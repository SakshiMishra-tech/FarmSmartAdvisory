@echo off
echo 🌾 FarmWise - Starting the main app
echo ==================================

if not exist "package.json" (
    echo ❌ package.json not found in the project root
    pause
    exit /b 1
)

npm install --legacy-peer-deps
npm run dev