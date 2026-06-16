import type { Metadata } from 'next';
import pool from '@/lib/db';

function baseUrl() {
  // Ưu tiên domain production cố định, KHÔNG dùng VERCEL_URL (URL deployment
  // riêng thường bị Vercel Deployment Protection chặn → crawler không tải được ảnh)
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id: publicId } = await params;
  const base = baseUrl();

  // title rỗng → không hiện gì (Messenger/Zalo chỉ hiện ảnh + domain)
  const emptyTitle = { title: { absolute: '' }, metadataBase: new URL(base) };

  try {
    const result = await pool.query(
      `SELECT dr.message, a.name AS assignee_name
       FROM daily_report.daily_report dr
       LEFT JOIN daily_report.users a ON dr.assignee_id = a.id
       WHERE dr.public_id = $1`,
      [publicId]
    );

    if (result.rowCount === 0) return emptyTitle;

    const r = result.rows[0] as { message: string; assignee_name: string | null };
    const description = r.message.replace(/\s+/g, ' ').trim().slice(0, 200);
    const url = `${base}/report/${publicId}`;

    // Chỉ hiện title khi có người nhận; ngược lại để trống
    const title = r.assignee_name ? `Task of ${r.assignee_name}` : '';

    return {
      title: { absolute: title },
      description,
      metadataBase: new URL(base),
      openGraph: {
        ...(title ? { title } : {}),
        description,
        url,
        type: 'article',
        siteName: 'Daily Report',
      },
      twitter: {
        card: 'summary_large_image',
        ...(title ? { title } : {}),
        description,
      },
    };
  } catch {
    return emptyTitle;
  }
}

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
