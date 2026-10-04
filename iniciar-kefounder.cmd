@echo off
REM Inicia KeFounder! en http://localhost:3000 (compila el frontend si hace falta).
cd /d "%~dp0"
if not exist node_modules (
  echo Instalando dependencias...
  call npm install
)
if not exist dist\index.html (
  echo Compilando el frontend...
  call npm run build
)
if not defined KEFOUNDER_DEMO set KEFOUNDER_DEMO=1
call npm start
pause
