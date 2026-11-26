import React, { useEffect, useState } from 'react';
import { X, Share, PlusSquare, Download } from 'lucide-react';
import { SoulFlowMark } from '@/components/v2/HeaderV2';

/**
 * "Add to Home Screen" prompt.
 * - Android/Chrome: fires the native `beforeinstallprompt` mini-infobar.
 * - iOS Safari: no programmatic prompt exists, so show the Share → Add to
 *   Home Screen instructions instead.
 * Dismissal is remembered for 14 days; the card never re-appears once the
 * app is installed (display-mode: standalone).
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'soulflow-install-dismissed';
const DISMISS_COOLDOWN = 14 * 24 * 60 * 60 * 1000; // 14 days
const SHOW_DELAY = 25_000; // don't interrupt the first visit

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIos = () =>
  /iphone|ipad|ipod/.test(navigator.userAgent) && !isStandalone();

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || '0');
    if (Date.now() - dismissedAt < DISMISS_COOLDOWN) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    // iOS never fires beforeinstallprompt — offer the manual instructions.
    // Other platforms: the card appears when (and only when) the native
    // prompt becomes available, so the Install button always works.
    const timer = window.setTimeout(() => {
      if (isIos()) setShowIosHelp(true);
    }, SHOW_DELAY);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      window.clearTimeout(timer);
    };
  }, []);

  // Once the native prompt is available, reveal the card right away.
  useEffect(() => {
    if (deferredPrompt) setVisible(true);
  }, [deferredPrompt]);

  const dismiss = () => {
    setVisible(false);
    setShowIosHelp(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setVisible(false);
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
    setDeferredPrompt(null);
  };

  if (!visible && !showIosHelp) return null;

  return (
    <aside
      aria-label="Install SoulFlow"
      className="fixed left-4 bottom-24 md:bottom-6 z-40 w-[calc(100%-2rem)] max-w-xs organic-card rounded-2xl p-4 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="absolute top-2 right-2 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-secondary"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-3 pr-6">
        <SoulFlowMark className="h-9 w-9 shrink-0" />
        <div className="min-w-0">
          <p className="font-heading font-semibold text-foreground leading-tight">SoulFlow, one tap away</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            {showIosHelp
              ? 'Tap Share, then “Add to Home Screen”.'
              : 'Install for quick access — works offline too.'}
          </p>
        </div>
      </div>

      {showIosHelp ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Share className="h-4 w-4 text-primary" />
          <span>Share</span>
          <span aria-hidden="true">→</span>
          <PlusSquare className="h-4 w-4 text-primary" />
          <span>Add to Home Screen</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleInstall}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground h-9 px-4 text-sm font-semibold shadow-sm shadow-primary/25"
        >
          <Download className="h-4 w-4" /> Install
        </button>
      )}
    </aside>
  );
};

export default InstallPrompt;