param([string]$Profile = "preview")

# Ensure EAS CLI is available
if (-not (Get-Command eas -ErrorAction SilentlyContinue)) {
  Write-Host "Installing EAS CLI globally..." -ForegroundColor Cyan
  npm i -g eas-cli
}

Write-Host "Logging in to Expo (if needed)..." -ForegroundColor Cyan
eas login

Write-Host "Starting EAS build (Android, profile: $Profile)..." -ForegroundColor Cyan
eas build -p android --profile $Profile
