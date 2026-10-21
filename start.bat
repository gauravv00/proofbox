@echo off
setlocal enabledelayedexpansion

title ProofBox - Legal Evidence Organiser
color 0F

echo ==============================================================
echo   PROOFBOX - Legal Evidence Organiser
echo   A personal evidence-management platform for everyday disputes
echo ==============================================================
echo.

cd /d "%~dp0"

:: 1. Check if node_modules exists, if not run npm install
if not exist "node_modules\" (
    echo [!] Dependencies not found. Running npm install...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] npm install failed. Please check your Node environment.
        pause
        exit /b %ERRORLEVEL%
    )
    echo [+] Dependencies installed successfully.
) else (
    echo [+] Dependencies already installed.
)

:: 2. Open browser to http://localhost:3001
echo [+] Opening browser to http://localhost:3001 ...
timeout /t 2 /nobreak >nul
start "" http://localhost:3001

:: 3. Start the backend
echo [+] Starting ProofBox API server on http://localhost:3001 ...
node backend/server.js

pause
