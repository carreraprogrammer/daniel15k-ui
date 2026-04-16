import type { ReactNode } from 'react';
import { BrandMark } from '../../atoms/BrandMark';
import styles from './AuthLayout.module.css';

export const AuthLayout = ({ title, children }: { title: string; children: ReactNode }) => (
  <main className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.brandLockup}>
        <BrandMark variant="principal" size="lg" />
        <div className={styles.brandText}>
          <span className={styles.eyebrow}>Daniel 15K</span>
          <strong className={styles.brandTitle}>Ascent Finance</strong>
        </div>
      </div>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description}>
        Entra a un sistema que no solo registra movimientos: te devuelve criterio, contexto y presión útil para tomar mejores decisiones.
      </p>
      <div className={styles.metricRow}>
        <div className={styles.metricCard}>
          <strong>Tiempo real</strong>
          <span>Telegram y dashboard sincronizados</span>
        </div>
        <div className={styles.metricCard}>
          <strong>Coaching</strong>
          <span>Lectura conductual, no solo tracking</span>
        </div>
      </div>
    </section>
    <section className={styles.panel}>
      <div className={styles.panelGlow} aria-hidden="true" />
      <div className={styles.panelBody}>{children}</div>
    </section>
  </main>
);
