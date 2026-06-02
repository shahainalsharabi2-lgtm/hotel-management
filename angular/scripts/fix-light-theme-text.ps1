# Fix white text on light backgrounds; preserve on colored surfaces & primary buttons
$root = Join-Path $PSScriptRoot '..\src\app'
$files = Get-ChildItem $root -Recurse -Filter '*.css'

$keepWhitePattern = '(login-btn|btn-save-settings\.primary|\.add-btn|\.btn\.primary|submit-btn|rooms-dev-card--|room-scene--|tone-green|tone-occ|tone-soil|tone-booked|tone-depart|tone-maint|tone-halt|tone-bkdirty|tone-checkout|mode-switch button\.active|mode-switch button:hover|currency-preview-card|currency-preview-amount|currency-preview-badge|btn-mini-save)'

foreach ($file in $files) {
  $lines = Get-Content $file.FullName -Encoding UTF8
  $changed = $false
  $out = foreach ($line in $lines) {
    $n = $line
    if ($line -notmatch $keepWhitePattern) {
      if ($line -match 'color:\s*#fff\b') {
        $n = $line -replace 'color:\s*#fff\b', 'color: var(--app-text)'
        $changed = $true
      }
      if ($line -match 'color:\s*white\b') {
        $n = $line -replace 'color:\s*white\b', 'color: var(--app-text)'
        $changed = $true
      }
      if ($line -match 'color:\s*rgba\(255,\s*255,\s*255,\s*0\.([0-9]+)\)') {
        $n = $line -replace 'color:\s*rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)', 'color: var(--app-text-muted)'
        $changed = $true
      }
    }
    $n
  }
  if ($changed) {
    Set-Content $file.FullName ($out -join "`n") -Encoding UTF8 -NoNewline
    Write-Host "fixed: $($file.Name)"
  }
}
