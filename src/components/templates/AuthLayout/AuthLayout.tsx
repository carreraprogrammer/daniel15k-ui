import type { ReactNode } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { BrandMark } from '../../atoms/BrandMark';
import styles from './AuthLayout.module.css';

export const AuthLayout = ({ title, children }: { title: string; children: ReactNode }) => (
  <IonPage className={styles.authPage}>
    <IonContent className={styles.authContent} fullscreen>
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroCard}>
            <div className={styles.brandLockup}>
              <BrandMark variant="principal" size="lg" />
              <div className={styles.brandText}>
                <span className={styles.eyebrow}>Daniel 15K</span>
                <strong className={styles.brandTitle}>Ascent Finance</strong>
              </div>
            </div>
            <div className={styles.copy}>
              <h1 className={styles.title}>{title}</h1>
              <p className={styles.description}>
                Controla tu mes desde una sola superficie: presupuesto, burn rate y decisiones
                con contexto real, no solo tracking.
              </p>
            </div>

            <div className={styles.metricRow}>
              <div className={styles.metricCard}>
                <strong>Presupuesto guiado</strong>
                <span>Ingresos, categorías y margen sin perder foco.</span>
              </div>
              <div className={styles.metricCard}>
                <strong>Señales útiles</strong>
                <span>Burn rate claro y lectura conductual del mes.</span>
              </div>
            </div>

            <div className={styles.signalRow}>
              <span className={styles.signalChip}>Dark glass</span>
              <span className={styles.signalChip}>Glow controlado</span>
              <span className={styles.signalChip}>Foco financiero</span>
            </div>
          </div>
        </section>
        <section className={styles.panel}>
          <div className={styles.panelGlow} aria-hidden="true" />
          <div className={styles.panelBody}>{children}</div>
        </section>
      </main>
    </IonContent>
  </IonPage>
);
