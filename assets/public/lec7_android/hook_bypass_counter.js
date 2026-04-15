'use strict';

const LIB = 'libnative-lib.so';
const IMAGE_BASE = 0x00100000;
const DAT_COUNTER = 0x00103008;
const COUNTER_OFF = DAT_COUNTER - IMAGE_BASE; // 0x3008

console.log('[*] script loaded');

Java.perform(function () {
  const MainActivity = Java.use('com.hackerone.mobile.challenge2.MainActivity');
  const getKeyOv = MainActivity.getKey.overload('java.lang.String');

  let counterPtr = null;
  let hooked = false;

  const t = setInterval(function () {
    try {
      const mod = Process.findModuleByName(LIB);
      if (!mod) {
        console.log('[*] waiting for ' + LIB + ' ...');
        return;
      }

      counterPtr = mod.base.add(COUNTER_OFF);
      console.log('[+] base=' + mod.base + ' counter=' + counterPtr);

      if (!hooked) {
        hooked = true;
        getKeyOv.implementation = function (pin) {
          counterPtr.writeU64(0);
          return getKeyOv.call(this, pin);
        };
        console.log('[+] getKey hook installed');
      }

      clearInterval(t);
    } catch (e) {
      console.log('[-] error: ' + e + '\n' + (e.stack || ''));
    }
  }, 500);
});