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
import { SplashScreen } from '@capacitor/splash-screen';
import { AppRouter } from './router/AppRouter';
import { AgentUIProvider } from './contexts/AgentUIContext';
import { applyThemeMode, getThemeMediaQuery, useThemeStore } from './store/themeStore';

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
