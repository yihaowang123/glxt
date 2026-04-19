@echo off
cd /d D:\GLXT\GLXT
echo Starting npm install...
call npm install
echo npm install finished with code: %ERRORLEVEL%
pause