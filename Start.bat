@echo off
title D212 Tax Helper
echo.
echo   ===================================
echo    D212 Tax Helper
echo    Starting server...
echo   ===================================
echo.

cd /d "%~dp0"
start /min "" node server.js
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo   Server running at http://localhost:3000
echo   Use Stop.bat to stop the server.
echo.
exit
