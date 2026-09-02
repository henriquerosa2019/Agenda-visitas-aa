@echo off
chcp 65001 >nul
cd /d "C:\PROJETOS IA\AGENDA CTO"

:: Garante o Node.js no PATH do Windows Task Scheduler
set "PATH=C:\Program Files\nodejs;%PATH%"

set "NODE_BIN=C:\Program Files\nodejs\node.exe"
set "TARGET_SCRIPT=C:\PROJETOS IA\AGENDA CTO\scripts\analyze-visits.mjs"
set "LOG_FILE=C:\PROJETOS IA\AGENDA CTO\analise_execucao.log"

echo =================================================== >> "%LOG_FILE%"
echo Execucao em: %date% as %time% >> "%LOG_FILE%"
echo =================================================== >> "%LOG_FILE%"

if exist "%NODE_BIN%" (
    "%NODE_BIN%" --dns-result-order=ipv4first "%TARGET_SCRIPT%" >> "%LOG_FILE%" 2>&1
) else (
    node --dns-result-order=ipv4first "%TARGET_SCRIPT%" >> "%LOG_FILE%" 2>&1
)

echo. >> "%LOG_FILE%"
