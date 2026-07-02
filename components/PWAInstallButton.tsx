'use client';

import { Download } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export default function PWAInstallButton() {
  const { handleInstall } = usePWAInstall();

  return (
    <button
      onClick={handleInstall}
      className="block sm:hidden p-2 rounded hover:bg-gray-200 dark:hover:bg-[#3c3c3c] text-gray-600 dark:text-[#d4d4d4] hover:text-gray-900 dark:hover:text-white transition-colors"
      title="Cài đặt ứng dụng"
    >
      <Download className="w-5 h-5" />
    </button>
  );
}
