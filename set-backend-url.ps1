param([string]$Url)

if (-not $Url) {
  Write-Host "Usage: .\set-backend-url.ps1 -Url http://192.168.x.x:5000" -ForegroundColor Yellow
  exit 1
}

# Normalize (strip trailing slash)
if ($Url.EndsWith("/")) { $Url = $Url.TrimEnd("/") }

# Update app.json (expo.extra.backendUrl)
$appJsonPath = "app.json"
if (Test-Path $appJsonPath) {
  $json = Get-Content $appJsonPath -Raw | ConvertFrom-Json
  if (-not $json.expo) { $json | Add-Member -NotePropertyName expo -NotePropertyValue (@{}) }
  if (-not $json.expo.extra) { $json.expo | Add-Member -NotePropertyName extra -NotePropertyValue (@{}) }
  $json.expo.extra.backendUrl = $Url
  $json | ConvertTo-Json -Depth 10 | Set-Content $appJsonPath -Encoding UTF8
  Write-Host "Updated app.json → expo.extra.backendUrl = $Url" -ForegroundColor Green
} else {
  Write-Host "WARNING: app.json not found." -ForegroundColor Yellow
}

# Also update src/config.ts if present (optional)
$configPath = "src\config.ts"
if (Test-Path $configPath) {
  $content = Get-Content $configPath -Raw
  $content = [regex]::Replace($content, "(https?://[^'\"`]+:\d+)", $Url)
  Set-Content $configPath $content -Encoding UTF8
  Write-Host "Updated src\config.ts default URL where possible." -ForegroundColor Green
}

Write-Host "Done." -ForegroundColor Cyan
