@echo off
chcp 65001 >nul
title SX Workforce - firemna aplikacia (prenosna verzia)
cd /d "%~dp0"
echo ============================================================
echo  SX Workforce - firemna aplikacia (prenosna verzia, bez instalacie)
echo ============================================================
echo.
if not exist node mkdir node
if not exist node\node.exe (
  echo Node.js este nie je v priecinku "node". Stahujem jeden subor node.exe z nodejs.org (cca 85 MB, iba prvykrat)...
  curl -L -# -o node\node.exe https://nodejs.org/dist/v22.22.0/win-x64/node.exe
  if not exist node\node.exe (
    echo.
    echo Stiahnutie zlyhalo. Stiahnite subor https://nodejs.org/dist/v22.22.0/win-x64/node.exe rucne,
    echo ulozte ho do priecinka "node" vedla tohto suboru a spustite SPUSTIT.bat znova.
    pause
    exit /b 1
  )
  echo Hotovo.
)
if not exist data\app.db (
  set /p DEMO="Nacitat ukazkove data - vzorova firma? [A/N]: "
  if /i "%DEMO%"=="A" node\node.exe --no-warnings=ExperimentalWarning scripts\demo.js
)
echo.
echo Spustam aplikaciu na http://localhost:3000
echo Prihlasenie: admin / admin   (pri ukazke aj kancelaria, dispecer, uctovnik / demo1234)
echo Toto okno nechajte otvorene. Ukoncenie: zavrite okno alebo stlacte Ctrl+C.
echo.
start "" "http://localhost:3000"
node\node.exe --no-warnings=ExperimentalWarning server.js
pause
