@echo off
setlocal
cd /d "%~dp0"

if "%~1"=="" (
    set "ENV_FILE=.env"
) else (
    set "ENV_FILE=teams\%~1\.env"
    set "RPP_DATA_DIR=teams\%~1"
)

if not exist "%ENV_FILE%" (
    echo Could not find %ENV_FILE%
    pause
    exit /b 1
)

for /f "usebackq eol=# tokens=1,* delims==" %%a in ("%ENV_FILE%") do set "%%a=%%b"
if not defined RPP_DISCORD_CLIENT_ID goto missing
if not defined RPP_DISCORD_TOKEN goto missing

title %RPP_DISCORD_USERNAME%
call npm start run
pause
exit /b

:missing
echo Add the Discord Application ID and bot token to %ENV_FILE%, then run this again.
pause
exit /b 1
