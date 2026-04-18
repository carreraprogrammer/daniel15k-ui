import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/display.css';
import './theme/tokens.css';
import './theme/reset.css';
import './theme/typography.css';
import './theme/utilities.css';
import { IonApp } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { AppRouter } from './router/AppRouter';
import { AgentUIProvider } from './contexts/AgentUIContext';

export default function App() {
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
