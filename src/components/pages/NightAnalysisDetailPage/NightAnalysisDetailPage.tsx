import { IonContent, IonIcon, IonPage } from '@ionic/react';
import { useEffect, useState } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import {
  chevronBackOutline,
  sparklesOutline,
  trophyOutline,
  warningOutline,
  ribbonOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
} from 'ionicons/icons';
import { financeService } from '../../../services/financeService';
import { formatCurrencyCompact } from '../../../utils/formatCurrency';
import type { AgentInsight, NightAnalysis } from '../../../types/finance.types';
import styles from './NightAnalysisDetailPage.module.css';

const insightIcon = (kind?: AgentInsight['insight_kind'] | null): string => {
  switch (kind) {
    case 'congratulation': return trophyOutline;
    case 'alert':          return warningOutline;
    case 'achievement':    return ribbonOutline;
    default:               return sparklesOutline;
  }
};

const CAT_NAMES: Record<string, string> = {
  committed:     'Comprometido',
  necessary:     'Necesario',
  discretionary: 'Discrecional',
  investment:    'Inversión',
  social:        'Social',
  income:        'Ingreso',
};

const HEALTH_LABELS: Record<string, { label: string; cls: string }> = {
  comfortable: { label: 'Tranquilo',  cls: styles.healthComfortable },
  warning:     { label: 'Justo',      cls: styles.healthWarning },
  critical:    { label: 'En rojo',    cls: styles.healthCritical },
};

const formatDate = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(y, m - 1, d));
};

export const NightAnalysisDetailPage = () => {
  const { date } = useParams<{ date: string }>();
  const history = useHistory();
  const location = useLocation<{ insight?: AgentInsight }>();
  const [analysis, setAnalysis] = useState<NightAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    financeService.fetchNightAnalysisByDate(date)
      .then((data) => setAnalysis(data))
      .catch(() => setAnalysis(null))
      .finally(() => setLoading(false));
  }, [date]);

  const insight = analysis?.agent_insight ?? location.state?.insight ?? null;
  const health = analysis ? HEALTH_LABELS[analysis.health_status] ?? null : null;

  return (
    <IonPage className={styles.page}>
      <div className={styles.topbar}>
        <button type="button" className={styles.iconBtn} onClick={() => history.goBack()}>
          <IonIcon icon={chevronBackOutline} />
        </button>
        <div className={styles.topbarCenter}>
          <span className={styles.topbarTitle}>Análisis nocturno</span>
          {date ? <span className={styles.topbarDate}>{formatDate(date)}</span> : null}
        </div>
        <div className={styles.iconBtn} style={{ visibility: 'hidden' }} />
      </div>

      <IonContent className={styles.content}>
        <div className={styles.stack}>
          {loading ? (
            <div className={styles.emptyState}>Cargando análisis…</div>
          ) : (
            <>
              {/* ── Insight card — visible aunque no haya NightAnalysis completo */}
              {insight ? (
                <div className={styles.insightCard}>
                  <div className={styles.insightIcon}>
                    <IonIcon icon={insightIcon(insight.insight_kind)} />
                  </div>
                  <div className={styles.insightBody}>
                    <p className={styles.insightTitle}>{insight.title}</p>
                    <p className={styles.insightText}>{insight.body}</p>
                  </div>
                </div>
              ) : null}

              {!analysis ? (
                <div className={styles.emptyState}>Sin datos de contexto para esta fecha.</div>
              ) : (
                <>

              {/* ── Estado financiero ────────────────────────────────────── */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Estado financiero</h3>
                <div className={styles.metricsRow}>
                  {health ? (
                    <div className={`${styles.metricChip} ${health.cls}`}>
                      <span className={styles.metricLabel}>Estado</span>
                      <span className={styles.metricValue}>{health.label}</span>
                    </div>
                  ) : null}
                  <div className={styles.metricChip}>
                    <span className={styles.metricLabel}>Margen</span>
                    <span className={styles.metricValue}>
                      {formatCurrencyCompact(analysis.commitment_gap)}
                    </span>
                  </div>
                  <div className={styles.metricChip}>
                    <span className={styles.metricLabel}>Ritmo diario</span>
                    <span className={styles.metricValue}>
                      {formatCurrencyCompact(analysis.daily_burn)}/día
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Transacciones esperadas ──────────────────────────────── */}
              {analysis.transactions_context.matched.length > 0 ? (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Gastos esperados</h3>
                  <div className={styles.txnList}>
                    {analysis.transactions_context.matched.map((tx) => (
                      <div key={tx.transaction_id} className={styles.txnRowMatched}>
                        <IonIcon icon={checkmarkCircleOutline} className={styles.txnMatchIcon} />
                        <div className={styles.txnInfo}>
                          <span className={styles.txnName}>{tx.obligation_name}</span>
                          {Math.abs(tx.delta) / tx.expected_amount > 0.05 ? (
                            <span className={styles.txnDelta}>
                              {tx.delta > 0 ? '+' : ''}{formatCurrencyCompact(tx.delta)} vs esperado
                            </span>
                          ) : null}
                        </div>
                        <span className={styles.txnAmt}>{formatCurrencyCompact(tx.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* ── Gastos a revisar ─────────────────────────────────────── */}
              {analysis.transactions_context.unmatched.length > 0 ? (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Gastos del día</h3>
                  <div className={styles.txnList}>
                    {analysis.transactions_context.unmatched.map((tx) => (
                      <div key={tx.transaction_id} className={styles.txnRow}>
                        <IonIcon icon={alertCircleOutline} className={styles.txnUnmatchIcon} />
                        <div className={styles.txnInfo}>
                          <span className={styles.txnName}>{tx.concept}</span>
                          <span className={styles.txnCat}>
                            {CAT_NAMES[tx.category_type] ?? tx.category_type}
                          </span>
                        </div>
                        <span className={styles.txnAmt}>{formatCurrencyCompact(tx.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* ── Alertas de categoría ─────────────────────────────────── */}
              {analysis.category_alerts.filter((a) => a.pct_used > 50).length > 0 ? (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Cómo van las gavetas</h3>
                  <div className={styles.alertList}>
                    {analysis.category_alerts
                      .filter((a) => a.pct_used > 50)
                      .map((alert) => (
                        <div key={alert.category_type} className={styles.alertRow}>
                          <div className={styles.alertHeader}>
                            <span className={styles.alertName}>
                              {CAT_NAMES[alert.category_type] ?? alert.category_type}
                            </span>
                            <span className={`${styles.alertBadge} ${
                              alert.status === 'over'       ? styles.alertOver :
                              alert.status === 'near_limit' ? styles.alertNear : ''
                            }`}>
                              {alert.pct_used}%
                            </span>
                          </div>
                          <div className={styles.alertBar}>
                            <div
                              className={`${styles.alertBarFill} ${
                                alert.status === 'over' ? styles.alertBarOver : ''
                              }`}
                              style={{ width: `${Math.min(alert.pct_used, 100)}%` }}
                            />
                          </div>
                          <div className={styles.alertAmounts}>
                            <span>{formatCurrencyCompact(alert.spent)} gastado</span>
                            <span>de {formatCurrencyCompact(alert.budget)}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : null}
                </>
              )}
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};
