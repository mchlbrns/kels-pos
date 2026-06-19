@echo off
echo ===================================================
echo KELS POS - Production Environment Runner
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

echo [INFO] Building the production bundle...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Production build failed.
    pause
    exit /b 1
)

echo.
echo [INFO] Production build compiled successfully.
echo [INFO] Starting KELS POS Production Server on port 3000 (accessible on local network)...
echo.
call npm run start:prod
