import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/display.css';
import './theme/tokens.css';
import './theme/reset.css';
import './theme/typography.css';
import './theme/utilities.css';
import { useEffect } from 'react';
import { IonApp } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { isPlatform } from '@ionic/react';
import { App as CapacitorApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { AppRouter } from './router/AppRouter';
import { AgentUIProvider } from './contexts/AgentUIContext';
import { QuickCaptureShortcut } from './plugins/quickCaptureShortcut';
import { applyThemeMode, getThemeMediaQuery, useThemeStore } from './store/themeStore';

const openQuickCapture = (paymentSource?: string) => {
  const params = new URLSearchParams();
  if (paymentSource) params.set('payment_source', paymentSource);
  window.location.assign(`/quick${params.toString() ? `?${params.toString()}` : ''}`);
};

const handleDeepLink = (rawUrl: string) => {
  try {
    const url = new URL(rawUrl);
    const path = url.hostname === 'quick' || url.hostname === 'quick-capture'
      ? '/quick'
      : url.pathname;

    if (path === '/quick' || path === '/quick-capture') {
      openQuickCapture(url.searchParams.get('payment_source') ?? undefined);
    }
  } catch {
    // Ignore malformed external URLs.
  }
};

export default function App() {
  const themePreference = useThemeStore((state) => state.preference);

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
      const pending = await QuickCaptureShortcut.getPendingLaunch().catch(() => ({ paymentSource: undefined }));
      if (pending.paymentSource) openQuickCapture(pending.paymentSource);
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
          <AppRouter />
        </AgentUIProvider>
      </IonReactRouter>
    </IonApp>
  );
}
