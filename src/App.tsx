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
import { applyThemeMode, useThemeStore } from './store/themeStore';

export default function App() {
  const themeMode = useThemeStore((state) => state.mode);

  useEffect(() => {
    applyThemeMode(themeMode);
  }, [themeMode]);

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
