'use client';

import { Download, X } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import IOSInstallGuide from './IOSInstallGuide';

export default function PWAInstallPrompt() {
  const { showPrompt, showIOSGuide, isInstalled, handleInstall, handleDismiss } = usePWAInstall();

  if (isInstalled) return null;

  return (
    <>
      <IOSInstallGuide isOpen={showIOSGuide} onDismiss={handleDismiss} />
      {!showIOSGuide && showPrompt && <Prompt handleInstall={handleInstall} handleDismiss={handleDismiss} />}
    </>
  );
}

function Prompt({ handleInstall, handleDismiss }: { handleInstall: () => void; handleDismiss: () => void }) {
  return (
    <div className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-auto sm:w-80 z-40">
      <div className="bg-white dark:bg-[#252526] border border-gray-200 dark:border-[#3c3c3c] rounded-lg shadow-lg p-4 sm:p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-[#d4d4d4] text-sm">
                Cài đặt ứng dụng
              </h3>
              <p className="text-xs text-gray-500 dark:text-[#858585] mt-0.5">
                Truy cập nhanh hơn từ màn hình chính
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-[#d4d4d4] transition-colors shrink-0 ml-2"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleInstall}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Cài đặt
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 bg-gray-100 dark:bg-[#3c3c3c] text-gray-900 dark:text-[#d4d4d4] rounded-lg py-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-[#474747] transition-colors"
          >
            Không
          </button>
        </div>
      </div>
    </div>
  );
}
