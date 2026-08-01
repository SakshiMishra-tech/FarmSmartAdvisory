@echo off
echo 🌾 FarmSmart Voice Assistant - Starting Services
echo ================================================

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    pause
    exit /b 1
)

REM Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed or not in PATH
    pause
    exit /b 1
)

echo ✅ Python and Node.js are available

REM Start Backend
echo 🚀 Starting Backend Server...
cd backend
if exist "start_backend.py" (
    start "Backend Server" python start_backend.py
) else (
    start "Backend Server" python app.py
)
cd ..

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start Frontend
echo 🎨 Starting Frontend Application...
cd client
if exist "package.json" (
    start "Frontend Server" cmd /k "npm install && npm run dev"
) else (
    echo ❌ Frontend not found in client directory
    pause
    exit /b 1
)
cd ..

echo.
echo ✅ Services started successfully!
echo 📍 Backend API: http://localhost:8000
echo 📍 Frontend App: http://localhost:3000
echo 📖 API Documentation: http://localhost:8000/docs
echo.
echo Press any key to stop all services
pause >nul

REM Kill background processes
taskkill /f /im python.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1
echo 🛑 Services stopped