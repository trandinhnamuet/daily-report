/**
 * Edition — 1 codebase phục vụ nhiều "phiên bản" app, chọn bằng biến môi trường
 * NEXT_PUBLIC_EDITION lúc BUILD (không đổi được lúc runtime vì Next inline giá trị này).
 *
 *   personal   → bản cá nhân   (trước đây là branch `main`):    không có người nhận/deadline
 *   teamwork   → bản Trecome   (trước đây là branch `teamwork`): đủ tính năng nhóm
 *   enterprise → bản doanh nghiệp (tương lai): như teamwork + giới hạn phạm vi nhìn thấy
 *
 * File này KHÔNG được import gì từ server (db, next/headers...) vì cả client
 * component lẫn server đều dùng nó.
 */

export type Edition = 'personal' | 'teamwork' | 'enterprise';

const raw = process.env.NEXT_PUBLIC_EDITION;

export const EDITION: Edition =
  raw === 'personal' || raw === 'enterprise' ? raw : 'teamwork';

export interface BrandConfig {
  /** Tên app trong manifest (tên hiện khi cài PWA trên Android) */
  appName: string;
  shortName: string;
  /** Favicon trên tab trình duyệt */
  favicon: string;
  faviconType: string;
  /** apple-touch-icon (icon khi Add to Home Screen trên iOS) */
  appleIcon: string;
  /** Icon 192/512 trong manifest */
  manifestIcon: string;
  manifestIconType: string;
}

export interface FeatureConfig {
  /** Người nhận (assignee) + deadline trên note/task */
  assignee: boolean;
  /**
   * Phạm vi nhìn thấy note/task:
   *  - 'all': mọi người thấy của nhau (personal, teamwork)
   *  - 'team': chỉ thấy của mình + nhân viên dưới quyền (enterprise — CHƯA triển khai,
   *    sẽ cần cột users.manager_id + lọc trong các route đọc dữ liệu)
   */
  scope: 'all' | 'team';
}

const TEAMWORK_BRAND: BrandConfig = {
  appName: 'Trecome Task Note',
  shortName: 'Trecome Task Note',
  favicon: '/mobile-logo/favicon-teamwork.png',
  faviconType: 'image/png',
  appleIcon: '/mobile-logo/logo-teamwork.jpeg',
  manifestIcon: '/mobile-logo/logo-teamwork.jpeg',
  manifestIconType: 'image/jpeg',
};

const EDITIONS: Record<Edition, { brand: BrandConfig; features: FeatureConfig }> = {
  personal: {
    brand: {
      appName: 'My Task Note',
      shortName: 'My Task',
      favicon: '/mobile-logo/logo-main.png',
      faviconType: 'image/png',
      appleIcon: '/mobile-logo/logo-main.png',
      manifestIcon: '/mobile-logo/logo-main.png',
      manifestIconType: 'image/png',
    },
    features: { assignee: false, scope: 'all' },
  },
  teamwork: {
    brand: TEAMWORK_BRAND,
    features: { assignee: true, scope: 'all' },
  },
  enterprise: {
    // Tạm dùng brand teamwork cho tới khi có branding riêng
    brand: TEAMWORK_BRAND,
    features: { assignee: true, scope: 'team' },
  },
};

export const BRAND = EDITIONS[EDITION].brand;
export const FEATURES = EDITIONS[EDITION].features;
