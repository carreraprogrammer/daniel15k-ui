import { useEffect } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { useHistory, useLocation } from 'react-router-dom';
import { Spinner } from '../../atoms/Spinner';
import { useAuthStore } from '../../../store/authStore';

export const OAuthCallbackPage = () => {
  const history = useHistory();
  const location = useLocation();
  const hydrateAuth = useAuthStore((state) => state.hydrateAuth);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const error = searchParams.get('error');
    const message = searchParams.get('message') ?? 'No se pudo completar la autenticación con Google.';
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    if (error) {
      history.replace('/login', { oauthError: message });
      return;
    }

    if (!accessToken || !refreshToken) {
      history.replace('/login', { oauthError: 'La autenticación con Google no devolvió tokens válidos.' });
      return;
    }

    hydrateAuth({
      data: {
        attributes: {
          auth_provider: 'google',
        },
      },
      meta: {
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    });

    history.replace('/dashboard');
  }, [history, hydrateAuth, location.search]);

  return (
    <IonPage>
      <IonContent fullscreen className="ion-padding">
        <Spinner />
      </IonContent>
    </IonPage>
  );
};
