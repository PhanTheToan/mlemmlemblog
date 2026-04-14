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
const LOG_EACH_PIN = true;
const RUN_TIMEOUT_MS = 5 * 60 * 1000; // 5 phút
const BLOCK_HINTS = ['cooldown', 'too many', 'locked', 'wait'];

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
  let timeoutHandle = null;
  let attempts = 0;
  let blockAttempt = 0;
  let blockPin = null;
  let blockError = null;
  const runStartMs = Date.now();

  function clearRunTimeout() {
    if (!timeoutHandle) return;
    clearTimeout(timeoutHandle);
    timeoutHandle = null;
  }

  function step() {
    if (!act || done) return;

    const to = Math.min(i + BATCH, END + 1);
    for (; i < to; i++) {
      const pin = zpad6(i);
      attempts += 1;
      if (LOG_EACH_PIN) send(`[*] trying PIN: ${pin}`);

     // try { act.resetCoolDown(); } catch (_) {}

      try {
        const key = act.getKey(pin);
        const pt = SecretBox.$new(key).decrypt(nonceBytes, cipherBytes); // đúng PIN => không throw
        const keyHex = MainActivity.bytesToHex(key);
        const plain = JString.$new(pt).toString();

        send(`[+] FOUND PIN: ${pin}`);
        send(`[+] FOUND at attempt: ${attempts}`);
        send(`[+] KEY: ${keyHex}`);
        send(`[+] PLAINTEXT: ${plain}`);
        done = true;
        clearRunTimeout();
        return;
      } catch (e) {
        const err = (e && e.toString ? e.toString() : '' + e).toLowerCase();
        if (!blockAttempt && BLOCK_HINTS.some(function (hint) { return err.indexOf(hint) !== -1; })) {
          blockAttempt = attempts;
          blockPin = pin;
          blockError = '' + e;
          send(`[!] BLOCK detected at attempt ${blockAttempt}, pin ${blockPin}`);
          send(`[!] BLOCK error: ${blockError}`);
        }
        if (LOG_EACH_PIN) send(`[-] wrong PIN: ${pin}`);
      }
    }

    if (i > END) {
      done = true;
      clearRunTimeout();
      send(`[*] total attempts: ${attempts}`);
      send('[-] Reached END range without finding valid PIN');
      return;
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
      timeoutHandle = setTimeout(function () {
        if (done) return;
        done = true;
        const elapsed = Date.now() - runStartMs;
        send(`[-] Timeout after ${RUN_TIMEOUT_MS} ms, stop brute-force`);
        send(`[*] timeout stats: attempts=${attempts}, last_pin=${zpad6(i)}, elapsed_ms=${elapsed}`);
        if (blockAttempt) {
          send(`[*] block stats: block_attempt=${blockAttempt}, block_pin=${blockPin}`);
          send(`[*] block reason: ${blockError}`);
        } else {
          send('[*] block stats: not detected');
        }
      }, RUN_TIMEOUT_MS);
      step();
    }
  });
});
