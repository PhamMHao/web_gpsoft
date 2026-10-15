# ==============================================================================
# GPSOFT Store & Enterprise - Auto Update & Restart Script (Windows PowerShell)
# ==============================================================================
# Script này tự động:
# 1. Kéo code mới nhất từ GitHub branch main (git pull)
# 2. Cài đặt thêm thư viện dependencies mới nếu có (npm install)
# 3. Biên dịch lại giao diện frontend tối ưu cho production (npm run build)
# 4. Tự động kiểm tra và restart lại server (hỗ trợ cả PM2 hoặc chạy trực tiếp)
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "       GPSOFT STORE & ENTERPRISE - AUTO UPDATE SCRIPT             " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Kéo code mới nhất từ Git
Write-Host "[1/4] Đang kéo code mới nhất từ GitHub (git pull origin main)..." -ForegroundColor Yellow
try {
    git pull origin main
    Write-Host ">> Kéo code thành công!" -ForegroundColor Green
} catch {
    Write-Host "[LỖI] Không thể git pull! Vui lòng kiểm tra kết nối mạng hoặc xung đột git stash/commit." -ForegroundColor Red
    exit 1
}

# 2. Cài đặt dependencies nếu có thay đổi
Write-Host ""
Write-Host "[2/4] Đang kiểm tra & cập nhật thư viện (npm install)..." -ForegroundColor Yellow
try {
    npm install
    Write-Host ">> Thư viện đã được cập nhật đầy đủ!" -ForegroundColor Green
} catch {
    Write-Host "[LỖI] Quá trình npm install gặp sự cố!" -ForegroundColor Red
    exit 1
}

# 3. Build lại frontend production
Write-Host ""
Write-Host "[3/4] Đang biên dịch frontend production (npm run build)..." -ForegroundColor Yellow
try {
    npm run build
    Write-Host ">> Build frontend production hoàn tất (dist/)!" -ForegroundColor Green
} catch {
    Write-Host "[LỖI] Quá trình build frontend thất bại!" -ForegroundColor Red
    exit 1
}

# 4. Khởi động lại Server
Write-Host ""
Write-Host "[4/4] Đang khởi động lại dịch vụ máy chủ..." -ForegroundColor Yellow

# Kiểm tra xem máy chủ có đang quản lý qua PM2 hay không
if (Get-Command pm2 -ErrorAction SilentlyContinue) {
    Write-Host "Phát hiện PM2 trên hệ thống! Đang reload app 'gpsoft' qua PM2..." -ForegroundColor Cyan
    pm2 reload gpsoft 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "App 'gpsoft' chưa đăng ký trong PM2. Đang tạo mới và chạy production..." -ForegroundColor Yellow
        $env:NODE_ENV = "production"
        pm2 start server.ts --name gpsoft --node-args="--disable-warning=ExperimentalWarning --import tsx"
    }
    Write-Host ">> Dịch vụ đã được reload thành công qua PM2!" -ForegroundColor Green
} else {
    # Nếu không dùng PM2, tắt tiến trình cũ đang chiếm cổng 3100 (nếu có) và khởi chạy bản mới
    Write-Host "Đang kiểm tra và giải phóng cổng 3100 nếu có tiến trình cũ..." -ForegroundColor Cyan
    $portConnection = Get-NetTCPConnection -LocalPort 3100 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }
    if ($portConnection) {
        $pidsToKill = $portConnection | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($p in $pidsToKill) {
            Write-Host "Dừng tiến trình cũ PID: $p" -ForegroundColor Gray
            Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 1
    }

    Write-Host ">> Đang khởi động máy chủ Production mới..." -ForegroundColor Green
    Write-Host "Truy cập Website tại: http://localhost:3100" -ForegroundColor Cyan
    Write-Host "==================================================================" -ForegroundColor Cyan
    $env:NODE_ENV = "production"
    npm run start
}
