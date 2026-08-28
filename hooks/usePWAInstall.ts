import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// PWAEventCapture bắt beforeinstallprompt sớm rồi treo event lên window
type PWAWindow = Window & { __pwaInstallPrompt?: BeforeInstallPromptEvent };
// Safari iOS đánh dấu chế độ standalone trên navigator
type IOSNavigator = Navigator & { standalone?: boolean };

const pwaWindow = () => window as unknown as PWAWindow;

// localStorage (không phải sessionStorage): tắt popup 1 lần là im trong DISMISS_DAYS ngày,
// thay vì hiện lại mỗi lần mở tab mới.
const DISMISS_KEY = 'pwa_install_dismissed_at';
const INSTALLED_KEY = 'pwa_installed';
const LEGACY_DISMISS_KEY = 'pwa_install_dismissed';
const DISMISS_DAYS = 30;

// Người dùng bấm nút cài đặt ở header → báo cho PWAInstallPrompt (instance hook khác) mở guide iOS
const SHOW_IOS_GUIDE_EVENT = 'pwa:show-ios-guide';

const isIOS = () => {
  if (typeof window === 'undefined') return false;
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return true;
  // iPadOS 13+ khai user agent giống macOS, chỉ phân biệt được qua touch
  return /Macintosh/.test(navigator.userAgent) && (navigator.maxTouchPoints ?? 0) > 1;
};

// Popup cài app chỉ có nghĩa trên điện thoại/tablet. Chrome desktop cũng bắn
// beforeinstallprompt nên nếu không lọc thì xem web trên laptop vẫn bị nhắc cài.
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  if (/Android|iPad|iPhone|iPod|Mobile|Silk/i.test(navigator.userAgent)) return true;
  if (isIOS()) return true;
  // Laptop cảm ứng vẫn có chuột → any-hover: hover, nên vẫn bị loại
  return window.matchMedia('(pointer: coarse) and (any-hover: none)').matches;
};

const isStandalone = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as IOSNavigator).standalone === true ||
         document.referrer.startsWith('android-app://');
};

const readFlag = (key: string): string | null => {
  try { return localStorage.getItem(key); } catch { return null; }
};

const writeFlag = (key: string, value: string) => {
  try { localStorage.setItem(key, value); } catch { /* private mode */ }
};

const wasInstalled = () => readFlag(INSTALLED_KEY) === 'true';

const isDismissed = () => {
  const at = Number(readFlag(DISMISS_KEY));
  if (!at) return false;
  return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
};

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  // Tính một lần khi mount (SSR không có window nên luôn ra false)
  const [isMobile] = useState(isMobileDevice);

  // Theo dõi cài đặt thành công — chạy kể cả khi popup đang bị tắt
  useEffect(() => {
    const onInstalled = () => {
      writeFlag(INSTALLED_KEY, 'true');
      setIsInstalled(true);
      setShowPrompt(false);
      setShowIOSGuide(false);
    };
    const onShowIOSGuide = () => setShowIOSGuide(true);

    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener(SHOW_IOS_GUIDE_EVENT, onShowIOSGuide);
    return () => {
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener(SHOW_IOS_GUIDE_EVENT, onShowIOSGuide);
    };
  }, []);

  useEffect(() => {
    // Đã cài (đang chạy standalone hoặc từng cài trên máy này)
    if (isStandalone() || wasInstalled()) {
      setIsInstalled(true);
      return;
    }

    // Desktop/laptop: không bao giờ tự hiện popup cài app.
    if (!isMobileDevice()) return;

    // Đã tắt popup trước đó → không tự hiện lại nữa (áp dụng cho cả iOS lẫn Android).
    // Check này phải nằm TRƯỚC nhánh iOS, nếu không iPhone sẽ hiện guide mỗi lần vào app.
    if (isDismissed()) return;

    // Bản cũ lưu ở sessionStorage: coi như đã tắt, đồng thời dọn key cũ
    try {
      if (sessionStorage.getItem(LEGACY_DISMISS_KEY)) {
        sessionStorage.removeItem(LEGACY_DISMISS_KEY);
        writeFlag(DISMISS_KEY, String(Date.now()));
        return;
      }
    } catch { /* private mode */ }

    // iOS không support beforeinstallprompt, show manual guide thay vào
    if (isIOS()) {
      setShowIOSGuide(true);
      return;
    }

    // Check if event was already captured globally (for early capture)
    const existingPrompt = pwaWindow().__pwaInstallPrompt;
    if (existingPrompt) {
      setInstallPrompt(existingPrompt);
      setShowPrompt(true);
      return;
    }

    // Listen for install prompt (Android/Chrome/Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const event = e as BeforeInstallPromptEvent;
      setInstallPrompt(event);
      setShowPrompt(true);
    };

    // Also listen for custom event from PWAEventCapture
    const handlePWAInstallCaptured = (e: CustomEvent) => {
      setInstallPrompt(e.detail);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwainstallpromptcaptured', handlePWAInstallCaptured as EventListener);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwainstallpromptcaptured', handlePWAInstallCaptured as EventListener);
    };
  }, []);

  const handleDismiss = useCallback(() => {
    writeFlag(DISMISS_KEY, String(Date.now()));
    setShowPrompt(false);
    setShowIOSGuide(false);
  }, []);

  const handleInstall = useCallback(async () => {
    // iOS: show manual guide instead of prompt.
    // Nút ở header dùng instance hook riêng nên phải bắn event để PWAInstallPrompt render guide.
    if (isIOS()) {
      setShowIOSGuide(true);
      window.dispatchEvent(new Event(SHOW_IOS_GUIDE_EVENT));
      return;
    }

    // If already installed, inform user
    if (isStandalone()) {
      alert('Ứng dụng đã được cài đặt trên thiết bị của bạn');
      return;
    }

    const prompt = installPrompt ?? pwaWindow().__pwaInstallPrompt;

    if (!prompt) {
      // No prompt available - Chrome likely blocked it due to repeated dismissals
      // Guide user to use browser menu instead
      alert(
        'Để cài đặt ứng dụng, vui lòng:\n\n' +
        '1. Bấm menu (⋮) trên góc phải\n' +
        '2. Chọn "Thêm vào màn hình chính"\n\n' +
        'Nếu không thấy tùy chọn này, vui lòng xóa cache của trình duyệt và thử lại.'
      );
      return;
    }

    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      writeFlag(INSTALLED_KEY, 'true');
      pwaWindow().__pwaInstallPrompt = undefined;
      setInstallPrompt(null);
      setShowPrompt(false);
      // Don't dismiss - user accepted
    } else {
      handleDismiss();
    }
  }, [installPrompt, handleDismiss]);

  const canInstall = !!installPrompt && !isInstalled;

  return {
    installPrompt,
    showPrompt,
    showIOSGuide,
    isInstalled,
    isMobile,
    canInstall,
    handleInstall,
    handleDismiss,
  };
}
