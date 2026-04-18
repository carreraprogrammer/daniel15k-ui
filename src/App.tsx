import '@ionic/react/css/core.css';
import './theme/tokens.css';
import './theme/reset.css';
import './theme/typography.css';
import './theme/utilities.css';
import { IonApp } from '@ionic/react';
import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './router/AppRouter';
import { AgentUIProvider } from './contexts/AgentUIContext';

export default function App() {
  return (
    <IonApp>
      <BrowserRouter>
        <AgentUIProvider>
          <AppRouter />
        </AgentUIProvider>
      </BrowserRouter>
    </IonApp>
  );
}