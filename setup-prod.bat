@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ====================================================
echo    GPSOFT Store ^& Enterprise - Production Setup
echo ====================================================

:: 1. Kiem tra Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js chua duoc cai dat. Vui long cai dat Node.js (v18+) truoc khi tiep tuc.
    pause
    exit /b 1
)

echo [1/5] Kiem tra phien ban moi truong:
for /f "tokens=*" %%v in ('node -v') do echo  - Node.js: %%v
for /f "tokens=*" %%v in ('npm -v') do echo  - NPM: %%v

:: 2. Kiem tra file .env
if not exist ".env" (
    if exist ".env.example" (
        echo [2/5] Chua tim thay file .env. Dang tu dong tao tu .env.example...
        copy ".env.example" ".env" >nul
        echo [2/5] Da tao file .env mac dinh. Ban co the chinh sua cac bien moi truong neu can.
    ) else (
        echo [ERROR] Khong tim thay file .env hoac .env.example!
        pause
        exit /b 1
    )
) else (
    echo [2/5] Da phat hien file .env hop le.
)

:: 3. Cai dat thu vien
echo [3/5] Dang cai dat dependencies (npm install)...
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Cai dat thu vien that bai!
    pause
    exit /b %ERRORLEVEL%
)

:: 4. Build frontend production
echo [4/5] Dang bien dich frontend production (npm run build)...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Build frontend that bai!
    pause
    exit /b %ERRORLEVEL%
)

:: 5. Chay he thong o che do Production
echo ====================================================
echo  Build production thanh cong! Dang khoi chay he thong...
echo  Truy cap ung dung tai: http://localhost:3100
echo ====================================================

set NODE_ENV=production
call npm run start
