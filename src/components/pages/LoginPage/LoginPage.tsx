import { useEffect, useState } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import { IonContent, IonPage, isPlatform } from '@ionic/react';
import { AuthLayout } from '../../templates/AuthLayout';
import { BrandMark } from '../../atoms/BrandMark';
import { FormSection } from '../../molecules/FormSection/FormSection';
import { ErrorState } from '../../molecules/ErrorState';
import { Spinner } from '../../atoms/Spinner';
import { DynamicForm } from '../../organisms/DynamicForm';
import { GoogleButton } from '../../atoms/GoogleButton';
import { useAuthStore } from '../../../store/authStore';
import { useFormStore } from '../../../store/formStore';
import { useToast } from '../../../hooks/useToast';
import { startGoogleOAuth, loginWithGoogleMobile } from '../../../services/authService';
import { getLastAuthPath } from '../../../utils/navigation';
import styles from '../AuthPage.module.css';
import nativeStyles from './LoginPageNative.module.css';

const fallbackSchema = {
  slug: 'login-form',
  title: 'Login',
  submit_endpoint: '/api/v1/auth/login',
  submit_method: 'POST' as const,
  fields: [
    { name: 'email', type: 'email' as const, label: 'Email' },
    { name: 'password', type: 'password' as const, label: 'Password' },
  ],
};

export const LoginPage = () => {
  const schema = useFormStore((state) => state.schemas['login-form']);
  const isLoading = useFormStore((state) => state.isLoading);
  const schemaError = useFormStore((state) => state.error);
  const fetchSchema = useFormStore((state) => state.fetchSchema);
  const hydrateAuth = useAuthStore((state) => state.hydrateAuth);
  const location = useLocation();
  const history = useHistory();
  const { showError, toast } = useToast();
  const oauthError = (location.state as { oauthError?: string } | null)?.oauthError;
  const [mobileLoading, setMobileLoading] = useState(false);
  const isNative = isPlatform('capacitor');

  useEffect(() => {
    if (isNative) return;
    void fetchSchema('login-form').catch(() => undefined);
  }, [fetchSchema, isNative]);

  useEffect(() => {
    if (!oauthError) return;
    showError(oauthError);
    history.replace(location.pathname, {});
  }, [history, location.pathname, oauthError, showError]);

  const handleMobileGoogleLogin = async () => {
    setMobileLoading(true);
    try {
      const response = await loginWithGoogleMobile();
      hydrateAuth(response);
      history.replace(getLastAuthPath());
    } catch {
      showError('No se pudo iniciar sesión con Google.');
    } finally {
      setMobileLoading(false);
    }
  };

  if (isNative) {
    return (
      <IonPage>
        <IonContent fullscreen style={{ '--background': '#0b0f19' }}>
          <div className={nativeStyles.page}>
            <div className={nativeStyles.top}>
              <div className={nativeStyles.logo}>
                <BrandMark variant="monoline" size="lg" />
              </div>
              <span className={nativeStyles.appName}>Daniel 15K</span>
              <span className={nativeStyles.tagline}>Presupuesto, burn rate y decisiones{'\n'}con contexto real.</span>
            </div>

            <div className={nativeStyles.bottom}>
              {mobileLoading ? (
                <Spinner />
              ) : (
                <button
                  className={nativeStyles.googleButton}
                  onClick={() => void handleMobileGoogleLogin()}
                >
                  <svg className={nativeStyles.googleIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 10.2v3.9h5.4c-.2 1.2-.9 2.2-1.9 2.9v2.4h3.1c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.4-.2-2.1H12Z" fill="#4285F4"/>
                    <path d="M12 21c2.6 0 4.8-.9 6.4-2.4l-3.1-2.4c-.9.6-2 .9-3.3.9-2.5 0-4.7-1.7-5.5-4h-3.2v2.5A9.7 9.7 0 0 0 12 21Z" fill="#34A853"/>
                    <path d="M6.5 13.1A5.8 5.8 0 0 1 6.2 12c0-.4.1-.8.2-1.1V8.4H3.2A9.1 9.1 0 0 0 2.2 12c0 1.4.3 2.8 1 4l3.3-2.9Z" fill="#FBBC05"/>
                    <path d="M12 6.8c1.4 0 2.7.5 3.7 1.4l2.8-2.8A9.5 9.5 0 0 0 12 3a9.7 9.7 0 0 0-8.8 5.4l3.2 2.5c.8-2.4 3-4.1 5.6-4.1Z" fill="#EA4335"/>
                  </svg>
                  Continuar con Google
                </button>
              )}

              <Link className={nativeStyles.registerLink} to="/register">
                ¿No tienes cuenta? <span>Regístrate</span>
              </Link>
            </div>
          </div>
          {toast}
        </IonContent>
      </IonPage>
    );
  }

  if (isLoading && !schema) {
    return <Spinner />;
  }

  return (
    <AuthLayout title="Iniciar sesión">
      <div className={styles.stack}>
        <div className={styles.contentHeader}>
          <span className={styles.contentEyebrow}>Acceso rápido</span>
          <p className={styles.contentText}>Continúa con Google o entra con tu correo.</p>
        </div>

        <GoogleButton onClick={startGoogleOAuth} />

        <div className={styles.divider} aria-hidden="true">
          <span className={styles.line} />
          <span className={styles.dividerText}>o con email</span>
          <span className={styles.line} />
        </div>

        <FormSection
          title="Acceso con email"
          description="Usa tu correo para entrar. Si el esquema dinámico no carga, el formulario base sigue disponible."
        >
          {schemaError && !schema ? (
            <ErrorState
              title="No pudimos cargar el formulario dinámico"
              message={schemaError}
              onRetry={() => void fetchSchema('login-form')}
            />
          ) : null}

          {isLoading && !schema ? (
            <div style={{ display: 'grid', placeItems: 'center', padding: 'var(--space-4)' }}>
              <Spinner size="lg" />
            </div>
          ) : null}

          <DynamicForm
            schema={schema ?? fallbackSchema}
            submitLabel="Entrar"
            onSuccess={(response) => {
              hydrateAuth(response);
              history.replace(getLastAuthPath());
            }}
            onError={() => {
              showError('No se pudo iniciar sesión. Verifica tus credenciales.');
            }}
          />
        </FormSection>

        <Link className={styles.link} to="/register">
          ¿No tienes cuenta? Regístrate
        </Link>
        {toast}
      </div>
    </AuthLayout>
  );
};
