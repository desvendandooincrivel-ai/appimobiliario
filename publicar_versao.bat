@echo off
echo ========================================================
echo ========================================================
cd /d "%~dp0"
echo.
echo Este script vai:
echo 1. INCREMENTAR a versao automaticamente (ex: 0.1.0 -^> 0.1.1)
echo 2. Gerar o novo instalador
echo 3. Enviar para o GitHub
echo.
pause

set GH_TOKEN=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

echo.
echo Salvando codigo no GitHub (Commit & Push)...
call git add .
call git commit -m "Auto-update: Versao automatica via script"
call git push origin main

echo.
echo Atualizando numero da versao...
call npm version patch --no-git-tag-version

echo.
echo Iniciando Build e Publicacao...
echo (Isso pode demorar alguns minutos)
echo.

call npm run electron:build -- --publish always

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   SUCESSO! Versao publicada no GitHub.
    echo   Seus usuarios receberao a atualizacao automaticamente.
    echo ========================================================
) else (
    echo.
    echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    echo   ERRO: Algo deu errado. Verifique as mensagens acima.
    echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
)

pause
