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

```javascript
Java.perform(
    () => {
        const pattern = Java.use('java.util.regex.Pattern');
        const regex_change = pattern.compile.overload('java.lang.String');
        regex_change.implementation = function(x) {
            return regex_change.call(this, '.*');
        }
    }
);
```

![img.png](img.png)
```commandline
04-14 22:50:11.268  8359  8359 D PinLock : Pin complete: 918264
04-14 22:50:11.268  8359  8359 D TEST    : 499B77D8B93BFEBB98FCC976003A2DF47D70E389A5A6DF7BAC175D271CA70C34
04-14 22:50:11.269  8359  8359 D DECRYPTED: flag{wow_yall_called_a_lot_of_func$}
```

Trước hết qua check `logcat` truy cập tìm kiếm dựa trên các từ trong `logcat` như `TEST`, `Pinlock` ta tìm đến `MainActity`. Giờ cùng kiểm qua xem trong hàm này có gì
- Đoạn mã `onCreate()`
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
Sử dụng để khởi tạo các biến, giá trị và đáng nói ở đây ta có `ciphertext`.
- Đoạn mã `onPinChange()` dùng để hiển thị các thông tin ...
- Đoạn mã `onCreate()` trực tiếp sử dụng để giải mã và xử lý logic chính ở phía sau của hệ thống 
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
Tổng hợp các thông tin thì hiện tại ta đã có 
```text
cipherText='9646D13EC8F8617D1CEA1CF4334940824C700ADF6A7A3236163CA2C9604B9BE4BDE770AD698C02070F571A0B612BBD3572D81F99'
iv='aabbccddeeffgghhaabbccdd'
Pin='user fill 6-digits'
```
Dựa vào `logcat` thì ta có thể rằng khi người dùng nhập sai mã pin, hệ thống sẽ `decrypt()` mã pin đó sau đó nếu mã pin sai thì ngay lập tức sẽ sinh ra ngoại lệ và sẽ in ra stack trace ngay lập tức như chúng ta đã thấy
```commandline
04-14 22:01:55.404  7986  7986 W System.err: java.lang.RuntimeException: Decryption failed. Ciphertext failed verification
04-14 22:01:55.405  7986  7986 W System.err: 	at org.libsodium.jni.crypto.Util.isValid(Util.java:47)
04-14 22:01:55.405  7986  7986 W System.err: 	at org.libsodium.jni.crypto.SecretBox.decrypt(SecretBox.java:56)
04-14 22:01:55.405  7986  7986 W System.err: 	at com.hackerone.mobile.challenge2.MainActivity$1.onComplete(MainActivity.java:42)
04-14 22:01:55.405  7986  7986 W System.err: 	at com.andrognito.pinlockview.PinLockView$1.onNumberClicked(PinLockView.java:56)
...
```
Dựa vào những ý tưởng sơ khai đó, ngay lập tức ta có thể nghĩ đến phương pháp brute force mã pin có 6 chữ số. Lập tức có thể nắm source và trình bày ý tưởng nhờ AI viết script? Đó cũng là một cách tốt nhưng chúng ta đang `zero to hero` nên hãy cùng tìm hiểu sâu hơn nguyên do như thế nào nhé!

Lần luợt, rà soát mã nguồn từ trên xuống dưới, ta thấy có `getKey()`

Cùng đi vào class `SecretBox()` xem trong đây có gì?
```java
package org.libsodium.jni.crypto;

import org.libsodium.jni.NaCl;
import org.libsodium.jni.Sodium;
import org.libsodium.jni.encoders.Encoder;

/* loaded from: classes.dex */
public class SecretBox {
    private byte[] key;

    public SecretBox(byte[] bArr) {
        this.key = bArr;
        Util.checkLength(bArr, 32);
    }

    public SecretBox(String str, Encoder encoder) {
        this(encoder.decode(str));
    }

    public byte[] encrypt(byte[] bArr, byte[] bArr2) {
        Util.checkLength(bArr, 24);
        byte[] prependZeros = Util.prependZeros(32, bArr2);
        byte[] zeros = Util.zeros(prependZeros.length);
        NaCl.sodium();
        Util.isValid(Sodium.crypto_secretbox_xsalsa20poly1305(zeros, prependZeros, prependZeros.length, bArr, this.key), "Encryption failed");
        return Util.removeZeros(16, zeros);
    }

    public byte[] decrypt(byte[] bArr, byte[] bArr2) {
        Util.checkLength(bArr, 24);
        byte[] prependZeros = Util.prependZeros(16, bArr2);
        byte[] zeros = Util.zeros(prependZeros.length);
        NaCl.sodium();
        Util.isValid(Sodium.crypto_secretbox_xsalsa20poly1305_open(zeros, prependZeros, prependZeros.length, bArr, this.key), "Decryption failed. Ciphertext failed verification");
        return Util.removeZeros(32, zeros);
    }
}
```
Đây là full source của class `SecretBox` được import từ `
