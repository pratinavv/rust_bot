@echo off
setlocal
cd /d "%~dp0"

if not exist ".env" (
    echo Could not find .env
    pause
    exit /b 1
)

for /f "usebackq eol=# tokens=1,* delims==" %%a in (".env") do set "%%a=%%b"
if not defined RPP_DISCORD_CLIENT_ID goto missing
if not defined RPP_DISCORD_TOKEN goto missing

title pratinavv
call npm start run
pause
exit /b

:missing
echo Add the Discord Application ID and bot token to .env, then run this again.
pause
exit /b 1
