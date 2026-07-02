import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isIOS = () => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

const isStandalone = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
};

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if PWA is already installed
    if (isStandalone()) {
      setIsInstalled(true);
      return;
    }

    // iOS không support beforeinstallprompt, show manual guide thay vào
    if (isIOS()) {
      setShowIOSGuide(true);
      return;
    }

    // Check if install was dismissed before
    const dismissed = sessionStorage.getItem('pwa_install_dismissed');
    if (dismissed) return;

    // Listen for install prompt (Android/Chrome/Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const event = e as BeforeInstallPromptEvent;
      setInstallPrompt(event);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleDismiss = useCallback(() => {
    sessionStorage.setItem('pwa_install_dismissed', 'true');
    setShowPrompt(false);
    setShowIOSGuide(false);
  }, []);

  const handleInstall = useCallback(async () => {
    // iOS: show manual guide instead of prompt
    if (isIOS()) {
      setShowIOSGuide(true);
      return;
    }

    // If already installed, inform user
    if (isStandalone()) {
      alert('Ứng dụng đã được cài đặt trên thiết bị của bạn');
      return;
    }

    if (!installPrompt) {
      // No prompt available - clear PWA dismissal state and reload
      // This helps when Chrome blocks prompt due to repeated dismissals
      sessionStorage.removeItem('pwa_install_dismissed');
      setTimeout(() => window.location.reload(), 100);
      return;
    }

    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setShowPrompt(false);
      // Don't dismiss - user accepted
    } else {
      handleDismiss();
    }
  }, [installPrompt]);

  const canInstall = !!installPrompt && !isInstalled;

  return {
    installPrompt,
    showPrompt,
    showIOSGuide,
    isInstalled,
    canInstall,
    handleInstall,
    handleDismiss,
  };
}
