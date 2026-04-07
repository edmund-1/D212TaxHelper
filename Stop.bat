@echo off
echo Stopping ANAF Financial Dashboard...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo Killing process %%a on port 3000...
    taskkill /f /pid %%a 2>nul
)
echo Done.
timeout /t 2 /nobreak >nul
