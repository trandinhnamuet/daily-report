import { BRAND } from '@/lib/edition';

/**
 * /manifest.json — sinh theo edition thay vì file tĩnh trong public/.
 * Giữ nguyên URL cũ để sw.js (đang cache '/manifest.json') và các thiết bị
 * đã cài PWA không bị ảnh hưởng.
 */

const manifest = {
  name: BRAND.appName,
  short_name: BRAND.shortName,
  description: 'Quản lý công việc hàng ngày, note và task',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait-primary',
  background_color: '#ffffff',
  theme_color: '#2563eb',
  categories: ['productivity'],
  icons: [
    {
      src: BRAND.manifestIcon,
      sizes: '192x192',
      type: BRAND.manifestIconType,
      purpose: 'any',
    },
    {
      src: BRAND.manifestIcon,
      sizes: '512x512',
      type: BRAND.manifestIconType,
      purpose: 'any',
    },
  ],
  shortcuts: [
    {
      name: 'Mở công việc hôm nay',
      short_name: 'Hôm nay',
      description: 'Xem danh sách công việc của hôm nay',
      url: '/?tab=reports',
      icons: [
        {
          src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'><rect fill='%232563eb' width='96' height='96'/><text x='50%' y='50%' font-size='60' font-weight='bold' fill='white' text-anchor='middle' dy='.3em'>R</text></svg>",
          sizes: '96x96',
          type: 'image/svg+xml',
        },
      ],
    },
  ],
  screenshots: [
    {
      src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 540 720'><rect fill='%23f3f4f6' width='540' height='720'/><text x='270' y='360' font-size='48' font-weight='bold' fill='%232563eb' text-anchor='middle'>Daily Report</text></svg>",
      sizes: '540x720',
      type: 'image/svg+xml',
      form_factor: 'narrow',
    },
  ],
};

export async function GET() {
  return new Response(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
