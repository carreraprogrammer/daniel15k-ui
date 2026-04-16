import { IonIcon } from '@ionic/react';
import { menuOutline } from 'ionicons/icons';
import { Link } from 'react-router-dom';
import { Button } from '../../atoms/Button';
import { BrandMark } from '../../atoms/BrandMark';
import { useAuthStore } from '../../../store/authStore';
import styles from './Header.module.css';

export const Header = ({
  currentSection,
  onMenuToggle,
  menuOpen = false,
}: {
  currentSection?: string;
  onMenuToggle?: () => void;
  menuOpen?: boolean;
}) => {
  const logout = useAuthStore((state) => state.logout);

  return (
    <header className={styles.header}>
      <div className={styles.brandBlock}>
        <button
          type="button"
          className={styles.menuButton}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
          onClick={onMenuToggle}
        >
          <IonIcon icon={menuOutline} />
        </button>
        <div className={styles.brandIdentity}>
          <BrandMark variant="monoline" size="md" />
          <div className={styles.brandCopy}>
            <span className={styles.kicker}>Daniel 15K</span>
            <strong className={styles.brand}>Ascent Finance</strong>
            {currentSection ? <span className={styles.section}>{currentSection}</span> : null}
          </div>
        </div>
      </div>
      <div className={styles.actions}>
        <nav className={styles.nav}>
          <Link to="/profile" className={styles.link}>
            Mi perfil
          </Link>
          <Button label="Cerrar sesion" variant="ghost" onClick={() => void logout()} />
        </nav>
      </div>
    </header>
  );
};
