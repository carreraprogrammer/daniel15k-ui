import { useMemo, useState, type CSSProperties } from 'react';
import { IonIcon } from '@ionic/react';
import { alertCircleOutline, chevronDownOutline, chevronForwardOutline } from 'ionicons/icons';
import type { CurrentPlan, CurrentPlanCategory, CurrentPlanSubcategory, Transaction } from '../../../types/finance.types';
import { Button } from '../../atoms/Button';
import { CurrencyValue } from '../../atoms/CurrencyValue';
import { SheetModal } from '../../molecules/SheetModal';
import { DrawerDetailContent, type DrawerDetailTransaction } from '../DrawerDetail';
import { resolveNamedIcon } from '../BudgetWizard/iconRegistry';
import { formatCurrencyCompact } from '../../../utils/formatCurrency';
import type { CategoryLookupItem } from '../../../utils/financeBehavior';
import styles from './ActivePlanView.module.css';

const clampPct = (value: number): number => Math.max(0, Math.min(Math.round(value), 999));

const getPlanHealth = (categories: CurrentPlanCategory[]) => {
  const safeCategories = Array.isArray(categories) ? categories : [];
  const attention = safeCategories.filter((category) => category.signal_kind === 'attention');
  const positive = safeCategories.filter((category) => category.signal_kind === 'positive');
  const ranked = [...attention].sort((left, right) => {
    const leftRatio = (left.budgeted ?? 0) > 0 ? (left.spent ?? 0) / (left.budgeted ?? 1) : 0;
    const rightRatio = (right.budgeted ?? 0) > 0 ? (right.spent ?? 0) / (right.budgeted ?? 1) : 0;
    return rightRatio - leftRatio;
  });
  const topRisk = ranked[0] ?? safeCategories[0] ?? null;

  return {
    outOfRangeCount: attention.length,
    positiveCount: positive.length,
    topRisk,
  };
};

const buildHeroCopy = (currentPlan: CurrentPlan, categories: CurrentPlanCategory[]) => {
  const { outOfRangeCount, positiveCount, topRisk } = getPlanHealth(categories);
  const topRiskOverrun = topRisk ? Math.max((topRisk.spent ?? 0) - (topRisk.budgeted ?? 0), 0) : 0;
  const assigned = categories.reduce((sum, category) => sum + (category.budgeted ?? 0), 0);
  const remainingTotal = categories.reduce((sum, category) => sum + ((category.budgeted ?? 0) - (category.spent ?? 0)), 0);
  const freeMargin = (currentPlan.total_income ?? 0) - assigned;

  return {
    eyebrow: 'Plan activo',
    title: outOfRangeCount
      ? `${outOfRangeCount} categorías piden atención`
      : positiveCount
        ? `${positiveCount} avance${positiveCount === 1 ? '' : 's'} positivo${positiveCount === 1 ? '' : 's'} este mes`
      : 'Tu plan mensual sigue bajo control',
    text: outOfRangeCount
      ? `${topRisk?.name ?? 'La categoría principal'} es la señal más útil para revisar primero.${positiveCount ? ' También ya hay movimientos que fortalecen tu posición.' : ' El resto del detalle puede esperar hasta que abras las secciones.'}`
      : positiveCount
        ? 'No todo desvío es malo. Hay movimientos que mejoran tu posición financiera aunque se salgan del plan original.'
        : 'La portada del presupuesto debería bastar para decirte si el mes sigue sano sin obligarte a leer toda la estructura.',
    headlineValue: formatCurrencyCompact(remainingTotal),
    headlineCaption: topRisk
      ? `Disponible total frente al plan`
      : 'Disponible total frente al plan',
    supportLabel: outOfRangeCount ? 'Exceso actual' : 'Margen libre',
    supportValue: outOfRangeCount ? formatCurrencyCompact(topRiskOverrun) : formatCurrencyCompact(freeMargin),
    supportTone: outOfRangeCount ? 'warning' : 'calm',
    outOfRangeCount,
    positiveCount,
  };
};

const buildStatusLabel = (category: CurrentPlanCategory) => {
  return category.signal_label ?? 'En ritmo';
};

const buildCompactSignalLabel = (
  signalKind: CurrentPlanCategory['signal_kind'] | CurrentPlanSubcategory['signal_kind'],
  signalLabel?: string,
) => {
  if (signalKind === 'positive') return 'Bien';
  if (signalKind === 'attention') return 'Atención';
  if (signalLabel === 'Sin movimiento') return 'Sin mov.';
  return 'En ritmo';
};

const signalClassFor = (
  kind: CurrentPlanCategory['signal_kind'] | CurrentPlanSubcategory['signal_kind'],
  positiveClass: string,
  attentionClass: string,
): string => {
  if (kind === 'positive') return positiveClass;
  if (kind === 'attention') return attentionClass;
  return '';
};

const resolveBudgetAccent = (categoryCode: string, explicitColor?: string | null): string => {
  if (explicitColor) {
    return explicitColor;
  }

  if (categoryCode === 'income' || categoryCode === 'unknown') {
    return 'var(--color-accent)';
  }

  return `var(--color-${categoryCode})`;
};

const MONTH_NAMES_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

const paymentLabel = (src: string | null | undefined): string => {
  if (src === 'credit_card') return 'Crédito';
  if (src === 'debit') return 'Débito';
  if (src === 'cash') return 'Efectivo';
  return '';
};

const coversPeriodLabel = (tx: Transaction): string => {
  const { covers_period_month, month } = tx.attributes;
  if (!covers_period_month) return '';
  if (covers_period_month === month) return '';
  return `Cubre ${MONTH_NAMES_ES[covers_period_month - 1]}`;
};

const buildTransactionRow = (tx: Transaction, icon: string, metaPrefix?: string): DrawerDetailTransaction => {
  const attr = tx.attributes;
  const label = attr.concept || attr.product || 'Movimiento sin nombre';
  const meta = [metaPrefix, attr.date, paymentLabel(attr.payment_source), coversPeriodLabel(tx)]
    .filter(Boolean)
    .join(' · ');

  return {
    id: tx.id,
    name: label,
    meta,
    amount: attr.amount,
    icon,
    isIncome: attr.transaction_type === 'income',
  };
};

const SubcategoryCard = ({
  sub,
  accentColor,
  onOpen,
}: {
  sub: CurrentPlanSubcategory;
  accentColor: string;
  onOpen: () => void;
}) => {
  const spent = sub.spent ?? 0;
  const signalTitle = sub.signal_detail ?? sub.signal_label ?? 'Sin señal adicional';

  return (
    <article
      className={styles.subcategoryCard}
      style={{ '--subcategory-accent': accentColor } as CSSProperties}
      title={signalTitle}
    >
      <button
        type="button"
        className={styles.subcategoryCardButton}
        onClick={onOpen}
        aria-label={`Ver desglose de ${sub.name ?? sub.code ?? 'subcategoría'}`}
      >
        <div className={styles.subcategoryCompact}>
          <span className={styles.subcategoryIconWrap}>
            <IonIcon icon={resolveNamedIcon(sub.icon)} className={styles.subcategoryIcon} />
          </span>
          <div className={styles.subcategoryCopy}>
            <h4 className={styles.subcategoryName}>{sub.name ?? sub.code ?? 'Sin nombre'}</h4>
          </div>
          <strong className={styles.subcategoryPrimaryValue} title={signalTitle}>
            <CurrencyValue amount={spent} mode="compact" />
          </strong>
          <IonIcon icon={chevronForwardOutline} className={styles.subcategoryChevron} />
        </div>
      </button>
    </article>
  );
};

interface SubcategoryDetailModalProps {
  isOpen: boolean;
  subcategory: CurrentPlanSubcategory | null;
  accentColor: string;
  categorySpent: number;
  transactions: Transaction[];
  onClose: () => void;
}

interface PlanlessDetailModalProps {
  isOpen: boolean;
  amount: number;
  categorySpent: number;
  expenses: PlanlessExpense[];
  onClose: () => void;
}

const PlanlessDetailModal = ({
  isOpen,
  amount,
  categorySpent,
  expenses,
  onClose,
}: PlanlessDetailModalProps) => {
  const categoryShare = categorySpent > 0 ? clampPct((amount / categorySpent) * 100) : 0;
  const rows = expenses.map((expense) => (
    buildTransactionRow(expense.tx, alertCircleOutline, expense.subcategoryName)
  ));

  return (
    <SheetModal isOpen={isOpen} title="Sin presupuesto" onClose={onClose} height="tall">
      <DrawerDetailContent
        color="var(--color-warning)"
        soft="rgba(201,152,10,0.16)"
        spent={amount}
        pct={categoryShare}
        limit={null}
        arcCaption={`${categoryShare}% de la categoría`}
        stats={[
          { label: 'Gastado', value: formatCurrencyCompact(amount) },
          { label: 'Presupuesto', value: '—' },
          { label: 'Movimientos', value: expenses.length },
        ]}
        insightTitle="Fuera del plan"
        insightText="Este bloque agrupa subcategorías con gasto este mes que no tenían línea asignada."
        transactions={rows}
        emptyText="No hay movimientos detallados para este bloque."
      />
    </SheetModal>
  );
};

const SubcategoryDetailModal = ({
  isOpen,
  subcategory,
  accentColor,
  categorySpent,
  transactions,
  onClose,
}: SubcategoryDetailModalProps) => {
  if (!subcategory) return null;

  const budgeted = subcategory.budgeted ?? 0;
  const spent = subcategory.spent ?? 0;
  const remaining = budgeted - spent;
  const pct = budgeted > 0 ? clampPct((spent / budgeted) * 100) : 0;
  const categoryShare = categorySpent > 0 ? clampPct((spent / categorySpent) * 100) : 0;
  const isOver = spent > budgeted;
  const rows = transactions.map((tx) => buildTransactionRow(tx, resolveNamedIcon(subcategory.icon)));
  const primaryMetric = subcategory.primary_metric;

  return (
    <SheetModal isOpen={isOpen} title={subcategory.name ?? subcategory.code ?? 'Subcategoría'} onClose={onClose} height="tall">
      <DrawerDetailContent
        color={accentColor}
        soft="color-mix(in srgb, var(--drawer-color) 16%, transparent)"
        spent={spent}
        pct={pct}
        limit={budgeted}
        stats={[
          { label: 'Gastado', value: formatCurrencyCompact(spent) },
          { label: 'Presupuesto', value: formatCurrencyCompact(budgeted) },
          {
            label: primaryMetric?.kind === 'payment_status' ? 'Pendiente' : 'Disponible',
            value: primaryMetric?.kind === 'payment_status'
              ? formatCurrencyCompact(primaryMetric.value)
              : formatCurrencyCompact(Math.abs(remaining)),
            tone: remaining < 0 || primaryMetric?.status === 'critical' ? 'negative' : 'positive',
          },
        ]}
        insightTitle={primaryMetric?.title ?? "Dentro de esta categoría"}
        insightText={primaryMetric?.body ?? (
          <>
            Esta subcategoría consume <strong>{categoryShare}%</strong> del gasto total de la categoría.
            {isOver ? ` Está por encima del plan por ${formatCurrencyCompact(spent - budgeted)}.` : ` Te queda margen de ${formatCurrencyCompact(Math.max(remaining, 0))}.`}
          </>
        )}
        transactions={rows}
        emptyText="No hay movimientos registrados en esta subcategoría este mes."
      />
    </SheetModal>
  );
};

interface PlanlessExpense {
  tx: Transaction;
  subcategoryName: string;
}

const transactionSubcategoryId = (tx: Transaction): string | null => {
  const relationshipId = tx.relationships?.subcategory?.data?.id;
  if (relationshipId) return String(relationshipId);
  const attributeId = tx.attributes.subcategory_id;
  return attributeId == null ? null : String(attributeId);
};

const transactionCategoryType = (
  tx: Transaction,
  categoryLookup: Record<string, CategoryLookupItem>,
): string | null => {
  const subcategoryId = transactionSubcategoryId(tx);
  if (subcategoryId && categoryLookup[`subcategory:${subcategoryId}`]?.categoryType) {
    return categoryLookup[`subcategory:${subcategoryId}`].categoryType;
  }

  const relationshipCategoryId = tx.relationships?.category?.data?.id;
  if (relationshipCategoryId && categoryLookup[`category:${relationshipCategoryId}`]?.categoryType) {
    return categoryLookup[`category:${relationshipCategoryId}`].categoryType;
  }

  return tx.attributes.category_type ?? null;
};

const transactionSubcategoryName = (
  tx: Transaction,
  categoryLookup: Record<string, CategoryLookupItem>,
): string => {
  const subcategoryId = transactionSubcategoryId(tx);
  if (!subcategoryId) return 'Sin subcategoría';
  return categoryLookup[`subcategory:${subcategoryId}`]?.subcategoryName ?? `Subcategoría ${subcategoryId}`;
};

export interface CategoryGroupProps {
  category: CurrentPlanCategory;
  defaultExpanded?: boolean;
  transactions?: Transaction[];
  categoryLookup?: Record<string, CategoryLookupItem>;
  onAdjust?: (categoryCode: string) => void;
}

export const CategoryGroup = ({ category, defaultExpanded = false, transactions = [], categoryLookup = {}, onAdjust }: CategoryGroupProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [selectedSubcategory, setSelectedSubcategory] = useState<CurrentPlanSubcategory | null>(null);
  const [planlessOpen, setPlanlessOpen] = useState(false);
  const totalBudgeted = category.budgeted ?? 0;
  const totalSpent = category.spent ?? 0;
  const categoryCode = category.code ?? 'unknown';
  const categoryName = category.name ?? 'Sin categoría';
  const categoryIcon = category.icon ?? 'ellipseOutline';
  const subcategories = category.subcategories ?? [];
  const accountedSpent = subcategories.reduce((sum, s) => sum + (s.spent ?? 0), 0);
  const spentPct = totalBudgeted > 0 ? clampPct((totalSpent / totalBudgeted) * 100) : 0;
  const remaining = totalBudgeted - totalSpent;
  const statusLabel = buildStatusLabel(category);
  const colorVar = resolveBudgetAccent(categoryCode, category.color);
  const isOverSpent = totalSpent > totalBudgeted;
  const budgetedSubcategoryIds = new Set(
    subcategories
      .map((sub) => sub.id)
      .filter((id): id is number => typeof id === 'number')
      .map(String),
  );
  const planlessExpenses = transactions.flatMap((tx): PlanlessExpense[] => {
    const attr = tx.attributes;
    if (attr.transaction_type === 'income') return [];
    if (transactionCategoryType(tx, categoryLookup) !== categoryCode) return [];

    const subcategoryId = transactionSubcategoryId(tx);
    if (subcategoryId && budgetedSubcategoryIds.has(subcategoryId)) return [];

    return [{
      tx,
      subcategoryName: transactionSubcategoryName(tx, categoryLookup),
    }];
  });
  const visibleUnaccountedSpent = Math.max(
    totalSpent - accountedSpent,
    planlessExpenses.reduce((sum, expense) => sum + (expense.tx.attributes.amount ?? 0), 0),
  );
  const hasSubcategoryCards = subcategories.length > 0 || visibleUnaccountedSpent > 0;
  const transactionsBySubcategory = new Map<string, Transaction[]>();
  transactions.forEach((tx) => {
    if (tx.attributes.transaction_type === 'income') return;
    if (transactionCategoryType(tx, categoryLookup) !== categoryCode) return;
    const subcategoryId = transactionSubcategoryId(tx);
    if (!subcategoryId) return;
    const current = transactionsBySubcategory.get(subcategoryId) ?? [];
    current.push(tx);
    transactionsBySubcategory.set(subcategoryId, current);
  });

  return (
    <section
      className={[styles.categorySection, expanded ? styles.categorySectionExpanded : ''].filter(Boolean).join(' ')}
      style={{ '--cat-color': colorVar } as CSSProperties}
    >
      <button
        type="button"
        className={styles.categoryToggle}
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
      >
        <div className={styles.categoryIdentity}>
          <span className={styles.categoryIconWrap}>
            <IonIcon icon={resolveNamedIcon(categoryIcon)} className={styles.categoryIcon} />
          </span>
          <div className={styles.categoryCopy}>
            <div className={styles.categoryHeadingRow}>
              <h3 className={styles.categoryTitle}>{categoryName}</h3>
              <span
                className={[
                  styles.categoryState,
                  signalClassFor(category.signal_kind, styles.categoryStatePositive, styles.categoryStateAttention),
                ].filter(Boolean).join(' ')}
              >
                {statusLabel}
              </span>
            </div>
            <p className={styles.categorySummary}>
              {formatCurrencyCompact(totalSpent)} gastados de {formatCurrencyCompact(totalBudgeted)}.
            </p>
            {category.signal_detail ? (
              <p className={styles.categorySignalText}>{category.signal_detail}</p>
            ) : null}
          </div>
        </div>

        <div className={styles.categoryAside}>
          <div className={styles.categoryPct}>{spentPct}%</div>
          <IonIcon icon={expanded ? chevronDownOutline : chevronForwardOutline} className={styles.categoryChevron} />
        </div>
      </button>

      <div className={styles.categoryRail} aria-hidden="true">
        <div
          className={[styles.categoryRailFill, isOverSpent ? styles.categoryRailFillWarn : ''].filter(Boolean).join(' ')}
          style={{ width: `${Math.min(spentPct, 100)}%` }}
        />
      </div>

      {expanded ? (
        <div className={styles.categoryBody}>
          <div className={styles.categoryStatsRow}>
            <dl className={styles.categoryStats}>
              <div className={styles.categoryStat}>
                <dt>Presupuesto</dt>
                <dd>
                  <CurrencyValue amount={totalBudgeted} mode="compact" />
                </dd>
              </div>
              <div className={styles.categoryStat}>
                <dt>Gastado</dt>
                <dd>
                  <CurrencyValue amount={totalSpent} mode="compact" />
                </dd>
              </div>
              <div className={styles.categoryStat}>
                <dt>Restante</dt>
                <dd className={remaining < 0 ? styles.negativeValue : ''}>
                  <CurrencyValue amount={remaining} mode="compact" />
                </dd>
              </div>
              <div className={styles.categoryStat}>
                <dt>Estado</dt>
                <dd>{statusLabel}</dd>
              </div>
            </dl>
            {onAdjust && (
              <button
                type="button"
                className={styles.adjustBtn}
                onClick={() => onAdjust(categoryCode)}
              >
                Ajustar
              </button>
            )}
          </div>

          {hasSubcategoryCards ? (
            <div className={styles.subcategoryGrid}>
              {subcategories.map((sub) => (
                <SubcategoryCard
                  key={sub.id ?? sub.code ?? sub.name}
                  sub={sub}
                  accentColor={colorVar}
                  onOpen={() => setSelectedSubcategory(sub)}
                />
              ))}
              {visibleUnaccountedSpent > 0 ? (
                <article
                  className={`${styles.subcategoryCard} ${styles.subcategoryCardUnaccounted}`}
                  style={{ '--subcategory-accent': 'var(--color-warning)' } as CSSProperties}
                  title="Gasto sin línea de presupuesto asignada"
                >
                  <button
                    type="button"
                    className={styles.subcategoryCardButton}
                    onClick={() => setPlanlessOpen(true)}
                    aria-label="Ver desglose de gastos sin presupuesto"
                  >
                    <div className={styles.subcategoryCompact}>
                      <span className={styles.subcategoryIconWrap}>
                        <IonIcon icon={alertCircleOutline} className={styles.subcategoryIcon} />
                      </span>
                      <div className={styles.subcategoryCopy}>
                        <h4 className={styles.subcategoryName}>Sin presupuesto</h4>
                      </div>
                      <strong className={styles.subcategoryPrimaryValue}>
                        <CurrencyValue amount={visibleUnaccountedSpent} mode="compact" />
                      </strong>
                      <IonIcon icon={chevronForwardOutline} className={styles.subcategoryChevron} />
                    </div>
                  </button>
                </article>
              ) : null}
            </div>
          ) : (
            <div className={styles.emptySubcategories}>
              Esta categoría no tiene subcategorías activas para este plan.
            </div>
          )}
        </div>
      ) : null}
      <SubcategoryDetailModal
        isOpen={Boolean(selectedSubcategory)}
        subcategory={selectedSubcategory}
        accentColor={colorVar}
        categorySpent={totalSpent}
        transactions={selectedSubcategory?.id == null ? [] : transactionsBySubcategory.get(String(selectedSubcategory.id)) ?? []}
        onClose={() => setSelectedSubcategory(null)}
      />
      <PlanlessDetailModal
        isOpen={planlessOpen}
        amount={visibleUnaccountedSpent}
        categorySpent={totalSpent}
        expenses={planlessExpenses}
        onClose={() => setPlanlessOpen(false)}
      />
    </section>
  );
};

interface ActivePlanViewProps {
  currentPlan: CurrentPlan | null;
  onEditPlan: (categoryCode?: string) => void;
  onExploreDetail?: () => void;
}

export const ActivePlanView = ({
  currentPlan,
  onEditPlan,
  onExploreDetail,
}: ActivePlanViewProps) => {
  const categories = useMemo(
    () => (Array.isArray(currentPlan?.categories) ? currentPlan.categories : []),
    [currentPlan],
  );

  const planEditable = useMemo(() => {
    if (!currentPlan?.confirmed_at) return true;
    return Date.now() - new Date(currentPlan.confirmed_at).getTime() < 48 * 60 * 60 * 1000;
  }, [currentPlan?.confirmed_at]);

  if (!currentPlan) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyTitle}>Sin plan activo para este mes</p>
        <p className={styles.emptyText}>
          Crear un plan te ayuda a saber si el mes va dentro del presupuesto o no.
        </p>
        <Button label="Crear plan para este mes" onClick={onEditPlan} />
      </div>
    );
  }

  const hero = buildHeroCopy(currentPlan, categories);

  return (
    <section className={styles.root}>
      <div className={styles.heroShell}>
        <div className={styles.heroMain}>
          <span className={styles.eyebrow}>{hero.eyebrow}</span>
          <h2 className={styles.heroTitle}>{hero.title}</h2>
          <p className={styles.heroText}>{hero.text}</p>

          <div className={styles.heroMeta}>
            <span className={[styles.statusBadge, styles[`badge_${currentPlan.status}`]].join(' ')}>
              {currentPlan.status}
            </span>
            <span className={styles.metaPill}>{categories.length} categorías activas</span>
            <span className={styles.metaPill}>{hero.outOfRangeCount} alertas</span>
            {hero.positiveCount > 0 ? (
              <span className={`${styles.metaPill} ${styles.metaPillPositive}`}>
                {hero.positiveCount} avance{hero.positiveCount === 1 ? '' : 's'} positivo{hero.positiveCount === 1 ? '' : 's'}
              </span>
            ) : null}
            <span className={styles.metaPill}>
              {currentPlan.month_label ?? `${currentPlan.year}-${String(currentPlan.month).padStart(2, '0')}`}
            </span>
          </div>
        </div>

        <div className={styles.heroMetrics}>
          <div className={styles.metricBlock}>
            <span className={styles.metricLabel}>{hero.headlineCaption}</span>
            <strong className={styles.metricValue}>{hero.headlineValue}</strong>
          </div>
          <div className={[styles.metricBlock, hero.supportTone === 'warning' ? styles.metricBlockWarn : ''].filter(Boolean).join(' ')}>
            <span className={styles.metricLabel}>{hero.supportLabel}</span>
            <strong className={styles.metricValueCompact}>{hero.supportValue}</strong>
          </div>
        </div>

        <div className={styles.heroActions}>
          {planEditable && (
            <Button label="Editar plan" size="sm" variant="secondary" onClick={onEditPlan} />
          )}
          {onExploreDetail ? (
            <Button label="Ver detalle" size="sm" variant="ghost" onClick={onExploreDetail} />
          ) : null}
        </div>
      </div>
    </section>
  );
};
