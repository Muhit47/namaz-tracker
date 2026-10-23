@echo off
title Namaz Tracker Server
cd /d "%~dp0"

echo ========================================================
echo             Starting Namaz Tracker Server...
echo ========================================================
echo.

:: Allow phone/other devices on the same Wi-Fi to connect
set HOST=0.0.0.0
set PORT=5000

:: Check Python installation
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3 from https://www.python.org/
    pause
    exit /b 1
)

:: Ensure requirements are installed
if exist requirements.txt (
    pip show flask >nul 2>&1
    if errorlevel 1 (
        echo [Setup] First-time setup: Installing required packages...
        pip install -r requirements.txt
        echo.
    )
)

:: Free port 5000 if previously hung
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do (
    echo [Port] Closing previous instance PID %%a
    taskkill /F /PID %%a >nul 2>&1
)

:: Show PC IP address for phone access
echo [Phone] Open one of these on your phone (same Wi-Fi):
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /C:"IPv4"') do (
    for /f "tokens=*" %%j in ("%%i") do echo         http://%%j:5000
)
echo.

:: Open browser automatically
start "" http://127.0.0.1:5000

:: Start server
python server.py

pause
