# Personal Expense Analyzer - PowerShell Launcher
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "   Personal Expense Analyzer - One-Click Launcher      " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

$CppExe = Join-Path $ScriptDir "cpp_engine\expense_engine.exe"
$CppSrc = Join-Path $ScriptDir "cpp_engine\expense_engine.cpp"

if (-not (Test-Path $CppExe)) {
    Write-Host "[*] Compiling C++ High-Performance DSA Engine..." -ForegroundColor Yellow
    if (Get-Command g++ -ErrorAction SilentlyContinue) {
        g++ -std=c++14 -O2 $CppSrc -o $CppExe
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[+] C++ DSA Engine compiled successfully!" -ForegroundColor Green
        } else {
            Write-Host "[!] C++ compilation returned exit code $LASTEXITCODE" -ForegroundColor Red
        }
    } else {
        Write-Host "[!] g++ compiler not found in PATH." -ForegroundColor Yellow
    }
} else {
    Write-Host "[+] C++ DSA Engine ready!" -ForegroundColor Green
}

Write-Host "[*] Launching Personal Expense Analyzer in your default browser..." -ForegroundColor Cyan
python backend\server.py
