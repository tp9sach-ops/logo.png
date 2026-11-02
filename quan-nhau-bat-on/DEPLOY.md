# Triển khai chạy thử

Dự án là ứng dụng Node.js có HTTP và WebSocket, không phải trang tĩnh GitHub Pages.

- Cấu hình Render Blueprint: [render.yaml](./render.yaml)
- Root Directory: `quan-nhau-bat-on`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check: `/`

**Lưu ý:** Cấu hình chỉ có tác dụng sau khi toàn bộ mã nguồn và thư mục assets của ứng dụng được đưa vào thư mục này. Hiện tại repository mới có tài liệu và cấu hình triển khai; chưa đủ source/assets để Render build.
