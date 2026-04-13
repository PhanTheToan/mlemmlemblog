# Lecture 4: Reverse
**Objective:** Learn several application reverse engineering skills.

## Inside the apk
APK (Android Application Package) is a file that contains all required components to install an app on Android devices. Similar to Windows (`.exe`), manual installation is called `side-loading`.

Components inside an APK file:
- **META-INF/:** This directory exists in a signed APK and contains the file list in the APK and signature metadata for file verification.
- **lib/:** Native library files (`*.so`) are stored in subfolders of `lib/` such as `x86`, `x86_64`.
- **res/:** This folder contains all XML resources and drawables in different densities like `mdpi`, `hdpi`, etc.
- **AndroidManifest.xml:** Describes the APK name, version, and core app definitions.
- **classes.dex:** Contains compiled source code converted into DEX bytecode.
- **resources.arsc:** Some compiled resources and definitions are stored here. They are usually kept uncompressed in the APK for faster runtime access.

APK is an archive file, specifically in `zip format-type` based on `JAR file format`, with `.apk` as the extension. Run `unzip`.
![img.png](img.png)
After unzipping, check the extracted files.
![img_1.png](img_1.png)
This is the same file list mentioned above. However, the files are still in binary format, so they are not directly readable. Therefore, we need to **reverse engineer** it with [APKTool](https://apktool.org/docs/install). *This tool also helps with patching later.*
```commandline
apktool d InsecureBankv2.apk
```
![img_2.png](img_2.png)
The decompiled output is saved in the `InsecureBankv2` folder. APKTool decompiles `AndroidManifest` back to raw XML and converts `resource.arsc` and `classes.dex` into a language called `SMALI`.

## Smali
All steps in the *Inside the apk* section can also be automated with *ByteCode Viewer*.

We need to understand **smali** to understand how code execution flows and to perform `patching` that changes runtime behavior. Below is an example of `smali` execution flow.

In `Bytecode Viewer`, go to `view -> pane 2 -> Smali/DEX` to display `smali` code in the second window.
![img_3.png](img_3.png)
Now let us analyze the admin login bypass code shown earlier. This is the original code before translating to `smali`.
![img_4.png](img_4.png)
Then search for `devadmin` in `smali` code to locate the handling logic.
![img_6.png](img_6.png)
A quick explanation of this `smali` code:
- Initialize string `devadmin` and store it in variable `v5`.
- Line 284 compares input string `v4` with `v5`. If true, it returns `1`; if false, it returns `0`.
- Line 285 stores the comparison result in variable `v4`.
- Line 286, `if-eqz` means `equal zero`. If `v4 = 0`, execution jumps to `L2:`; otherwise it continues.
Now we analyze the two branches of this condition.
- Branch when `if-eqz` is not satisfied:
![img_7.png](img_7.png)
- Branch when `if-eqz` is satisfied:
![img_9.png](img_9.png)
Basically, the two branches are not very different.

However, one question is: *Why read `smali` code when we can read Java source code?*

## Patching android app
Patching an app simply means modifying program code to make it behave as we want. We use `APKTool` for patching. First, decompile the APK with:
```commandline
apktool d InsecureBankv2.apk
```
![img_10.png](img_10.png)
Let us explore what is inside. Open the `res` folder; it contains resources that we can quickly modify. Go to the app `string` storage file at `InsecureBankv2/res/values`.
![img_11.png](img_11.png)
Here we found a strange `value`; try changing `isAdmin: yes` and see what happens.

Now we need to recompile it back into an APK.
```commandline
apktool b InsecureBankv2
```
![img_12.png](img_12.png)
After compilation, the file is usually in `InsecureBankv2/dist`. Before installation, we must re-sign it. Because one file was changed, `META-INF` still contains the old signature from the original APK. To re-sign, we use `keytool` and `jarsigner`.
Create a key with `keytool`:
```commandline
keytool -genkey -v -keystore my-release-key.keystore -alias alias_name -keyalg RSA -keysize 2048 -validity 10000
```
![img_13.png](img_13.png)
Then sign with that key using `jarsigner`:
```commandline
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore my-release-key.keystore InsecureBankv2.apk alias_name
```
![img_14.png](img_14.png)
![img_15.png](img_15.png)

Before installing the new app, remove the old one first. We also rename it to `InsecureBankv2_patch` to avoid confusion.
<img alt="img_16.png" src="img_16.png" width="320px" high="auto"/>
Now we can see `Create User`. This section only appears after changing `isAdmin: Yes`. The result shows that we successfully `patched` the app.

Currently, the app shows `Device not root`, even though our system is already `rooted`. The behavior is strange, but no problem. Let us bypass it in reverse to prove the device is `rooted`. Open `Bytecode Viewer`, drop in the APK for analysis, and search for `Root`.
![img_18.png](img_18.png)
We can see `showRootStatus` in the results, which looks suspicious. Open and inspect it.
![img_19.png](img_19.png)
![img_23.png](img_23.png)
This code checks whether `/system/app/Superuser.apk` exists. If yes, it detects root; otherwise it skips. Now let us patch this logic. Open the `smali` code and analyze it.
![img_22.png](img_22.png)
A brief explanation: since the current output is `Device not root`, the comparison condition in `if(... && ...)` is likely satisfied, so both parts return `false`. Now let us trace the code in its current flow.
- Lines 215 and 216 initialize two variables with corresponding values.
- Line 217 checks whether a file exists at `/system/app/Superuser.apk`. It does not exist, and at line 218 the result is stored as `v0 = 0`.
- Line 219 `if-eqz` means `equal zero`, so execution jumps to `L3:`, re-initializes `v0 = 0`, then jumps to `L1:`.
- At `L1:`, `if-ne` means `not-equal`. The result is not equal, so it jumps to `L4:`, prints `Device not Rooted!!`, then ends the method.
So how do we patch it? Very simply, modify the source directly here. For example, change line 226 to `if-eq` or change line 233 to `const/4 v0, 1`. There are many possible ways. Then sign again using the same tools above. Let us try changing line 233 and signing.
*(Decompile with `apktool`, then edit in VSCode or Notepad xD.)* After that, compile and sign again.
![img_24.png](img_24.png)
Run compile:
![img_25.png](img_25.png)
After signing, reinstall it:
![img_26.png](img_26.png)
