@echo off
chcp 65001 >nul
title Parabenizacao Final de Mes A.A. - 12o Passo
cd /d "%~dp0"

echo ====================================================================
echo   🎉 ESCALA DE VISITAS A.A. — PARABENIZAÇÃO FINAL DE MÊS (12º PASSO)
echo ====================================================================
echo.
echo Disparando e-mail comemorativo para as contas cadastradas no Brevo...
echo.

node --dns-result-order=ipv4first scripts/analyze-visits.mjs --end-of-month

echo.
echo ====================================================================
echo   ✅ Execução concluída. Pressione qualquer tecla para fechar...
echo ====================================================================
pause >nul
