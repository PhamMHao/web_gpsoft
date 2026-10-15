# GPSOFT Store & Enterprise CMS

Hệ thống bán lẻ thiết bị công nghệ & CMS giải pháp doanh nghiệp (Phần mềm chấm công, Thiết kế website, Tra cứu bảo hành, Quản trị đơn hàng).

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Production (Nhanh Nhất)

Sau khi `git clone https://github.com/PhamMHao/web_gpsoft.git`:

### 1. Cấu hình biến môi trường
Tạo file `.env` từ `.env.example`:
```bash
cp .env.example .env
```
*(Trên Windows có thể copy file `.env.example` và đổi tên thành `.env`)*

Chỉnh sửa các thông tin cấu hình trong `.env` nếu cần:
- `PORT`: Cổng máy chủ (mặc định: `3100`)
- `DB_DRIVER`: `sqlite` (mặc định, không cần cài thêm DB server), `mysql`, hoặc `mssql`
- `GEMINI_API_KEY`: API Key hỗ trợ tính năng AI (nếu có)

---

### 2. Chạy Script Tự Động (Tự động install + build + chạy Production)

Dự án đã chuẩn bị sẵn các script 1 chạm cho mọi hệ điều hành:

#### 🔹 Trên Windows (Khuyên dùng):
Chỉ cần nhấp đúp vào file **`setup-prod.bat`** hoặc mở Terminal chạy:
```cmd
setup-prod.bat
```
*Hoặc trên PowerShell:*
```powershell
.\setup-prod.ps1
```

#### 🔹 Trên Linux / macOS / Ubuntu Server:
Cấp quyền thực thi và chạy:
```bash
chmod +x setup-prod.sh
./setup-prod.sh
```

---

## 🔄 Cập Nhật Code Mới Trên Server (Auto-Update)

Khi bạn có commit mới trên GitHub và muốn cập nhật máy chủ mà không cần làm thủ công:

Chỉ cần mở **PowerShell** trong thư mục dự án và chạy:
```powershell
.\update-server.ps1
```

Script sẽ tự động:
1. Kéo code mới nhất từ GitHub (`git pull origin main`)
2. Cài đặt thêm thư viện mới nếu có (`npm install`)
3. Tự động build lại giao diện production (`npm run build`)
4. Khởi động lại dịch vụ server (tự động phát hiện PM2 hoặc giải phóng cổng 3100 để chạy bản mới).

---

## 🛠️ Chạy Thủ Công Bằng Lệnh (Manual)

Nếu bạn muốn tự chạy từng bước:

```bash
# 1. Cài đặt thư viện
npm install

# 2. Build giao diện production
npm run build

# 3. Khởi chạy server production
npm run prod
# Hoặc trên Windows PowerShell:
# $env:NODE_ENV="production"; npm run start
```

Mở trình duyệt truy cập: **`http://localhost:3100`**

---

## 💻 Chế Độ Phát Triển (Development)

Nếu bạn muốn sửa code với tính năng Live Reload & HMR tự động:

```bash
npm run dev
```

Truy cập:
- Website công khai: `http://localhost:3100`
- Quản trị CMS: `http://localhost:3100/login-admin` (Tài khoản mặc định: `admin` / `admin123`)
