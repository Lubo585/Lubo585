@echo off
chcp 65001 >nul
title SX Workforce - firemna aplikacia
cd /d "%~dp0"
echo ============================================================
echo  SX Workforce - firemna aplikacia
echo ============================================================
echo.
where node >nul 2>&1
if %errorlevel% equ 0 goto :havenode
echo Node.js nie je nainstalovany. Instalujem Node.js 22 LTS cez winget...
winget install --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements -h
if %errorlevel% neq 0 (
  echo.
  echo Automaticka instalacia zlyhala. Stiahnite Node.js z https://nodejs.org (LTS), nainstalujte a spustite tento subor znova.
  echo Alternativa bez instalacie: prenosna verzia so SPUSTIT.bat.
  pause
  exit /b 1
)
echo Node.js nainstalovany. Zatvorte toto okno a spustite START.bat znova, aby sa nacitala nova cesta.
pause
exit /b 0

:havenode
for /f "delims=" %%v in ('node -v') do echo Node.js %%v najdeny.
if exist node_modules goto :deps_ok
echo Instalujem zavislosti aplikacie (iba prvykrat, cca 1 minuta)...
call npm install --omit=dev
if %errorlevel% neq 0 (
  echo Instalacia zlyhala.
  pause
  exit /b 1
)

:deps_ok
if exist data\app.db goto :run
echo.
set /p DEMO=Nacitat ukazkove data - vzorova firma? [A/N]: 
if /i "%DEMO%"=="A" call npm run demo
if /i "%DEMO%"=="Y" call npm run demo

:run
echo.
echo Spustam aplikaciu... Prihlasenie: admin / admin  (kancelaria, dispecer, uctovnik / demo1234 pri ukazke)
echo Okno nechajte otvorene, aplikacia bezi kym ho nezavriete (Ctrl+C ukonci).
echo.
start "" cmd /c "timeout /t 3 >nul & start "" http://localhost:3000"
call npm start
pause
