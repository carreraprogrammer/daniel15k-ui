import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { IonContent, IonIcon } from '@ionic/react';
import {
  chevronDownOutline,
  closeOutline,
  sparklesOutline,
  arrowForwardOutline,
  walletOutline,
  trophyOutline,
} from 'ionicons/icons';
import { useHistory, useParams } from 'react-router-dom';
import { AppLayout } from '../../templates/AppLayout';
import { useAppToolbar } from '../../templates/AppLayout/AppLayoutContext';
import { Spinner } from '../../atoms/Spinner';
import { ErrorState } from '../../molecules/ErrorState';
import { ErrorNotice } from '../../molecules/ErrorNotice/ErrorNotice';
import { Button } from '../../atoms/Button';
import { LoadingOverlay } from '../../molecules/LoadingOverlay/LoadingOverlay';
import { BudgetPlanModal } from '../../organisms/BudgetPlanModal/BudgetPlanModal';
import { AscentBudgetWizard } from '../../organisms/AscentBudgetWizard';
import { resolveNamedIcon } from '../../organisms/BudgetWizard/iconRegistry';
import { useWizardData } from '../../../hooks/useWizardData';
import { financeService } from '../../../services/financeService';
import { buildCategoryLookup, type CategoryLookupItem } from '../../../utils/financeBehavior';
import { formatCurrencyCompact, formatCurrencyFull } from '../../../utils/formatCurrency';
import type {
  BudgetPlanDraft,
  CategoryResource,
  CurrentPlan,
  CurrentPlanCategory,
  CurrentPlanSubcategory,
  FinancialPrimaryMetric,
  MonthlyPlanHistory,
  Transaction,
} from '../../../types/finance.types';
import './BudgetsPage.redesign.css';

// ── Helpers ─────────────────────────────────────────────────────────────────────

const peso = (n: number) => formatCurrencyFull(n);
const pesoK = (n: number) => formatCurrencyCompact(n);
const pctOf = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

const padMonth = (month: number): string => String(month).padStart(2, '0');

const parsePeriodParam = (yearParam?: string, monthParam?: string) => {
  const year = Number(yearParam);
  const month = Number(monthParam);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  return { year, month };
};

const formatPlanPeriod = (plan: MonthlyPlanHistory): string =>
  new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(
    new Date(plan.year, plan.month - 1, 1),
  );

const plannedExpenseTotal = (plan: MonthlyPlanHistory): number => {
  const snapshotCategories = plan.execution_snapshot?.categories;
  if (Array.isArray(snapshotCategories)) {
    return snapshotCategories.reduce((sum, category) => sum + Number(category?.budgeted ?? 0), 0);
  }
  return Number(plan.recurring_obligations_total ?? 0) +
    Number(plan.debt_minimums_total ?? 0) +
    Number(plan.discretionary_limit ?? 0);
};

type HistoryStatus = 'confirmado' | 'cerrado' | 'borrador';
const historyStatus = (plan: MonthlyPlanHistory): HistoryStatus => {
  if (plan.closed_at) return 'cerrado';
  if (plan.status === 'confirmed') return 'confirmado';
  return 'borrador';
};

const toneFor = (signal?: CurrentPlanCategory['signal_kind']): 'good' | 'warn' | 'ok' =>
  signal === 'positive' ? 'good' : signal === 'attention' ? 'warn' : 'ok';

const defaultBadge = (tone: 'good' | 'warn' | 'ok') =>
  tone === 'good' ? 'Buen avance' : tone === 'warn' ? 'Requiere atención' : 'En ritmo';

const primaryMetricValueLabel = (metric: FinancialPrimaryMetric): string => {
  if (metric.kind === 'goal_progress' || metric.kind === 'spiky_context' || metric.kind === 'debt_progress') {
    return `${Math.round(metric.value)}%`;
  }
  return formatCurrencyCompact(metric.value);
};

const paymentLabel = (src: string | null | undefined): string =>
  src === 'credit_card' ? 'Crédito' : src === 'debit' ? 'Débito' : src === 'cash' ? 'Efectivo' : '';

const transactionSubcategoryId = (tx: Transaction): string | null => {
  const relationshipId = tx.relationships?.subcategory?.data?.id;
  if (relationshipId) return String(relationshipId);
  const attributeId = tx.attributes.subcategory_id;
  return attributeId == null ? null : String(attributeId);
};

// ── Hero ─────────────────────────────────────────────────────────────────────────

interface HeroProps {
  month: string;
  cats: CurrentPlanCategory[];
  goal: CurrentPlanCategory | null;
}

const BudgetHero = ({ month, cats, goal }: HeroProps) => {
  const totalBudget = cats.reduce((a, c) => a + (c.budgeted ?? 0), 0);
  const totalSpent = cats.reduce((a, c) => a + (c.spent ?? 0), 0);
  const pct = pctOf(totalSpent, totalBudget);
  const attention = cats.filter((c) => c.signal_kind === 'attention');
  const good = cats.filter((c) => c.signal_kind === 'positive');
  const state: 'good' | 'warn' = attention.length > 0 ? 'warn' : 'good';

  const title = attention.length > 0
    ? `${attention.length} categoría${attention.length > 1 ? 's' : ''} ${attention.length > 1 ? 'piden' : 'pide'} atención`
    : good.length > 0
      ? `${good.length} avance${good.length > 1 ? 's' : ''} positivo${good.length > 1 ? 's' : ''} este mes`
      : 'Vas dentro del plan';

  const r = 46;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(100, pct) / 100) * circ;
  const goalPct = goal ? pctOf(goal.spent ?? 0, goal.budgeted ?? 0) : null;

  return (
    <div className={`bp-hero bp-hero-${state}`}>
      <div className="bp-hero-eyebrow">{month}</div>
      <div className="bp-hero-top">
        <div className="bp-hero-ring">
          <svg width="110" height="110" viewBox="0 0 110 110">
            <circle cx="55" cy="55" r={r} fill="none" stroke="var(--panel-2)" strokeWidth="9" />
            <circle
              cx="55" cy="55" r={r} fill="none"
              stroke={state === 'warn' ? 'var(--necessary)' : 'var(--investment)'}
              strokeWidth="9" strokeLinecap="round"
              strokeDasharray={`${dash} ${circ}`}
              transform="rotate(-90 55 55)"
            />
          </svg>
          <div className="bp-hero-ring-num">
            <span className="n">{pct}</span><span className="pct">%</span>
          </div>
        </div>
        <div className="bp-hero-text">
          <div className="bp-hero-title">{title}</div>
          <div className="bp-hero-sub">
            Llevas <b>{pesoK(totalSpent)}</b> gastados de <b>{pesoK(totalBudget)}</b> planeados este mes.
          </div>
        </div>
      </div>
      <div className="bp-hero-chips">
        <div className="bp-hero-chip">
          <span className="k">Disponible</span>
          <span className="v">{pesoK(Math.max(0, totalBudget - totalSpent))}</span>
        </div>
        <div className="bp-hero-chip">
          <span className="k">En alerta</span>
          <span className={`v ${attention.length ? 'warn' : ''}`}>{attention.length}</span>
        </div>
        <div className="bp-hero-chip">
          <span className="k">{goalPct != null ? 'Objetivo' : 'Grupos'}</span>
          <span className="v">{goalPct != null ? `${goalPct}%` : cats.length}</span>
        </div>
      </div>
    </div>
  );
};

// ── Goal card ─────────────────────────────────────────────────────────────────────

const GoalCard = ({ goal }: { goal: CurrentPlanCategory }) => {
  const monthly = goal.budgeted ?? 0;
  const contributed = goal.spent ?? 0;
  const pctThisMonth = Math.min(100, pctOf(contributed, monthly));
  const color = goal.color ?? 'var(--color-investment)';
  const metric = goal.primary_metric;

  return (
    <div className="bp-goal" style={{ '--g': color } as CSSProperties}>
      <div className="bp-goal-head">
        <span className="bp-goal-gem"><IonIcon icon={resolveNamedIcon(goal.icon) ?? trophyOutline} /></span>
        <div className="bp-goal-main">
          <span className="bp-goal-eyebrow">Objetivo prioritario</span>
          <span className="bp-goal-name">{goal.name ?? 'Objetivo financiero'}</span>
        </div>
        <div className="bp-goal-amt">{pesoK(monthly)}<span className="u">/mes</span></div>
      </div>
      <div className="bp-goal-track"><div className="bp-goal-fill" style={{ width: `${pctThisMonth}%` }} /></div>
      <div className="bp-goal-foot">
        <span>{pctThisMonth}% aportado este mes</span>
        <span>{peso(contributed)} aportado</span>
      </div>
      <div className="bp-goal-total">
        <span>{metric?.title ?? 'Progreso del mes'}</span>
        <span className="mono">{metric ? primaryMetricValueLabel(metric) : `${pctThisMonth}%`}</span>
      </div>
    </div>
  );
};

// ── Category accordion ────────────────────────────────────────────────────────────

interface CategoryGroupProps {
  cat: CurrentPlanCategory;
  open: boolean;
  onToggle: (code: string) => void;
  onOpenSub: (cat: CurrentPlanCategory, sub: CurrentPlanSubcategory) => void;
}

const CategoryGroup = ({ cat, open, onToggle, onOpenSub }: CategoryGroupProps) => {
  const code = cat.code ?? 'unknown';
  const color = cat.color ?? `var(--color-${code})`;
  const tone = toneFor(cat.signal_kind);
  const badge = cat.signal_label ?? defaultBadge(tone);
  const budget = cat.budgeted ?? 0;
  const spent = cat.spent ?? 0;
  const pct = Math.min(100, pctOf(spent, budget));
  const over = spent > budget;
  const remaining = budget - spent;
  const subs = cat.subcategories ?? [];
  const toneColor = tone === 'good' ? 'var(--investment)' : tone === 'warn' ? 'var(--necessary)' : 'var(--text)';

  return (
    <div className={`bp-cat ${open ? 'is-open' : ''}`} style={{ '--c': color } as CSSProperties}>
      <button className="bp-cat-head" onClick={() => onToggle(code)} aria-expanded={open}>
        <span className="bp-cat-gem"><IonIcon icon={resolveNamedIcon(cat.icon) ?? walletOutline} /></span>
        <span className="bp-cat-main">
          <span className="bp-cat-name-row">
            <span className="bp-cat-name">{cat.name ?? 'Sin categoría'}</span>
            <span className={`bp-cat-badge tone-${tone}`}>{badge}</span>
          </span>
          {cat.signal_detail ? <span className="bp-cat-note">{cat.signal_detail}</span> : null}
        </span>
        <span className="bp-cat-chev"><IonIcon icon={chevronDownOutline} /></span>
      </button>

      <div className="bp-cat-barwrap">
        <div className="bp-cat-bar"><div className={`bp-cat-bar-fill ${over ? 'over' : ''}`} style={{ width: `${pct}%` }} /></div>
        <div className="bp-cat-bar-foot">
          <span>{peso(spent)} gastados de {peso(budget)}</span>
          <span className={over ? 'over' : ''}>{pct}%</span>
        </div>
      </div>

      {open ? (
        <div className="bp-cat-body">
          <div className="bp-cat-stats">
            <div className="cell"><span className="l">Presupuesto</span><span className="v">{peso(budget)}</span></div>
            <div className="cell"><span className="l">Gastado</span><span className="v">{peso(spent)}</span></div>
            <div className="cell"><span className="l">Restante</span><span className={`v ${remaining < 0 ? 'over' : ''}`}>{peso(Math.abs(remaining))}</span></div>
            <div className="cell"><span className="l">Estado</span><span className="v tone" style={{ color: toneColor }}>{badge}</span></div>
          </div>
          {subs.length ? (
            <div className="bp-cat-subs">
              {subs.map((s) => (
                <SubCard key={s.id ?? s.code ?? s.name} sub={s} color={color} onOpen={() => onOpenSub(cat, s)} />
              ))}
            </div>
          ) : (
            <div className="bp-empty-subs">Esta categoría no tiene subcategorías activas para este plan.</div>
          )}
        </div>
      ) : null}
    </div>
  );
};

const SubCard = ({ sub, color, onOpen }: { sub: CurrentPlanSubcategory; color: string; onOpen: () => void }) => {
  const budget = sub.budgeted ?? 0;
  const spent = sub.spent ?? 0;
  const pct = budget > 0 ? Math.min(100, pctOf(spent, budget)) : 0;
  const over = spent > budget;
  return (
    <button className="bp-sub" style={{ '--c': color } as CSSProperties} onClick={onOpen}>
      <span className="bp-sub-gem"><IonIcon icon={resolveNamedIcon(sub.icon) ?? walletOutline} /></span>
      <span className="bp-sub-name">{sub.name ?? sub.code ?? 'Sin nombre'}</span>
      <span className="bp-sub-amt">{pesoK(spent)}</span>
      <span className="bp-sub-bar"><span className={`fill ${over ? 'over' : ''}`} style={{ width: `${pct}%` }} /></span>
    </button>
  );
};

// ── Subcategory drawer ────────────────────────────────────────────────────────────

interface DrawerProps {
  cat: CurrentPlanCategory;
  sub: CurrentPlanSubcategory;
  txns: Transaction[];
  onClose: () => void;
}

const SubDrawer = ({ cat, sub, txns, onClose }: DrawerProps) => {
  const color = cat.color ?? `var(--color-${cat.code ?? 'unknown'})`;
  const budget = sub.budgeted ?? 0;
  const spent = sub.spent ?? 0;
  const pct = budget > 0 ? Math.min(100, pctOf(spent, budget)) : 0;
  const over = spent > budget;
  const remaining = budget - spent;
  const covered = budget > 0 && spent >= budget;
  const subIcon = resolveNamedIcon(sub.icon) ?? walletOutline;

  return (
    <>
      <div className="bp-sheet-backdrop" onClick={onClose} />
      <div className="bp-drawer" role="dialog" aria-modal="true">
        <div className="bp-sheet-handle" />
        <div className="bp-drawer-card" style={{ '--c': color } as CSSProperties}>
          <div className="bp-drawer-head">
            <span className="bp-drawer-gem"><IonIcon icon={subIcon} /></span>
            <div className="bp-drawer-main">
              <span className="bp-drawer-eyebrow">{cat.name}</span>
              <span className="bp-drawer-name">{sub.name ?? sub.code ?? 'Subcategoría'}</span>
            </div>
            <button className="bp-drawer-close" onClick={onClose} aria-label="Cerrar"><IonIcon icon={closeOutline} /></button>
          </div>

          <div className="bp-drawer-amt">
            <span className="cur">$</span>{Math.round(spent).toLocaleString('es-CO')}
            <span className="of"> de {peso(budget)}</span>
          </div>

          <div className="bp-drawer-track"><div className={`bp-drawer-fill ${over ? 'over' : ''}`} style={{ width: `${pct}%` }} /></div>

          <div className="bp-drawer-stats">
            <div className="cell"><span className="l">Gastado</span><span className="v">{peso(spent)}</span></div>
            <div className="cell"><span className="l">Presupuesto</span><span className="v">{peso(budget)}</span></div>
            <div className="cell"><span className="l">{remaining >= 0 ? 'Restante' : 'De más'}</span><span className={`v ${remaining < 0 ? 'over' : 'ok'}`}>{peso(Math.abs(remaining))}</span></div>
          </div>

          {covered ? (
            <div className="bp-drawer-note">
              <span className="ic"><IonIcon icon={sparklesOutline} /></span>
              {sub.name} ya está cubierto este mes.
            </div>
          ) : null}
        </div>

        <div className="bp-drawer-txns">
          <div className="bp-drawer-txns-label">Movimientos</div>
          {txns.length === 0 ? (
            <div className="bp-drawer-empty">Sin movimientos todavía este mes.</div>
          ) : txns.map((tx) => {
            const attr = tx.attributes;
            const isIncome = attr.transaction_type === 'income';
            const metaBits = [attr.date, paymentLabel(attr.payment_source)].filter(Boolean).join(' · ');
            return (
              <div key={tx.id} className="bp-txn">
                <span className="bp-txn-gem" style={{ '--c': color } as CSSProperties}><IonIcon icon={subIcon} /></span>
                <span className="bp-txn-main">
                  <span className="bp-txn-name">{attr.concept || attr.product || 'Movimiento sin nombre'}</span>
                  <span className="bp-txn-meta">{metaBits}</span>
                </span>
                <span className={`bp-txn-amt ${isIncome ? 'pos' : ''}`}>{isIncome ? '+' : '−'}{pesoK(Math.abs(attr.amount ?? 0))}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

// ── History card ──────────────────────────────────────────────────────────────────

interface HistoryCardProps {
  plan: MonthlyPlanHistory;
  onOpen: () => void;
  onClose: () => void;
  closing: boolean;
}

const HistoryBar = ({ label, planned, real, max, color }: { label: string; planned: number; real: number | null; max: number; color: string }) => (
  <div className="bp-hbar">
    <div className="bp-hbar-label">
      <span>{label}</span>
      {real != null ? <span className={`delta ${real > planned ? 'over' : 'under'}`}>{real > planned ? '+' : ''}{pesoK(real - planned)}</span> : null}
    </div>
    <div className="bp-hbar-track">
      <div className="bp-hbar-planned" style={{ width: `${max > 0 ? (planned / max) * 100 : 0}%` }} />
      {real != null ? <div className="bp-hbar-real" style={{ width: `${max > 0 ? (real / max) * 100 : 0}%`, background: color }} /> : null}
    </div>
    <div className="bp-hbar-foot">
      <span>Plan {pesoK(planned)}</span>
      {real != null ? <span>Real {pesoK(real)}</span> : null}
    </div>
  </div>
);

const HistoryCard = ({ plan, onOpen, onClose, closing }: HistoryCardProps) => {
  const status = historyStatus(plan);
  const closed = status === 'cerrado';
  const incomePlanned = Number(plan.base_budget_income ?? 0) + Number(plan.expected_variable_income ?? 0);
  const incomeReal = closed ? Number(plan.execution_snapshot?.income_actual ?? plan.income_actual ?? 0) : null;
  const spendPlanned = plannedExpenseTotal(plan);
  const spendReal = closed ? Number(plan.execution_snapshot?.expense_actual ?? plan.expense_actual ?? 0) : null;
  const statusText = status === 'confirmado' ? 'Confirmado' : status === 'cerrado' ? 'Cerrado' : 'Borrador';

  return (
    <div
      className="bp-hcard is-clickable"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      aria-label={`Ver detalle de ${formatPlanPeriod(plan)}`}
    >
      <div className="bp-hcard-head">
        <span className="bp-hcard-month">{formatPlanPeriod(plan)}</span>
        <span className={`bp-hcard-status st-${status}`}>{statusText}</span>
      </div>
      <HistoryBar label="Ingreso" planned={incomePlanned} real={incomeReal} max={Math.max(incomePlanned, incomeReal ?? 0)} color="var(--income)" />
      <HistoryBar label="Gasto" planned={spendPlanned} real={spendReal} max={Math.max(spendPlanned, spendReal ?? 0)} color="var(--necessary)" />
      <div className="bp-hcard-actions">
        {status === 'confirmado' ? (
          <button
            className="bp-hcard-btn ghost"
            disabled={closing}
            onClick={(e) => { e.stopPropagation(); onClose(); }}
          >
            {closing ? 'Cerrando…' : 'Cerrar mes'}
          </button>
        ) : null}
        <button className="bp-hcard-btn link" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
          Ver detalle <IonIcon icon={arrowForwardOutline} />
        </button>
      </div>
    </div>
  );
};

// ── No-plan state ─────────────────────────────────────────────────────────────────

const NoPlanState = ({ onStart, onLegacy }: { onStart: () => void; onLegacy: () => void }) => (
  <div className="bp-noplan">
    <div className="bp-noplan-ic"><IonIcon icon={walletOutline} /></div>
    <div className="bp-noplan-title">Todavía no armas el plan de este mes</div>
    <div className="bp-noplan-sub">Reparte tu ingreso por categoría para saber, de un vistazo, si vas dentro de rango.</div>
    <button className="bp-btn-primary" onClick={onStart}>Armar plan mensual <IonIcon icon={arrowForwardOutline} /></button>
    <button className="bp-noplan-legacy" onClick={onLegacy}>Ver plan anterior</button>
  </div>
);

// ── Page ────────────────────────────────────────────────────────────────────────

export const BudgetsContent = () => {
  const history = useHistory();
  const routeParams = useParams<{ year?: string; month?: string }>();

  const [currentPlan, setCurrentPlan] = useState<CurrentPlan | null>(null);
  const [categories, setCategories] = useState<CategoryResource[]>([]);
  const [planHistory, setPlanHistory] = useState<MonthlyPlanHistory[]>([]);
  const [periodTransactions, setPeriodTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closingPlanId, setClosingPlanId] = useState<number | null>(null);

  const [tab, setTab] = useState<'detalle' | 'historial'>('detalle');
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<{ cat: CurrentPlanCategory; sub: CurrentPlanSubcategory } | null>(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);

  // Wizard state (unchanged behaviour)
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardIsEditMode, setWizardIsEditMode] = useState(false);
  const [wizardAdjustCategory, setWizardAdjustCategory] = useState<string | undefined>(undefined);
  const [wizardSaving, setWizardSaving] = useState(false);
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [wizardSuccess, setWizardSuccess] = useState(false);

  const routePeriod = useMemo(() => parsePeriodParam(routeParams.year, routeParams.month), [routeParams.month, routeParams.year]);
  const currentPeriod = useMemo(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }, []);
  const selectedPeriod = routePeriod ?? currentPeriod;
  const month = `${selectedPeriod.year}-${padMonth(selectedPeriod.month)}`;
  const selectedPeriodLabel = useMemo(
    () => new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(new Date(selectedPeriod.year, selectedPeriod.month - 1, 1)),
    [selectedPeriod.month, selectedPeriod.year],
  );

  const { wizardData, loading: wizardDataLoading, error: wizardDataError, reload: reloadWizardData } =
    useWizardData({ enabled: wizardOpen, month });

  useAppToolbar(useMemo(() => ({ title: 'Presupuesto', subtitle: selectedPeriodLabel }), [selectedPeriodLabel]));

  // ── Load ──────────────────────────────────────────────────────────────────────
  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const prevMonth = selectedPeriod.month === 1 ? 12 : selectedPeriod.month - 1;
      const prevYear = selectedPeriod.month === 1 ? selectedPeriod.year - 1 : selectedPeriod.year;

      const [categoriesResponse, currentPlanResponse, monthlyPlansResponse, transactionsResponse, prevTransactionsResponse] =
        await Promise.all([
          financeService.fetchCategories(),
          financeService.fetchCurrentPlan(selectedPeriod),
          financeService.getMonthlyPlans(),
          financeService.fetchTransactions({ month: selectedPeriod.month, year: selectedPeriod.year, per_page: 500, sort_by: 'date', sort_dir: 'desc' }),
          financeService.fetchTransactions({ month: prevMonth, year: prevYear, per_page: 100, sort_by: 'date', sort_dir: 'desc' }),
        ]);

      const coversThisPeriod = prevTransactionsResponse.data.filter(
        (tx) => tx.attributes.covers_period_month === selectedPeriod.month && tx.attributes.covers_period_year === selectedPeriod.year,
      );

      setCategories(categoriesResponse.data);
      setCurrentPlan(currentPlanResponse);
      setPlanHistory(monthlyPlansResponse.data ?? []);
      setPeriodTransactions([...transactionsResponse.data, ...coversThisPeriod]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar los presupuestos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [selectedPeriod.month, selectedPeriod.year]);
  useEffect(() => { setTab('detalle'); }, [selectedPeriod.month, selectedPeriod.year]);

  useEffect(() => {
    if (!wizardSuccess) return;
    const t = setTimeout(() => setWizardSuccess(false), 3000);
    return () => clearTimeout(t);
  }, [wizardSuccess]);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const categoryLookup = useMemo(() => buildCategoryLookup(categories), [categories]);

  const planWithColors = useMemo<CurrentPlan | null>(() => {
    if (!currentPlan) return null;
    const colorByCode = new Map(
      categories.map((c) => [c.attributes.code ?? '', c.attributes.color ?? 'var(--color-accent)']),
    );
    return {
      ...currentPlan,
      categories: (currentPlan.categories ?? []).map((cat) => ({
        ...cat,
        color: cat.color ?? colorByCode.get(cat.code ?? '') ?? 'var(--color-accent)',
      })),
    };
  }, [categories, currentPlan]);

  const goalCat = useMemo(() => planWithColors?.categories.find((c) => c.code === 'objetivos') ?? null, [planWithColors]);
  const regularCats = useMemo(() => planWithColors?.categories.filter((c) => c.code !== 'objetivos') ?? [], [planWithColors]);

  const drawerTxns = useMemo(() => {
    if (!drawer?.sub?.id) return [];
    const subId = String(drawer.sub.id);
    return periodTransactions.filter((tx) => tx.attributes.transaction_type !== 'income' && transactionSubcategoryId(tx) === subId);
  }, [drawer, periodTransactions]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleOpenWizard = () => { setWizardIsEditMode(false); setWizardAdjustCategory(undefined); setWizardError(null); setWizardSuccess(false); setWizardOpen(true); };
  const handleOpenWizardForEdit = (categoryCode?: string) => { setWizardIsEditMode(true); setWizardAdjustCategory(categoryCode); setWizardError(null); setWizardSuccess(false); setWizardOpen(true); };
  const handleCloseWizard = () => { if (wizardSaving) return; setWizardOpen(false); setWizardError(null); };

  const handleWizardComplete = async (draft: BudgetPlanDraft) => {
    setWizardSaving(true);
    setWizardError(null);
    try {
      if (wizardIsEditMode && currentPlan) {
        await financeService.confirmMonthlyPlanWithLines(currentPlan.id, draft.lines, draft.goal_contribution_amount);
      } else {
        const plan = await financeService.generateMonthlyPlanForWizard({ mode: draft.mode });
        await financeService.confirmMonthlyPlanWithLines(plan.id, draft.lines, draft.goal_contribution_amount);
      }
      setWizardOpen(false);
      setWizardSuccess(true);
      void load(true);
    } catch (err) {
      setWizardError(err instanceof Error ? err.message : 'No fue posible guardar el plan. Intentá de nuevo.');
    } finally {
      setWizardSaving(false);
    }
  };

  const handleCloseMonth = async (planId: number) => {
    setClosingPlanId(planId);
    try {
      await financeService.closeMonthlyPlan(planId);
      const monthlyPlansResponse = await financeService.getMonthlyPlans();
      setPlanHistory(monthlyPlansResponse.data ?? []);
    } finally {
      setClosingPlanId(null);
    }
  };

  const planEditable = useMemo(() => {
    if (!currentPlan?.confirmed_at) return true;
    return Date.now() - new Date(currentPlan.confirmed_at).getTime() < 48 * 60 * 60 * 1000;
  }, [currentPlan?.confirmed_at]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <IonContent>
      <div className="bp-root">
        {loading ? (
          <div className="bp-centered"><Spinner size="lg" /></div>
        ) : error ? (
          <div className="bp-scroll"><ErrorState message={error} onRetry={() => void load()} /></div>
        ) : !currentPlan ? (
          <div className="bp-scroll">
            <NoPlanState onStart={handleOpenWizard} onLegacy={() => setPlanModalOpen(true)} />
          </div>
        ) : (
          <>
            <div className="bp-tabs">
              <button className={`bp-tab ${tab === 'detalle' ? 'on' : ''}`} onClick={() => setTab('detalle')}>Detalle</button>
              <button className={`bp-tab ${tab === 'historial' ? 'on' : ''}`} onClick={() => setTab('historial')}>Historial</button>
            </div>

            <div className="bp-scroll">
              {tab === 'detalle' ? (
                <>
                  <BudgetHero month={selectedPeriodLabel} cats={regularCats} goal={goalCat} />

                  {goalCat ? (
                    <>
                      <div className="bp-sec"><span className="bp-sec-label">Lo primero · tu objetivo</span></div>
                      <GoalCard goal={goalCat} />
                    </>
                  ) : null}

                  <div className="bp-sec">
                    <span className="bp-sec-label">Por categoría</span>
                    <span className="bp-sec-hint">{regularCats.length} grupos</span>
                  </div>
                  <div className="bp-cats">
                    {regularCats.map((cat) => (
                      <CategoryGroup
                        key={cat.code ?? cat.name ?? 'cat'}
                        cat={cat}
                        open={openCat === (cat.code ?? '')}
                        onToggle={(code) => setOpenCat((c) => (c === code ? null : code))}
                        onOpenSub={(c, s) => setDrawer({ cat: c, sub: s })}
                      />
                    ))}
                  </div>

                  {planEditable ? (
                    <div className="bp-sec" style={{ justifyContent: 'center', marginTop: 22 }}>
                      <Button label="Editar plan" variant="ghost" onClick={() => handleOpenWizardForEdit()} />
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="bp-sec" style={{ marginTop: 4 }}>
                    <span className="bp-sec-label">Planes mensuales</span>
                    <span className="bp-sec-hint">{planHistory.length} meses</span>
                  </div>
                  {planHistory.length ? (
                    <div className="bp-hlist">
                      {planHistory.map((plan) => (
                        <HistoryCard
                          key={plan.id}
                          plan={plan}
                          closing={closingPlanId === plan.id}
                          onOpen={() => history.push(`/budgets/${plan.year}/${padMonth(plan.month)}`)}
                          onClose={() => void handleCloseMonth(plan.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="bp-noplan"><div className="bp-noplan-sub">Todavía no hay planes mensuales en el historial.</div></div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {drawer ? <SubDrawer cat={drawer.cat} sub={drawer.sub} txns={drawerTxns} onClose={() => setDrawer(null)} /> : null}
      </div>

      {/* ── Wizard (sin cambios) ── */}
      <AscentBudgetWizard
        isOpen={wizardOpen}
        onClose={handleCloseWizard}
        onComplete={(draft: BudgetPlanDraft) => void handleWizardComplete(draft)}
        wizardData={wizardData ?? undefined}
        month={month}
        hasPlanHistory={planHistory.length > 0}
        isEditMode={wizardIsEditMode}
        adjustCategoryCode={wizardAdjustCategory}
        existingMode={currentPlan?.mode}
        planConfirmedAt={wizardIsEditMode ? (currentPlan?.confirmed_at ?? undefined) : undefined}
      />

      <LoadingOverlay isOpen={wizardOpen && wizardDataLoading && !wizardData} message="Cargando datos del asistente..." />

      {wizardOpen && wizardDataError && !wizardData ? (
        <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', padding: 'var(--space-6)', background: 'rgba(5, 7, 12, 0.72)', zIndex: 'calc(var(--z-modal) + 1)' }}>
          <ErrorNotice
            title="No pudimos abrir el asistente"
            message={wizardDataError}
            onRetry={reloadWizardData}
            secondaryAction={<Button label="Cerrar" variant="ghost" onClick={handleCloseWizard} />}
          />
        </div>
      ) : null}

      {wizardOpen && wizardError ? (
        <div role="alert" style={{ position: 'fixed', bottom: 'calc(var(--space-8) + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', padding: 'var(--space-3) var(--space-5)', borderRadius: 'var(--radius-lg)', background: 'var(--color-error-subtle)', border: '1px solid var(--color-error)', color: 'var(--color-error)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', zIndex: 'calc(var(--z-modal) + 2)', maxWidth: 'min(480px, 90vw)', textAlign: 'center' }}>
          {wizardError}
        </div>
      ) : null}

      <LoadingOverlay isOpen={wizardSaving} message="Guardando plan..." zIndex="calc(var(--z-modal) + 3)" />

      {wizardSuccess ? (
        <div role="status" style={{ position: 'fixed', bottom: 'calc(var(--space-8) + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', padding: 'var(--space-3) var(--space-5)', borderRadius: 'var(--radius-lg)', background: 'var(--surface-control)', border: '1px solid var(--surface-border)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', zIndex: 'calc(var(--z-modal) + 2)' }}>
          Plan guardado correctamente para {month}.
        </div>
      ) : null}

      <BudgetPlanModal isOpen={planModalOpen} onClose={() => setPlanModalOpen(false)} onSaved={() => void load()} />
    </IonContent>
  );
};

export const BudgetsPage = () => (
  <AppLayout title="Presupuestos">
    <BudgetsContent />
  </AppLayout>
);
