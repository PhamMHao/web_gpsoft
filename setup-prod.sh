#!/bin/bash
set -e

# Màu sắc thông báo
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}   GPSOFT Store & Enterprise - Production Setup   ${NC}"
echo -e "${BLUE}====================================================${NC}"

# 1. Kiểm tra môi trường Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js chưa được cài đặt. Vui lòng cài đặt Node.js (v18+) trước.${NC}"
    exit 1
fi

echo -e "${GREEN}[1/5] Node.js version:${NC} $(node -v)"
echo -e "${GREEN}[1/5] NPM version:${NC} $(npm -v)"

# 2. Kiểm tra file cấu hình môi trường .env
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo -e "${YELLOW}[2/5] Chưa tìm thấy file .env! Đang tự động sao chép từ .env.example...${NC}"
        cp .env.example .env
        echo -e "${YELLOW}>> Đã tạo file .env từ .env.example. Vui lòng cập nhật các biến bí mật nếu cần.${NC}"
    else
        echo -e "${RED}[ERROR] Không tìm thấy file .env hoặc .env.example!${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}[2/5] Đã phát hiện file .env sẵn sàng.${NC}"
fi

# 3. Cài đặt toàn bộ dependencies
echo -e "${BLUE}[3/5] Đang cài đặt thư viện dependencies (npm install)...${NC}"
npm install

# 4. Build giao diện production
echo -e "${BLUE}[4/5] Đang build giao diện frontend production (npm run build)...${NC}"
npm run build

# 5. Khởi động hệ thống ở chế độ Production
echo -e "${GREEN}====================================================${NC}"
echo -e "${GREEN} Build production thành công! Đang khởi chạy hệ thống...${NC}"
echo -e "${GREEN} Hệ thống sẽ lắng nghe tại cổng cấu hình (mặc định: http://localhost:3100)${NC}"
echo -e "${GREEN}====================================================${NC}"

export NODE_ENV=production
npm run start
