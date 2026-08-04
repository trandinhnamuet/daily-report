import { Pool } from 'pg';

// Supabase pooler (session mode) chỉ cho tối đa pool_size kết nối (mặc định 15).
// Trên Vercel mỗi lambda tạo 1 Pool riêng; nếu không giới hạn, vài instance chạy
// song song là cạn slot → lỗi EMAXCONNSESSION "max clients reached".
// → Giữ ít kết nối, nhả nhanh khi rảnh. Có thể chỉnh qua env DB_POOL_MAX.
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: parseInt(process.env.DB_POOL_MAX || '3'),
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
  allowExitOnIdle: true,
  ssl: {
    rejectUnauthorized: false
  }
});

export default pool;
