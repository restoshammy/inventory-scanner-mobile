# Path to Android SDK tools
$adb = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
$emulatorBin = Join-Path $env:LOCALAPPDATA "Android\Sdk\emulator\emulator.exe"
$apkPath = "C:\Users\guestuser\Documents\inventory-app\inventory-scanner-mobile\android\app\build\outputs\apk\debug\app-debug.apk"

if (-not (Test-Path $adb)) {
    Write-Error "adb.exe not found at $adb. Install Android SDK Platform-Tools in Android Studio."
    exit 1
}

# Kill any stale ADB server
& $adb kill-server | Out-Null
& $adb start-server | Out-Null

# Check for connected devices
$devices = & $adb devices | Select-String "device$"
if ($devices.Count -eq 0) {
    Write-Host "[INFO] No devices detected. Trying to boot an emulator..."

    if (-not (Test-Path $emulatorBin)) {
        Write-Error "No emulator binary found. Open Android Studio -> Tools -> Device Manager and create a virtual device first."
        exit 1
    }

    $avdList = & $emulatorBin -list-avds
    if (-not $avdList) {
        Write-Error "No AVDs found. Create one in Android Studio Device Manager."
        exit 1
    }

    $firstAvd = $avdList[0]
    Write-Host "[INFO] Booting emulator $firstAvd..."
    Start-Process $emulatorBin -ArgumentList $firstAvd

    Write-Host "[INFO] Waiting for emulator to boot..."
    & $adb wait-for-device
    Start-Sleep -Seconds 15
}

# Install the APK
if (-not (Test-Path $apkPath)) {
    Write-Error "APK not found at $apkPath. Build it first with '.\gradlew :app:assembleDebug' (run from the android folder)."
    exit 1
}

Write-Host "[INFO] Installing $apkPath ..."
& $adb install -r $apkPath

# Launch the app
$package = "com.sjnh.inventoryscanner"
$activity = ".MainActivity"
Write-Host "[INFO] Launching $package/$activity ..."
& $adb shell am start -n "$package/$activity"

Write-Host "[SUCCESS] Install + launch complete!"
