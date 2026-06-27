import { IonContent, IonIcon, IonPage } from '@ionic/react';
import {
  analyticsOutline,
  cardOutline,
  chatbubblesOutline,
  checkmarkCircleOutline,
  flashOutline,
  lockClosedOutline,
  pulseOutline,
  shieldCheckmarkOutline,
  trendingUpOutline,
  walletOutline,
} from 'ionicons/icons';
import { Link } from 'react-router-dom';
import { BrandMark } from '../../atoms/BrandMark';
import { useAuthStore } from '../../../store/authStore';
import styles from './LandingPage.module.css';

const intelligenceLayers = [
  {
    icon: walletOutline,
    label: 'Caja viva',
    text: 'Disponible real después de obligaciones, deuda y compras pendientes.',
  },
  {
    icon: analyticsOutline,
    label: 'Lectura conductual',
    text: 'Cada movimiento entra por intención: comprometido, necesario, inversión o elección.',
  },
  {
    icon: shieldCheckmarkOutline,
    label: 'Relaciones protegidas',
    text: 'Abonos, cuotas, tarjeta y recurrentes mantienen historial y saldo correcto.',
  },
];

const signalRows = [
  { label: 'Ingreso confirmado', value: '$7.500.000', tone: 'income', width: '100%' },
  { label: 'Compromisos blindados', value: '$3.420.000', tone: 'committed', width: '72%' },
  { label: 'Margen flexible', value: '$1.082.400', tone: 'investment', width: '46%' },
];

const systemSignals = [
  ['Completeness graph', 'Sabe qué falta, qué está confirmado y qué dato ya envejeció.'],
  ['Plan mensual ejecutable', 'El presupuesto deja de ser intención y se vuelve tablero de decisiones.'],
  ['Agente contextual', 'Antes de responder, cruza deuda, pagos, ingreso, recurrentes y flujo.'],
];

export const LandingPage = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const primaryPath = isAuthenticated ? '/dashboard' : '/login';
  const primaryLabel = isAuthenticated ? 'Abrir dashboard' : 'Entrar a Ascent';
  const navLabel = isAuthenticated ? 'Dashboard' : 'Entrar';

  return (
    <IonPage className={styles.page}>
      <IonContent fullscreen className={styles.content}>
        <header className={styles.nav}>
          <Link className={styles.brand} to="/">
            <BrandMark variant="monoline" size="md" />
            <span className={styles.brandText}>
              <span>Ascent</span>
              <strong>Ascent Finance</strong>
            </span>
          </Link>

          <nav className={styles.links} aria-label="Secciones">
            <a href="#sistema">Sistema</a>
            <a href="#inteligencia">Inteligencia</a>
            <a href="#agente">Agente</a>
          </nav>

          <Link className={styles.navButton} to={primaryPath}>
            {navLabel}
          </Link>
        </header>

        <main className={styles.main}>
          <section className={styles.hero}>
            <div className={styles.heroAmbient} aria-hidden="true">
              <span className={styles.ambientRing} />
              <span className={styles.ambientGrid} />
            </div>

            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Sistema financiero personal con agente</p>
              <h1>Ascent</h1>
              <p className={styles.heroText}>
                Un tablero privado que entiende caja, deuda, presupuesto vivo y decisiones diarias como partes del mismo sistema.
              </p>
              <div className={styles.heroActions}>
                <Link className={styles.primaryAction} to={primaryPath}>
                  {primaryLabel}
                </Link>
                <a className={styles.secondaryAction} href="#sistema">
                  Ver arquitectura
                </a>
              </div>
            </div>

            <div className={styles.livingSystem} aria-label="Sistema financiero vivo">
              <div className={styles.orbitStage}>
                <div className={`${styles.orbit} ${styles.orbitOuter}`} aria-hidden="true" />
                <div className={`${styles.orbit} ${styles.orbitInner}`} aria-hidden="true" />
                <div className={`${styles.node} ${styles.nodeIncome}`}>
                  <IonIcon icon={walletOutline} />
                  <span>Ingreso</span>
                </div>
                <div className={`${styles.node} ${styles.nodeDebt}`}>
                  <IonIcon icon={cardOutline} />
                  <span>Deuda</span>
                </div>
                <div className={`${styles.node} ${styles.nodeAgent}`}>
                  <IonIcon icon={pulseOutline} />
                  <span>Brain</span>
                </div>
                <div className={styles.coreSignal}>
                  <span>Hoy puedes mover</span>
                  <strong>$1.08M</strong>
                  <small>$1.082.400 disponibles sin romper caja ni obligaciones.</small>
                </div>
              </div>

              <div className={styles.signalPanel}>
                <div className={styles.panelTitle}>
                  <IonIcon icon={flashOutline} />
                  <span>Lectura de abril</span>
                </div>
                {signalRows.map((row) => (
                  <div className={styles.signalRow} key={row.label}>
                    <div className={styles.signalMeta}>
                      <span>{row.label}</span>
                      <strong>{row.value}</strong>
                    </div>
                    <div className={styles.track}>
                      <span
                        className={`${styles.fill} ${styles[row.tone]}`}
                        style={{ width: row.width }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className={styles.systemBand} id="sistema">
            <div className={styles.sectionHeader}>
              <p className={styles.eyebrow}>No es un landing genérico</p>
              <h2>La primera pantalla muestra el producto: un sistema que ordena decisiones, no una promesa suelta.</h2>
            </div>
            <div className={styles.signalGrid}>
              {systemSignals.map(([title, text], index) => (
                <article className={styles.signalCard} key={title}>
                  <span className={styles.index}>0{index + 1}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.intelligenceBand} id="inteligencia">
            <div className={styles.sectionHeader}>
              <p className={styles.eyebrow}>Premium por profundidad</p>
              <h2>La información se agrupa por capas de decisión.</h2>
            </div>
            <div className={styles.layerGrid}>
              {intelligenceLayers.map((layer) => (
                <article className={styles.layer} key={layer.label}>
                  <IonIcon icon={layer.icon} />
                  <h3>{layer.label}</h3>
                  <p>{layer.text}</p>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.agentBand} id="agente">
            <div className={styles.agentCopy}>
              <p className={styles.eyebrow}>Brain financiero</p>
              <h2>El agente registra con contexto y conserva las relaciones importantes.</h2>
              <p>
                Un pago a tarjeta reduce deuda; una compra con crédito entra al pool pendiente; un gasto recurrente cambia la lectura del mes.
              </p>
            </div>

            <div className={styles.conversation}>
              <div className={styles.messageOut}>
                Pagué $221.000 a LifeMiles por la cuota del iPhone.
              </div>
              <div className={styles.messageIn}>
                <IonIcon icon={checkmarkCircleOutline} />
                <span>Registrado como abono a deuda. Saldo actualizado y transacción ligada al plan mensual.</span>
              </div>
              <div className={styles.securityLine}>
                <IonIcon icon={lockClosedOutline} />
                <span>Contexto privado, trazable y corregible.</span>
              </div>
              <div className={styles.trendLine}>
                <IonIcon icon={trendingUpOutline} />
                <span>Impacto en margen flexible: +$221.000 liberados del pool.</span>
              </div>
              <div className={styles.messageOut}>
                ¿Puedo mover $450.000 a ahorro hoy?
              </div>
              <div className={styles.messageIn}>
                <IonIcon icon={chatbubblesOutline} />
                <span>Sí, pero dejaría $632.400 de margen. Mantén $180.000 para transporte y mercado.</span>
              </div>
            </div>
          </section>
        </main>
      </IonContent>
    </IonPage>
  );
};
