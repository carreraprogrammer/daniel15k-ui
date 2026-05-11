import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { IonIcon, IonPage } from '@ionic/react';
import { closeOutline, logOutOutline, personCircleOutline } from 'ionicons/icons';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Header } from '../../organisms/Header';
import { BrandMark } from '../../atoms/BrandMark';
import { BreadcrumbTrail, type BreadcrumbItem } from '../../organisms/BreadcrumbTrail';
import { CompletenessIndicator } from '../../molecules/CompletenessIndicator';
import { FloatingAgent } from '../../organisms/FloatingAgent';
import { rememberAuthPath } from '../../../utils/navigation';
import { useAuthStore } from '../../../store/authStore';
import { AppLayoutContext } from './AppLayoutContext';
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
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const logout = useAuthStore((state) => state.logout);
  const layoutContext = useMemo(() => ({ setBreadcrumbs }), []);

  useEffect(() => {
    rememberAuthPath(location.pathname);
    setBreadcrumbs([]);
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
    <AppLayoutContext.Provider value={layoutContext}>
      <IonPage className={styles.page}>
        <div ref={shellRef} className={styles.shell}>
          <div className={styles.backdrop} aria-hidden="true" />
          <div ref={headerRef} className={styles.headerSlot}>
            <Header currentSection={title} />
            <BreadcrumbTrail items={breadcrumbs} />
          </div>
          <div className={styles.grid}>
            <aside className={styles.sidebar}>
              <div className={styles.sidebarPanel}>
                <p className={styles.sidebarLabel}>Finanzas</p>
                {renderNav()}
              </div>
            </aside>
            <main className={styles.main}>
              <div className={styles.contentShell} data-agent-drag-surface="content">
                {children}
              </div>
            </main>
          </div>

          <CompletenessIndicator />
          <FloatingAgent />
        </div>
      </IonPage>
    </AppLayoutContext.Provider>
  );
};
