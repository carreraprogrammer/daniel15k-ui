import { useAuthStore } from '../../../store/authStore';
import styles from './ImpersonationBanner.module.css';

export const ImpersonationBanner = () => {
  const impersonatedAccount = useAuthStore((state) => state.impersonatedAccount);
  const stopImpersonation   = useAuthStore((state) => state.stopImpersonation);

  if (!impersonatedAccount) return null;

  return (
    <div className={styles.banner} role="status">
      <span className={styles.label}>
        Estás viendo como <strong>{impersonatedAccount.name}</strong> · {impersonatedAccount.email}
      </span>
      <button type="button" className={styles.returnBtn} onClick={stopImpersonation}>
        Volver a mi cuenta
      </button>
    </div>
  );
};
