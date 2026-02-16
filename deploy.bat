@echo off
echo 🚀 Deploying Vartica Food Delivery App to Vercel...
echo.

REM Check if Vercel CLI is installed
vercel --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Vercel CLI not found. Installing...
    npm install -g vercel
)

REM Login to Vercel (if not already logged in)
echo 🔐 Checking Vercel login status...
vercel whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo 🔑 Please login to Vercel:
    vercel login
)

REM Deploy to production
echo 🚀 Deploying to production...
vercel --prod

echo.
echo ✅ Deployment completed!
echo 🌐 Your app is now live at: https://vartica-food-delivery-app.vercel.app
echo.
pause