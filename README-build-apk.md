# Build an APK (Android) — quick guide

## Files in this pack
- `app.json` — Android cleartext HTTP enabled; default backend URL set to `http://192.168.1.23:5000`.
- `eas.json` — has a **preview** profile that outputs an **APK**.
- `build-apk.ps1` — one-command helper to log in and build.
- `set-backend-url.ps1` — optional helper to change the default backend URL later.

## Steps
1) Drop these files into your **mobile app project root** (same folder as `package.json`).
2) (Optional) Change the default backend URL:
   ```powershell
   .\set-backend-url.ps1 -Url http://192.168.1.23:5000
   ```
3) Build the APK:
   ```powershell
   .\build-apk.ps1
   ```
   - If prompted, log in to Expo (one time).
   - When the build finishes, a link to download the **.apk** will be shown.
4) Install on Android (enable “Install unknown apps”), open the app → tap **⚙️** to adjust the server URL if needed.

For Play Store later (AAB): `eas build -p android --profile production`
