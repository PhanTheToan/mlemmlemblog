'use strict';

const PKG = 'com.hackerone.mobile.challenge2';
const ACT = 'com.hackerone.mobile.challenge2.MainActivity';

const CIPHER_HEX =
  '9646D13EC8F8617D1CEA1CF4334940824C700ADF6A7A3236163CA2C9604B9BE4BDE770AD698C02070F571A0B612BBD3572D81F99';
const NONCE_ASCII = 'aabbccddeeffgghhaabbccdd'; // đúng theo MainActivity.java

const START = 0;
const END = 999999;
const BATCH = 1000;
const SLEEP_MS = 1;

function zpad6(n) {
  return ('000000' + n).slice(-6);
}

function hookBlockSigtrap() {
  function patchSignalArg(sym, idx) {
    const p = Module.findExportByName('libc.so', sym) || Module.findExportByName(null, sym);
    if (!p) return;
    Interceptor.attach(p, {
      onEnter(args) {
        const sig = args[idx].toInt32();
        if (sig === 5) { // SIGTRAP
          args[idx] = ptr(0);
          send(`[*] blocked SIGTRAP via ${sym}`);
        }
      }
    });
  }
  patchSignalArg('raise', 0);
  patchSignalArg('kill', 1);
  patchSignalArg('tgkill', 2);
  patchSignalArg('pthread_kill', 1);
}

setImmediate(hookBlockSigtrap);

Java.perform(function () {
  const MainActivity = Java.use(ACT);
  const SecretBox = Java.use('org.libsodium.jni.crypto.SecretBox');
  const Hex = Java.use('org.libsodium.jni.encoders.Hex');
  const JString = Java.use('java.lang.String');

  const cipherBytes = Hex.$new().decode(CIPHER_HEX);
  const nonceBytes = JString.$new(NONCE_ASCII).getBytes();

  let act = null;
  let i = START;
  let done = false;

  function step() {
    if (!act || done) return;

    const to = Math.min(i + BATCH, END + 1);
    for (; i < to; i++) {
      const pin = zpad6(i);

      try { act.resetCoolDown(); } catch (_) {}

      try {
        const key = act.getKey(pin);
        const pt = SecretBox.$new(key).decrypt(nonceBytes, cipherBytes); // đúng PIN => không throw
        const keyHex = MainActivity.bytesToHex(key);
        const plain = JString.$new(pt).toString();

        send(`[+] FOUND PIN: ${pin}`);
        send(`[+] KEY: ${keyHex}`);
        send(`[+] PLAINTEXT: ${plain}`);
        done = true;
        return;
      } catch (e) {
        // wrong pin
      }
    }

    if (i % 10000 === 0) send(`[*] tested: ${zpad6(i)}`);
    setTimeout(step, SLEEP_MS);
  }

  Java.choose(ACT, {
    onMatch: function (inst) {
      act = Java.retain(inst);
      send('[*] MainActivity instance found');
    },
    onComplete: function () {
      if (!act) {
        send('[-] MainActivity not found');
        return;
      }
      send('[*] Start brute-force');
      step();
    }
  });
});