@echo off
echo ========================================================
echo   JOBH IMOVEIS MANAGER - PUBLICAR NOVA VERSAO
echo ========================================================
echo.
echo Este script vai:
echo 1. Gerar o executavel portatil (unico arquivo)
echo 2. Enviar automaticamente para o seu GitHub
echo.
echo Certifique-se de que voce atualizou a versao no package.json antes!
echo.
pause

set GH_TOKEN=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

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
