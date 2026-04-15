import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Header } from '../../organisms/Header';
import styles from './AppLayout.module.css';

const getNavClassName = ({ isActive }: { isActive: boolean }) => [styles.navLink, isActive ? styles.navLinkActive : ''].filter(Boolean).join(' ');

export const AppLayout = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className={styles.shell}>
    <div className={styles.backdrop} aria-hidden="true" />
    <Header />
    <div className={styles.grid}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarPanel}>
          <p className={styles.sidebarLabel}>Finanzas</p>
          <nav className={styles.nav}>
            <NavLink to="/dashboard" className={getNavClassName}>
              Dashboard
            </NavLink>
            <NavLink to="/transactions" className={getNavClassName}>
              Transacciones
            </NavLink>
            <NavLink to="/debts" className={getNavClassName}>
              Deudas
            </NavLink>
            <NavLink to="/recurring" className={getNavClassName}>
              Recurrentes
            </NavLink>
            <NavLink to="/budgets" className={getNavClassName}>
              Presupuestos
            </NavLink>
            <NavLink to="/profile" className={getNavClassName}>
              Mi perfil
            </NavLink>
          </nav>
        </div>
      </aside>
      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <span className={styles.pageEyebrow}>Operación Manual</span>
          <h1 className={styles.title}>{title}</h1>
        </div>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  </div>
);
