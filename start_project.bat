@echo off
chcp 65001 > nul
title Ensilados Santa Cruz - Master Launcher

echo ======================================================================
echo           ENSILADOS SANTA CRUZ - LANZADOR MAESTRO DEL SISTEMA
echo ======================================================================
echo  1. Iniciando Backend FastAPI (Puerto 8001)...
echo  2. Iniciando Frontend Vite / React (Puerto 5173)...
echo  3. Levantando Túnel Cloudflare (ensilados.cherry.lat)...
echo ======================================================================
echo.

cd /d "%~dp0"

:: 1. Iniciar Backend FastAPI
echo [*] Levantando Servidor Backend FastAPI...
start "Backend - FastAPI Ensilados Santa Cruz" cmd /k "cd /d "%~dp0backend" && .\venv\Scripts\Activate.bat && uvicorn main:app --host 127.0.0.1 --port 8001 --reload"

:: Pausa breve para permitir la conexión inicial a Supabase
timeout /t 3 /nobreak > nul

:: 2. Iniciar Frontend React + Vite
echo [*] Levantando Servidor Frontend React...
start "Frontend - React Vite Ensilados Santa Cruz" cmd /k "cd /d "%~dp0frontend" && npm run dev -- --port 5173 --host 127.0.0.1"

:: Pausa breve para arranque del servidor Vite
timeout /t 3 /nobreak > nul

:: 3. Iniciar Túnel Cloudflared
echo [*] Conectando Túnel Cloudflare para ensilados.cherry.lat y ensiladosapi.cherry.lat...
start "Cloudflare Tunnel - Ensilados" cmd /k "cloudflared tunnel --config "%~dp0tunnel_config.yml" run aa6a7b0e-c401-42b6-9189-94e6fd7ff7b0"

echo.
echo ======================================================================
echo  SISTEMA OPERATIVO Y DISPONIBLE:
echo   - Web Pública:         https://ensilados.cherry.lat
echo   - API & Swagger Docs:  https://ensiladosapi.cherry.lat/docs
echo   - Local Frontend:      http://127.0.0.1:5173
echo   - Local Backend:       http://127.0.0.1:8001/docs
echo ======================================================================
echo Puedes minimizar esta ventana. Para cerrar el sistema, cierra las terminales abiertas.
pause
