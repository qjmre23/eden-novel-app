# Eden Novel — Android Export Guide

This project uses **Capacitor** to wrap the React/Vite web app into a native Android APK.
The `android/` folder is a fully self-contained Android Studio project ready to open.

---

## Quick Export Steps

### 1. Build and sync (run from this folder)

```bash
pnpm run android:sync
```

This builds the web app for Android (base path `/`) and syncs it into `android/app/src/main/assets/public/`.

### 2. Open in Android Studio

```bash
npx cap open android
```

Android Studio will open the `android/` folder directly. From there you can:
- Build → Make Project
- Build → Build Bundle(s)/APK(s) → Build APK(s)
- Run on an emulator or connected device

### 3. Build Debug APK from CLI (needs Android SDK)

```bash
pnpm run android:build-apk
```

Output APK will be at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## File Structure

```
android/
├── app/
│   ├── build.gradle              # App-level Gradle config
│   ├── src/main/
│   │   ├── AndroidManifest.xml   # App permissions & config
│   │   ├── assets/public/        # ← Built web app lives here
│   │   ├── java/com/edennovel/app/
│   │   │   └── MainActivity.java # Entry point (Capacitor bridge)
│   │   └── res/
│   │       ├── values/
│   │       │   ├── colors.xml    # Eden Novel dark color palette
│   │       │   ├── strings.xml   # App name & package
│   │       │   └── styles.xml    # Dark theme styles
│   │       └── xml/
│   │           ├── file_paths.xml
│   │           └── network_security_config.xml
├── build.gradle                  # Root Gradle config (AGP version)
├── gradle.properties             # JVM & build optimizations
├── variables.gradle              # SDK versions (minSdk=24, target=36)
└── settings.gradle               # Module includes
```

---

## App Details

| Field       | Value                  |
|-------------|------------------------|
| App ID      | `com.edennovel.app`    |
| App Name    | `Eden Novel`           |
| Min SDK     | API 24 (Android 7.0)   |
| Target SDK  | API 36                 |
| Version     | 1.0 (versionCode 1)    |
| Theme       | Dark (zinc-950 / #09090b) |

---

## Permissions Included

- `INTERNET` — AI API calls & MongoDB sync
- `ACCESS_NETWORK_STATE` / `ACCESS_WIFI_STATE` — connection checks
- `READ/WRITE_EXTERNAL_STORAGE` — save/export (legacy, capped at API 29/32)
- `VIBRATE` — haptic feedback
- `WAKE_LOCK` — keep screen on during story generation

---

## Signing for Release (Play Store)

1. Generate a keystore:
   ```bash
   keytool -genkey -v -keystore eden-novel-release.jks \
     -alias eden-novel -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Add to `android/app/build.gradle`:
   ```groovy
   android {
     signingConfigs {
       release {
         storeFile file('eden-novel-release.jks')
         storePassword 'YOUR_STORE_PASSWORD'
         keyAlias 'eden-novel'
         keyPassword 'YOUR_KEY_PASSWORD'
       }
     }
     buildTypes {
       release {
         signingConfig signingConfigs.release
         minifyEnabled true
       }
     }
   }
   ```

3. Build release APK:
   ```bash
   cd android && ./gradlew assembleRelease
   ```

---

## Notes

- **No SQLite plugin needed** — story data uses IndexedDB (Dexie.js) which works natively in Android WebView via Capacitor.
- **MongoDB sync** works over HTTPS — already allowed in `network_security_config.xml`.
- After any code changes, always run `pnpm run android:sync` before rebuilding the APK.
