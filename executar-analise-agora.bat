@echo off
chcp 65001 >nul
title Análise de Visitas A.A.
cd /d "%~dp0"

echo ====================================================================
echo   📊 EXECUTANDO ANÁLISE DE VISITAS A.A. — CTO / CIT
echo ====================================================================
echo.

node --dns-result-order=ipv4first scripts/analyze-visits.mjs

echo.
echo ====================================================================
echo   ✅ Execução concluída. Pressione qualquer tecla para fechar...
echo ====================================================================
pause >nul
