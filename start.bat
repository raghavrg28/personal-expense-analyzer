@echo off
title Personal Expense Analyzer
cd /d "%~dp0"

echo =======================================================
echo    Personal Expense Analyzer - One-Click Launcher
echo =======================================================
echo.

:: 1. Check C++ Engine Binary
if not exist "cpp_engine\expense_engine.exe" (
    echo [*] Compiling C++ High-Performance DSA Engine...
    where g++ >nul 2>&1
    if %errorlevel% neq 0 (
        echo [!] Warning: g++ not found on PATH. Attempting to run without recompilation.
    ) else (
        g++ -std=c++14 -O2 cpp_engine\expense_engine.cpp -o cpp_engine\expense_engine.exe
        if %errorlevel% equ 0 (
            echo [+] C++ DSA Engine compiled successfully!
        ) else (
            echo [!] C++ compilation failed. Python fallback may be used.
        )
    )
) else (
    echo [+] C++ DSA Engine ready!
)

:: 2. Launch Server and Open Web App
echo [*] Starting Python API Server and Launching Dashboard in your browser...
echo [*] URL: http://localhost:5000
echo.
python backend\server.py

pause
