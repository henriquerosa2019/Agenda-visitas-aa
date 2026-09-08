@echo off
chcp 65001 >nul
title Testes Autônomos — Agenda de Visitas A.A.
cd /d "%~dp0"

echo ====================================================================
echo   🤖 EXECUÇÃO AUTÔNOMA DE TESTES PLAYWRIGHT COM LOGS
echo ====================================================================
echo.

node scripts/run-autonomous-tests.mjs

echo.
echo ====================================================================
echo   Logs gravados em: testes_execucao.log e TEST_REPORT.md
echo ====================================================================
pause >nul
