import { IonContent, IonPage } from '@ionic/react';
import { Link } from 'react-router-dom';

export const NotFoundPage = () => (
  <IonPage>
    <IonContent fullscreen className="ion-padding">
      <main>
        <h1>Página no encontrada</h1>
        <Link to="/">Volver al inicio</Link>
      </main>
    </IonContent>
  </IonPage>
);
