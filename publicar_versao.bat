@echo off
:: Carrega o token do arquivo publish.env
if exist publish.env (
    for /f "tokens=1,2 delims==" %%a in (publish.env) do (
        set %%a=%%b
    )
)

echo ========================================================
echo ========================================================
cd /d "%~dp0"
echo.
echo Este script vai:
echo 1. Commitar e enviar o codigo para o GitHub
echo 2. Incrementar a versao automaticamente
echo 3. Gerar o instalador e subir para o GitHub
echo.
pause

echo.
echo Salvando codigo no GitHub (Commit e Push)...
call git add .
call git commit -m "Auto-update: Versao automatica via script"
call git push origin main

echo.
echo Atualizando numero da versao...
:: Pega a versao nova para exibir no log
for /f "tokens=*" %%i in ('npm version patch --no-git-tag-version') do set NEW_VERSION=%%i

echo.
echo Iniciando Build e Publicacao da %NEW_VERSION%...
echo (Isso pode demorar alguns minutos)
echo.

:: Executa o build com o token carregado
call npm run electron:build -- --publish always

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   SUCESSO! Versao %NEW_VERSION% publicada no GitHub.
    echo   Seus usuarios receberao a atualizacao automaticamente.
    echo ========================================================
) else (
    echo.
    echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    echo   ERRO: Algo deu errado (Erro %ERRORLEVEL%).
    echo   Verifique se o token no publish.env e valido.
    echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
)

pause
