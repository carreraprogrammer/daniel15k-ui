import { Link } from 'react-router-dom';
import { Button } from '../../atoms/Button';
import { useAuthStore } from '../../../store/authStore';
import styles from './Header.module.css';

export const Header = ({ currentSection }: { currentSection?: string }) => {
  const logout = useAuthStore((state) => state.logout);

  return (
    <header className={styles.header}>
      <div className={styles.brandBlock}>
        <span className={styles.kicker}>Daniel 15K</span>
        <strong className={styles.brand}>Finance Console</strong>
        {currentSection ? <span className={styles.section}>{currentSection}</span> : null}
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
