import { IonContent, IonIcon, IonPage } from '@ionic/react';
import { useEffect, useState } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import {
  chevronBackOutline,
  optionsOutline,
  checkmarkOutline,
  copyOutline,
  cardOutline,
  helpCircleOutline,
  cartOutline,
} from 'ionicons/icons';
import { financeService } from '../../../services/financeService';
import { formatCurrencyCompact } from '../../../utils/formatCurrency';
import type { AgentInsight, NightAnalysis, NightAnalysisTransactionContext } from '../../../types/finance.types';
import { CoachNote } from '../../molecules/CoachNote/CoachNote';
import { StatusStrip } from '../../molecules/StatusStrip/StatusStrip';
import { CategoryPressureCard } from '../../molecules/CategoryPressureCard/CategoryPressureCard';
import { ReasoningAccordion } from '../../molecules/ReasoningAccordion/ReasoningAccordion';
import { InsightTabBar } from '../../molecules/InsightTabBar/InsightTabBar';
import type { CategoryType } from '../../molecules/CategoryPressureCard/CategoryPressureCard';
import styles from './NightAnalysisDetailPage.module.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

const CAT_NAMES: Record<string, string> = {
  committed:     'Comprometido',
  necessary:     'Necesario',
  discretionary: 'Flexible',
  investment:    'Inversión',
  social:        'Social',
  income:        'Ingreso',
};

const HEALTH_LABELS: Record<string, { label: string; tone: 'warn' | 'bad' | undefined }> = {
  comfortable: { label: 'Tranquilo',  tone: undefined },
  warning:     { label: 'Justo',      tone: 'warn' },
  critical:    { label: 'En rojo',    tone: 'bad' },
};

const formatDate = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', weekday: 'long' }).format(date);
};

const formatTime = (iso: string): string => {
  return new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso));
};

type ReviewItem = NonNullable<NightAnalysisTransactionContext['needs_review']>[number];

const REVIEW_ASK: Record<ReviewItem['reason'], string> = {
  no_classification:  'No supe en qué gaveta ponerlo. ¿Me ayudas a clasificarlo?',
  deduplication_risk: 'Esto se parece mucho a un movimiento que ya tenías registrado.',
  possible_debt:      'Esto parece un pago de deuda. ¿Lo vinculo a una deuda?',
};

const reviewIconMap: Record<ReviewItem['reason'], string> = {
  no_classification:  helpCircleOutline,
  deduplication_risk: copyOutline,
  possible_debt:      cardOutline,
};

// ── ReviewCard ────────────────────────────────────────────────────────────────

interface ReviewCardProps {
  item: ReviewItem;
  onDismiss: (id: number) => void;
}

const ReviewCard = ({ item, onDismiss }: ReviewCardProps) => {
  const reasonClass =
    item.reason === 'deduplication_risk' ? styles.reviewIconDedup :
    item.reason === 'possible_debt'      ? styles.reviewIconDebt : '';

  return (
    <div className={styles.reviewCard}>
      <div className={styles.reviewHead}>
        <div className={`${styles.reviewIcon} ${reasonClass}`}>
          <IonIcon icon={reviewIconMap[item.reason]} />
        </div>
        <div className={styles.reviewInfo}>
          <span className={styles.reviewConcept}>{item.concept}</span>
          <span className={styles.reviewMeta}>
            {formatCurrencyCompact(item.amount)} · {item.date}
          </span>
        </div>
      </div>

      <div className={styles.reviewAsk}>
        {item.notes ?? REVIEW_ASK[item.reason]}
      </div>

      <div className={styles.reviewActions}>
        {item.reason === 'no_classification' && (
          <>
            <button type="button" className={styles.btnPrimary}>
              <IonIcon icon={checkmarkOutline} /> Clasificar
            </button>
            <button type="button" className={styles.btnGhost} onClick={() => onDismiss(item.transaction_id)}>
              Descartar
            </button>
          </>
        )}
        {item.reason === 'deduplication_risk' && (
          <>
            <button type="button" className={styles.btnPrimary}>
              <IonIcon icon={checkmarkOutline} /> Es duplicado
            </button>
            <button type="button" className={styles.btnGhost} onClick={() => onDismiss(item.transaction_id)}>
              Son distintos
            </button>
          </>
        )}
        {item.reason === 'possible_debt' && (
          <>
            <button type="button" className={styles.btnPrimary}>
              <IonIcon icon={checkmarkOutline} /> Vincular
            </button>
            <button type="button" className={styles.btnGhost} onClick={() => onDismiss(item.transaction_id)}>
              No, es otra cosa
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

export const NightAnalysisDetailPage = () => {
  const { date } = useParams<{ date: string }>();
  const history = useHistory();
  const location = useLocation<{ insight?: AgentInsight }>();
  const [analysis, setAnalysis] = useState<NightAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const dismiss = (id: number) => setDismissed((prev) => new Set(prev).add(id));

  useEffect(() => {
    setLoading(true);
    financeService.fetchNightAnalysisByDate(date)
      .then(setAnalysis)
      .catch(() => setAnalysis(null))
      .finally(() => setLoading(false));
  }, [date]);

  const insight = analysis?.agent_insight ?? location.state?.insight ?? null;
  const health = analysis ? HEALTH_LABELS[analysis.health_status] : null;
  const reviews = (analysis?.transactions_context.needs_review ?? []).filter((r) => !dismissed.has(r.transaction_id));
  const matched = analysis?.transactions_context.matched ?? [];
  const unmatched = analysis?.transactions_context.unmatched ?? [];
  const pressureAlerts = (analysis?.category_alerts ?? []).filter((a) => a.pct_used > 50);

  // Derive month/year from date param for tab navigation (YYYY-MM-DD or DD/MM)
  const tabDate = date;
  const parsedDate = (() => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return new Date(date);
    const [d2, m2] = date.split('/').map(Number);
    return new Date(new Date().getFullYear(), m2 - 1, d2);
  })();
  const tabMonth = parsedDate.getMonth() + 1;
  const tabYear = parsedDate.getFullYear();

  return (
    <IonPage className={styles.page}>
      {/* Header */}
      <div className={styles.topbar}>
        <button type="button" className={styles.iconBtn} onClick={() => history.goBack()}>
          <IonIcon icon={chevronBackOutline} />
        </button>
        <div className={styles.crumb}>
          <span className={styles.crumbKind}>Análisis nocturno</span>
          {date ? <span className={styles.crumbDate}>{formatDate(date)}</span> : null}
        </div>
        <div className={styles.iconBtn} style={{ visibility: 'hidden' }}>
          <IonIcon icon={optionsOutline} />
        </div>
      </div>

      <IonContent className={styles.content}>
        <div className={styles.scroll}>

          {loading ? (
            <div className={styles.empty}>Cargando análisis…</div>
          ) : (
            <>
              {/* Coach note */}
              {insight ? (
                <CoachNote
                  body={insight.body}
                  meta={[
                    `Generado a las ${formatTime(insight.generated_at)}`,
                    ...(reviews.length > 0 ? [`${reviews.length} movimiento${reviews.length > 1 ? 's' : ''} esperan tu ayuda`] : []),
                  ]}
                />
              ) : null}

              {/* Status strip */}
              {analysis ? (
                <StatusStrip cells={[
                  { label: 'Estado', value: health?.label ?? '—', tone: health?.tone },
                  { label: 'Margen', value: formatCurrencyCompact(analysis.commitment_gap) },
                  { label: 'Ritmo', value: `${formatCurrencyCompact(analysis.daily_burn)}/día` },
                ]} />
              ) : null}

              {!analysis ? (
                <div className={styles.empty}>Sin datos de contexto para esta fecha.</div>
              ) : (
                <>
                  {/* Needs review — action-first */}
                  {reviews.length > 0 ? (
                    <>
                      <div className={styles.secHead}>
                        <h3 className={styles.secTitle}>Necesito tu ayuda</h3>
                        <span className={styles.secMeta}>{reviews.length} pendientes</span>
                      </div>
                      <div className={styles.helpBlock}>
                        <div className={styles.helpIntro}>
                          <div className={styles.helpIcon} aria-hidden="true" />
                          <div className={styles.helpText}>
                            <p className={styles.helpTitle}>
                              No entendí {reviews.length} movimiento{reviews.length > 1 ? 's' : ''}.
                            </p>
                            <p className={styles.helpSub}>
                              Si los aclarás ahora, mañana mi análisis va a ser más exacto. Te toma menos de un minuto.
                            </p>
                          </div>
                        </div>
                        {reviews.map((r) => <ReviewCard key={r.transaction_id} item={r} onDismiss={dismiss} />)}
                      </div>
                    </>
                  ) : null}

                  {/* Matched obligations */}
                  {matched.length > 0 ? (
                    <>
                      <div className={styles.secHead}>
                        <h3 className={styles.secTitle}>Lo que esperaba ver</h3>
                        <span className={styles.secMeta}>{matched.length} cumplidos</span>
                      </div>
                      <div className={styles.list}>
                        {matched.map((m) => (
                          <div key={m.transaction_id} className={styles.row}>
                            <div className={styles.rowIconCheck}>
                              <IonIcon icon={checkmarkOutline} />
                            </div>
                            <div className={styles.rowBody}>
                              <span className={styles.rowName}>{m.obligation_name}</span>
                              {Math.abs(m.delta) / m.expected_amount > 0.05 ? (
                                <span className={styles.rowMeta}>
                                  {m.delta > 0 ? '+' : ''}{formatCurrencyCompact(m.delta)} vs esperado
                                </span>
                              ) : null}
                            </div>
                            <span className={styles.rowAmt}>{formatCurrencyCompact(m.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}

                  {/* Unmatched transactions */}
                  {unmatched.length > 0 ? (
                    <>
                      <div className={styles.secHead}>
                        <h3 className={styles.secTitle}>Otros movimientos del día</h3>
                      </div>
                      <div className={styles.list}>
                        {unmatched.map((u) => (
                          <div key={u.transaction_id} className={styles.row}>
                            <div className={styles.rowIconWarn}>
                              <IonIcon icon={cartOutline} />
                            </div>
                            <div className={styles.rowBody}>
                              <span className={styles.rowName}>{u.concept}</span>
                              <span className={styles.rowMeta}>{CAT_NAMES[u.category_type] ?? u.category_type}</span>
                            </div>
                            <span className={styles.rowAmt}>{formatCurrencyCompact(u.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}

                  {/* Category pressure */}
                  {pressureAlerts.length > 0 ? (
                    <>
                      <div className={styles.secHead}>
                        <h3 className={styles.secTitle}>Gavetas con presión</h3>
                      </div>
                      <div className={styles.pressureList}>
                        {pressureAlerts.map((a) => (
                          <CategoryPressureCard
                            key={a.category_type}
                            name={CAT_NAMES[a.category_type] ?? a.category_type}
                            pct={a.pct_used}
                            spent={a.spent}
                            limit={a.budget}
                            category={a.category_type as CategoryType}
                          />
                        ))}
                      </div>
                    </>
                  ) : null}

                  {/* Reasoning */}
                  {analysis.agent_reasoning ? (
                    <ReasoningAccordion text={analysis.agent_reasoning} />
                  ) : null}
                </>
              )}
            </>
          )}
          <InsightTabBar active="nocturno" date={tabDate} month={tabMonth} year={tabYear} />
        </div>
      </IonContent>
    </IonPage>
  );
};
