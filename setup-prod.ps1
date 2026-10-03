# Run GPSOFT in Production Mode
$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "   GPSOFT Store & Enterprise - Production Setup   " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# 1. Kiem tra Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js chua duoc cai dat. Vui long cai dat Node.js (v18+) truoc." -ForegroundColor Red
    exit 1
}

Write-Host "[1/5] Node.js version: $(node -v)" -ForegroundColor Green
Write-Host "[1/5] NPM version: $(npm -v)" -ForegroundColor Green

# 2. Kiem tra .env
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Write-Host "[2/5] Chua tim thay file .env! Dang tao tu .env.example..." -ForegroundColor Yellow
        Copy-Item ".env.example" ".env"
        Write-Host "[2/5] Da tao file .env." -ForegroundColor Yellow
    } else {
        Write-Host "[ERROR] Khong tim thay file .env hoac .env.example!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[2/5] Da phat hien file .env." -ForegroundColor Green
}

# 3. Cai dat thu vien
Write-Host "[3/5] Dang cai dat dependencies (npm install)..." -ForegroundColor Cyan
npm install

# 4. Build frontend production
Write-Host "[4/5] Dang build frontend production (npm run build)..." -ForegroundColor Cyan
npm run build

# 5. Khoi dong production
Write-Host "====================================================" -ForegroundColor Green
Write-Host " Build production thanh cong! Dang khoi dong..." -ForegroundColor Green
Write-Host " Website: http://localhost:3100" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green

$env:NODE_ENV = "production"
npm run start
