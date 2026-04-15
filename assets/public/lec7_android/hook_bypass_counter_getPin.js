'use strict';

const LIB_NAME = 'libnative-lib.so';
const ACTIVITY = 'com.hackerone.mobile.challenge2.MainActivity';

const CIPHER_HEX = '9646D13EC8F8617D1CEA1CF4334940824C700ADF6A7A3236163CA2C9604B9BE4BDE770AD698C02070F571A0B612BBD3572D81F99';
const NONCE_ASCII = 'aabbccddeeffgghhaabbccdd';

const PIN_START = 999999;
const PIN_END = 0;
const BATCH_SIZE = 400;
const PAUSE_MS = 1;
const LOG_EVERY = 5000;

function zpad6(n) {
  return ('000000' + n).slice(-6);
}

function findExport(moduleName, symbolName) {
  const mod = Process.findModuleByName(moduleName);
  if (!mod) return null;
  const exp = mod.enumerateExports().find(e => e.name === symbolName);
  return exp ? exp.address : null;
}

function getRange(addr) {
  try {
    return Process.findRangeByAddress(addr);
  } catch (_) {
    try {
      return Process.getRangeByAddress(addr);
    } catch (_) {
      return null;
    }
  }
}

function resolveCounterPtrFromReset(resetPtr) {
  const first = Instruction.parse(resetPtr);
  const second = Instruction.parse(first.next);

  // arm64:
  // adrp xN, #PAGE
  // str  xzr, [xN, #disp]   (or wzr)
  if (first.mnemonic === 'adrp' && second.mnemonic === 'str') {
    const o1 = first.operands;
    const o2 = second.operands;
    if (
      o1.length >= 2 &&
      o2.length >= 2 &&
      o1[0].type === 'reg' &&
      o1[1].type === 'imm' &&
      o2[0].type === 'reg' &&
      o2[1].type === 'mem' &&
      (o2[0].value === 'xzr' || o2[0].value === 'wzr') &&
      o2[1].value.base === o1[0].value
    ) {
      return ptr(o1[1].value).add(ptr(o2[1].value.disp));
    }
  }

  // x86_64 fallback:
  // mov qword ptr [rip + disp], 0
  let p = resetPtr;
  for (let i = 0; i < 10; i++) {
    const ins = Instruction.parse(p);
    if (ins.mnemonic === 'mov' && ins.operands.length >= 2) {
      const a = ins.operands[0];
      const b = ins.operands[1];
      if (a.type === 'mem' && b.type === 'imm' && a.value.base === 'rip' && b.value === 0) {
        return ins.next.add(a.value.disp);
      }
    }
    p = ins.next;
  }

  return null;
}

console.log('[*] script loaded');

let started = false;
const boot = setInterval(function () {
  if (started) return;
  try {
    const mod = Process.findModuleByName(LIB_NAME);
    const resetPtr = mod ? findExport(LIB_NAME, 'Java_com_hackerone_mobile_challenge2_MainActivity_resetCoolDown') : null;
    if (!mod || !resetPtr) return;

    const counterPtr = resolveCounterPtrFromReset(resetPtr);
    if (!counterPtr) {
      console.log('[-] failed to resolve counter pointer from resetCoolDown');
      clearInterval(boot);
      return;
    }

    const range = getRange(counterPtr);
    console.log('[+] module base=' + mod.base + ' size=0x' + mod.size.toString(16));
    console.log('[+] resetCoolDown=' + resetPtr);
    console.log('[+] counterPtr=' + counterPtr + ' range=' + (range ? (range.base + ' ' + range.protection) : 'null'));

    if (!range) {
      console.log('[-] counter pointer is unmapped');
      clearInterval(boot);
      return;
    }
    if (range.protection.indexOf('w') === -1) {
      try {
        Memory.protect(range.base, range.size, 'rw-');
      } catch (_) {}
    }

    started = true;
    clearInterval(boot);

    Java.perform(function () {
      const MainActivity = Java.use(ACTIVITY);
      const SecretBox = Java.use('org.libsodium.jni.crypto.SecretBox');
      const Hex = Java.use('org.libsodium.jni.encoders.Hex');
      const JString = Java.use('java.lang.String');

      const getKeyOv = MainActivity.getKey.overload('java.lang.String');
      getKeyOv.implementation = function (pin) {
        try {
          counterPtr.writeU64(0);
        } catch (e) {
          console.log('[-] write counter failed: ' + e);
        }
        return getKeyOv.call(this, pin);
      };
      console.log('[+] getKey hook installed');

      const cipherBytes = Hex.$new().decode(CIPHER_HEX);
      const nonceBytes = JString.$new(NONCE_ASCII).getBytes();

      Java.choose(ACTIVITY, {
        onMatch: function (instance) {
          const act = Java.retain(instance);
          console.log('[+] MainActivity found; start brute-force');

          let i = PIN_START;
          let found = false;

          function step() {
            if (found || i < PIN_END) {
              if (!found) console.log('[-] not found in range');
              return;
            }

            const stop = Math.max(i - BATCH_SIZE, PIN_END - 1);
            for (; i > stop; i--) {
              const pin = zpad6(i);
              try {
                const key = act.getKey(pin);
                const plainBytes = SecretBox.$new(key).decrypt(nonceBytes, cipherBytes);
                const plain = JString.$new(plainBytes).toString();

                console.log('[+] FOUND PIN: ' + pin);
                console.log('[+] KEY: ' + MainActivity.bytesToHex(key));
                console.log('[+] PLAINTEXT: ' + plain);
                found = true;
                break;
              } catch (_) {
                // wrong pin
              }

              if (!found && i % LOG_EVERY === 0) {
                console.log('[*] checked: ' + zpad6(i));
              }
            }

            if (!found) setTimeout(step, PAUSE_MS);
          }

          setTimeout(step, 0);
        },
        onComplete: function () {
          console.log('[*] Java.choose complete');
        }
      });
    });
  } catch (e) {
    console.log('[-] fatal: ' + e + '\n' + (e.stack || ''));
    clearInterval(boot);
  }
}, 200);