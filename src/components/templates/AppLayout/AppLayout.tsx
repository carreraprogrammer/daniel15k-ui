import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IonIcon, IonPage } from '@ionic/react';
import { closeOutline, logOutOutline, personCircleOutline } from 'ionicons/icons';
import { NavLink, useLocation } from 'react-router-dom';
import { Header } from '../../organisms/Header';
import { BrandMark } from '../../atoms/BrandMark';
import { Button } from '../../atoms/Button';
import { CompletenessIndicator } from '../../molecules/CompletenessIndicator';
import { AgentEventRenderer } from '../../molecules/AgentEventRenderer';
import { useAuthStore } from '../../../store/authStore';
import { rememberAuthPath } from '../../../utils/navigation';
import styles from './AppLayout.module.css';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/transactions', label: 'Transacciones' },
  { to: '/debts', label: 'Deudas' },
  { to: '/planned-expenses', label: 'Planeados' },
  { to: '/recurring', label: 'Recurrentes' },
  { to: '/budgets', label: 'Presupuestos' },
  { to: '/savings-goals', label: 'Metas' },
  { to: '/profile', label: 'Mi perfil' },
];

export const AppLayout = ({ title, children }: { title: string; children: ReactNode }) => {
  const logout = useAuthStore((state) => state.logout);
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    rememberAuthPath(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle('menu-open', mobileMenuOpen);
    return () => document.body.classList.remove('menu-open');
  }, [mobileMenuOpen]);

  useEffect(() => {
    const shell = shellRef.current;
    const header = headerRef.current;
    if (!shell || !header || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const syncHeaderHeight = () => {
      shell.style.setProperty('--app-header-height', `${header.getBoundingClientRect().height}px`);
    };

    syncHeaderHeight();

    const observer = new ResizeObserver(() => {
      syncHeaderHeight();
    });

    observer.observe(header);

    return () => observer.disconnect();
  }, []);

  const closeMenu = () => setMobileMenuOpen(false);

  const renderNav = (onNavigate?: () => void) => (
    <nav className={styles.nav}>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={styles.navLink}
          activeClassName={styles.navLinkActive}
          onClick={onNavigate}
          exact
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <IonPage className={styles.page}>
      <div ref={shellRef} className={styles.shell}>
        <div className={styles.backdrop} aria-hidden="true" />
        <div ref={headerRef} className={styles.headerSlot}>
          <Header currentSection={title} onMenuToggle={() => setMobileMenuOpen((open) => !open)} menuOpen={mobileMenuOpen} />
        </div>
        <div className={styles.grid}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarPanel}>
              <p className={styles.sidebarLabel}>Finanzas</p>
              {renderNav()}
            </div>
          </aside>
          <main className={styles.main}>
            <div className={styles.contentShell}>
              {children}
            </div>
          </main>
        </div>

          <div
            className={[styles.mobileMenuBackdrop, mobileMenuOpen ? styles.mobileMenuBackdropVisible : ''].filter(Boolean).join(' ')}
            aria-hidden={mobileMenuOpen ? 'false' : 'true'}
            onClick={closeMenu}
          />

          <aside className={[styles.mobileMenu, mobileMenuOpen ? styles.mobileMenuOpen : ''].filter(Boolean).join(' ')}>
            <div className={styles.mobileMenuHeader}>
              <div className={styles.mobileMenuBrand}>
                <BrandMark variant="monoline" size="md" />
                <div>
                  <span className={styles.mobileMenuKicker}>Daniel 15K</span>
                  <h2 className={styles.mobileMenuTitle}>Ascent Finance</h2>
                </div>
              </div>
              <button type="button" className={styles.mobileMenuClose} aria-label="Cerrar menú" onClick={closeMenu}>
                <IonIcon icon={closeOutline} />
              </button>
            </div>

            <section className={styles.mobileMenuSection}>
              <p className={styles.mobileMenuLabel}>Finanzas</p>
              {renderNav(closeMenu)}
            </section>

            <section className={styles.mobileMenuSection}>
              <p className={styles.mobileMenuLabel}>Cuenta</p>
              <NavLink to="/profile" className={styles.utilityLink} onClick={closeMenu} exact>
                <IonIcon icon={personCircleOutline} />
                <span>Mi perfil</span>
              </NavLink>
              <Button
                label="Cerrar sesión"
                variant="ghost"
                iconLeft={<IonIcon icon={logOutOutline} />}
                onClick={() => {
                  closeMenu();
                  void logout();
                }}
                fullWidth
              />
            </section>
          </aside>

          <AgentEventRenderer />
          <CompletenessIndicator />
        </div>
    </IonPage>
  );
};
