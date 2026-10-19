@echo off
title Share Personal Expense Analyzer Online
cd /d "%~dp0"

echo ========================================================
echo    Generate Instant Live Public Link for Others
echo ========================================================
echo.
echo [*] Step 1: Making sure local server is running...
tasklist /FI "IMAGENAME eq python.exe" 2>NUL | find /I /N "python.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [+] Server is already running on port 5000!
) else (
    echo [*] Starting server in background...
    start /B python backend\server.py --no-open
    timeout /t 2 /nobreak >nul
)

echo.
echo [*] Step 2: Generating free public link via localtunnel...
echo [*] Share the generated URL below with anyone!
echo [*] Press Ctrl+C anytime to stop sharing.
echo ========================================================
echo.

npx localtunnel --port 5000

pause
