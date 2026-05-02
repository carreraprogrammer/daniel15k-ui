import { useEffect, useRef, type ReactNode } from 'react';
import { IonPage } from '@ionic/react';
import { NavLink, useLocation } from 'react-router-dom';
import { Header } from '../../organisms/Header';
import { CompletenessIndicator } from '../../molecules/CompletenessIndicator';
import { AgentEventRenderer } from '../../molecules/AgentEventRenderer';
import { rememberAuthPath } from '../../../utils/navigation';
import styles from './AppLayout.module.css';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/transactions', label: 'Transacciones' },
  { to: '/debts', label: 'Deudas' },
  { to: '/planned-expenses', label: 'Planes' },
  { to: '/recurring', label: 'Recurrentes' },
  { to: '/budgets', label: 'Presupuestos' },
  { to: '/profile', label: 'Mi perfil' },
];

export const AppLayout = ({ title, children }: { title: string; children: ReactNode }) => {
  const location = useLocation();
  const shellRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    rememberAuthPath(location.pathname);
  }, [location.pathname]);

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

  const renderNav = () => (
    <nav className={styles.nav}>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={styles.navLink}
          activeClassName={styles.navLinkActive}
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
          <Header currentSection={title} />
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

        <AgentEventRenderer />
        <CompletenessIndicator />
      </div>
    </IonPage>
  );
};
