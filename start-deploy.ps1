$ErrorActionPreference = "SilentlyContinue"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$guide = Join-Path $root "docs\deploy-start.html"
$renderUrl = "https://dashboard.render.com/register"

function Open-Url([string]$target) {
    if ([string]::IsNullOrWhiteSpace($target)) { return }
    Start-Process $target
}

Write-Host ""
Write-Host "Opening browser..." -ForegroundColor Cyan

if (Test-Path $guide) {
    Open-Url $guide
    Start-Sleep -Seconds 1
}

Open-Url $renderUrl

Write-Host ""
Write-Host "If browser did not open, copy these links:" -ForegroundColor Yellow
Write-Host $renderUrl
if (Test-Path $guide) { Write-Host "file:///$($guide -replace '\\','/')" }
Write-Host ""
Write-Host "1) On the page, click the GitHub button (top of page)" -ForegroundColor Green
Write-Host "2) New + -> Blueprint -> hotel-management" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to close"
