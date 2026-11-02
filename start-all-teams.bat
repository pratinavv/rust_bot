@echo off
cd /d "%~dp0"
for /d %%t in (teams\*) do start "%%~nxt" cmd /c start-bot.bat "%%~nxt"
