@echo off
set SCRIPT_DIR=%~dp0
set TARGET_BAT=%SCRIPT_DIR%start.bat
set SHORTCUT_PATH=%USERPROFILE%\Desktop\Personal Expense Analyzer.lnk

powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%TARGET_BAT%'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.WindowStyle = 1; $s.Description = 'Personal Expense Analyzer'; $s.Save()"

echo [+] Desktop shortcut created successfully at:
echo     "%SHORTCUT_PATH%"
echo.
pause
