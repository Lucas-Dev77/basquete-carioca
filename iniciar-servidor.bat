@echo off
title Pelada Carioca - servidor local
cd /d "%~dp0"
echo.
echo  Pelada Carioca rodando em http://localhost:8000
echo  Feche esta janela ou pressione Ctrl+C para parar.
echo.
start "" http://localhost:8000
python -m http.server 8000
pause
