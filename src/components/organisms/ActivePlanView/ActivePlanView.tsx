import { useMemo, useState, type CSSProperties } from 'react';
import { IonIcon } from '@ionic/react';
import { chevronDownOutline, chevronForwardOutline } from 'ionicons/icons';
import type { CurrentPlan, CurrentPlanCategory, CurrentPlanSubcategory } from '../../../types/finance.types';
import { Button } from '../../atoms/Button';
import { CurrencyValue } from '../../atoms/CurrencyValue';
import { resolveNamedIcon } from '../BudgetWizard/iconRegistry';
import { formatCurrencyCompact } from '../../../utils/formatCurrency';
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

const resolveBudgetAccent = (categoryCode: string): string => {
  if (categoryCode === 'income' || categoryCode === 'unknown') {
    return 'var(--color-accent)';
  }

  return `var(--color-${categoryCode})`;
};

const SubcategoryCard = ({ sub, accentColor }: { sub: CurrentPlanSubcategory; accentColor: string }) => {
  const budgeted = sub.budgeted ?? 0;
  const spent = sub.spent ?? 0;
  const remaining = budgeted - spent;
  const pct = budgeted > 0 ? clampPct((spent / budgeted) * 100) : 0;
  const isOver = spent > budgeted;
  const signalTitle = sub.signal_detail ?? sub.signal_label ?? 'Sin señal adicional';

  return (
    <article
      className={styles.subcategoryCard}
      style={{ '--subcategory-accent': accentColor } as CSSProperties}
      title={signalTitle}
    >
      <div className={styles.subcategoryTop}>
        <div className={styles.subcategoryIdentity}>
          <span className={styles.subcategoryIconWrap}>
            <IonIcon icon={resolveNamedIcon(sub.icon)} className={styles.subcategoryIcon} />
          </span>
          <div className={styles.subcategoryCopy}>
            <h4 className={styles.subcategoryName}>{sub.name ?? sub.code ?? 'Sin nombre'}</h4>
            <p className={styles.subcategoryMeta}>
              <CurrencyValue amount={spent} mode="compact" /> de{' '}
              <CurrencyValue amount={budgeted} mode="compact" />
            </p>
          </div>
        </div>
        <span
          className={[
            styles.subcategorySignal,
            signalClassFor(sub.signal_kind, styles.subcategorySignalPositive, styles.subcategorySignalAttention),
          ].filter(Boolean).join(' ')}
          title={signalTitle}
          aria-label={sub.signal_label ?? signalTitle}
        >
          <span className={styles.subcategorySignalDot} />
          <span className={styles.subcategorySignalLabel}>
            {buildCompactSignalLabel(sub.signal_kind, sub.signal_label)}
          </span>
        </span>
      </div>

      <div className={styles.subcategoryRail} aria-hidden="true">
        <div
          className={[styles.subcategoryRailFill, isOver ? styles.subcategoryRailFillWarn : ''].filter(Boolean).join(' ')}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      <dl className={styles.subcategoryStats}>
        <div className={styles.subcategoryStat}>
          <dt>Presupuesto</dt>
          <dd>
            <CurrencyValue amount={budgeted} mode="compact" />
          </dd>
        </div>
        <div className={styles.subcategoryStat}>
          <dt>Gastado</dt>
          <dd>
            <CurrencyValue amount={spent} mode="compact" />
          </dd>
        </div>
        <div className={styles.subcategoryStat}>
          <dt>Restante</dt>
          <dd className={remaining < 0 ? styles.negativeValue : ''}>
            <CurrencyValue amount={remaining} mode="compact" />
          </dd>
        </div>
      </dl>
    </article>
  );
};

export interface CategoryGroupProps {
  category: CurrentPlanCategory;
  defaultExpanded?: boolean;
}

export const CategoryGroup = ({ category, defaultExpanded = false }: CategoryGroupProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const totalBudgeted = category.budgeted ?? 0;
  const totalSpent = category.spent ?? 0;
  const categoryCode = category.code ?? 'unknown';
  const categoryName = category.name ?? 'Sin categoría';
  const categoryIcon = category.icon ?? 'ellipseOutline';
  const subcategories = category.subcategories ?? [];
  const spentPct = totalBudgeted > 0 ? clampPct((totalSpent / totalBudgeted) * 100) : 0;
  const remaining = totalBudgeted - totalSpent;
  const statusLabel = buildStatusLabel(category);
  const colorVar = resolveBudgetAccent(categoryCode);
  const isOverSpent = totalSpent > totalBudgeted;

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

          {subcategories.length > 0 ? (
            <div className={styles.subcategoryGrid}>
              {subcategories.map((sub) => (
                <SubcategoryCard
                  key={sub.id ?? sub.code ?? sub.name}
                  sub={sub}
                  accentColor={colorVar}
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptySubcategories}>
              Esta categoría no tiene subcategorías activas para este plan.
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
};

interface ActivePlanViewProps {
  currentPlan: CurrentPlan | null;
  onEditPlan: () => void;
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
          <Button label="Editar plan" size="sm" onClick={onEditPlan} />
          {onExploreDetail ? (
            <Button label="Ver detalle" size="sm" variant="ghost" onClick={onExploreDetail} />
          ) : null}
        </div>
      </div>
    </section>
  );
};
