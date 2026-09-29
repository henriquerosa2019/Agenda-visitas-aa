@echo off
chcp 65001 >nul
title Agendar Relatório Diário de Visitas A.A. (08:00)
cd /d "%~dp0"

echo ====================================================================
echo   ⏰ CONFIGURANDO TAREFA AGENDADA NO WINDOWS (DIARIAMENTE ÀS 08:00)
echo ====================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\agendar-tarefa-windows.ps1"

echo.
echo ====================================================================
echo   ✅ Concluído! Pressione qualquer tecla para sair...
echo ====================================================================
pause >nul
