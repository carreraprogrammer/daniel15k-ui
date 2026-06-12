// Dashboard redesignado — principio: respuesta-primero.
// Cada tarjeta responde UNA pregunta de un vistazo; el detalle vive en un SheetModal.

import { IonContent, IonIcon } from '@ionic/react';
import { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import {
  sparklesOutline,
  homeOutline,
  cartOutline,
  heartOutline,
  bookOutline,
  giftOutline,
  flashOutline,
  chevronForwardOutline,
  warningOutline,
  shieldOutline,
  calendarOutline,
  checkmarkCircleOutline,
  trophyOutline,
  ribbonOutline,
  cardOutline,
} from 'ionicons/icons';
import type { AgentInsight, MonthRecurringObligationExecutionItem, SummaryResponse, Transaction } from '../../../types/finance.types';
import { useAgentUI } from '../../../contexts/AgentUIContext';
import { AppLayout } from '../../templates/AppLayout';
import { Spinner } from '../../atoms/Spinner';
import { ErrorState } from '../../molecules/ErrorState';
import { SheetModal } from '../../molecules/SheetModal';
import { resolveNamedIcon } from '../../organisms/BudgetWizard/iconRegistry';
import { useDashboardData } from '../../../hooks/useDashboardData';
import { useAuthStore } from '../../../store/authStore';
import { financeService } from '../../../services/financeService';
import pageStyles from '../FinancePage.module.css';
import styles from './DashboardPage.module.css';

// ── Legible money formatter — clean amounts, no "mil" clutter ──────────────
const money = (n: number): string => {
  const sign = n < 0 ? '−' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${abs.toLocaleString('es-CO')}`;
};

const moneyFull = (n: number): string =>
  `${n < 0 ? '−$' : '$'}${Math.abs(n).toLocaleString('es-CO')}`;

// ── Category config (conductual palette) ──────────────────────────────────
const CAT_CONFIG: Record<string, { name: string; color: string; icon: string }> = {
  committed:     { name: 'Comprometido', color: 'var(--color-committed)',     icon: homeOutline },
  necessary:     { name: 'Necesario',    color: 'var(--color-necessary)',     icon: cartOutline },
  discretionary: { name: 'Flexible',     color: 'var(--color-discretionary)', icon: heartOutline },
  investment:    { name: 'Inversión',    color: 'var(--color-investment)',    icon: bookOutline },
  social:        { name: 'Social',       color: 'var(--color-social)',        icon: giftOutline },
  income:        { name: 'Ingreso',      color: 'var(--color-income)',        icon: flashOutline },
};

const catConfig = (code: string | null | undefined) =>
  CAT_CONFIG[code ?? ''] ?? { name: code ?? '—', color: 'var(--color-unknown)', icon: flashOutline };

// ── Helper: greeting ───────────────────────────────────────────────────────
const getGreetingByHour = (hour: number) => {
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

const getFirstName = (name?: string | null) => name?.trim().split(/\s+/u)[0] ?? '';

// ── Txn date label ─────────────────────────────────────────────────────────
const txnDayLabel = (dateStr: string): string => {
  const parts = dateStr.split('/');
  const day = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const year = parts[2] ? Number(parts[2]) : new Date().getFullYear();
  const txDate = new Date(year, month, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - txDate.setHours(0, 0, 0, 0);
  const days = Math.round(diffMs / 86_400_000);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  return parts.slice(0, 2).join('/');
};

const paymentLabel = (src: string | null | undefined): string => {
  if (src === 'credit_card') return 'Crédito';
  if (src === 'debit') return 'Débito';
  if (src === 'cash') return 'Efectivo';
  return '';
};

// ── Insight helpers ────────────────────────────────────────────────────────
const insightIcon = (kind?: AgentInsight['insight_kind'] | null): string => {
  switch (kind) {
    case 'congratulation': return trophyOutline;
    case 'alert':          return warningOutline;
    case 'achievement':    return ribbonOutline;
    default:               return sparklesOutline;
  }
};

// Alias for readability in this file
type OblItem = MonthRecurringObligationExecutionItem;

// ──────────────────────────────────────────────────────────────────────────
// HERO CARD — "¿voy bien?"
// ──────────────────────────────────────────────────────────────────────────
interface HeroCardProps {
  runway: NonNullable<SummaryResponse['cash_flow_runway']>;
  today: number;
  nextCycleDay: number;
  todayLabel: string;
  nextCycleLabel: string;
  nextIncomeLabel: string;
  onOpen: () => void;
}

const HeroCard = ({ runway, today, nextCycleDay, todayLabel, nextCycleLabel, nextIncomeLabel, onOpen }: HeroCardProps) => {
  const health = runway.health_status;
  const phrase = health === 'comfortable' ? 'Vas relajado.'
    : health === 'warning' ? `Vas justo hasta ${nextIncomeLabel === 'quincena' ? 'la quincena' : 'el próximo ingreso'}.`
    : health === 'critical' ? 'Estás en rojo.'
    : 'Sin datos de flujo.';

  const margin = runway.commitment_gap ?? 0;
  const pct = Math.min(100, Math.round((today / nextCycleDay) * 100));

  const healthMod = health === 'comfortable' ? styles.heroOk
    : health === 'warning' ? styles.heroWarn
    : health === 'critical' ? styles.heroRisk
    : '';

  return (
    <button type="button" className={`${styles.card} ${styles.hero} ${healthMod}`} onClick={onOpen}>
      <div className={styles.heroEyebrow}>
        <span className={styles.heroEyebrowDot} />
        Tu estado · hasta el {nextCycleLabel}
      </div>
      <div className={styles.heroPhrase}>{phrase}</div>
      <div className={styles.heroAmount}>
        <span className={styles.heroAmtVal}>{money(margin)}</span>
        <span className={styles.heroAmtLbl}>de margen libre</span>
      </div>
      <div className={styles.heroBarWrap}>
        <div className={styles.heroBar}>
          <div className={styles.heroBarFill} style={{ width: `${pct}%` }} />
        </div>
        <div className={styles.heroBarFoot}>
          <span>Hoy · <span className={styles.mono}>{todayLabel}</span></span>
          <span>{nextIncomeLabel === 'quincena' ? 'Quincena' : 'Próximo ingreso'} · <span className={styles.mono}>{nextCycleLabel}</span></span>
        </div>
      </div>
      <div className={styles.heroFoot}>
        <div className={styles.heroFootL}>
          <span className={styles.heroFootLbl}>En tu flujo hoy</span>
          <span className={styles.heroFootVal}>{money(runway.confirmed_balance)}</span>
        </div>
        <span className={styles.heroFootLink}>
          Ver tu flujo <IonIcon icon={chevronForwardOutline} />
        </span>
      </div>
    </button>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// NEXT OBLIGATION — "¿qué viene y cuándo?"
// ──────────────────────────────────────────────────────────────────────────
interface NextObligationProps {
  items: OblItem[];
  today: number;
  onOpen: () => void;
}

const NextObligation = ({ items, today, onOpen }: NextObligationProps) => {
  const pending = items.filter((i) => i.covered_amount === 0);
  const paid    = items.filter((i) => i.covered_amount > 0);

  if (items.length === 0) return null;

  const totalPending = pending.reduce((a, i) => a + i.expected_amount, 0);
  const pct = items.length > 0 ? Math.round((paid.length / items.length) * 100) : 0;

  if (pending.length === 0) {
    return (
      <button type="button" className={`${styles.card} ${styles.nextObl}`} onClick={onOpen}>
        <div className={styles.nextTop}>
          <div className={`${styles.nextIcon} ${styles.nextIconDone}`}>
            <IonIcon icon={checkmarkCircleOutline} />
          </div>
          <div className={styles.nextBody}>
            <div className={styles.nextEyebrow}>Obligaciones del mes</div>
            <div className={styles.nextName}>¡Todo pagado este mes!</div>
          </div>
          <div className={styles.nextRight}>
            <div className={styles.nextAmt}>{paid.length} de {items.length}</div>
            <div className={styles.nextWhen}>completadas</div>
          </div>
        </div>
        <div className={styles.nextProg}>
          <div className={styles.nextProgBar}>
            <div className={styles.nextProgFill} style={{ width: '100%' }} />
          </div>
          <div className={styles.nextProgFoot}>
            <span className={styles.nextProgCount}><b>{paid.length} de {items.length}</b> pagadas este mes</span>
          </div>
        </div>
      </button>
    );
  }

  const next = pending[0];
  const daysAway = (next.due_day ?? 0) - today;
  const soon = daysAway <= 4;
  const cat = catConfig(next.category_code);
  const oblIcon = resolveNamedIcon(next.subcategory_icon ?? null) ?? cat.icon;

  return (
    <button type="button" className={`${styles.card} ${styles.nextObl}`} onClick={onOpen}>
      <div className={styles.nextTop}>
        <div
          className={`${styles.nextIcon} ${soon ? styles.nextIconSoon : ''}`}
          style={{ background: `linear-gradient(140deg, ${cat.color}, color-mix(in srgb, ${cat.color} 60%, #000))` }}
        >
          <IonIcon icon={oblIcon} />
        </div>
        <div className={styles.nextBody}>
          <div className={styles.nextEyebrow}>Tu próxima obligación</div>
          <div className={styles.nextName}>{next.name}</div>
        </div>
        <div className={styles.nextRight}>
          <div className={styles.nextAmt}>{money(next.expected_amount)}</div>
          <div className={`${styles.nextWhen} ${soon ? styles.nextWhenSoon : ''}`}>
            <IonIcon icon={calendarOutline} />
            {daysAway <= 0 ? 'hoy' : `en ${daysAway}d`}
          </div>
        </div>
      </div>
      <div className={styles.nextProg}>
        <div className={styles.nextProgBar}>
          <div className={styles.nextProgFill} style={{ width: `${pct}%` }} />
        </div>
        <div className={styles.nextProgFoot}>
          <span className={styles.nextProgCount}><b>{paid.length} de {items.length}</b> pagadas este mes</span>
          <span className={styles.nextProgLeft}>te falta <b>{money(totalPending)}</b></span>
        </div>
      </div>
    </button>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// FUND CARD — objetivo financiero fusionado (sin duplicación)
// ──────────────────────────────────────────────────────────────────────────
interface FundCardProps {
  summary: SummaryResponse;
  onOpen: () => void;
}

const EF_STATUS: Record<string, { label: string; color: string }> = {
  none:      { label: 'SIN FONDO',    color: 'var(--color-committed)' },
  starter:   { label: 'STARTER',      color: 'var(--color-necessary)' },
  minimal:   { label: 'CONSTRUYENDO', color: 'var(--color-discretionary)' },
  healthy:   { label: 'SALUDABLE',    color: 'var(--color-investment)' },
  excellent: { label: 'ÓPTIMO',       color: 'var(--color-income)' },
};

const FundCard = ({ summary, onOpen }: FundCardProps) => {
  const phase = summary.financial_context?.phase;
  const goalAmount = summary.financial_context?.monthly_goal_contribution ?? 0;

  // ── Debt payoff card ──
  if (phase === 'debt_payoff' && goalAmount > 0) {
    const focal = summary.debts?.recommended_payment;
    const remaining = focal?.balance ?? 0;
    const monthsToPayoff = goalAmount > 0 && remaining > 0 ? Math.ceil(remaining / goalAmount) : null;
    const name = focal?.name ?? 'Pago de deudas';

    return (
      <button type="button" className={`${styles.card} ${styles.fund}`}
        style={{ '--f-col': 'var(--color-committed)' } as React.CSSProperties}
        onClick={onOpen}
      >
        <div className={styles.fundIcon}>
          <IonIcon icon={cardOutline} />
        </div>
        <div className={styles.fundBody}>
          <div className={styles.fundHead}>
            <span className={styles.fundName}>{name}</span>
            <span className={styles.fundChip}>COMPROMETIDO</span>
          </div>
          <div className={styles.fundSub}>{money(remaining)} restantes · abona {money(goalAmount)}/mes</div>
          <div className={styles.fundBar}><div className={styles.fundBarFill} style={{ width: '5%' }} /></div>
        </div>
        <div className={styles.fundPanel}>
          <span className={styles.fundPanelVal}>{monthsToPayoff ?? '—'}</span>
          <span className={styles.fundPanelLbl}>meses</span>
        </div>
      </button>
    );
  }

  // ── Emergency fund card (default) ──
  const efGoal = summary.savings_goals?.find((g) => /emergencia|emergency/iu.test(g.name));
  const efCurrent = efGoal?.current_amount ?? 0;
  const plan = summary.monthly_plan;
  const bareBones = (plan?.recurring_obligations_total ?? 0) + (plan?.debt_minimums_total ?? 0);
  const efTarget = bareBones;
  const months = bareBones > 0 ? efCurrent / bareBones : 0;
  const pct = efTarget > 0 ? Math.min(Math.round((efCurrent / efTarget) * 100), 100) : 0;
  const statusKey = months < 0.5 ? 'none' : months < 1 ? 'starter' : months < 3 ? 'minimal' : months < 6 ? 'healthy' : 'excellent';
  const st = EF_STATUS[statusKey];
  const monthlyContrib = goalAmount > 0 ? goalAmount : (summary.financial_context?.monthly_goal_contribution ?? 0);

  return (
    <button type="button" className={`${styles.card} ${styles.fund}`}
      style={{ '--f-col': st.color } as React.CSSProperties}
      onClick={onOpen}
    >
      <div className={styles.fundIcon}>
        <IonIcon icon={shieldOutline} />
      </div>
      <div className={styles.fundBody}>
        <div className={styles.fundHead}>
          <span className={styles.fundName}>Fondo de emergencia</span>
          <span className={styles.fundChip}>{st.label}</span>
        </div>
        <div className={styles.fundSub}>
          {money(efCurrent)} / {money(efTarget)}
          {monthlyContrib > 0 ? ` · aporta ${money(monthlyContrib)}/mes` : ''}
        </div>
        <div className={styles.fundBar}><div className={styles.fundBarFill} style={{ width: `${pct}%` }} /></div>
      </div>
      <div className={styles.fundPanel}>
        <span className={styles.fundPanelVal}>{months.toFixed(1)}</span>
        <span className={styles.fundPanelLbl}>meses</span>
      </div>
    </button>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// INSIGHT CARD — una línea + acción (chevron)
// ──────────────────────────────────────────────────────────────────────────
interface InsightCardProps {
  insight: AgentInsight | null;
  onClick: () => void;
}

const InsightCard = ({ insight, onClick }: InsightCardProps) => {
  const isAlert = insight?.insight_kind === 'alert';
  return (
    <button
      type="button"
      className={`${styles.card} ${styles.insight} ${isAlert ? styles.insightWarn : ''}`}
      onClick={onClick}
    >
      <div className={styles.insightIcon}>
        <IonIcon icon={insightIcon(insight?.insight_kind)} />
      </div>
      <div className={styles.insightBody}>
        <div className={styles.insightText}>
          {insight?.body ?? 'El análisis nocturno de tu coach aparecerá aquí.'}
        </div>
        <div className={styles.insightMeta}>
          <span className={styles.insightDot} />
          Análisis nocturno
          {insight?.status === 'new' ? <span className={styles.insightNewDot} /> : null}
        </div>
      </div>
      <IonIcon icon={chevronForwardOutline} className={styles.insightChev} />
    </button>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// COMPACT CATEGORY ROW
// ──────────────────────────────────────────────────────────────────────────
interface CatRowProps {
  cat: { category_type: string; budget: number; spent: number; category_id: number };
  onClick?: () => void;
}

const CatRow = ({ cat, onClick }: CatRowProps) => {
  const cfg = catConfig(cat.category_type);
  const pct = cat.budget > 0 ? Math.min(Math.round((cat.spent / cat.budget) * 100), 100) : 0;
  const over = cat.spent > cat.budget && cat.budget > 0;

  return (
    <button
      type="button"
      className={styles.catCard}
      style={{ '--c-col': cfg.color } as React.CSSProperties}
      onClick={onClick}
    >
      <div className={styles.catGem}><IonIcon icon={cfg.icon} /></div>
      <div className={styles.catMain}>
        <div className={styles.catName}>{cfg.name}</div>
        <div className={styles.catSub}>{money(cat.spent)} de {money(cat.budget)}</div>
      </div>
      <div className={`${styles.catPct} ${over ? styles.catPctOver : ''}`}>{pct}%</div>
      <div className={styles.catBar}>
        <div className={`${styles.catBarFill} ${over ? styles.catBarFillOver : ''}`} style={{ width: `${pct}%` }} />
      </div>
    </button>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// TRANSACTION ROW
// ──────────────────────────────────────────────────────────────────────────
const TxnItem = ({ tx }: { tx: Transaction }) => {
  const attr = tx.attributes;
  const cfg = catConfig(attr.category_type);
  const isIncome = attr.transaction_type === 'income';
  const meta = [txnDayLabel(attr.date), paymentLabel(attr.payment_source)].filter(Boolean).join(' · ');

  return (
    <div className={styles.txnRow} style={{ '--t-col': cfg.color } as React.CSSProperties}>
      <div className={styles.txnIcon}><IonIcon icon={cfg.icon} /></div>
      <div className={styles.txnBody}>
        <div className={styles.txnName}>{attr.concept || attr.product}</div>
        {meta ? <div className={styles.txnMeta}>{meta}</div> : null}
      </div>
      <div className={`${styles.txnAmt} ${isIncome ? styles.txnAmtIncome : ''}`}>
        {isIncome ? '+' : '−'}{money(attr.amount)}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// FLOW MODAL — detalle del flujo (hero tap)
// ──────────────────────────────────────────────────────────────────────────
interface FlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  runway: NonNullable<SummaryResponse['cash_flow_runway']>;
  nextCycleLabel: string;
}

const FlowModal = ({ isOpen, onClose, runway, nextCycleLabel }: FlowModalProps) => {
  // Desglose real del margen libre (glosario-calculos.md):
  // margen = lo que tienes hoy − pagos antes del próximo ingreso − (ritmo × días)
  const days = runway.days_to_next_income ?? 0;
  const dailyBurn = runway.daily_necessary_burn ?? 0;
  const burnUntilIncome = dailyBurn * days;
  const committed = runway.committed_before_next_income ?? 0;
  const margin = runway.commitment_gap ?? 0;

  const rows = [
    {
      lbl: 'Lo que tienes hoy',
      hint: 'Ingresos menos gastos confirmados, más lo que arrastraste del mes pasado',
      val: runway.confirmed_balance,
    },
    {
      lbl: 'Pagos que ya prometiste',
      hint: `Compromisos fijos que vencen antes del ${nextCycleLabel}`,
      val: -committed,
    },
    {
      lbl: 'Tu día a día hasta esa fecha',
      hint: `≈ ${money(dailyBurn)}/día × ${days} días — mercado, transporte, comida`,
      val: -burnUntilIncome,
    },
  ];

  return (
    <SheetModal isOpen={isOpen} title="Tu flujo hasta la quincena" onClose={onClose} height="compact">
      <div className={styles.modalBody}>
        {rows.map((r, i) => (
          <div className={styles.flowRow} key={i}>
            <div className={styles.flowL}>
              <span className={styles.flowLbl}>{r.lbl}</span>
              <span className={styles.flowHint}>{r.hint}</span>
            </div>
            <span className={`${styles.flowVal} ${r.val < 0 ? styles.flowValNeg : ''}`}>{moneyFull(r.val)}</span>
          </div>
        ))}
        <div className={`${styles.flowRow} ${styles.flowRowTotal}`}>
          <div className={styles.flowL}>
            <span className={`${styles.flowLbl} ${styles.flowLblTotal}`}>Margen libre</span>
            <span className={styles.flowHint}>Lo que puedes mover sin poner en riesgo nada de lo de arriba</span>
          </div>
          <span className={`${styles.flowVal} ${styles.flowValAccent}`}>{moneyFull(margin)}</span>
        </div>
      </div>
    </SheetModal>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// BURN MODAL — ¿de dónde sale tu ritmo?
// ──────────────────────────────────────────────────────────────────────────
interface BurnModalProps {
  isOpen: boolean;
  onClose: () => void;
  runway: NonNullable<SummaryResponse['cash_flow_runway']>;
}

const BurnModal = ({ isOpen, onClose, runway }: BurnModalProps) => (
  <SheetModal isOpen={isOpen} title="Tu ritmo diario" onClose={onClose} height="compact">
    <div className={styles.modalBody}>
      <div className={styles.fundModalCenter}>
        <div className={styles.fundModalAmount}>{moneyFull(runway.daily_necessary_burn)}</div>
        <div className={styles.fundModalSub}>promedio de tus gastos del día a día</div>
      </div>
      <p className={styles.explain}>
        Se calcula con tus gastos necesarios — mercado, transporte, comida — de los
        últimos 30 días, divididos entre 30.
      </p>
      <p className={styles.explain}>
        Tus pagos fijos (arriendo, cuotas, suscripciones) <strong>no entran aquí</strong>:
        esos se cuentan aparte como compromisos, para no contarlos dos veces.
      </p>
      {!runway.has_sufficient_history ? (
        <p className={`${styles.explain} ${styles.explainWarn}`}>
          Todavía no tienes 14 días de historial, así que por ahora usamos un estimado
          de $30.000/día. Se afina solo a medida que registras.
        </p>
      ) : null}
    </div>
  </SheetModal>
);

// ──────────────────────────────────────────────────────────────────────────
// OBLIGATIONS MODAL — checklist completa
// ──────────────────────────────────────────────────────────────────────────
interface ObligationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: OblItem[];
  today: number;
}

const ObligationsModal = ({ isOpen, onClose, items, today }: ObligationsModalProps) => {
  const pending = items.filter((i) => i.covered_amount === 0);
  const paid    = items.filter((i) => i.covered_amount > 0);
  const totalPending = pending.reduce((a, i) => a + i.expected_amount, 0);
  const totalPaid    = paid.reduce((a, i) => a + i.covered_amount, 0);

  return (
    <SheetModal isOpen={isOpen} title="Obligaciones del mes" onClose={onClose} height="tall">
      <div className={styles.modalBody}>
        <div className={styles.oblSummary}>
          <div className={styles.oblStat}>
            <div className={styles.oblStatLbl}>Te falta</div>
            <div className={styles.oblStatVal}>{money(totalPending)}</div>
          </div>
          <div className={styles.oblStat}>
            <div className={styles.oblStatLbl}>Ya pagaste</div>
            <div className={`${styles.oblStatVal} ${styles.oblStatValPaid}`}>{money(totalPaid)}</div>
          </div>
        </div>

        {pending.length > 0 ? (
          <>
            <div className={styles.oblGroupLbl}>Pendientes · {pending.length}</div>
            {pending.map((it) => {
              const daysAway = (it.due_day ?? 0) - today;
              const soon = daysAway <= 4;
              return (
                <div className={styles.oblRow} key={it.id}>
                  <div className={`${styles.oblDot} ${soon ? styles.oblDotWarn : ''}`} />
                  <div className={styles.oblRowBody}>
                    <div className={styles.oblName}>{it.name}</div>
                    <div className={styles.oblMeta}>
                      {it.due_day ? `día ${it.due_day}` : '—'} · {money(it.expected_amount)}
                    </div>
                  </div>
                  <div className={`${styles.oblWhen} ${soon ? styles.oblWhenSoon : ''}`}>
                    {daysAway <= 0 ? 'hoy' : `en ${daysAway}d`}
                  </div>
                </div>
              );
            })}
          </>
        ) : null}

        {paid.length > 0 ? (
          <>
            <div className={styles.oblGroupLbl}>Pagadas · {paid.length}</div>
            {paid.map((it) => (
              <div className={styles.oblRow} key={it.id}>
                <div className={`${styles.oblDot} ${styles.oblDotPaid}`}>
                  <IonIcon icon={checkmarkCircleOutline} />
                </div>
                <div className={styles.oblRowBody}>
                  <div className={`${styles.oblName} ${styles.oblNamePaid}`}>{it.name}</div>
                  <div className={styles.oblMeta}>
                    {it.due_day ? `día ${it.due_day}` : '—'} · {money(it.covered_amount)}
                  </div>
                </div>
                <div className={`${styles.oblWhen} ${styles.oblWhenPaid}`}>pagada</div>
              </div>
            ))}
          </>
        ) : null}
      </div>
    </SheetModal>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// FUND MODAL — detalle del fondo / objetivo
// ──────────────────────────────────────────────────────────────────────────
interface FundModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: SummaryResponse;
}

const FundModal = ({ isOpen, onClose, summary }: FundModalProps) => {
  const phase = summary.financial_context?.phase;
  const goalAmount = summary.financial_context?.monthly_goal_contribution ?? 0;

  if (phase === 'debt_payoff' && goalAmount > 0) {
    const focal = summary.debts?.recommended_payment;
    const remaining = focal?.balance ?? 0;
    const monthsToPayoff = goalAmount > 0 && remaining > 0 ? Math.ceil(remaining / goalAmount) : null;
    const name = focal?.name ?? 'Pago de deudas';

    return (
      <SheetModal isOpen={isOpen} title={name} onClose={onClose} height="compact">
        <div className={styles.modalBody}>
          <div className={styles.fundModalCenter}>
            <div className={styles.fundModalAmount}>{moneyFull(remaining)}</div>
            <div className={styles.fundModalSub}>restantes para liquidar</div>
          </div>
          <div className={styles.flowRow}>
            <div className={styles.flowL}>
              <span className={styles.flowLbl}>Aporte mensual comprometido</span>
              <span className={styles.flowHint}>Se aparta antes de repartir</span>
            </div>
            <span className={styles.flowVal}>{moneyFull(goalAmount)}</span>
          </div>
          {monthsToPayoff ? (
            <div className={`${styles.flowRow} ${styles.flowRowTotal}`}>
              <div className={styles.flowL}>
                <span className={`${styles.flowLbl} ${styles.flowLblTotal}`}>A este ritmo lo pagas en</span>
              </div>
              <span className={`${styles.flowVal} ${styles.flowValAccent}`}>{monthsToPayoff} meses</span>
            </div>
          ) : null}
        </div>
      </SheetModal>
    );
  }

  // EF detail
  const efGoal = summary.savings_goals?.find((g) => /emergencia|emergency/iu.test(g.name));
  const efCurrent = efGoal?.current_amount ?? 0;
  const plan = summary.monthly_plan;
  const bareBones = (plan?.recurring_obligations_total ?? 0) + (plan?.debt_minimums_total ?? 0);
  const efTarget = bareBones;
  const pct = efTarget > 0 ? Math.min(Math.round((efCurrent / efTarget) * 100), 100) : 0;
  const remaining = Math.max(0, efTarget - efCurrent);
  const monthsToTarget = goalAmount > 0 && remaining > 0 ? Math.ceil(remaining / goalAmount) : null;

  return (
    <SheetModal isOpen={isOpen} title="Fondo de emergencia" onClose={onClose} height="compact">
      <div className={styles.modalBody}>
        <div className={styles.fundModalCenter}>
          <div className={styles.fundModalAmount}>{moneyFull(efCurrent)}</div>
          <div className={styles.fundModalSub}>de {moneyFull(efTarget)} · meta de 1 mes de cobertura</div>
          <div className={styles.fundModalBar}>
            <div className={styles.fundModalBarFill} style={{ width: `${pct}%` }} />
          </div>
        </div>
        {goalAmount > 0 ? (
          <div className={styles.flowRow}>
            <div className={styles.flowL}>
              <span className={styles.flowLbl}>Aporte mensual comprometido</span>
              <span className={styles.flowHint}>Se aparta antes de repartir</span>
            </div>
            <span className={styles.flowVal}>{moneyFull(goalAmount)}</span>
          </div>
        ) : null}
        <div className={styles.flowRow}>
          <div className={styles.flowL}><span className={styles.flowLbl}>Te falta para la meta</span></div>
          <span className={styles.flowVal}>{moneyFull(remaining)}</span>
        </div>
        {monthsToTarget ? (
          <div className={`${styles.flowRow} ${styles.flowRowTotal}`}>
            <div className={styles.flowL}>
              <span className={`${styles.flowLbl} ${styles.flowLblTotal}`}>A este ritmo lo logras en</span>
            </div>
            <span className={`${styles.flowVal} ${styles.flowValAccent}`}>{monthsToTarget} meses</span>
          </div>
        ) : null}
      </div>
    </SheetModal>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// SECTION HEADER
// ──────────────────────────────────────────────────────────────────────────
const SecHead = ({ label, onMore, moreLabel = 'Ver todo' }: { label: string; onMore?: () => void; moreLabel?: string }) => (
  <div className={styles.secHead}>
    <span className={styles.secLabel}>{label}</span>
    {onMore ? (
      <button type="button" className={styles.secMore} onClick={onMore}>
        {moreLabel} <IonIcon icon={chevronForwardOutline} />
      </button>
    ) : null}
  </div>
);

// ──────────────────────────────────────────────────────────────────────────
// DASHBOARD CONTENT
// ──────────────────────────────────────────────────────────────────────────
export const DashboardContent = () => {
  const { summary, insight, completeness, loading, error, reload, monthTransactions } = useDashboardData();
  const history = useHistory();
  const [modal, setModal] = useState<'flow' | 'obl' | 'fund' | 'burn' | null>(null);

  const { dataVersion } = useAgentUI();
  useEffect(() => { if (dataVersion > 0) void reload(); }, [dataVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pendientes por confirmar (capturadas por el agente) ──────────────────
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    financeService.fetchPendingTransactions()
      .then((res) => setPendingCount(res.data.length))
      .catch(() => setPendingCount(0));
  }, [dataVersion]);

  // ── Date calculations ──────────────────────────────────────────────────
  const today = new Date();
  const todayNum = today.getDate();
  const dayMonthFmt = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' });
  const runway = summary?.cash_flow_runway;
  const nextIncomeDayNum = runway?.next_income_day ?? null;
  const nextCycleDate = nextIncomeDayNum
    ? new Date(today.getFullYear(), today.getMonth(), nextIncomeDayNum)
    : new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const todayLabel = dayMonthFmt.format(today);
  const nextCycleLabel = dayMonthFmt.format(nextCycleDate);
  const nextIncomeLabel = runway?.next_income_classification === 'base' ? 'quincena' : 'próximo ingreso';
  const nextCycleDay = nextIncomeDayNum ?? nextCycleDate.getDate();

  // ── Plan banner ────────────────────────────────────────────────────────
  const hasPlanPendingConfirmation = completeness?.pending_confirmation?.includes('monthly_plan') ?? false;
  const planMonthLabel = summary?.period
    ? new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(
        new Date(summary.period.year, summary.period.month - 1, 1),
      )
    : 'este mes';

  // ── Obligations ────────────────────────────────────────────────────────
  const oblItems: OblItem[] = summary?.month_execution?.recurring_obligations?.items ?? [];

  const navigateToInsight = () => {
    const date = insight?.analysis_date
      ?? insight?.generated_at?.slice(0, 10)
      ?? new Date().toISOString().slice(0, 10);
    history.push(`/analisis/${date}`, { insight });
  };

  return (
    <IonContent className={pageStyles.pageContent}>
      <section className={pageStyles.stack}>

        {loading ? <div className={pageStyles.centeredState}><Spinner size="lg" /></div> : null}
        {error ? <ErrorState message={error} onRetry={() => void reload()} /> : null}

        {!loading && !error && summary ? (
          <>
            {/* ── Plan pending banner ──────────────────────────────────── */}
            {hasPlanPendingConfirmation ? (
              <div className={styles.planBanner}>
                <p className={styles.planBannerText}>
                  Tu plan de {planMonthLabel} está listo para revisar.
                </p>
                <button type="button" className={styles.planBannerBtn} onClick={() => history.push('/budgets')}>
                  Revisar
                </button>
              </div>
            ) : null}

            {/* ── Pendientes por confirmar ─────────────────────────────── */}
            {pendingCount > 0 ? (
              <div className={styles.planBanner}>
                <p className={styles.planBannerText}>
                  {pendingCount === 1
                    ? 'Encontré 1 movimiento. Confírmalo en un tap.'
                    : `Encontré ${pendingCount} movimientos. Confírmalos en un tap.`}
                </p>
                <button type="button" className={styles.planBannerBtn} onClick={() => history.push('/transactions')}>
                  Revisar
                </button>
              </div>
            ) : null}

            {/* ── HERO — ¿voy bien? ────────────────────────────────────── */}
            {runway ? (
              <HeroCard
                runway={runway}
                today={todayNum}
                nextCycleDay={nextCycleDay}
                todayLabel={todayLabel}
                nextCycleLabel={nextCycleLabel}
                nextIncomeLabel={nextIncomeLabel}
                onOpen={() => setModal('flow')}
              />
            ) : null}

            {/* ── PRÓXIMA OBLIGACIÓN — ¿qué viene? ────────────────────── */}
            <NextObligation items={oblItems} today={todayNum} onOpen={() => setModal('obl')} />

            {/* ── FONDO / OBJETIVO — fusionado ────────────────────────── */}
            <FundCard summary={summary} onOpen={() => setModal('fund')} />

            {/* ── INSIGHT — una línea + acción ────────────────────────── */}
            <InsightCard insight={insight} onClick={navigateToInsight} />

            {/* ── Tu mes en pocas líneas ───────────────────────────────── */}
            {(summary.balance || runway) ? (
              <>
                <SecHead label="Tu mes en pocas líneas" />
                <div className={styles.kpis}>
                  <div className={styles.kpi}>
                    <div className={styles.kpiLbl}>Gastado este mes</div>
                    <div className={styles.kpiVal}>{money(summary.balance.expense_confirmed)}</div>
                  </div>
                  <button type="button" className={`${styles.kpi} ${styles.kpiTap}`} onClick={() => setModal('burn')}>
                    <div className={styles.kpiLbl}>Ritmo diario</div>
                    <div className={styles.kpiVal}>
                      {money(runway?.daily_necessary_burn ?? 0)}
                      <span className={styles.kpiUnit}>/día</span>
                    </div>
                    <div className={styles.kpiHint}>¿De dónde sale?</div>
                  </button>
                </div>
              </>
            ) : null}

            {/* ── Cómo va cada gaveta ───────────────────────────────────── */}
            {(summary.burn_rate?.categories?.length ?? 0) > 0 ? (
              <>
                <SecHead label="Cómo va cada gaveta" onMore={() => history.push('/budgets')} />
                <div className={styles.catList}>
                  {(summary.burn_rate?.categories ?? []).map((cat) => (
                    <CatRow
                      key={cat.category_id}
                      cat={cat}
                      onClick={() => history.push(`/gaveta/${cat.category_type}`, { category: cat })}
                    />
                  ))}
                </div>
              </>
            ) : null}

            {/* ── Lo último ────────────────────────────────────────────── */}
            {monthTransactions.length > 0 ? (
              <>
                <SecHead label="Lo último" onMore={() => history.push('/transactions')} />
                <div className={styles.txnList}>
                  {monthTransactions.slice(0, 3).map((tx) => (
                    <TxnItem key={tx.id} tx={tx} />
                  ))}
                </div>
              </>
            ) : null}
          </>
        ) : null}

      </section>

      {/* ── MODALES ──────────────────────────────────────────────────────── */}
      {runway ? (
        <FlowModal
          isOpen={modal === 'flow'}
          onClose={() => setModal(null)}
          runway={runway}
          nextCycleLabel={nextCycleLabel}
        />
      ) : null}

      <ObligationsModal
        isOpen={modal === 'obl'}
        onClose={() => setModal(null)}
        items={oblItems}
        today={todayNum}
      />

      {runway ? (
        <BurnModal
          isOpen={modal === 'burn'}
          onClose={() => setModal(null)}
          runway={runway}
        />
      ) : null}

      {summary ? (
        <FundModal
          isOpen={modal === 'fund'}
          onClose={() => setModal(null)}
          summary={summary}
        />
      ) : null}

    </IonContent>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// DASHBOARD PAGE
// ──────────────────────────────────────────────────────────────────────────
export const DashboardPage = () => {
  const userName = useAuthStore((state) => state.user?.name);
  const greeting = getGreetingByHour(new Date().getHours());
  const firstName = getFirstName(userName);

  return (
    <AppLayout title={`${greeting}${firstName ? ` ${firstName}` : ''}`}>
      <DashboardContent />
    </AppLayout>
  );
};
