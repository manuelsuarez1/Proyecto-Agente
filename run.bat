@echo off
cd /d "%~dp0"

REM Verificar si node_modules existe
if not exist "node_modules" (
  echo Instalando dependencias...
  npm install
)

echo Iniciando Agent App...
echo.
echo Para detener la aplicación, presiona Ctrl+C
echo.

npm run start