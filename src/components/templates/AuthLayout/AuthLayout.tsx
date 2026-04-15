import type { ReactNode } from 'react';
import styles from './AuthLayout.module.css';

export const AuthLayout = ({ title, children }: { title: string; children: ReactNode }) => (
  <main className={styles.page}>
    <section className={styles.hero}>
      <span className={styles.eyebrow}>Workspace Access</span>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description}>
        Accede a un panel moderno para gestionar usuarios, perfiles y formularios con una experiencia clara y consistente.
      </p>
      <div className={styles.metricRow}>
        <div className={styles.metricCard}>
          <strong>24/7</strong>
          <span>Operación continua</span>
        </div>
        <div className={styles.metricCard}>
          <strong>SSO</strong>
          <span>Ingreso con Google</span>
        </div>
      </div>
    </section>
    <section className={styles.panel}>
      <div className={styles.panelGlow} aria-hidden="true" />
      <div className={styles.panelBody}>{children}</div>
    </section>
  </main>
);
