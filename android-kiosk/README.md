# CDSP Android 一体机薄壳

该工程是第一阶段 Android 容器，只在 RK3576 一体机主屏中承载现有 H5：

```text
http://172.18.0.59:4173/#/pages/workbench/index
```

它不复制 H5 或 Unity 资源，也不修改微信小程序。APK 提供沉浸式全屏、屏幕常亮、受信来源限制、WebGL 硬件加速，以及网络或 WebView 渲染进程异常后的可恢复错误页。

## 构建

需要 JDK 17+、Android SDK Platform 35、Build Tools 34.0.0 和 Gradle 8.9。

```powershell
.\gradlew.bat :app:assembleDebug
```

覆盖目标地址：

```powershell
.\gradlew.bat :app:assembleDebug -PCDSP_WEB_APP_URL=http://172.18.0.59:4173/#/pages/workbench/index
```

调试 APK：

```text
app/build/outputs/apk/debug/app-debug.apk
```

## 真机安装

```powershell
adb -s 5MR2546014326187 install -r app/build/outputs/apk/debug/app-debug.apk
adb -s 5MR2546014326187 shell am start --display 0 -n com.cdsp.kiosk.debug/com.cdsp.kiosk.MainActivity
```

当前网络安全配置只允许 `172.18.0.59` 使用明文 HTTP/WS。该例外仅用于内网开发，正式交付必须迁移到 HTTPS/WSS。

目标一体机虽然支持 WebGL 2，但其 Android System WebView 116 在现有 Unity 2019 大模型初始化期间会发生原生渲染进程崩溃；当前壳层会接管崩溃并允许重新加载，但三维模型正式启用前仍需升级并验证设备 WebView 运行时，或重新优化 Unity 构建资源。

当前版本不包含开机自启、锁定任务模式或 HDMI 副屏控制；这些能力应在主屏 REST、WebSocket 和 Unity WebGL 全链路验证通过后增加。
