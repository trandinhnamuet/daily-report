import { ImageResponse } from 'next/og';
import pool from '@/lib/db';

export const runtime = 'nodejs';
export const alt = 'Task preview';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const STATUS_CFG: Record<string, { label: string; accent: string; bg: string; text: string }> = {
  note: { label: 'Ghi chú', accent: '#6b7280', bg: '#f3f4f6', text: '#4b5563' },
  todo: { label: 'Todo',    accent: '#ef4444', bg: '#fee2e2', text: '#b91c1c' },
  done: { label: 'Done',    accent: '#22c55e', bg: '#dcfce7', text: '#15803d' },
};

function fmtDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())} ${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id: publicId } = await params;

  let report: { message: string; status: string; created_at: Date; user_name: string } | null = null;

  try {
    const result = await pool.query(
      `SELECT dr.message, dr.status, dr.created_at, u.name AS user_name
       FROM daily_report.daily_report dr
       JOIN daily_report.users u ON dr.user_id = u.id
       WHERE dr.public_id = $1`,
      [publicId]
    );
    if (result.rowCount && result.rowCount > 0) report = result.rows[0];
  } catch { /* fall through to fallback */ }

  if (!report) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: '#1e1e1e', color: '#9ca3af', fontSize: 48,
          }}
        >
          Không tìm thấy task
        </div>
      ),
      { ...size }
    );
  }

  const cfg = STATUS_CFG[report.status] ?? STATUS_CFG.note;
  const avatarChar = report.user_name ? report.user_name.charAt(0).toUpperCase() : '?';
  const message = report.message.replace(/\s+/g, ' ').trim();
  const messageClipped = message.length > 300 ? message.slice(0, 300) + '…' : message;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#ffffff' }}>
        {/* Accent bar */}
        <div style={{ width: 20, height: '100%', background: cfg.accent, display: 'flex' }} />

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '56px 64px' }}>
          {/* Top row: status + brand */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', background: cfg.bg, color: cfg.text,
                fontSize: 30, fontWeight: 700, padding: '10px 26px', borderRadius: 999,
              }}
            >
              {cfg.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', color: '#9ca3af', fontSize: 28, fontWeight: 600 }}>
              Daily Report
            </div>
          </div>

          {/* Author */}
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 36 }}>
            <div
              style={{
                width: 64, height: 64, borderRadius: 999, background: '#3b82f6', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700,
              }}
            >
              {avatarChar}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 20 }}>
              <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, color: '#111827' }}>
                {report.user_name ?? 'Người dùng đã bị xoá'}
              </div>
              <div style={{ display: 'flex', fontSize: 24, color: '#6b7280', marginTop: 4 }}>
                {fmtDate(new Date(report.created_at))}
              </div>
            </div>
          </div>

          {/* Message */}
          <div
            style={{
              display: 'flex', flex: 1, marginTop: 32, fontSize: 42, lineHeight: 1.4,
              color: '#1f2937', overflow: 'hidden',
            }}
          >
            {messageClipped}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
