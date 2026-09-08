@echo off
chcp 65001 >nul
title Testes Playwright — Agenda de Visitas A.A.
cd /d "%~dp0"

echo ====================================================================
echo   🎭 EXECUTANDO TESTES PLAYWRIGHT — AGENDA DE VISITAS A.A.
echo ====================================================================
echo.

if not exist "node_modules\@playwright\test" (
    echo [1/2] Instalando @playwright/test no projeto...
    call npm install -D @playwright/test
    echo [2/2] Baixando navegador Chromium do Playwright...
    call npx playwright install chromium
)

echo Executando testes automatizados...
call npx playwright test

echo.
echo ====================================================================
echo   ✅ Testes finalizados. Pressione qualquer tecla para fechar...
echo ====================================================================
pause >nul
