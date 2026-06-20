'use client';

import { useState, useEffect } from 'react';
import { Download, Share, X, PlusSquare, Smartphone, Store, AlertTriangle } from 'lucide-react';
import styles from './PWAInstallPrompt.module.css';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [isInsecureMobile, setIsInsecureMobile] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [forceShow, setForceShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Helper functions to check status
    const isStandalone = () => {
      const nav = window.navigator as Navigator & { standalone?: boolean };
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        nav.standalone === true
      );
    };

    const isIOS = () => {
      const win = window as Window & { MSStream?: unknown };
      return (
        /iphone|ipad|ipod/i.test(window.navigator.userAgent) &&
        !win.MSStream
      );
    };

    const isMobile = () => {
      return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        window.navigator.userAgent
      );
    };

    const isInsecure = () => {
      return (
        window.location.protocol !== 'https:' &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1'
      );
    };

    // If already installed/standalone, notify header and stop
    if (isStandalone()) {
      window.dispatchEvent(
        new CustomEvent('pwa-installable-status', {
          detail: { installable: false, platform: 'standalone' },
        })
      );
      return;
    }

    // Check if dismissed before
    const isDismissed = () => {
      return localStorage.getItem('pwa_install_dismissed') === 'true';
    };

    // 1. Android/Chrome native prompt handling
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setIsInsecureMobile(false); // native event fired, so secure context is active

      // Tell Header we are installable
      window.dispatchEvent(
        new CustomEvent('pwa-installable-status', {
          detail: { installable: true, platform: 'native' },
        })
      );

      if (!isDismissed()) {
        setShowPrompt(true);
      }
    };

    // 2. iOS Safari / Insecure Mobile handling
    const checkMobilePrompt = () => {
      // Prioritize warning about insecure HTTP connection on mobile
      if (isMobile() && isInsecure()) {
        setIsInsecureMobile(true);
        setIsIOSDevice(false);

        // Tell Header we are installable (so they can trigger info manually)
        window.dispatchEvent(
          new CustomEvent('pwa-installable-status', {
            detail: { installable: true, platform: 'insecure' },
          })
        );

        if (!isDismissed()) {
          setShowPrompt(true);
        }
        return;
      }

      if (isIOS() && !isStandalone()) {
        setIsIOSDevice(true);
        setIsInsecureMobile(false);

        // Tell Header we are installable
        window.dispatchEvent(
          new CustomEvent('pwa-installable-status', {
            detail: { installable: true, platform: 'ios' },
          })
        );

        if (!isDismissed()) {
          setShowPrompt(true);
        }
      }
    };

    // 3. App installed event
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowPrompt(false);
      window.dispatchEvent(
        new CustomEvent('pwa-installable-status', {
          detail: { installable: false, platform: 'none' },
        })
      );
    };

    // 4. Listen to custom event to manually trigger the install instructions (e.g. from header)
    const handleManualTrigger = () => {
      setForceShow(true);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('trigger-pwa-install', handleManualTrigger);

    // Run immediate check for iOS/Safari or insecure mobile support
    checkMobilePrompt();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('trigger-pwa-install', handleManualTrigger);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the native browser install prompt
    await deferredPrompt.prompt();
    
    // Wait for the user's choice
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    // Save dismissal to localStorage so we don't prompt automatically anymore
    localStorage.setItem('pwa_install_dismissed', 'true');
    setShowPrompt(false);
    setForceShow(false);
  };

  if (!showPrompt) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <div className={styles.icon}>
            {isInsecureMobile ? <AlertTriangle size={20} style={{ color: 'var(--danger)' }} /> : <Store size={20} />}
          </div>
          <span className={styles.title}>
            {isInsecureMobile ? 'HTTPS Required to Install' : 'Install Kels POS'}
          </span>
        </div>
        <button onClick={handleDismiss} className={styles.closeBtn} title="Dismiss">
          <X size={18} />
        </button>
      </div>

      <p className={styles.description}>
        {isInsecureMobile
          ? 'Mobile browsers restrict PWA installation over local HTTP network IPs (e.g. http://192.168.x.x:3000) for security. To install this app:'
          : 'Add Kels POS to your home screen for swift, full-screen loyalty searches and seamless offline sales checkout.'}
      </p>

      {isInsecureMobile ? (
        <div className={styles.iosInstructions}>
          <div className={styles.iosStep} style={{ flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={styles.stepNumber}>A</span>
              <strong>True Standalone App: Secure Tunnel (Recommended)</strong>
            </div>
            <span style={{ paddingLeft: '26px', color: 'var(--text-secondary)', fontSize: '12px' }}>
              Run <code>ngrok http 3000</code> on your PC, then visit the generated public <code>https://...</code> URL on your phone. This enables full HTTPS context for a borderless, standalone WebAPK installation.
            </span>
          </div>
          
          <div className={styles.iosStep} style={{ flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={styles.stepNumber}>B</span>
              <strong>True Standalone App: USB Port Forwarding</strong>
            </div>
            <span style={{ paddingLeft: '26px', color: 'var(--text-secondary)', fontSize: '12px' }}>
              Enable USB Debugging on your phone, connect it to your PC, open <code>chrome://inspect/#devices</code> in Chrome on your PC, and enable <strong>Port Forwarding</strong> for port 3000 (map 3000 to <code>localhost:3000</code>). Then visit <code>http://localhost:3000</code> on your phone.
            </span>
          </div>

          <div className={styles.iosStep} style={{ flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={styles.stepNumber}>C</span>
              <strong>Browser Shortcut Only: Insecure Bypass</strong>
            </div>
            <span style={{ paddingLeft: '26px', color: 'var(--text-secondary)', fontSize: '12px' }}>
              In mobile Chrome, open <code>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code>, add <code>{typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : 'http://your-ip:3000'}</code>, select Enabled, and relaunch Chrome. <em style={{ fontSize: '11px', color: 'var(--danger)' }}>Note: Because this uses an insecure network IP, Chrome will only install a bookmark shortcut that opens in a Chrome tab.</em>
            </span>
          </div>
        </div>
      ) : isIOSDevice ? (
        <div className={styles.iosInstructions}>
          <div className={styles.iosStep}>
            <span className={styles.stepNumber}>1</span>
            <span>
              Tap the <strong>Share</strong> button
              <span className={styles.shareIconInline}>
                <Share size={14} />
              </span>
              at the bottom of your Safari browser.
            </span>
          </div>
          <div className={styles.iosStep}>
            <span className={styles.stepNumber}>2</span>
            <span>
              Scroll down the share list and select <strong>Add to Home Screen</strong>
              <span className={styles.plusIconInline}>
                <PlusSquare size={14} />
              </span>
              .
            </span>
          </div>
        </div>
      ) : null}

      <div className={styles.footer}>
        {!forceShow && (
          <button onClick={handleDismiss} className={styles.dismissBtn}>
            Not Now
          </button>
        )}
        {!isInsecureMobile && !isIOSDevice && deferredPrompt ? (
          <button onClick={handleInstallClick} className={styles.installBtn}>
            <Download size={16} />
            Install App
          </button>
        ) : isIOSDevice || isInsecureMobile ? (
          <button onClick={handleDismiss} className={styles.installBtn}>
            Got It
          </button>
        ) : (
          /* Fallback for general browsers that triggered manual click */
          <button onClick={handleDismiss} className={styles.installBtn}>
            <Smartphone size={16} />
            Open Menu to Install
          </button>
        )}
      </div>
    </div>
  );
}
