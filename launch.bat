@echo off
title Email Assistant AI Prototype
color 0B
cls
echo ========================================================
echo         Launching AI Email Assistant (Node.js)
echo ========================================================
echo.
cd /d "%~dp0"

:: Check if Node is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not found in your PATH.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b
)

:: Start local server in the background and launch browser
echo Starting local prototype server at http://localhost:3000 ...
start "" node server.js

:: Wait 2 seconds for server boot
timeout /t 2 /nobreak >nul

:: Open browser automatically
echo Opening Email Assistant interface in your browser...
start http://localhost:3000

echo.
echo Application is running! Keep this window open while using the app.
echo Press Ctrl+C or close this window to stop the server.
echo ========================================================
echo.
node server.js
pause
