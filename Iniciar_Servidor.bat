@echo off
cd /d "%~dp0"
echo Iniciando servidor local para la PWA...
start http://localhost:8000
py -m http.server 8000
