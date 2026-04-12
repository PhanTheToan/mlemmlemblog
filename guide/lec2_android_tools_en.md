# Lecture 2: Android Tools and ADB Basics

Enable Developer Mode on the Android emulator.
![Enable Developer mode](/assets/public/lec2_android_tools/image-4.png)

Tap the build/version field about 7 to 8 times to unlock Developer Options.  
Then open `Developer options`, find `USB debugging`, and enable it so `adb` can interact with the emulator from your host machine.
![Enable USB debugging](/assets/public/lec2_android_tools/image-5.png)

After the emulator setup is complete, validate your ADB connection with these commands:

- Check connected devices:
```commandline
adb devices
```
![ADB devices output](/assets/public/lec2_android_tools/adb_device.png)

- Restart ADB as `root` on the emulator:
```commandline
adb devices
adb root
```

If you get `restarting adbd as root`, the operation was successful.

Install an APK with `adb` using this sample app: [InsecureBankv2.apk](https://github.com/dineshshetty/Android-InsecureBankv2/blob/master/InsecureBankv2.apk)

- Install command:
```commandline
adb install /path/to/apkfile
```
![Install APK command](</assets/public/lec2_android_tools/Screenshot 2026-04-11 at 15.03.56.png>)

Note: run the command from the APK directory or use the full file path.

Verify that `InsecureBankv2` appears on the emulator.
![InsecureBankv2 installed](</assets/public/lec2_android_tools/Screenshot 2026-04-11 at 15.06.35.png>)

- Open a shell on the Android device:
```commandline
adb shell
```
![ADB shell](/assets/public/lec2_android_tools/image-2.png)

- View system logs:
```commandline
adb logcat
```
![ADB logcat](/assets/public/lec2_android_tools/image-1.png)

- Upload a file from host to emulator:
```commandline
adb push </path/to/file/on/host> </path/to/file/on/device>
```
![ADB push](/assets/public/lec2_android_tools/image-3.png)

- Download a file from emulator to host:
```commandline
adb pull </path/to/file/on/device> </path/to/file/on/host>
```
