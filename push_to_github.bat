@echo off
title Push Personal Expense Analyzer to GitHub
cd /d "%~dp0"

echo ========================================================
echo    Push Personal Expense Analyzer to GitHub
echo ========================================================
echo.

set /p REPO_URL="Enter your GitHub Repository URL (e.g. https://github.com/username/repo-name.git): "

if "%REPO_URL%"=="" (
    echo [!] No URL entered. Aborting.
    pause
    exit /b 1
)

echo.
echo [*] Configuring remote origin...
git remote remove origin 2>nul
git remote add origin %REPO_URL%
git branch -M main

echo [*] Pushing to GitHub (A browser login window may open to authenticate)...
git push -u origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo [+] Successfully pushed to GitHub!
    echo [+] Your shareable link: %REPO_URL:.git=%
    echo ========================================================
) else (
    echo.
    echo [!] Push failed. Please verify the URL and your GitHub permissions.
)

echo.
pause
