@echo off
REM Quick Start Guide for NextStop Login & Register System (Windows)

echo.
echo 🚀 Starting NextStop Backend ^& Frontend
echo =========================================
echo.

REM Check if Node.js is installed
where /q node
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do (
    echo ✅ Node.js found: %%i
)

echo.
echo 📦 Starting Backend Server...
cd backend

if not exist "node_modules" (
    echo 📥 Installing backend dependencies...
    call npm install
)

start "Backend Server" cmd /k npm run dev
timeout /t 2 /nobreak

echo.
echo ⚛️  Starting Frontend Development Server...
cd ..
cd frontend

if not exist "node_modules" (
    echo 📥 Installing frontend dependencies...
    call npm install
)

start "Frontend Server" cmd /k npm run dev

echo.
echo =========================================
echo 🎉 NextStop is running!
echo.
echo 📍 Frontend:  http://localhost:5173
echo 📍 Backend:   http://localhost:3000
echo.
echo 🔗 Links:
echo    - Login:    http://localhost:5173/login
echo    - Register: http://localhost:5173/register
echo    - Dashboard: http://localhost:5173/admindashbord
echo.
echo Close the terminal windows to stop the servers
echo =========================================
echo.
pause
