@echo off
REM Deploy favorites functionality to Supabase

echo Deploying favorites functionality to Supabase...

REM Check if Supabase CLI is installed
where supabase >nul 2>&1
if %errorlevel% neq 0 (
    echo Supabase CLI not found. Please install it first:
    echo npm install -g supabase
    exit /b 1
)

REM Link to your Supabase project (if not already linked)
echo Linking to Supabase project...
supabase link

REM Deploy the migration
echo Deploying migration...
supabase db push

echo Deployment complete!
echo.
echo Next steps:
echo 1. Test the favorites functionality in your app
echo 2. Verify the new tables and functions exist in your Supabase dashboard
echo 3. Make sure RLS policies are working correctly