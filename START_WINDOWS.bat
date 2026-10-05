@echo off
setlocal
cd /d "%~dp0"

if not exist .env (
  copy .env.example .env >nul
  echo Created .env from .env.example
)

if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 goto :error
)

echo.
echo Starting Holosoft Website + CMS + API...
echo Website: http://localhost:5173
echo CMS:     http://localhost:5174
echo API:     http://localhost:8787/api/health
echo.
call npm run dev
goto :eof

:error
echo.
echo Setup failed. Check that Node.js 22.12+ and npm are installed and that npm can reach the package registry.
exit /b 1
