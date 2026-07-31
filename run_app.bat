@echo off
SET PATH=C:\Program Files\nodejs;%PATH%
cd /d "C:\appimobiliario"
echo Iniciando Jobh Imoveis Manager (Modo Desktop)...
call npm run electron:dev
