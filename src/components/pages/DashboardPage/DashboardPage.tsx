// Dashboard v2 — "El ascenso".
// Menos "todo en tarjetas": listas nativas, jerarquía tipográfica, un solo widget-hero
// (el ascenso = objetivo impuesto por el sistema). El usuario decide qué widgets ve y en
// qué orden (persistido en localStorage). El detalle vive bajo un tap (SheetModal).

import { IonContent, IonIcon } from '@ionic/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  cartOutline,
  bookOutline,
  giftOutline,
  flashOutline,
  lockClosedOutline,
  pricetagOutline,
  cashOutline,
  chevronForwardOutline,
  checkmarkOutline,
  checkmarkCircleOutline,
  optionsOutline,
  personCircleOutline,
} from 'ionicons/icons';
import type { MonthRecurringObligationExecutionItem, SummaryResponse, Transaction } from '../../../types/finance.types';
import { useAgentUI } from '../../../contexts/AgentUIContext';
import { AppLayout } from '../../templates/AppLayout';
import { useAppToolbar, type AppToolbarConfig } from '../../templates/AppLayout/AppLayoutContext';
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

// ── Category config (conductual palette, 3 gavetas visibles) ───────────────
const CAT_CONFIG: Record<string, { name: string; color: string; icon: string }> = {
  committed:     { name: 'Comprometido', color: 'var(--color-committed)',     icon: lockClosedOutline },
  necessary:     { name: 'Necesario',    color: 'var(--color-necessary)',     icon: cartOutline },
  discretionary: { name: 'Flexible',     color: 'var(--color-discretionary)', icon: pricetagOutline },
  investment:    { name: 'Inversión',    color: 'var(--color-investment)',    icon: bookOutline },
  social:        { name: 'Social',       color: 'var(--color-social)',        icon: giftOutline },
  income:        { name: 'Ingreso',      color: 'var(--color-income)',        icon: cashOutline },
};

const catConfig = (code: string | null | undefined) =>
  CAT_CONFIG[code ?? ''] ?? { name: code ?? '—', color: 'var(--color-unknown)', icon: flashOutline };

// 3 gavetas: Social se fusiona en Flexible; Inversión sale (módulo aparte).
const CAT_ORDER = ['committed', 'necessary', 'discretionary'] as const;

// ── Helpers ────────────────────────────────────────────────────────────────
const getGreetingByHour = (hour: number) => {
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

const getFirstName = (name?: string | null) => name?.trim().split(/\s+/u)[0] ?? '';

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

type OblItem = MonthRecurringObligationExecutionItem;

// ──────────────────────────────────────────────────────────────────────────
// ASCENSO — objetivo impuesto por el sistema (escalera Ramsey)
// Derivado en el cliente desde datos reales. NOTA: el orden replica
// Finanzas::Interactors::DerivePhase, pero el fondo de emergencia apunta a 6
// meses (meta de producto), mientras DerivePhase corta la fase en 3 meses.
// Reconciliar 3 vs 6 es la decisión de producto pendiente.
// ──────────────────────────────────────────────────────────────────────────
interface AscentStage {
  id: string;
  label: string;
  hint: string;
  target: number | null;
  current: number | null;
  locked?: boolean;
  skipped?: boolean;
  progressKnown?: boolean;   // false = no podemos calcular % (p. ej. deuda sin principal original)
  unknownValue?: number;     // valor a mostrar cuando progressKnown === false
  unknownLabel?: string;
}

interface AscentGoal {
  active: number;
  stages: AscentStage[];
}

// Baby Step 1 (Ramsey): fondo inicial FIJO (~$1.000 USD), no un mes de gastos.
// Debe coincidir con Finanzas::Interactors::DerivePhase::SEED_EMERGENCY_FUND en la API.
const SEED_FUND = 4_000_000;

const buildAscent = (summary: SummaryResponse): AscentGoal => {
  const plan = summary.monthly_plan;
  const committed = (plan?.recurring_obligations_total ?? 0) + (plan?.debt_minimums_total ?? 0);
  const efGoal = summary.savings_goals?.find((g) => /emergencia|emergency/iu.test(g.name));
  const efCurrent = efGoal?.current_amount ?? 0;
  const debtTotal = summary.debts?.total_balance ?? 0;
  const hasDebts = debtTotal > 0;

  const sixMonth = committed * 6;

  // El fondo semilla solo se interpone cuando hay deuda; sin deuda se va directo al
  // fondo de emergencia completo (el semilla es la primera parte de ese mismo fondo).
  let active: number;
  if (hasDebts) {
    active = efCurrent < SEED_FUND ? 0 : 1;
  } else if (committed > 0 && efCurrent < sixMonth) {
    active = 2;
  } else {
    active = 3;
  }

  const stages: AscentStage[] = [
    {
      id: 'baby_fund',
      label: 'Fondo semilla',
      hint: hasDebts
        ? 'Fondo inicial fijo (~$1.000 USD), antes de atacar deuda'
        : 'Sin deuda, va directo a tu fondo de emergencia',
      target: SEED_FUND,
      current: Math.min(efCurrent, SEED_FUND),
      progressKnown: true,
      skipped: !hasDebts,
    },
    {
      id: 'debt_payoff',
      label: 'Pagar deudas',
      hint: hasDebts ? 'Deuda activa fuera, presupuesto estricto' : 'No tienes deuda activa',
      target: hasDebts ? debtTotal : null,
      current: null,
      progressKnown: false,
      skipped: !hasDebts,
      unknownValue: hasDebts ? debtTotal : undefined,
      unknownLabel: hasDebts ? 'por liquidar' : undefined,
    },
    {
      id: 'emergency_fund',
      label: 'Fondo de emergencia',
      hint: '6 meses de gastos cubiertos',
      target: sixMonth || null,
      current: sixMonth > 0 ? Math.min(efCurrent, sixMonth) : efCurrent,
      progressKnown: committed > 0,
    },
    {
      id: 'patrimonio',
      label: 'Crecer patrimonio',
      hint: 'Próximamente',
      target: null,
      current: null,
      locked: true,
    },
  ];

  return { active, stages };
};

// Una sola montaña: el avatar sube por la ladera izquierda hacia el pico, donde
// ondea la bandera de meta. Marcas de altura a los lados dan referencia real.
const D2_PEAK_D = 'M 2,56 L 50,7 L 98,56 Z';
const D2_SLOPE_FROM = { x: 8, y: 52 };
const D2_SLOPE_TO = { x: 49, y: 10 };
const D2_HEIGHT_TICKS = [0, 0.5, 1];

const stageProgress = (stage: AscentStage): number => {
  if (stage.locked || stage.skipped || stage.target == null || stage.current == null) return 0;
  if (stage.progressKnown === false) return 0;
  return stage.target > 0 ? Math.min(1, stage.current / stage.target) : 0;
};

const stageState = (stage: AscentStage, i: number, active: number): 'locked' | 'skipped' | 'done' | 'active' | 'upcoming' => {
  if (stage.locked) return 'locked';
  if (stage.skipped) return 'skipped';
  if (i < active) return 'done';
  if (i === active) return 'active';
  return 'upcoming';
};

const avatarPos = (goal: AscentGoal) => {
  const frac = stageProgress(goal.stages[goal.active]);
  return {
    x: D2_SLOPE_FROM.x + (D2_SLOPE_TO.x - D2_SLOPE_FROM.x) * frac,
    y: D2_SLOPE_FROM.y + (D2_SLOPE_TO.y - D2_SLOPE_FROM.y) * frac,
  };
};

const AscentWidget = ({ goal, onOpen }: { goal: AscentGoal; onOpen: () => void }) => {
  const stage = goal.stages[goal.active];
  const known = stage.progressKnown !== false && stage.target != null && stage.current != null;
  const pct = known ? Math.round(stageProgress(stage) * 100) : null;
  const pos = avatarPos(goal);

  return (
    <div className={styles.d2Ascent}>
      <div className={styles.d2AscentHead}>
        <span className={styles.d2AscentEyebrow}>Tu ascenso</span>
        <span className={styles.d2AscentStage}>{stage.label}</span>
      </div>

      <button type="button" className={styles.d2MtnWrap} onClick={onOpen}>
        <span className={styles.d2MtnGlow} />
        <svg className={styles.d2MtnPathSvg} viewBox="0 0 100 60" preserveAspectRatio="none">
          <path d={D2_PEAK_D} className={styles.d2MtnPeakShape} />
          {D2_HEIGHT_TICKS.map((f) => {
            const y = D2_SLOPE_FROM.y + (D2_SLOPE_TO.y - D2_SLOPE_FROM.y) * f;
            return <line key={f} x1="2" x2="98" y1={y} y2={y} className={styles.d2MtnTick} />;
          })}
          <line x1={D2_SLOPE_FROM.x} y1={D2_SLOPE_FROM.y} x2={pos.x} y2={pos.y} className={styles.d2MtnSlopeDone} />
        </svg>
        <span className={styles.d2MtnFlag} style={{ left: '50%', top: '7%' }}>
          <svg viewBox="0 0 20 22" width="15" height="16">
            <line x1="2" y1="1" x2="2" y2="21" stroke="var(--text-on-surface-muted)" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M2,2 L17,6 L2,11 Z" fill="var(--color-brand)" />
          </svg>
        </span>
        <span className={`${styles.d2MtnTickLbl} ${styles.d2MtnTickLblTop}`}>{money(stage.target ?? 0)}</span>
        <span className={`${styles.d2MtnTickLbl} ${styles.d2MtnTickLblBottom}`}>{money(0)}</span>
        <span className={`${styles.d2MtnAvatar} ${styles.d2MtnAvatarSm}`} style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
          <svg className={styles.d2MtnAvatarEyes} viewBox="0 0 40 24">
            <circle className={styles.d2Pupil} cx="12" cy="12" r="6" />
            <circle className={styles.d2Pupil} cx="28" cy="12" r="6" />
            <circle className={styles.d2Catch} cx="9.8" cy="9.6" r="1.7" />
            <circle className={styles.d2Catch} cx="25.8" cy="9.6" r="1.7" />
          </svg>
        </span>
        <span className={styles.d2MtnFoot}>
          <span>
            {known ? (
              <span className={styles.d2MtnFootVal}>
                {money(stage.current ?? 0)} <span className={styles.d2MtnFootValMuted}>/ {money(stage.target ?? 0)}</span>
              </span>
            ) : (
              <span className={styles.d2MtnFootVal}>{money(stage.unknownValue ?? 0)}</span>
            )}
            <span className={styles.d2MtnFootLbl}>{known ? stage.hint : (stage.unknownLabel ?? stage.hint)}</span>
          </span>
          {pct != null ? <span className={styles.d2MtnFootPct}>{pct}%</span> : null}
        </span>
      </button>

      <div className={styles.d2AscentStages}>
        {goal.stages.map((s, i) => {
          const state = stageState(s, i, goal.active);
          const chipMod =
            state === 'done' || state === 'skipped' ? styles.d2AscentChipDone
              : state === 'active' ? styles.d2AscentChipActive
                : state === 'locked' ? styles.d2AscentChipLocked : '';
          return (
            <div key={s.id} className={`${styles.d2AscentChip} ${chipMod}`}>
              {(state === 'done' || state === 'skipped') ? <IonIcon icon={checkmarkOutline} /> : null}
              {s.label}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AscentModal = ({ isOpen, goal, onClose }: { isOpen: boolean; goal: AscentGoal; onClose: () => void }) => (
  <SheetModal isOpen={isOpen} title="Tu ascenso" onClose={onClose} height="tall">
    <div className={styles.modalBody}>
      <p className={styles.explain}>
        El sistema define tu próximo paso según tu situación: primero un colchón mínimo,
        luego salir de deudas, después un fondo de emergencia completo, y al final crecer patrimonio.
      </p>
      {goal.stages.map((s, i) => {
        const state = stageState(s, i, goal.active);
        const known = s.progressKnown !== false && s.target != null && s.current != null;
        const pct = known ? Math.round(stageProgress(s) * 100) : null;
        const valColor = state === 'active' ? 'var(--color-brand)'
          : (state === 'done' || state === 'skipped') ? 'var(--color-investment)' : undefined;
        return (
          <div className={styles.flowRow} key={s.id} style={{ opacity: state === 'locked' ? 0.45 : 1 }}>
            <div className={styles.flowL}>
              <span className={styles.flowLbl} style={{ color: valColor }}>
                {i + 1}. {s.label}{state === 'done' ? ' · hecho' : state === 'active' ? ' · en curso' : ''}
              </span>
              <span className={styles.flowHint}>{s.hint}</span>
            </div>
            <span className={styles.flowVal} style={{ color: state === 'skipped' ? 'var(--color-investment)' : undefined }}>
              {state === 'locked' ? '—' : state === 'skipped' ? 'No la necesitas' : pct != null ? `${pct}%` : 'En curso'}
            </span>
          </div>
        );
      })}
    </div>
  </SheetModal>
);

// ──────────────────────────────────────────────────────────────────────────
// ESTADO GENERAL — reemplaza el hero grande (una línea, sin melodrama)
// ──────────────────────────────────────────────────────────────────────────
const StatusLine = ({ runway, nextIncomeLabel, onOpen }: {
  runway: SummaryResponse['cash_flow_runway'] | null | undefined;
  nextIncomeLabel: string;
  onOpen: () => void;
}) => {
  const health = runway?.health_status ?? null;
  const mod = health === 'comfortable' ? styles.d2StatusOk
    : health === 'warning' ? styles.d2StatusWarn
      : health === 'critical' ? styles.d2StatusRisk : '';
  const label = health === 'comfortable' ? 'Vas bien'
    : health === 'warning' ? 'Vas justo'
      : health === 'critical' ? 'Estás en rojo' : 'Sin datos de flujo';
  const tail = nextIncomeLabel === 'quincena' ? 'hasta la quincena' : 'hasta el próximo ingreso';

  return (
    <button type="button" className={`${styles.d2Status} ${mod}`} onClick={onOpen}>
      <span className={styles.d2StatusDot} />
      <span className={styles.d2StatusText}>{label}{health ? ` — ${tail}` : ''}</span>
      <IonIcon icon={chevronForwardOutline} className={styles.d2StatusChev} />
    </button>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// RITMO DIARIO + GASTADO
// ──────────────────────────────────────────────────────────────────────────
const StatsRow = ({ ritmo, gastado, onRitmo }: { ritmo: number; gastado: number; onRitmo: () => void }) => (
  <div className={styles.d2Stats}>
    <button type="button" className={`${styles.d2Stat} ${styles.d2StatTap}`} onClick={onRitmo}>
      <div className={styles.d2StatLbl}>Ritmo diario</div>
      <div className={styles.d2StatVal}>{money(ritmo)}<span className={styles.d2StatUnit}> /día</span></div>
      <div className={styles.d2StatHint}>¿De dónde sale?</div>
    </button>
    <div className={styles.d2Stat}>
      <div className={styles.d2StatLbl}>Gastado este mes</div>
      <div className={styles.d2StatVal}>{money(gastado)}</div>
    </div>
  </div>
);

// ──────────────────────────────────────────────────────────────────────────
// OBLIGACIONES — widget compacto
// ──────────────────────────────────────────────────────────────────────────
const ObligationsWidget = ({ items, today, onOpen }: { items: OblItem[]; today: number; onOpen: () => void }) => {
  if (items.length === 0) return null;
  const pending = items.filter((i) => i.covered_amount === 0).sort((a, b) => (a.due_day ?? 99) - (b.due_day ?? 99));
  const paid = items.filter((i) => i.covered_amount > 0);
  const falta = pending.reduce((a, i) => a + i.expected_amount, 0);
  const visible = pending.slice(0, 3);

  return (
    <div className={styles.d2Widget}>
      <div className={styles.d2Sec}>
        <span className={styles.d2SecLabel}>Obligaciones</span>
        <button type="button" className={styles.d2SecMore} onClick={onOpen}>Ver todo <IonIcon icon={chevronForwardOutline} /></button>
      </div>
      <div className={styles.d2OblSummary}>
        <span className={styles.d2OblSummaryL}><b>{paid.length} de {items.length}</b> pagadas</span>
        <span className={styles.d2OblSummaryR}>te falta {money(falta)}</span>
      </div>
      <div className={styles.d2List}>
        {visible.map((it) => {
          const daysAway = (it.due_day ?? 0) - today;
          const soon = daysAway <= 5;
          const cat = catConfig(it.category_code);
          const icon = resolveNamedIcon(it.subcategory_icon ?? null) ?? cat.icon;
          return (
            <button type="button" className={styles.d2Row} key={it.id} style={{ '--r-col': cat.color } as React.CSSProperties} onClick={onOpen}>
              <span className={styles.d2RowIcon}><IonIcon icon={icon} /></span>
              <span className={styles.d2RowBody}>
                <span className={styles.d2RowName}>{it.name}</span>
                <span className={styles.d2RowSub}>{it.due_day ? `día ${it.due_day}` : '—'} · {money(it.expected_amount)}</span>
              </span>
              <span className={`${styles.d2RowMeta} ${soon ? styles.d2RowMetaSoon : ''}`}>{daysAway <= 0 ? 'hoy' : `en ${daysAway}d`}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// GAVETAS (3)
// ──────────────────────────────────────────────────────────────────────────
interface CatItem { category_type: string; budget: number; spent: number; category_id: number }

const CategoriesWidget = ({ cats, onOpen }: { cats: CatItem[]; onOpen: (c: CatItem) => void }) => {
  const byType = new Map(cats.map((c) => [c.category_type, c]));
  const rows = CAT_ORDER.map((t) => byType.get(t)).filter((c): c is CatItem => Boolean(c));
  if (rows.length === 0) return null;

  return (
    <div className={styles.d2Widget}>
      <div className={styles.d2Sec}><span className={styles.d2SecLabel}>Cómo va cada gaveta</span></div>
      <div className={styles.d2List}>
        {rows.map((c) => {
          const cfg = catConfig(c.category_type);
          const pct = c.budget > 0 ? Math.min(100, Math.round((c.spent / c.budget) * 100)) : 0;
          const over = c.spent > c.budget && c.budget > 0;
          return (
            <button type="button" className={`${styles.d2Row} ${styles.d2RowHasBar}`} key={c.category_id} style={{ '--r-col': cfg.color } as React.CSSProperties} onClick={() => onOpen(c)}>
              <span className={styles.d2RowIcon}><IonIcon icon={cfg.icon} /></span>
              <span className={styles.d2RowBody}>
                <span className={styles.d2RowName}>{cfg.name}</span>
                <span className={styles.d2RowSub}>{money(c.spent)} de {money(c.budget)}</span>
              </span>
              <span className={styles.d2RowRight}>
                <span className={styles.d2RowAmt} style={{ color: over ? 'var(--color-committed)' : undefined }}>{pct}%</span>
              </span>
              <span className={styles.d2RowBar}><span className={`${styles.d2RowBarFill} ${over ? styles.d2RowBarFillOver : ''}`} style={{ width: `${pct}%` }} /></span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// LO ÚLTIMO
// ──────────────────────────────────────────────────────────────────────────
const TxnsWidget = ({ txns, onMore }: { txns: Transaction[]; onMore: () => void }) => {
  if (txns.length === 0) return null;
  return (
    <div className={styles.d2Widget}>
      <div className={styles.d2Sec}>
        <span className={styles.d2SecLabel}>Lo último</span>
        <button type="button" className={styles.d2SecMore} onClick={onMore}>Ver todo <IonIcon icon={chevronForwardOutline} /></button>
      </div>
      <div className={styles.d2List}>
        {txns.slice(0, 3).map((tx) => {
          const attr = tx.attributes;
          const cfg = catConfig(attr.category_type);
          const isIncome = attr.transaction_type === 'income';
          const meta = [txnDayLabel(attr.date), paymentLabel(attr.payment_source)].filter(Boolean).join(' · ');
          const col = isIncome ? 'var(--color-income)' : cfg.color;
          return (
            <div className={styles.d2Row} key={tx.id} style={{ '--r-col': col } as React.CSSProperties}>
              <span className={styles.d2RowIcon}><IonIcon icon={isIncome ? flashOutline : cfg.icon} /></span>
              <span className={styles.d2RowBody}>
                <span className={styles.d2RowName}>{attr.concept || attr.product}</span>
                {meta ? <span className={styles.d2RowSub}>{meta}</span> : null}
              </span>
              <span className={`${styles.d2RowAmt} ${isIncome ? styles.d2RowAmtIn : ''}`}>
                {isIncome ? '+' : '−'}{money(attr.amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// MODALES reutilizados (flujo / ritmo / obligaciones)
// ──────────────────────────────────────────────────────────────────────────
const FlowModal = ({ isOpen, onClose, runway, nextCycleLabel }: {
  isOpen: boolean; onClose: () => void;
  runway: NonNullable<SummaryResponse['cash_flow_runway']>; nextCycleLabel: string;
}) => {
  const days = runway.days_to_next_income ?? 0;
  const dailyBurn = runway.daily_necessary_burn ?? 0;
  const burnUntilIncome = dailyBurn * days;
  const committed = runway.committed_before_next_income ?? 0;
  const margin = runway.commitment_gap ?? 0;

  const rows = [
    { lbl: 'Lo que tienes hoy', hint: 'Ingresos menos gastos confirmados, más lo que arrastraste del mes pasado', val: runway.confirmed_balance },
    { lbl: 'Pagos que ya prometiste', hint: `Compromisos fijos que vencen antes del ${nextCycleLabel}`, val: -committed },
    { lbl: 'Tu día a día hasta esa fecha', hint: `≈ ${money(dailyBurn)}/día × ${days} días — mercado, transporte, comida`, val: -burnUntilIncome },
  ];

  return (
    <SheetModal isOpen={isOpen} title="Tu estado hasta la quincena" onClose={onClose} height="compact">
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

const BurnModal = ({ isOpen, onClose, runway }: {
  isOpen: boolean; onClose: () => void; runway: NonNullable<SummaryResponse['cash_flow_runway']>;
}) => (
  <SheetModal isOpen={isOpen} title="Tu ritmo diario" onClose={onClose} height="compact">
    <div className={styles.modalBody}>
      <div className={styles.fundModalCenter}>
        <div className={styles.fundModalAmount}>{moneyFull(runway.daily_necessary_burn)}</div>
        <div className={styles.fundModalSub}>promedio de tus gastos del día a día</div>
      </div>
      <p className={styles.explain}>
        Se calcula con tus gastos necesarios — mercado, transporte, comida — de los últimos 30 días, divididos entre 30.
      </p>
      <p className={styles.explain}>
        Tus pagos fijos (arriendo, cuotas, suscripciones) <strong>no entran aquí</strong>: esos se cuentan aparte como compromisos, para no contarlos dos veces.
      </p>
      {!runway.has_sufficient_history ? (
        <p className={`${styles.explain} ${styles.explainWarn}`}>
          Todavía no tienes 14 días de historial, así que por ahora usamos un estimado de $30.000/día. Se afina solo a medida que registras.
        </p>
      ) : null}
    </div>
  </SheetModal>
);

const ObligationsModal = ({ isOpen, onClose, items, today }: {
  isOpen: boolean; onClose: () => void; items: OblItem[]; today: number;
}) => {
  const pending = items.filter((i) => i.covered_amount === 0);
  const paid = items.filter((i) => i.covered_amount > 0);
  const totalPending = pending.reduce((a, i) => a + i.expected_amount, 0);
  const totalPaid = paid.reduce((a, i) => a + i.covered_amount, 0);

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
            {pending.sort((a, b) => (a.due_day ?? 99) - (b.due_day ?? 99)).map((it) => {
              const daysAway = (it.due_day ?? 0) - today;
              const soon = daysAway <= 4;
              return (
                <div className={styles.oblRow} key={it.id}>
                  <div className={`${styles.oblDot} ${soon ? styles.oblDotWarn : ''}`} />
                  <div className={styles.oblRowBody}>
                    <div className={styles.oblName}>{it.name}</div>
                    <div className={styles.oblMeta}>{it.due_day ? `día ${it.due_day}` : '—'} · {money(it.expected_amount)}</div>
                  </div>
                  <div className={`${styles.oblWhen} ${soon ? styles.oblWhenSoon : ''}`}>{daysAway <= 0 ? 'hoy' : `en ${daysAway}d`}</div>
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
                <div className={`${styles.oblDot} ${styles.oblDotPaid}`}><IonIcon icon={checkmarkCircleOutline} /></div>
                <div className={styles.oblRowBody}>
                  <div className={`${styles.oblName} ${styles.oblNamePaid}`}>{it.name}</div>
                  <div className={styles.oblMeta}>{it.due_day ? `día ${it.due_day}` : '—'} · {money(it.covered_amount)}</div>
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
// PERSONALIZAR — reordenar (drag) + ocultar/mostrar, persistido
// ──────────────────────────────────────────────────────────────────────────
type WidgetId = 'status' | 'ascent' | 'stats' | 'obligations' | 'categories' | 'txns';
interface WidgetPref { id: WidgetId; visible: boolean }

const WIDGET_LABELS: Record<WidgetId, string> = {
  status: 'Estado general',
  ascent: 'Tu ascenso',
  stats: 'Ritmo diario y gastado',
  obligations: 'Obligaciones',
  categories: 'Gavetas (comprometido / necesario / flexible)',
  txns: 'Lo último',
};
const DEFAULT_WIDGETS: WidgetPref[] = (['status', 'ascent', 'stats', 'obligations', 'categories', 'txns'] as WidgetId[])
  .map((id) => ({ id, visible: true }));
const WIDGETS_KEY = 'ascent-dashboard-widgets-v2';

const loadWidgets = (): WidgetPref[] => {
  try {
    const raw = localStorage.getItem(WIDGETS_KEY);
    if (!raw) return DEFAULT_WIDGETS;
    const saved = JSON.parse(raw) as WidgetPref[];
    const merged = saved.filter((w) => WIDGET_LABELS[w.id]);
    const seen = new Set(merged.map((w) => w.id));
    DEFAULT_WIDGETS.forEach((d) => { if (!seen.has(d.id)) merged.push(d); });
    return merged;
  } catch {
    return DEFAULT_WIDGETS;
  }
};

const CustomizeSheet = ({ isOpen, widgets, onChange, onClose, onReset }: {
  isOpen: boolean; widgets: WidgetPref[];
  onChange: (w: WidgetPref[]) => void; onClose: () => void; onReset: () => void;
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [dragIdx, setDragIdx] = useState(-1);

  const toggle = (id: WidgetId) => onChange(widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)));

  const onGripDown = (idx: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    setDragIdx(idx);
    const container = listRef.current;
    const move = (ev: PointerEvent) => {
      if (!container) return;
      const rows = Array.from(container.querySelectorAll('[data-cz-row]'));
      let overIdx = rows.length - 1;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i].getBoundingClientRect();
        if (ev.clientY < r.top + r.height / 2) { overIdx = i; break; }
      }
      setDragIdx((cur) => {
        if (cur === -1 || cur === overIdx) return cur;
        const next = widgets.slice();
        const [moved] = next.splice(cur, 1);
        next.splice(overIdx, 0, moved);
        onChange(next);
        return overIdx;
      });
    };
    const up = () => {
      setDragIdx(-1);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <SheetModal isOpen={isOpen} title="Personalizar dashboard" onClose={onClose} height="tall">
      <div className={styles.modalBody}>
        <p className={styles.d2CzSub}>Arrastra para reordenar. Apaga lo que no quieras ver.</p>
        <button type="button" className={styles.d2CzReset} onClick={onReset}>Restaurar predeterminados</button>
        <div className={styles.d2CzBody} ref={listRef}>
          {widgets.map((w, i) => (
            <div key={w.id} data-cz-row className={`${styles.d2CzRow} ${w.visible ? '' : styles.d2CzRowHidden} ${dragIdx === i ? styles.d2CzRowDragging : ''}`}>
              <span className={styles.d2CzGrip} onPointerDown={onGripDown(i)}><IonIcon icon={optionsOutline} /></span>
              <span className={styles.d2CzLabel}>{WIDGET_LABELS[w.id]}</span>
              <button type="button" className={`${styles.d2CzToggle} ${w.visible ? styles.d2CzToggleOn : ''}`} onClick={() => toggle(w.id)}>
                <span className={styles.d2CzKnob} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </SheetModal>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// DASHBOARD CONTENT
// ──────────────────────────────────────────────────────────────────────────
export const DashboardContent = () => {
  const { summary, completeness, loading, error, reload, monthTransactions } = useDashboardData();
  const history = useHistory();
  const [modal, setModal] = useState<'flow' | 'obl' | 'burn' | 'ascent' | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [widgets, setWidgets] = useState<WidgetPref[]>(loadWidgets);

  // ── Botón "Personalizar" en el toolbar del header (solo en esta página) ──
  const userName = useAuthStore((state) => state.user?.name);
  const greeting = getGreetingByHour(new Date().getHours());
  const firstName = getFirstName(userName);
  const toolbar = useMemo<AppToolbarConfig>(() => ({
    title: firstName || 'Ascent',
    subtitle: greeting,
    actions: [
      {
        key: 'customize',
        label: 'Personalizar dashboard',
        icon: <IonIcon icon={optionsOutline} />,
        onClick: () => setCustomizeOpen(true),
      },
      {
        key: 'profile',
        label: 'Mi perfil',
        icon: <IonIcon icon={personCircleOutline} />,
        onClick: () => history.push('/profile'),
      },
    ],
  }), [firstName, greeting, history]);
  useAppToolbar(toolbar);

  useEffect(() => {
    localStorage.setItem(WIDGETS_KEY, JSON.stringify(widgets));
  }, [widgets]);

  const { dataVersion } = useAgentUI();
  useEffect(() => { if (dataVersion > 0) void reload(); }, [dataVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    financeService.fetchPendingTransactions()
      .then((res) => setPendingCount(res.data.length))
      .catch(() => setPendingCount(0));
  }, [dataVersion]);

  // ── Date calculations ──
  const today = new Date();
  const todayNum = today.getDate();
  const dayMonthFmt = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' });
  const runway = summary?.cash_flow_runway ?? null;
  const nextIncomeDayNum = runway?.next_income_day ?? null;
  const nextCycleDate = nextIncomeDayNum
    ? new Date(today.getFullYear(), today.getMonth(), nextIncomeDayNum)
    : new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const nextCycleLabel = dayMonthFmt.format(nextCycleDate);
  const nextIncomeLabel = runway?.next_income_classification === 'base' ? 'quincena' : 'próximo ingreso';

  const hasPlanPendingConfirmation = completeness?.pending_confirmation?.includes('monthly_plan') ?? false;
  const planMonthLabel = summary?.period
    ? new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(new Date(summary.period.year, summary.period.month - 1, 1))
    : 'este mes';

  const oblItems: OblItem[] = summary?.month_execution?.recurring_obligations?.items ?? [];
  const cats: CatItem[] = summary?.burn_rate?.categories ?? [];
  const ascent = summary ? buildAscent(summary) : null;

  const renderWidget = (id: WidgetId) => {
    switch (id) {
      case 'status':
        return <StatusLine runway={runway} nextIncomeLabel={nextIncomeLabel} onOpen={() => setModal('flow')} />;
      case 'ascent':
        return ascent ? <AscentWidget goal={ascent} onOpen={() => setModal('ascent')} /> : null;
      case 'stats':
        return <StatsRow ritmo={runway?.daily_necessary_burn ?? 0} gastado={summary?.balance.expense_confirmed ?? 0} onRitmo={() => setModal('burn')} />;
      case 'obligations':
        return <ObligationsWidget items={oblItems} today={todayNum} onOpen={() => setModal('obl')} />;
      case 'categories':
        return <CategoriesWidget cats={cats} onOpen={(c) => history.push(`/gaveta/${c.category_type}`, { category: c })} />;
      case 'txns':
        return <TxnsWidget txns={monthTransactions} onMore={() => history.push('/transactions')} />;
      default:
        return null;
    }
  };

  return (
    <IonContent className={pageStyles.pageContent}>
      <section className={pageStyles.stack}>
        {loading ? <div className={pageStyles.centeredState}><Spinner size="lg" /></div> : null}
        {error ? <ErrorState message={error} onRetry={() => void reload()} /> : null}

        {!loading && !error && summary ? (
          <>
            {hasPlanPendingConfirmation ? (
              <div className={styles.planBanner}>
                <p className={styles.planBannerText}>Tu plan de {planMonthLabel} está listo para revisar.</p>
                <button type="button" className={styles.planBannerBtn} onClick={() => history.push('/budgets')}>Revisar</button>
              </div>
            ) : null}

            {pendingCount > 0 ? (
              <div className={styles.planBanner}>
                <p className={styles.planBannerText}>
                  {pendingCount === 1 ? 'Encontré 1 movimiento. Confírmalo en un tap.' : `Encontré ${pendingCount} movimientos. Confírmalos en un tap.`}
                </p>
                <button type="button" className={styles.planBannerBtn} onClick={() => history.push('/transactions')}>Revisar</button>
              </div>
            ) : null}

            <div className={styles.d2Scroll}>
              {widgets.filter((w) => w.visible).map((w) => (
                <div key={w.id}>{renderWidget(w.id)}</div>
              ))}
            </div>
          </>
        ) : null}
      </section>

      {runway ? <FlowModal isOpen={modal === 'flow'} onClose={() => setModal(null)} runway={runway} nextCycleLabel={nextCycleLabel} /> : null}
      <ObligationsModal isOpen={modal === 'obl'} onClose={() => setModal(null)} items={oblItems} today={todayNum} />
      {runway ? <BurnModal isOpen={modal === 'burn'} onClose={() => setModal(null)} runway={runway} /> : null}
      {ascent ? <AscentModal isOpen={modal === 'ascent'} goal={ascent} onClose={() => setModal(null)} /> : null}

      <CustomizeSheet
        isOpen={customizeOpen}
        widgets={widgets}
        onChange={setWidgets}
        onClose={() => setCustomizeOpen(false)}
        onReset={() => setWidgets(DEFAULT_WIDGETS.map((w) => ({ ...w })))}
      />
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
