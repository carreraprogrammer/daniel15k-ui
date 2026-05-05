import { useEffect, useState } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import { isPlatform } from '@ionic/react';
import { AuthLayout } from '../../templates/AuthLayout';
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
      <AuthLayout title="Daniel 15K">
        <div className={styles.stack} style={{ justifyContent: 'center', flex: 1, gap: 'var(--space-8)' }}>
          <div className={styles.contentHeader} style={{ textAlign: 'center' }}>
            <p className={styles.contentText}>Inicia sesión para continuar</p>
          </div>

          {mobileLoading ? (
            <Spinner />
          ) : (
            <GoogleButton onClick={() => void handleMobileGoogleLogin()} />
          )}

          <Link className={styles.link} to="/register" style={{ textAlign: 'center' }}>
            ¿No tienes cuenta? Regístrate
          </Link>
        </div>
        {toast}
      </AuthLayout>
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
