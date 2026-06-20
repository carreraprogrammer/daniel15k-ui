import { useEffect } from 'react';
import { Button } from '../../atoms/Button';
import { useAuthStore } from '../../../store/authStore';
import { useEmailConnectionStore } from '../../../store/emailConnectionStore';
import styles from './GmailReconnectBanner.module.css';

/**
 * Banner global y persistente que aparece cuando el refresh token de Gmail murió
 * (needs_reconnect=true). A diferencia de la tarjeta transitoria del agente, este
 * se queda visible hasta que el usuario reconecta, para que el aviso no se pierda.
 */
export const GmailReconnectBanner = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const needsReconnect = useEmailConnectionStore((state) => state.needsReconnect);
  const actionLoading = useEmailConnectionStore((state) => state.actionLoading);
  const fetchStatus = useEmailConnectionStore((state) => state.fetchStatus);
  const startOAuth = useEmailConnectionStore((state) => state.startOAuth);

  // Conocer el estado apenas el usuario está autenticado, en cualquier pantalla.
  useEffect(() => {
    if (isAuthenticated) void fetchStatus();
  }, [isAuthenticated, fetchStatus]);

  if (!isAuthenticated || !needsReconnect) return null;

  return (
    <div className={styles.banner} role="alert">
      <div className={styles.text}>
        <strong className={styles.title}>Reconectá tu Gmail</strong>
        <span className={styles.body}>
          Perdí el acceso a tu correo y dejé de registrar tus movimientos automáticamente.
        </span>
      </div>
      <Button
        label="Reconectar"
        size="sm"
        variant="primary"
        loading={actionLoading}
        onClick={() => void startOAuth()}
      />
    </div>
  );
};
