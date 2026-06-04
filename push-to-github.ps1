# رفع المشروع إلى GitHub (مرة واحدة — يحتاج Personal Access Token)
# أنشئ التوكن من: GitHub → Settings → Developer settings → Personal access tokens → repo

$ErrorActionPreference = "Stop"

$gitPaths = @(
    "C:\Program Files\Git\cmd",
    "$env:LOCALAPPDATA\PortableGit\cmd"
)
foreach ($p in $gitPaths) {
    if (Test-Path $p) { $env:Path = "$p;$env:Path"; break }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Git غير مثبت. ثبّته من https://git-scm.com/download/win ثم أعد تشغيل هذا السكربت." -ForegroundColor Red
    exit 1
}

Set-Location $PSScriptRoot

if (-not (Test-Path .git)) {
    Write-Host "لا يوجد مستودع git هنا. شغّل من مجلد المشروع." -ForegroundColor Red
    exit 1
}

$user = "shahainalsharabi2-lgtm"
$repo = "hotel-management"
Write-Host ""
Write-Host "سجّل الدخول بحساب: $user" -ForegroundColor Cyan
Write-Host "الصق Personal Access Token (لن يظهر أثناء الكتابة):" -ForegroundColor Yellow
$secure = Read-Host -AsSecureString
$token = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
)
if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "لم يُدخل توكن." -ForegroundColor Red
    exit 1
}

$pushUrl = "https://${user}:$token@github.com/${user}/${repo}.git"
Write-Host "جاري الرفع..." -ForegroundColor Green
git -c credential.helper= push $pushUrl main
if ($LASTEXITCODE -ne 0) {
    Write-Host "فشل الرفع. تحقق من التوكن وصلاحية repo." -ForegroundColor Red
    exit $LASTEXITCODE
}

git branch --set-upstream-to=origin main 2>$null
git remote set-url origin "https://github.com/${user}/${repo}.git"
Write-Host "تم الرفع بنجاح إلى https://github.com/${user}/${repo}" -ForegroundColor Green
