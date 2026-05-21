import { IonContent, IonIcon, IonPage } from '@ionic/react';
import { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import {
  chevronBackOutline,
  chevronForwardOutline,
  flagOutline,
  flameOutline,
} from 'ionicons/icons';
import { financeService } from '../../../services/financeService';
import { formatCurrencyCompact } from '../../../utils/formatCurrency';
import type { SummaryResponse, UserMilestone } from '../../../types/finance.types';
import { CoachNote } from '../../molecules/CoachNote/CoachNote';
import { StatusStrip } from '../../molecules/StatusStrip/StatusStrip';
import { CategoryPressureCard } from '../../molecules/CategoryPressureCard/CategoryPressureCard';
import { ReasoningAccordion } from '../../molecules/ReasoningAccordion/ReasoningAccordion';
import { InsightTabBar } from '../../molecules/InsightTabBar/InsightTabBar';
import type { CategoryType } from '../../molecules/CategoryPressureCard/CategoryPressureCard';
import styles from './MonthlyInsightDetailPage.module.css';

const MONTH_NAMES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const MILESTONE_LABELS: Record<string, string> = {
  first_transaction:           'Primera transacción registrada',
  streak_7:                    '7 días de racha',
  streak_30:                   '30 días de racha',
  debt_paid_off:               'Deuda liquidada',
  budget_under:                'Mes bajo presupuesto',
  savings_goal_completed:      'Meta de ahorro completada',
  discretionary_under_budget:  'Flexible bajo presupuesto',
  overflow_received:           'Excedente recibido',
  plan_confirmed:              'Plan mensual confirmado',
};

// ── Score ring ─────────────────────────────────────────────────────────────

const ScoreRing = ({ value, size = 86 }: { value: number; size?: number }) => {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={styles.ring}>
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth="6" fill="none" className={styles.ringTrack} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        strokeWidth="6" fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className={styles.ringFill}
      />
    </svg>
  );
};

// ── Helpers ────────────────────────────────────────────────────────────────

type BurnCategory = NonNullable<SummaryResponse['burn_rate']>['categories'][number];

function computeScore(categories: BurnCategory[], netBalance: number): number {
  if (!categories || categories.length === 0) return 0;
  const over = categories.filter((c) => c.pct > 100).length;
  const warn = categories.filter((c) => c.pct > 80 && c.pct <= 100).length;
  let score = 100 - over * 12 - warn * 4;
  if (netBalance > 0) score += 5;
  return Math.min(100, Math.max(0, Math.round(score)));
}

// ── Page ──────────────────────────────────────────────────────────────────

export const MonthlyInsightDetailPage = () => {
  const { month, year } = useParams<{ month: string; year: string }>();
  const history = useHistory();
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [milestones, setMilestones] = useState<UserMilestone[]>([]);
  const [loading, setLoading] = useState(true);

  const m = Number(month);
  const y = Number(year);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      financeService.fetchSummary(m, y),
      financeService.fetchMilestones(),
    ])
      .then(([s, ms]) => { setSummary(s); setMilestones(ms); })
      .catch(() => { setSummary(null); setMilestones([]); })
      .finally(() => setLoading(false));
  }, [m, y]);

  const categories = summary?.burn_rate?.categories ?? [];
  const overCategories = categories.filter((c) => c.pct > 100);
  const underCategories = categories.filter((c) => c.pct <= 100);
  const savings = summary?.savings_goals ?? [];
  const netBalance = summary?.balance.net_balance ?? 0;

  const score = summary ? computeScore(categories, netBalance) : null;

  const coachBody = overCategories.length > 0
    ? `Cerraste ${MONTH_NAMES[m]} con ${overCategories.length} gaveta${overCategories.length > 1 ? 's' : ''} sobre presupuesto. La balanza ${netBalance >= 0 ? 'dio positiva' : 'quedó en rojo'}.`
    : `Cerraste ${MONTH_NAMES[m]} dentro del plan. El balance neto fue ${formatCurrencyCompact(netBalance)}.`;

  const incomeActual = summary?.balance.income_confirmed ?? 0;
  const expenseActual = summary?.balance.expense_confirmed ?? 0;

  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  const ctaTitle = overCategories.length > 0
    ? `Ajusta ${overCategories.map((c) => c.category).join(' y ')} para ${MONTH_NAMES[nextMonth]}`
    : `Sigue el plan de ${MONTH_NAMES[nextMonth]}`;

  return (
    <IonPage className={styles.page}>
      <div className={styles.topbar}>
        <button type="button" className={styles.iconBtn} onClick={() => history.goBack()}>
          <IonIcon icon={chevronBackOutline} />
        </button>
        <div className={styles.crumb}>
          <span className={styles.crumbKind}>Cierre de mes</span>
          <span className={styles.crumbDate}>{MONTH_NAMES[m]} {y}</span>
        </div>
        <div className={styles.iconBtn} style={{ visibility: 'hidden' }} />
      </div>

      <IonContent className={styles.content}>
        <div className={styles.scroll}>
          {loading ? (
            <div className={styles.empty}>Cargando cierre…</div>
          ) : !summary ? (
            <div className={styles.empty}>Sin datos para {MONTH_NAMES[m]} {y}.</div>
          ) : (
            <>
              <CoachNote
                body={coachBody}
                meta={[`Generado el 1 de ${MONTH_NAMES[nextMonth]}`]}
              />

              {/* Score card */}
              {score != null && (
                <div className={styles.scoreCard}>
                  <ScoreRing value={score} />
                  <div className={styles.scoreBody}>
                    <div className={styles.scoreNum}>
                      {score}<span className={styles.scoreMax}>/100</span>
                    </div>
                    <div className={styles.scoreDelta}>
                      {underCategories.length} de {categories.length} gavetas en verde
                    </div>
                    <div className={styles.scoreFoot}>
                      {netBalance >= 0
                        ? `Terminaste con ${formatCurrencyCompact(netBalance)} de margen.`
                        : `Cerraste ${formatCurrencyCompact(Math.abs(netBalance))} en rojo.`}
                    </div>
                  </div>
                </div>
              )}

              <StatusStrip cells={[
                {
                  label: 'Gavetas ok',
                  value: `${underCategories.length}`,
                  delta: categories.length > 0 ? `de ${categories.length}` : undefined,
                },
                {
                  label: 'Se pasaron',
                  value: `${overCategories.length}`,
                  tone: overCategories.length > 0 ? 'bad' : undefined,
                },
                {
                  label: 'Balance',
                  value: formatCurrencyCompact(netBalance),
                  tone: netBalance < 0 ? 'bad' : undefined,
                },
              ]} />

              {/* Category breakdown */}
              {categories.length > 0 && (
                <>
                  <div className={styles.secHead}>
                    <h3 className={styles.secTitle}>Tus gavetas</h3>
                    {overCategories.length > 0 && (
                      <span className={styles.secMeta}>{overCategories.length} se pasaron</span>
                    )}
                  </div>
                  <div className={styles.pressureList}>
                    {categories.map((cat) => (
                      <CategoryPressureCard
                        key={cat.category_type}
                        name={cat.category}
                        pct={cat.pct}
                        spent={cat.spent}
                        limit={cat.budget}
                        category={cat.category_type as CategoryType}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Milestones */}
              {milestones.length > 0 && (
                <>
                  <div className={styles.secHead}>
                    <h3 className={styles.secTitle}>Logros del mes</h3>
                    <span className={styles.secMeta}>{milestones.length} desbloqueados</span>
                  </div>
                  <div className={styles.medalList}>
                    {milestones.map((ms) => (
                      <div key={ms.id} className={styles.medal}>
                        <div className={styles.medalIcon}>
                          <IonIcon icon={flameOutline} />
                        </div>
                        <div className={styles.medalBody}>
                          <p className={styles.medalName}>
                            {MILESTONE_LABELS[ms.code] ?? ms.code}
                          </p>
                          <p className={styles.medalWhen}>
                            {new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long' }).format(new Date(ms.achieved_at))}
                          </p>
                        </div>
                        <IonIcon icon={chevronForwardOutline} className={styles.medalArrow} />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Savings goals */}
              {savings.length > 0 && (
                <>
                  <div className={styles.secHead}>
                    <h3 className={styles.secTitle}>Metas de ahorro</h3>
                  </div>
                  <div className={styles.list}>
                    {savings.map((g, i) => {
                      const pct = g.target_amount > 0
                        ? Math.round((g.current_amount / g.target_amount) * 100) : 0;
                      return (
                        <div key={i} className={styles.row}>
                          <div className={styles.rowBody}>
                            <span className={styles.rowName}>{g.name}</span>
                            <span className={styles.rowMeta}>{pct}% completado</span>
                          </div>
                          <span className={styles.rowAmt}>{formatCurrencyCompact(g.current_amount)}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* CTA next month */}
              <div className={styles.cta}>
                <div className={styles.ctaEyebrow}>
                  <IonIcon icon={flagOutline} className={styles.ctaIcon} />
                  <span>Propuesta para {MONTH_NAMES[nextMonth]}</span>
                </div>
                <p className={styles.ctaTitle}>{ctaTitle}</p>
                <p className={styles.ctaBody}>
                  {overCategories.length > 0
                    ? `${MONTH_NAMES[m]} dejó patrones claros. Ajusta el plan para el próximo mes.`
                    : `Llevas una racha sólida. Revisa si hay algo que optimizar.`}
                </p>
                <button
                  type="button"
                  className={styles.ctaBtn}
                  onClick={() => history.push(`/budgets/${nextYear}/${nextMonth}`)}
                >
                  Revisar plan de {MONTH_NAMES[nextMonth]} <IonIcon icon={chevronForwardOutline} />
                </button>
              </div>

              {/* Reasoning */}
              {(summary as any)?.agent_reasoning ? (
                <ReasoningAccordion text={(summary as any).agent_reasoning} />
              ) : null}
            </>
          )}

        </div>
      </IonContent>
      <InsightTabBar active="mensual" month={m} year={y} />
    </IonPage>
  );
};
