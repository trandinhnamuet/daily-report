import type { Metadata } from 'next';
import pool from '@/lib/db';

const STATUS_LABEL: Record<string, string> = { note: 'Ghi chú', todo: 'Todo', done: 'Done' };

function baseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const reportId = Number(id);
  const base = baseUrl();

  if (Number.isNaN(reportId)) {
    return { title: 'Task', metadataBase: new URL(base) };
  }

  try {
    const result = await pool.query(
      `SELECT dr.message, dr.status, u.name AS user_name
       FROM daily_report.daily_report dr
       JOIN daily_report.users u ON dr.user_id = u.id
       WHERE dr.id = $1`,
      [reportId]
    );

    if (result.rowCount === 0) {
      return { title: 'Không tìm thấy task', metadataBase: new URL(base) };
    }

    const r = result.rows[0] as { message: string; status: string; user_name: string };
    const statusLabel = STATUS_LABEL[r.status] ?? 'Task';
    const title = `${statusLabel} · ${r.user_name}`;
    const description = r.message.replace(/\s+/g, ' ').trim().slice(0, 200);
    const url = `${base}/report/${reportId}`;

    return {
      title,
      description,
      metadataBase: new URL(base),
      openGraph: {
        title,
        description,
        url,
        type: 'article',
        siteName: 'Daily Report',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
    };
  } catch {
    return { title: 'Task', metadataBase: new URL(base) };
  }
}

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
