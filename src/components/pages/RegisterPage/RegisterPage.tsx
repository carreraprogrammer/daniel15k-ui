import { Link, useHistory } from 'react-router-dom';
import { AuthLayout } from '../../templates/AuthLayout';
import { DynamicForm } from '../../organisms/DynamicForm';
import { GoogleButton } from '../../atoms/GoogleButton';
import { startGoogleOAuth } from '../../../services/authService';
import { useAuthStore } from '../../../store/authStore';
import { useToast } from '../../../hooks/useToast';
import styles from '../AuthPage.module.css';

const schema = {
  slug: 'register-form',
  title: 'Register',
  submit_endpoint: '/api/v1/auth/register',
  submit_method: 'POST' as const,
  fields: [
    { name: 'name', type: 'text' as const, label: 'Nombre' },
    { name: 'email', type: 'email' as const, label: 'Email' },
    { name: 'password', type: 'password' as const, label: 'Password' },
  ],
};

export const RegisterPage = () => {
  const hydrateAuth = useAuthStore((state) => state.hydrateAuth);
  const history = useHistory();
  const { showError, toast } = useToast();

  return (
    <AuthLayout title="Registro">
      <div className={styles.stack}>
        <div className={styles.contentHeader}>
          <span className={styles.contentEyebrow}>Crear acceso</span>
          <p className={styles.contentText}>Empieza con Google o crea tu acceso con email.</p>
        </div>

        <GoogleButton onClick={startGoogleOAuth} />

        <div className={styles.divider} aria-hidden="true">
          <span className={styles.line} />
          <span className={styles.dividerText}>o regístrate con email</span>
          <span className={styles.line} />
        </div>

        <DynamicForm
          schema={schema}
          onSuccess={(response) => {
            console.log('[RegisterPage] onSuccess:response', response);
            hydrateAuth(response);
            console.log('[RegisterPage] onSuccess:afterHydrate', useAuthStore.getState());
            history.replace('/dashboard');
          }}
          onError={(error) => {
            console.error('[RegisterPage] onError', error);
            showError('No se pudo completar el registro.');
          }}
        />

        <Link className={styles.link} to="/login">
          ¿Ya tienes cuenta? Inicia sesión
        </Link>
        {toast}
      </div>
    </AuthLayout>
  );
};
