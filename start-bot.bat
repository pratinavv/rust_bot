@echo off
cd /d "%~dp0"
for /f "usebackq eol=# tokens=1,* delims==" %%a in (".env") do set "%%a=%%b"
if not defined RPP_DISCORD_CLIENT_ID goto missing
if not defined RPP_DISCORD_TOKEN goto missing
call npm start run
pause
exit /b

:missing
echo Add your Discord Application ID and bot token to the .env file, then run this again.
pause
exit /b 1
