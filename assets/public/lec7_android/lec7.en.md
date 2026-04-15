# Lec 7.5: Challenge 2
> Install `challenge2_release.apk` to work on this challenge.
> The original lab comes from `h1-702 2018 CTF`.

[Lab link](https://github.com/tsug0d/AndroidMobilePentest101/blob/master/lab/frida_lab/challenge2_release.apk)

Install the app first and interact with it so we can observe its behavior.

```commandLine
adb install challenge2_realease.apk
```

![Challenge 2 screen](image-4.png)

Enter any PIN value you want, then open `logcat` to see what the app is doing behind the scenes.

```commandline
04-14 22:01:46.012   196   196 I logd    : logdr: UID=0 GID=0 PID=8155 b tail=0 logMask=99 pid=0 start=0ns deadline=0ns
04-14 22:01:48.168   691   691 I wpa_supplicant: wlan0: CTRL-EVENT-BEACON-LOSS
04-14 22:01:53.384  7986  7986 D PinLock : Pin changed, new length 1 with intermediate pin 9
04-14 22:01:53.395   363   498 D AudioFlinger: mixer(0xb400007ba30f8a70) throttle end: throttle time(33)
04-14 22:01:53.438  7986  8006 D EGL_emulation: app_time_stats: avg=35737.02ms min=11.04ms max=357234.59ms count=10
04-14 22:01:53.468  7986  7986 D PinLock : Pin changed, new length 2 with intermediate pin 99
04-14 22:01:53.493   363   498 D AudioFlinger: mixer(0xb400007ba30f8a70) throttle end: throttle time(35)
04-14 22:01:54.067  7986  7986 D PinLock : Pin changed, new length 3 with intermediate pin 999
04-14 22:01:54.454  7986  8006 D EGL_emulation: app_time_stats: avg=11.38ms min=1.72ms max=30.80ms count=60
04-14 22:01:54.534  7986  7986 D PinLock : Pin changed, new length 4 with intermediate pin 9999
04-14 22:01:54.933  7986  7986 D PinLock : Pin changed, new length 5 with intermediate pin 99999
04-14 22:01:55.402  7986  7986 D PinLock : Pin complete: 999999
04-14 22:01:55.402  7986  7986 D TEST    : 00000000000000000000000000000000AC175D27AC175D27AC175D27AC175D27
04-14 22:01:55.402  7986  7986 I org.libsodium.jni.NaCl: librarypath=/system/lib64:/system_ext/lib64
04-14 22:01:55.404  7986  7986 D PROBLEM : Unable to decrypt text
04-14 22:01:55.404  7986  7986 W System.err: java.lang.RuntimeException: Decryption failed. Ciphertext failed verification
04-14 22:01:55.405  7986  7986 W System.err: 	at org.libsodium.jni.crypto.Util.isValid(Util.java:47)
04-14 22:01:55.405  7986  7986 W System.err: 	at org.libsodium.jni.crypto.SecretBox.decrypt(SecretBox.java:56)
04-14 22:01:55.405  7986  7986 W System.err: 	at com.hackerone.mobile.challenge2.MainActivity$1.onComplete(MainActivity.java:42)
04-14 22:01:55.405  7986  7986 W System.err: 	at com.andrognito.pinlockview.PinLockView$1.onNumberClicked(PinLockView.java:56)
04-14 22:01:55.405  7986  7986 W System.err: 	at com.andrognito.pinlockview.PinLockAdapter$NumberViewHolder$1.onClick(PinLockAdapter.java:191)
04-14 22:01:55.405  7986  7986 W System.err: 	at android.view.View.performClick(View.java:7441)
04-14 22:01:55.405  7986  7986 W System.err: 	at android.view.View.performClickInternal(View.java:7418)
04-14 22:01:55.405  7986  7986 W System.err: 	at android.view.View.access$3700(View.java:835)
04-14 22:01:55.405  7986  7986 W System.err: 	at android.view.View$PerformClick.run(View.java:28676)
04-14 22:01:55.405  7986  7986 W System.err: 	at android.os.Handler.handleCallback(Handler.java:938)
04-14 22:01:55.405  7986  7986 W System.err: 	at android.os.Handler.dispatchMessage(Handler.java:99)
04-14 22:01:55.405  7986  7986 W System.err: 	at android.os.Looper.loopOnce(Looper.java:201)
04-14 22:01:55.405  7986  7986 W System.err: 	at android.os.Looper.loop(Looper.java:288)
04-14 22:01:55.405  7986  7986 W System.err: 	at android.app.ActivityThread.main(ActivityThread.java:7839)
04-14 22:01:55.405  7986  7986 W System.err: 	at java.lang.reflect.Method.invoke(Native Method)
04-14 22:01:55.405  7986  7986 W System.err: 	at com.android.internal.os.RuntimeInit$MethodAndArgsCaller.run(RuntimeInit.java:548)
04-14 22:01:55.405  7986  7986 W System.err: 	at com.android.internal.os.ZygoteInit.main(ZygoteInit.java:1003)
04-14 22:01:55.468  7986  8006 D EGL_emulation: app_time_stats: avg=16.59ms min=13.60ms max=19.65ms count=61
04-14 22:01:56.100   691   691 I wpa_supplicant: wlan0: CTRL-EVENT-BEACON-LOSS
```

From `logcat`, the keywords `PinLock`, `TEST`, and `PROBLEM` are enough to guide us toward `MainActivity`. Let us inspect the key logic there.

- `onCreate()`:

```java
public void onCreate(Bundle bundle) {
        super.onCreate(bundle);
        setContentView(R.layout.activity_main);
        this.cipherText = new Hex().decode("9646D13EC8F8617D1CEA1CF4334940824C700ADF6A7A3236163CA2C9604B9BE4BDE770AD698C02070F571A0B612BBD3572D81F99");
        this.mPinLockView = (PinLockView) findViewById(R.id.pin_lock_view);
        this.mPinLockView.setPinLockListener(this.mPinLockListener);
        this.mIndicatorDots = (IndicatorDots) findViewById(R.id.indicator_dots);
        this.mPinLockView.attachIndicatorDots(this.mIndicatorDots);
    }
```

This method initializes the required variables. The most important detail is that `cipherText` is hardcoded inside the app.

- `onPinChange()` is only used to update the PIN entry state.
- `onComplete()` contains the core flow: build a key from the user PIN, then try to decrypt the ciphertext.

```java
public void onComplete(String str) {
            Log.d(MainActivity.this.TAG, "Pin complete: " + str);
            byte[] key = MainActivity.this.getKey(str);
            Log.d("TEST", MainActivity.bytesToHex(key));
            try {
                Log.d("DECRYPTED", new String(new SecretBox(key).decrypt("aabbccddeeffgghhaabbccdd".getBytes(), MainActivity.this.cipherText), StandardCharsets.UTF_8));
            } catch (RuntimeException e) {
                Log.d("PROBLEM", "Unable to decrypt text");
                e.printStackTrace();
            }
        }
```

At this point, we already know the following inputs:

```text
cipherText='9646D13EC8F8617D1CEA1CF4334940824C700ADF6A7A3236163CA2C9604B9BE4BDE770AD698C02070F571A0B612BBD3572D81F99'
iv='aabbccddeeffgghhaabbccdd'
Pin='user fill 6-digits'
```

Based on `logcat`, every wrong PIN still reaches `decrypt()`. When the PIN is incorrect, the app immediately throws an exception and prints a stack trace:

```commandline
04-14 22:01:55.404  7986  7986 W System.err: java.lang.RuntimeException: Decryption failed. Ciphertext failed verification
04-14 22:01:55.405  7986  7986 W System.err: 	at org.libsodium.jni.crypto.Util.isValid(Util.java:47)
04-14 22:01:55.405  7986  7986 W System.err: 	at org.libsodium.jni.crypto.SecretBox.decrypt(SecretBox.java:56)
04-14 22:01:55.405  7986  7986 W System.err: 	at com.hackerone.mobile.challenge2.MainActivity$1.onComplete(MainActivity.java:42)
04-14 22:01:55.405  7986  7986 W System.err: 	at com.andrognito.pinlockview.PinLockView$1.onNumberClicked(PinLockView.java:56)
...
```

So the first obvious idea is brute-force against the 6-digit PIN. We could ask AI to write the script right away, but since this is a `zero to hero` exercise, it is more useful to understand the underlying logic first.

If we keep reading the source, we find two native methods:

```java
    import org.libsodium.jni.crypto.SecretBox;
    import org.libsodium.jni.encoders.Hex;

    public native byte[] getKey(String str);

    public native void resetCoolDown();

    static {
        System.loadLibrary("native-lib");
        hexArray = "0123456789ABCDEF".toCharArray();
    }
```

This shows that `getKey()` and `resetCoolDown()` are implemented inside `native-lib`. In the current flow, `getKey()` is called directly from `onComplete()`, while `resetCoolDown()` is not used by the app itself.

> To identify the device ABI:
> `adb shell getprop ro.product.cpu.abi`
>
> Example: `x86_64`

Then open the matching native library, for example `lib/x86_64/libnative-lib.so`.

Inspect `Java_com_hackerone_mobile_challenge2_MainActivity_getKey` in Ghidra:

![getKey in Ghidra](image.png)

This is `Java_com_hackerone_mobile_challenge2_MainActivity_resetCoolDown`:

![resetCoolDown in Ghidra](image-1.png)

In `resetCoolDown`, we can already see `DAT_00103008 = 0;`, which strongly suggests a counter reset. So the next step is to check whether `DAT_00103008` also appears inside `getKey()`.

![Counter usage inside getKey](image-2.png)

This is the block where `DAT_00103008` is used. The condition `DAT_00103008 < 0x33` means the counter is allowed to increase until it reaches `51`. Once it crosses that threshold, execution drops into the `else` branch, sleeps for roughly `10` seconds, and only then resets the counter back to `0`.

The rest of `getKey()` is used to derive the key from the user-supplied PIN. So the high-level conclusion is:

- `getKey()` derives the key and also enforces anti brute-force.
- `resetCoolDown()` lets us clear that counter manually.

Looking back at `resetCoolDown()`:

![Reset counter in native code](image-3.png)

The bypass path becomes straightforward: brute-force the PIN, and whenever the counter is close to the limit, call `resetCoolDown()` so the anti brute-force logic never slows us down.

Before writing the script, here is the full list of primitives we already have:

- `SecretBox()` for decryption attempts
- `getKey()` to derive a key from the user PIN
- `resetCoolDown()` to reset the counter
- `cipherText`
- `iv`

And here is the Frida script:

```javascript
setTimeout(
    function (){
        function rpad(width, string, pad){
            return (width <= string.length) ? string : rpad(width,pad+string,pad);
        }
        function getPin(pin){
            return rpad(6,pin,'0');
        }
        Java.perform(
            function() {
                const SecretBox = Java.use('org.libsodium.jni.crypto.SecretBox');
                const Hex = Java.use('org.libsodium.jni.encoders.Hex');
                const JString = Java.use('java.lang.String');
                const MainActivity = Java.use('com.hackerone.mobile.challenge2.MainActivity');
                const cipher = '9646D13EC8F8617D1CEA1CF4334940824C700ADF6A7A3236163CA2C9604B9BE4BDE770AD698C02070F571A0B612BBD3572D81F99';
                const iv = 'aabbccddeeffgghhaabbccdd';
                const BATCH_SIZE = 200;
                const PAUSE_MS = 1;
                const LOG_EVERY = 1000;

                Java.choose('com.hackerone.mobile.challenge2.MainActivity',{
                    onMatch : function(instance){
                        console.log("Found Instance");

                        let counter = 0;
                        let i = 999999;
                        let found = false;
                        const cipherText = Hex.$new().decode(cipher);
                        const nonce = JString.$new(iv).getBytes();

                        function step(){
                            if(found || i < 0){
                                return;
                            }

                            const stop = Math.max(i - BATCH_SIZE, -1);
                            for(; i > stop; i--){
                                const pin = getPin(i.toString());
                                try{
                                    const key = instance.getKey(pin);
                                    counter++;
                                    if(counter >= 51){
                                        counter = 0;
                                        instance.resetCoolDown();
                                    }

                                    let box = null;
                                    try{
                                        box = SecretBox.$new(key);
                                        box.decrypt(nonce,cipherText);
                                        console.log("Found Pin: " + pin + " Hex: " + MainActivity.bytesToHex(key));
                                        found = true;
                                        break;
                                    }catch(err){
                                        // wrong pin
                                    }finally{
                                        if(box !== null){
                                            try{
                                                box.$dispose();
                                            }catch(err){
                                                // nothing
                                            }
                                        }
                                    }
                                }catch(err){
                                    // nothing
                                }

                                if(!found && i % LOG_EVERY === 0){
                                    console.log("Checked down to PIN: " + getPin(i.toString()));
                                }
                            }

                            if(!found && i >= 0){
                                setTimeout(step, PAUSE_MS);
                            }
                        }

                        step();
                    },
                    onComplete : function(){
                        console.log('End!');
                    }
                })

            }
        );
    },0
);
```

Observed output:

```commandLine
Checked down to PIN: 923000
Checked down to PIN: 922000
Checked down to PIN: 921000
Checked down to PIN: 920000
Checked down to PIN: 919000
Found Pin: 918264 Hex: 499B77D8B93BFEBB98FCC976003A2DF47D70E389A5A6DF7BAC175D271CA70C34
```

Enter the recovered PIN and verify the result in `logcat`:

![Flag decryption result](img.png)

```commandline
04-14 22:50:11.268  8359  8359 D PinLock : Pin complete: 918264
04-14 22:50:11.268  8359  8359 D TEST    : 499B77D8B93BFEBB98FCC976003A2DF47D70E389A5A6DF7BAC175D271CA70C34
04-14 22:50:11.269  8359  8359 D DECRYPTED: flag{wow_yall_called_a_lot_of_func$}
```

*Recovered flag: `flag{wow_yall_called_a_lot_of_func$}`*
