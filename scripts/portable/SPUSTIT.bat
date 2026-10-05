@echo off
chcp 65001 >nul
title SX Workforce - firemna aplikacia (prenosna verzia)
cd /d "%~dp0"
echo ============================================================
echo  SX Workforce - firemna aplikacia (prenosna verzia, bez instalacie)
echo ============================================================
echo.
if not exist node mkdir node
if not exist node\node.exe goto :download
for %%F in (node\node.exe) do if %%~zF LSS 50000000 (
  echo Subor node.exe je neuplny, stiahnem ho znova.
  del /q node\node.exe
)
if exist node\node.exe goto :havenode

:download
echo Node.js este nie je v priecinku "node". Stahujem jeden subor node.exe z nodejs.org (cca 82 MB, iba prvykrat)...
curl -L -# -o node\node.exe https://nodejs.org/dist/v22.22.0/win-x64/node.exe
if not exist node\node.exe goto :dlfail
for %%F in (node\node.exe) do if %%~zF LSS 50000000 goto :dlfail
echo Hotovo.

:havenode
if exist data\app.db goto :run
echo.
set /p DEMO=Nacitat ukazkove data - vzorova firma? [A/N]: 
if /i "%DEMO%"=="A" node\node.exe --no-warnings=ExperimentalWarning scripts\demo.js
if /i "%DEMO%"=="Y" node\node.exe --no-warnings=ExperimentalWarning scripts\demo.js

:run
echo.
echo Spustam aplikaciu na http://localhost:3000
echo Prihlasenie: admin / admin   (pri ukazke aj kancelaria, dispecer, uctovnik / demo1234)
echo Toto okno nechajte otvorene. Ukoncenie: zavrite okno alebo stlacte Ctrl+C.
echo.
start "" cmd /c "timeout /t 3 >nul & start "" http://localhost:3000"
node\node.exe --no-warnings=ExperimentalWarning server.js
pause
goto :eof

:dlfail
echo.
echo Stiahnutie zlyhalo. Stiahnite subor https://nodejs.org/dist/v22.22.0/win-x64/node.exe rucne,
echo ulozte ho do priecinka "node" vedla tohto suboru a spustite SPUSTIT.bat znova.
pause
exit /b 1
