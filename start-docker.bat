@echo off
echo Starting Docker Desktop...
echo.

REM Check if Docker Desktop is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker Desktop is not running. Starting it...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo Waiting for Docker Desktop to start (this may take a few minutes)...
    timeout /t 30 /nobreak >nul
) else (
    echo Docker Desktop is already running.
)

REM Wait for Docker to be ready
echo Checking Docker status...
:check_docker
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker is not ready yet. Waiting...
    timeout /t 5 /nobreak >nul
    goto check_docker
)

echo Docker is ready!
echo.
echo You can now run: docker-compose up -d
pause