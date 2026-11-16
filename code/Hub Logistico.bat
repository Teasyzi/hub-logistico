@echo off
rem Abre o Hub Logistico no navegador. Feche esta janela para parar o servidor.
cd /d "%~dp0"
set PYTHONDONTWRITEBYTECODE=1
python -B hub.py servir
pause
