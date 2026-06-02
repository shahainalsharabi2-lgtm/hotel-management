@echo off
chcp 65001 >nul
echo فتح دليل النشر في المتصفح...
start "" "%~dp0docs\ابدأ-النشر-هنا.html"
start "" "https://dashboard.render.com/register/github"
echo.
echo 1) في المتصفح اضغط Sign in with GitHub
echo 2) بعد الدخول: New + ثم Blueprint ثم hotel-management
echo.
pause
