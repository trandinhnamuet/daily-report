'use client';

import { CloudOff } from 'lucide-react';
import { useOfflineStatus, type Kind } from '@/lib/offlineQueue';

/** "Offline" + số thay đổi chờ đồng bộ của 1 loại dữ liệu (hoặc tất cả) */
export default function OfflineBadge({ kind }: { kind?: Kind }) {
  const { online, pendingCount } = useOfflineStatus(kind);

  return (
    <>
      {!online && (
        <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500 whitespace-nowrap" title="Đang offline — dữ liệu được lưu trên máy">
          <CloudOff className="w-3.5 h-3.5" />
          Offline
        </span>
      )}
      {pendingCount > 0 && (
        <span className="text-xs text-gray-400 dark:text-[#858585] whitespace-nowrap" title="Số thay đổi chờ đồng bộ">
          {pendingCount} chờ đồng bộ
        </span>
      )}
    </>
  );
}
