Thực hiện bật chế độ nhà phát triển trên máy ảo
![alt text](/assets/public/lec2_android_tools/image-4.png)
Thực hiện click liên tục tầm 7-8 lần để mở chế độ. Sau đó truy cập vào `Developer options` tìm mục `USB debugging`, sau đó bật lên để `adb` tương tác với máy ảo từ máy thật.
![alt text](/assets/public/lec2_android_tools/image-5.png)
Sau khi thực hiện cài máy ảo xong, thực hiện kiểm tra các thông qua các lệnh như
- Kiểm tra các thiết bị đang kết nối
```
adb devices
```
![alt text](/assets/public/lec2_android_tools/adb_device.png)
- Thực hiện active quyền `root` trên thiết bị
```
adb devices
adb root
```
Phản hồi là `restarting adbd as root` thì đã thành công.

Cài đặt một file apk bằng `adb` [link](https://github.com/dineshshetty/Android-InsecureBankv2/blob/master/InsecureBankv2.apk)
- Cài đặt file apk bằng câu lệnh
```
adb install /path/to/apkfile
```
![alt text](</assets/public/lec2_android_tools/Screenshot 2026-04-11 at 15.03.56.png>)
*Yêu cầu di chuyển đến thư mục chứa file apk đó hoặc chỉ đường dẫn*

Kiểm tra thấy app `InsecureBankv2` đã được cài đặt trên điện thoại
![alt text](</assets/public/lec2_android_tools/Screenshot 2026-04-11 at 15.06.35.png>)

- Truy cập command-line shell của điện thoại gõ lệnh
```
adb shell
```
![alt text](/assets/public/lec2_android_tools/image-2.png)

- Để xem log, gõ lệnh
```
adb logcat
```
![alt text](/assets/public/lec2_android_tools/image-1.png)

- Để tải lên một file từ máy thật đến máy ảo, gõ lệnh
```
adb push </path/to/file/pc> </path/to/file/device>
```
![alt text](/assets/public/lec2_android_tools/image-3.png)

- Để tải một file từ điện thoại ảo về máy thật, gõ lệnh
```
adb pull <path/to/file/device> <path/to/file/pc>
```
