import { IonContent, IonPage } from '@ionic/react';
import { Link } from 'react-router-dom';
import { BrandMark } from '../../atoms/BrandMark';
import { useAuthStore } from '../../../store/authStore';
import styles from './LandingPage.module.css';

const behaviorRows = [
  { label: 'Comprometido', value: '$3.420.000', tone: 'committed', caption: 'Carga fija protegida' },
  { label: 'Necesario', value: '$820.000', tone: 'necessary', caption: 'Mantenimiento del mes' },
  { label: 'Discrecional', value: '$410.000', tone: 'discretionary', caption: 'Elecciones visibles' },
  { label: 'Inversión', value: '$1.200.000', tone: 'investment', caption: 'Capital futuro' },
];

const features = [
  {
    title: 'Captura sin fricción',
    text: 'Registra gastos, ingresos y deuda desde Telegram o desde la app sin convertir cada movimiento en una tarea administrativa.',
  },
  {
    title: 'Caja real, no ruido',
    text: 'Separa compras con tarjeta, pagos efectivos y obligaciones estructurales para que el dinero disponible sea confiable.',
  },
  {
    title: 'Agente con contexto',
    text: 'El brain revisa deudas, recurrentes, presupuesto y flujo antes de responder o registrar una decisión financiera.',
  },
];

const workflow = [
  ['01', 'Escribes lo que pasó', 'Un mensaje natural basta: gasto, abono, ingreso o corrección.'],
  ['02', 'El sistema clasifica', 'Categoría conductual, medio de pago y relación estructural quedan resueltos.'],
  ['03', 'Decides con números', 'El dashboard muestra cuánto puedes mover sin romper caja ni obligaciones.'],
];

export const LandingPage = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const primaryPath = isAuthenticated ? '/dashboard' : '/login';
  const primaryLabel = isAuthenticated ? 'Abrir dashboard' : 'Entrar a la app';

  return (
    <IonPage className={styles.page}>
      <IonContent fullscreen className={styles.content}>
        <header className={styles.nav}>
          <Link className={styles.brand} to="/">
            <BrandMark variant="principal" size="sm" />
            <span className={styles.brandText}>
              <span className={styles.brandKicker}>Daniel 15K</span>
              <strong>Ascent Finance</strong>
            </span>
          </Link>

          <nav className={styles.links} aria-label="Secciones">
            <a href="#flujo">Flujo</a>
            <a href="#sistema">Sistema</a>
            <a href="#agente">Agente</a>
          </nav>

          <Link className={styles.navButton} to={primaryPath}>
            {primaryLabel}
          </Link>
        </header>

        <main>
          <section className={styles.hero}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Finanzas personales operadas por agente</p>
              <h1>Ascent Finance</h1>
              <p className={styles.heroText}>
                Una superficie privada para ver caja disponible, deuda, compras pendientes y decisiones del mes sin perderte en planillas.
              </p>
              <div className={styles.actions}>
                <Link className={styles.primaryAction} to={primaryPath}>
                  {primaryLabel}
                </Link>
                <a className={styles.secondaryAction} href="#sistema">
                  Ver sistema
                </a>
              </div>
            </div>

            <div className={styles.productSurface} aria-label="Vista resumida del producto">
              <div className={styles.surfaceTop}>
                <span>Hoy puedes mover</span>
                <strong>$1.082.400</strong>
                <small>Después de deudas, recurrentes y compras pendientes.</small>
              </div>

              <div className={styles.surfaceGrid}>
                <section className={styles.metricPanel}>
                  <span>Pool tarjeta crédito</span>
                  <strong>$238.000</strong>
                  <small>4 compras pendientes de pago</small>
                </section>
                <section className={styles.metricPanel}>
                  <span>Deuda prioritaria</span>
                  <strong>$7.327.886</strong>
                  <small>TC LifeMiles #7248</small>
                </section>
              </div>

              <div className={styles.behaviorPanel}>
                <div className={styles.panelHeader}>
                  <span>Lectura conductual</span>
                  <small>Abril</small>
                </div>
                {behaviorRows.map((row) => (
                  <div className={styles.behaviorRow} key={row.label}>
                    <span className={`${styles.colorRail} ${styles[row.tone]}`} aria-hidden="true" />
                    <div>
                      <strong>{row.label}</strong>
                      <small>{row.caption}</small>
                    </div>
                    <span className={styles.rowValue}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className={styles.workflow} id="flujo">
            {workflow.map(([step, title, text]) => (
              <article className={styles.workflowItem} key={step}>
                <span>{step}</span>
                <h2>{title}</h2>
                <p>{text}</p>
              </article>
            ))}
          </section>

          <section className={styles.systemSection} id="sistema">
            <div className={styles.sectionIntro}>
              <p className={styles.eyebrow}>Arquitectura de decisión</p>
              <h2>El sistema separa movimientos diarios de obligaciones estructurales.</h2>
            </div>

            <div className={styles.featureGrid}>
              {features.map((feature) => (
                <article className={styles.featureCard} key={feature.title}>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.agentSection} id="agente">
            <div className={styles.agentCopy}>
              <p className={styles.eyebrow}>Brain financiero</p>
              <h2>El agente no solo registra: mantiene relaciones.</h2>
              <p>
                Una cuota del iPhone descuenta deuda; una compra diaria con tarjeta entra al pool; un abono queda en el historial correcto.
              </p>
            </div>

            <div className={styles.chatPanel}>
              <div className={styles.messageOut}>Se descontaron $221.000 de la TC LifeMiles por el iPhone.</div>
              <div className={styles.messageIn}>
                Registrado como abono a deuda. La transacción quedó ligada a TC LifeMiles #7248 y el saldo bajó a $7.327.886.
              </div>
            </div>
          </section>
        </main>
      </IonContent>
    </IonPage>
  );
};
