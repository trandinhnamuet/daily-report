import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if PWA is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if install was dismissed before
    const dismissed = sessionStorage.getItem('pwa_install_dismissed');
    if (dismissed) return;

    // Listen for install prompt
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
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) {
      // Không có prompt → im lặng (có thể do điều kiện trình duyệt chưa đủ)
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
  }, [installPrompt, handleDismiss]);

  const canInstall = !!installPrompt && !isInstalled;

  return {
    installPrompt,
    showPrompt,
    isInstalled,
    canInstall,
    handleInstall,
    handleDismiss,
  };
}
