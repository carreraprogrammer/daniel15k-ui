import { IonContent, IonIcon, IonPage } from '@ionic/react';
import { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import {
  chevronBackOutline,
  flameOutline,
  chevronForwardOutline,
  flagOutline,
} from 'ionicons/icons';
import { financeService } from '../../../services/financeService';
import { formatCurrencyCompact } from '../../../utils/formatCurrency';
import type { SummaryResponse, UserMilestone } from '../../../types/finance.types';
import { CoachNote } from '../../molecules/CoachNote/CoachNote';
import { StatusStrip } from '../../molecules/StatusStrip/StatusStrip';
import { CategoryPressureCard } from '../../molecules/CategoryPressureCard/CategoryPressureCard';
import { ReasoningAccordion } from '../../molecules/ReasoningAccordion/ReasoningAccordion';
import type { CategoryType } from '../../molecules/CategoryPressureCard/CategoryPressureCard';
import styles from './MonthlyInsightDetailPage.module.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const CAT_NAMES: Record<string, string> = {
  committed:     'Comprometido',
  necessary:     'Necesario',
  discretionary: 'Flexible',
  investment:    'Inversión',
  social:        'Social',
  income:        'Ingreso',
};

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

// ── Score ring ────────────────────────────────────────────────────────────────

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

// ── Page ──────────────────────────────────────────────────────────────────────

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
      .then(([s, ms]) => {
        setSummary(s);
        setMilestones(ms);
      })
      .catch(() => { setSummary(null); setMilestones([]); })
      .finally(() => setLoading(false));
  }, [m, y]);

  const insight = summary?.monthly_plan ? null : null; // future: monthly agent_insight
  const categories = summary?.burn_rate?.categories ?? [];
  const pressureCategories = categories.filter((c) => c.pct > 50);
  const savings = summary?.savings_goals ?? [];

  // Score from execution_snapshot if available (backend may inject financial_score)
  const score = (summary as any)?.financial_score as number | undefined;

  // Balance stats
  const incomeActual = summary?.balance.income_confirmed ?? 0;
  const expenseActual = summary?.balance.expense_confirmed ?? 0;
  const netBalance = summary?.balance.net_balance ?? 0;

  // Month agent insight body
  const coachBody = insight
    ? (insight as any).body
    : categories.some((c) => c.pct > 100)
      ? `${MONTH_NAMES[m]} tuvo ${categories.filter((c) => c.pct > 100).length} gaveta${categories.filter((c) => c.pct > 100).length > 1 ? 's' : ''} sobre presupuesto. Revisá el detalle para el próximo mes.`
      : `Cerraste ${MONTH_NAMES[m]} con tu flujo bajo control. El balance neto fue ${formatCurrencyCompact(netBalance)}.`;

  return (
    <IonPage className={styles.page}>
      {/* Header */}
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
              {/* Coach note */}
              <CoachNote
                body={coachBody}
                meta={[`Generado el 1 de ${MONTH_NAMES[m + 1] ?? 'enero'}`]}
              />

              {/* Score + status strip */}
              {score != null ? (
                <div className={styles.scoreCard}>
                  <ScoreRing value={score} />
                  <div className={styles.scoreBody}>
                    <div className={styles.scoreNum}>
                      {score}<span className={styles.scoreMax}>/100</span>
                    </div>
                    <div className={styles.scoreDelta}>Puntaje financiero del mes</div>
                  </div>
                </div>
              ) : null}

              <StatusStrip cells={[
                { label: 'Ingresado', value: formatCurrencyCompact(incomeActual) },
                { label: 'Gastado', value: formatCurrencyCompact(expenseActual) },
                { label: 'Balance', value: formatCurrencyCompact(netBalance), tone: netBalance < 0 ? 'bad' : undefined },
              ]} />

              {/* Category pressure */}
              {pressureCategories.length > 0 ? (
                <>
                  <div className={styles.secHead}>
                    <h3 className={styles.secTitle}>Tus gavetas</h3>
                    {categories.filter((c) => c.pct > 100).length > 0 ? (
                      <span className={styles.secMeta}>
                        {categories.filter((c) => c.pct > 100).length} se pasaron
                      </span>
                    ) : null}
                  </div>
                  <div className={styles.pressureList}>
                    {pressureCategories.map((cat) => (
                      <CategoryPressureCard
                        key={cat.category_type}
                        name={CAT_NAMES[cat.category_type] ?? cat.category}
                        pct={cat.pct}
                        spent={cat.spent}
                        limit={cat.budget}
                        category={cat.category_type as CategoryType}
                      />
                    ))}
                  </div>
                </>
              ) : null}

              {/* Milestones */}
              {milestones.length > 0 ? (
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
                            {new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(new Date(ms.achieved_at))}
                          </p>
                        </div>
                        <IonIcon icon={chevronForwardOutline} className={styles.medalArrow} />
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              {/* Savings goals */}
              {savings.length > 0 ? (
                <>
                  <div className={styles.secHead}>
                    <h3 className={styles.secTitle}>Metas de ahorro</h3>
                  </div>
                  <div className={styles.list}>
                    {savings.map((g, i) => {
                      const pct = g.target_amount > 0
                        ? Math.round((g.current_amount / g.target_amount) * 100)
                        : 0;
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
              ) : null}

              {/* CTA next month */}
              <div className={styles.cta}>
                <div className={styles.ctaEyebrow}>
                  <IonIcon icon={flagOutline} className={styles.ctaIcon} />
                  <span>Propuesta para {MONTH_NAMES[m === 12 ? 1 : m + 1]}</span>
                </div>
                <p className={styles.ctaTitle}>Revisá el plan del próximo mes</p>
                <p className={styles.ctaBody}>
                  Ajustá tus gavetas basado en cómo te fue este mes.
                </p>
                <button
                  type="button"
                  className={styles.ctaBtn}
                  onClick={() => history.push('/budgets')}
                >
                  Ver plan del mes <IonIcon icon={chevronForwardOutline} />
                </button>
              </div>

              {/* Reasoning — use agent reasoning from a plan insight if available */}
              {(summary as any)?.agent_reasoning ? (
                <ReasoningAccordion text={(summary as any).agent_reasoning} />
              ) : null}
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};
