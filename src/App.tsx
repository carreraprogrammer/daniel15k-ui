import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/display.css';
import './theme/fonts.css';
import './theme/tokens.css';
import './theme/reset.css';
import './theme/typography.css';
import './theme/utilities.css';
import { useEffect } from 'react';
import { IonApp } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { isPlatform } from '@ionic/react';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { SplashScreen } from '@capacitor/splash-screen';
import { AppRouter } from './router/AppRouter';
import { AgentUIProvider } from './contexts/AgentUIContext';
import { FloatingAgent } from './components/organisms/FloatingAgent';
import { GmailReconnectBanner } from './components/molecules/GmailReconnectBanner';
import { QuickCaptureShortcut } from './plugins/quickCaptureShortcut';
import { applyThemeMode, getThemeMediaQuery, useThemeStore } from './store/themeStore';
import { applyAccent, useAccentStore } from './store/accentStore';
import { useEmailConnectionStore } from './store/emailConnectionStore';

const openQuickCapture = (paymentSource?: string) => {
  const params = new URLSearchParams();
  if (paymentSource) params.set('payment_source', paymentSource);
  window.location.assign(`/quick${params.toString() ? `?${params.toString()}` : ''}`);
};

const handleDeepLink = (rawUrl: string) => {
  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname;
    const path = url.pathname;

    // Gmail OAuth callback: daniel15k://auth/gmail?status=connected|error[&reason=...]
    if (hostname === 'auth' && path === '/gmail') {
      const status = url.searchParams.get('status') ?? 'error';
      const reason = url.searchParams.get('reason');
      // El redirect a daniel15k:// abre la app pero deja el SFSafariViewController
      // (Browser.open) encima — por eso el botón "Volver a la aplicación" parecía no
      // hacer nada. Cerrarlo nos devuelve a la app sin que el usuario tenga que tocarlo.
      void Browser.close().catch(() => { /* no estaba abierto */ });
      useEmailConnectionStore.getState().handleDeepLinkResult(status, reason);
      window.location.assign('/profile');
      return;
    }

    // Quick capture: daniel15k://quick[?payment_source=...]
    const normalizedPath = (hostname === 'quick' || hostname === 'quick-capture') ? '/quick' : path;
    if (normalizedPath === '/quick' || normalizedPath === '/quick-capture') {
      openQuickCapture(url.searchParams.get('payment_source') ?? undefined);
    }
  } catch {
    // Ignore malformed external URLs.
  }
};

export default function App() {
  const themePreference = useThemeStore((state) => state.preference);
  const accentPreset = useAccentStore((state) => state.preset);

  useEffect(() => {
    applyAccent(accentPreset);
  }, [accentPreset]);

  useEffect(() => {
    applyThemeMode(themePreference);

    if (themePreference !== 'system') return undefined;

    const mediaQuery = getThemeMediaQuery();
    if (!mediaQuery) return undefined;

    const handleSystemThemeChange = () => applyThemeMode('system');
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [themePreference]);

  useEffect(() => {
    if (isPlatform('capacitor')) {
      void SplashScreen.hide({ fadeOutDuration: 400 });
    }
  }, []);

  useEffect(() => {
    if (!isPlatform('capacitor')) return undefined;

    const syncShortcutLaunch = async () => {
      const pending = await QuickCaptureShortcut.getPendingLaunch().catch(() => ({
        shouldOpen: false,
        paymentSource: undefined,
      }));
      if (pending.shouldOpen) openQuickCapture(pending.paymentSource);
    };

    void syncShortcutLaunch();

    const subscriptions: Array<{ remove: () => Promise<void> }> = [];
    void CapacitorApp.addListener('appUrlOpen', ({ url }) => handleDeepLink(url)).then((sub) => subscriptions.push(sub));
    void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void syncShortcutLaunch();
    }).then((sub) => subscriptions.push(sub));

    return () => {
      subscriptions.forEach((sub) => void sub.remove());
    };
  }, []);

  return (
    <IonApp>
      <IonReactRouter>
        <AgentUIProvider>
          <GmailReconnectBanner />
          <AppRouter />
          <FloatingAgent />
        </AgentUIProvider>
      </IonReactRouter>
    </IonApp>
  );
}
