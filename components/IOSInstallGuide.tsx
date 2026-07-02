'use client';

import { Share2, X } from 'lucide-react';

interface IOSInstallGuideProps {
  isOpen: boolean;
  onDismiss: () => void;
}

export default function IOSInstallGuide({ isOpen, onDismiss }: IOSInstallGuideProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-auto sm:w-80 z-40">
      <div className="bg-white dark:bg-[#252526] border border-gray-200 dark:border-[#3c3c3c] rounded-lg shadow-lg p-4 sm:p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-[#d4d4d4] text-sm">
                Cài đặt trên iPhone
              </h3>
              <p className="text-xs text-gray-500 dark:text-[#858585] mt-0.5">
                Tạo shortcut trên home screen
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-[#d4d4d4] transition-colors shrink-0 ml-2"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps */}
        <div className="text-xs text-gray-600 dark:text-[#c5c5c5] space-y-3">
          <div className="flex gap-2">
            <div className="font-bold text-blue-600 dark:text-blue-400 shrink-0">1.</div>
            <div>Tap biểu tượng <span className="font-semibold">Share</span> ở dưới cùng màn hình</div>
          </div>
          <div className="flex gap-2">
            <div className="font-bold text-blue-600 dark:text-blue-400 shrink-0">2.</div>
            <div>Cuộn xuống chọn <span className="font-semibold">Add to Home Screen</span></div>
          </div>
          <div className="flex gap-2">
            <div className="font-bold text-blue-600 dark:text-blue-400 shrink-0">3.</div>
            <div>Tap <span className="font-semibold">Add</span> ở góc trên phải</div>
          </div>
        </div>

        {/* Button */}
        <button
          onClick={onDismiss}
          className="w-full bg-gray-100 dark:bg-[#3c3c3c] text-gray-900 dark:text-[#d4d4d4] rounded-lg py-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-[#474747] transition-colors"
        >
          Đã hiểu
        </button>
      </div>
    </div>
  );
}
