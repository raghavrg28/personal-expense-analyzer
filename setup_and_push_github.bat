@echo off
title Publish Personal Expense Analyzer to GitHub
cd /d "%~dp0"

set "GH_PATH=C:\Program Files\GitHub CLI\gh.exe"

echo ========================================================
echo    One-Click GitHub Repository Creator and Publisher
echo ========================================================
echo.

if not exist "%GH_PATH%" (
    echo [!] GitHub CLI not found at default location.
    pause
    exit /b 1
)

:: Check if already logged in
"%GH_PATH%" auth status >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [*] Step 1: Connecting your GitHub account...
    echo [*] A browser window will open. Enter the code shown below to authorize.
    echo.
    "%GH_PATH%" auth login --web --git-protocol https
) else (
    echo [+] GitHub account is already connected!
)

echo.
echo [*] Step 2: Creating public repository 'personal-expense-analyzer' on your GitHub...
echo.

:: Try to create and push repo directly
"%GH_PATH%" repo create personal-expense-analyzer --public --source=. --remote=origin --push

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo [+] SUCCESS! Your project is now published on GitHub!
    echo ========================================================
    echo.
    "%GH_PATH%" repo view --web
) else (
    echo.
    echo [*] If the repository already exists, pushing changes...
    git push -u origin main
    "%GH_PATH%" repo view --web
)

echo.
pause
