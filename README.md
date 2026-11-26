# AfterShot – bản Android (APK + cập nhật trong app)

App = web AfterShot đóng trong vỏ Capacitor. File web nằm sẵn trong APK (chạy offline).
Sau khi cài APK một lần, mọi chỉnh sửa trong thư mục `www/` sẽ tự cập nhật vào app, **không cần cài APK mới**.

## 1. Đưa lên GitHub (làm 1 lần)
1. Tạo repo mới trên GitHub, đặt **Public** (app tải bản cập nhật qua raw.githubusercontent.com nên repo phải public).
2. Upload toàn bộ nội dung thư mục này lên repo (kéo thả file/thư mục, nhớ cả thư mục `.github`).
   **Không** upload keystore.
3. Vào repo → Settings → Secrets and variables → Actions → New repository secret, tạo 2 secret (giá trị lấy trong `GITHUB-SECRETS.txt`):
   - `KEYSTORE_BASE64`
   - `KEYSTORE_PASSWORD`
4. Vào tab Actions → bật workflows nếu GitHub hỏi.

## 2. Build APK
- Actions → **Build APK** → Run workflow (hoặc push tag dạng `v1.0`).
- Chạy xong (khoảng 5–10 phút) vào **Releases** (hoặc Artifacts của lần chạy) tải `AfterShot-<phiên bản>.apk`, copy sang điện thoại và cài (bật "cài từ nguồn không rõ").
- Luôn dùng **cùng keystore** cho các lần build sau để cài đè được lên bản cũ.

## 3. Cập nhật app (không cần cài lại)
1. Sửa/thay file trong `www/` (ví dụ `index.html`, `looks.js`, `logos/…`) rồi commit lên nhánh chính.
2. Workflow **OTA** tự tạo lại `www/version.json`.
3. Mở app: tự kiểm tra (nếu quá 1 giờ kể từ lần trước), hoặc bấm **Kiểm tra cập nhật** ở chân trang. Hiện thanh "Đã tải bản mới" → bấm để tải lại.
- Raw GitHub có cache khoảng 5 phút, nên cập nhật có thể trễ vài phút.
- Bản cập nhật lỗi (báo lỗi JS trong 8 giây đầu) sẽ tự quay về bản gốc trong APK. Cũng có nút **Khôi phục bản gốc** ở chân trang, hoặc mở `…/?safe=1`.

## 4. Khi nào phải build APK mới
OTA chỉ thay file web. Cần build lại APK khi đổi: `sw.js`, `ota-config.js`, plugin/quyền Android, icon/splash, hoặc tính năng native.
Khi bản web mới cần tính năng native mới: tăng `aftershotShell` trong `package.json` và `shell` trong `www/ota-config.js` (và `minShell` sẽ tự lấy từ package.json). Bản app cũ sẽ báo cần cài APK mới thay vì tải bản web không tương thích.

## Lưu ý
- Lưu ảnh trên Android đi qua bảng chia sẻ (Share sheet) – chọn "Lưu vào thiết bị/Drive/Zalo…".
- Keystore là chìa khoá ký app. Mất nó = không cập nhật đè được APK cũ. Hãy sao lưu `aftershot-release.keystore` ở nơi an toàn, đừng đưa lên GitHub.
