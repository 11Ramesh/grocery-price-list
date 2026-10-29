@echo off
title Sinhala Grocery Price List Local Server
cd /d "%~dp0"
echo ========================================================
echo    Sinhala Grocery Price List - Local Web Server
echo ========================================================
echo.
echo Server eka start wemin pawathi...
echo Browser eka auto open wei: http://localhost:8080
echo.
echo [Wadagath]: Me black window eka close karanna epa.
echo Server stop karanna one nam me window eka close karanna.
echo ========================================================
echo.

start "" "http://localhost:8080"
python -m http.server 8080

pause

