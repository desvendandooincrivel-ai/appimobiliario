@echo off
SET PATH=C:\Program Files\nodejs;%PATH%
cd /d "C:\appimobiliario"
echo Instalando dependencias...
call npm install --no-fund --no-audit
echo Iniciando servidor...
call npm run dev
