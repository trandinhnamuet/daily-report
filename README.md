# Task Notes

Ứng dụng ghi chú + quản lý công việc hàng ngày (Next.js + Postgres), hỗ trợ PWA.

## Editions — 1 branch, nhiều phiên bản

Từ branch `unified`, hai branch cũ (`main` và `teamwork`) được gộp làm một.
Phiên bản app được chọn bằng biến môi trường **lúc build**:

```bash
NEXT_PUBLIC_EDITION=personal   # bản cá nhân   (branch main cũ)
NEXT_PUBLIC_EDITION=teamwork   # bản Trecome   (branch teamwork cũ) — mặc định nếu không set
NEXT_PUBLIC_EDITION=enterprise # bản doanh nghiệp (đang chuẩn bị)
```

| | personal | teamwork | enterprise (tương lai) |
|---|---|---|---|
| Tên app / icon / manifest | My Task Note | Trecome Task Note | Trecome (tạm) |
| Người nhận + deadline | ❌ | ✅ | ✅ |
| Comment / cảm xúc / đã đọc | ✅ | ✅ | ✅ |
| Lịch sử hành động (/activity) | ✅ | ✅ | ✅ |
| Phạm vi nhìn thấy task | tất cả | tất cả | mình + cấp dưới (chưa làm) |

Toàn bộ khác biệt nằm trong [lib/edition.ts](lib/edition.ts) (`BRAND` + `FEATURES`).
Thêm tính năng chung → code bình thường, không cần quan tâm edition.
Thêm tính năng riêng → thêm flag vào `FEATURES` và bọc `{FEATURES.xxx && ...}`.

**Lưu ý:** vì là biến `NEXT_PUBLIC_*`, giá trị được nhúng vào bundle lúc `next build`.
Mỗi deployment (Vercel project) set giá trị riêng trong Environment Variables rồi redeploy.

## Getting Started

```bash
npm install
cp .env.example .env   # điền thông tin DB + chọn NEXT_PUBLIC_EDITION
npm run dev            # chạy migrate rồi mở dev server
```

Mở [http://localhost:3000](http://localhost:3000).

- `npm run dev` / `npm run build` đều chạy migration trước (`scripts/migrate.js`).
- Migration đánh dấu đã chạy trong bảng `daily_report.migrations`, các bảng dùng
  `CREATE TABLE IF NOT EXISTS` nên nhiều deployment chung 1 DB vẫn an toàn.

## Deploy (Vercel)

1 repo → nhiều Vercel project, mỗi project:

- trỏ cùng branch `unified`
- set `NEXT_PUBLIC_EDITION` khác nhau (`personal` / `teamwork`)
- DB có thể chung hoặc riêng (schema `daily_report`)
