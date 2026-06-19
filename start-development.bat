@echo off
echo ===================================================
echo KELS POS - Development Environment Runner
echo ===================================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/ and try again.
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist node_modules (
    echo [INFO] Installing project dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

echo.
echo [INFO] Starting KELS POS Development Server on port 3000 (accessible on local network)...
echo.
call npm run dev
