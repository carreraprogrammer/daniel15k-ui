import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spinner } from '../../atoms/Spinner';
import { useAuthStore } from '../../../store/authStore';

export const OAuthCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hydrateAuth = useAuthStore((state) => state.hydrateAuth);

  useEffect(() => {
    const error = searchParams.get('error');
    const message = searchParams.get('message') ?? 'No se pudo completar la autenticación con Google.';
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    if (error) {
      navigate('/login', {
        replace: true,
        state: { oauthError: message },
      });
      return;
    }

    if (!accessToken || !refreshToken) {
      navigate('/login', {
        replace: true,
        state: { oauthError: 'La autenticación con Google no devolvió tokens válidos.' },
      });
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

    navigate('/dashboard', { replace: true });
  }, [hydrateAuth, navigate, searchParams]);

  return <Spinner />;
};
