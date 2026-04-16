import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../templates/AuthLayout';
import { Spinner } from '../../atoms/Spinner';
import { DynamicForm } from '../../organisms/DynamicForm';
import { GoogleButton } from '../../atoms/GoogleButton';
import { useAuthStore } from '../../../store/authStore';
import { useFormStore } from '../../../store/formStore';
import { useToast } from '../../../hooks/useToast';
import { startGoogleOAuth } from '../../../services/authService';
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
  const fetchSchema = useFormStore((state) => state.fetchSchema);
  const hydrateAuth = useAuthStore((state) => state.hydrateAuth);
  const location = useLocation();
  const navigate = useNavigate();
  const { showError, toast } = useToast();
  const oauthError = (location.state as { oauthError?: string } | null)?.oauthError;

  useEffect(() => {
    void fetchSchema('login-form').catch(() => undefined);
  }, [fetchSchema]);

  useEffect(() => {
    if (!oauthError) {
      return;
    }

    showError(oauthError);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, navigate, oauthError, showError]);

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

        <DynamicForm
          schema={schema ?? fallbackSchema}
          onSuccess={(response) => {
            console.log('[LoginPage] onSuccess:response', response);
            hydrateAuth(response);
            console.log('[LoginPage] onSuccess:afterHydrate', useAuthStore.getState());
            navigate('/dashboard', { replace: true });
          }}
          onError={(error) => {
            console.error('[LoginPage] onError', error);
            showError('No se pudo iniciar sesión. Verifica tus credenciales.');
          }}
        />

        <Link className={styles.link} to="/register">
          ¿No tienes cuenta? Regístrate
        </Link>
        {toast}
      </div>
    </AuthLayout>
  );
};
