import type { CSSProperties } from 'react';
import type { CurrentPlan, CurrentPlanCategory, CurrentPlanSubcategory } from '../../../types/finance.types';
import { Button } from '../../atoms/Button';
import styles from './ActivePlanView.module.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatCOP = (amount: number): string =>
  '$' + Math.round(amount).toLocaleString('es-CO').replace(/,/g, '.');

const getPlanHealth = (categories: CurrentPlanCategory[]) => {
  const safeCategories = Array.isArray(categories) ? categories : [];
  const outOfRange = safeCategories.filter((category) => (category.projected ?? 0) > (category.budgeted ?? 0));
  const topRisk = outOfRange[0] ?? safeCategories[0] ?? null;

  return {
    outOfRangeCount: outOfRange.length,
    topRisk,
  };
};

const buildHeroCopy = (currentPlan: CurrentPlan, categories: CurrentPlanCategory[]) => {
  const { outOfRangeCount, topRisk } = getPlanHealth(categories);

  return {
    eyebrow: 'Presupuestos',
    question: '¿Mi plan mensual sigue sano?',
    title: outOfRangeCount
      ? `${outOfRangeCount} categorías fuera de rango`
      : 'El plan mensual sigue estable',
    text: topRisk
      ? `${topRisk.name ?? 'Una categoría'} es la señal más útil para revisar primero. No necesitas bajar a la tabla para entender dónde mirar.`
      : 'Este resumen te muestra si el plan confirmado sigue bajo control antes de entrar al detalle.',
    primaryValue: topRisk ? formatCOP(topRisk.projected ?? 0) : formatCOP(currentPlan.total_income ?? 0),
    primaryCaption: topRisk
      ? `Proyección actual de ${topRisk.name ?? 'la categoría'}`
      : 'Ingreso total del plan',
    supportTitle: 'Riesgo principal',
    supportValue: topRisk && (topRisk.budgeted ?? 0) > 0
      ? `${Math.round(Math.min(((topRisk.spent ?? 0) / (topRisk.budgeted ?? 1)) * 100, 100))}%`
      : '—',
    supportText: topRisk
      ? `${formatCOP(topRisk.spent ?? 0)} gastados de ${formatCOP(topRisk.budgeted ?? 0)}; proyectado a ${formatCOP(topRisk.projected ?? 0)}.`
      : 'Cuando existan categorías activas, aquí verás la tensión principal del plan.',
    supportPct: topRisk && (topRisk.budgeted ?? 0) > 0
      ? Math.min(Math.round(((topRisk.spent ?? 0) / (topRisk.budgeted ?? 1)) * 100), 100)
      : 0,
    supportWarn: Boolean(topRisk && (topRisk.projected ?? 0) > (topRisk.budgeted ?? 0)),
    outOfRangeCount,
  };
};

// ── Sub-components ────────────────────────────────────────────────────────────

export interface CategoryGroupProps {
  category: CurrentPlanCategory;
}

const SubcategoryRow = ({ sub }: { sub: CurrentPlanSubcategory }) => {
  const budgeted = sub.budgeted ?? 0;
  const spent = sub.spent ?? 0;
  const projected = sub.projected ?? 0;
  const pct = budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 0;
  const isOver = projected > budgeted;

  return (
    <div className={styles.subcategoryRow}>
      <div className={styles.subcategoryHeader}>
        <span className={styles.subcategoryName}>{sub.name ?? sub.code ?? '—'}</span>
        <span className={styles.subcategoryFigures}>
          {formatCOP(spent)}{' '}
          <span className={styles.separator}>/</span>{' '}
          {formatCOP(budgeted)}
        </span>
      </div>
      <div className={styles.subBarTrack} aria-hidden="true">
        <div
          className={[styles.subBarFill, isOver ? styles.barFillWarn : ''].filter(Boolean).join(' ')}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isOver ? (
        <span className={styles.statusWarn} style={{ fontSize: 'var(--text-xs)' }}>
          ⚠ proyectado: {formatCOP(projected)}
        </span>
      ) : null}
    </div>
  );
};

export const CategoryGroup = ({ category }: CategoryGroupProps) => {
  const totalBudgeted = category.budgeted ?? 0;
  const totalSpent = category.spent ?? 0;
  const totalProjected = category.projected ?? 0;
  const subcategories = category.subcategories ?? [];

  const pct = totalBudgeted > 0 ? Math.min((totalSpent / totalBudgeted) * 100, 100) : 0;
  const isOverProjected = totalProjected > totalBudgeted;
  const categoryCode = category.code ?? 'unknown';
  const categoryName = category.name ?? 'Sin categoría';
  const colorVar = `var(--color-${categoryCode})`;
  const subtleVar = `var(--color-${categoryCode}-subtle)`;

  return (
    <div
      className={styles.categoryGroup}
      style={{ '--cat-color': colorVar, '--cat-subtle': subtleVar } as CSSProperties}
    >
      <div className={styles.categoryHeader}>
        <div className={styles.colorDot} />
        <span className={styles.categoryName}>{categoryName}</span>
        <span className={styles.budgetFigures}>
          {formatCOP(totalSpent)}{' '}
          <span className={styles.separator}>/</span>{' '}
          {formatCOP(totalBudgeted)}
        </span>
      </div>

      <div className={styles.barTrack} aria-hidden="true">
        <div
          className={[
            styles.barFill,
            isOverProjected ? styles.barFillWarn : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className={styles.statusRow}>
        <span className={styles.pctLabel}>{Math.round(pct)}%</span>
        {isOverProjected ? (
          <span className={styles.statusWarn}>
            ⚠ proyectado: {formatCOP(totalProjected)}
          </span>
        ) : (
          <span className={styles.statusOk}>&#10003; en ritmo</span>
        )}
      </div>

      {subcategories.length > 0 ? (
        <div className={styles.subcategoryList}>
          {subcategories.map((sub) => (
            <SubcategoryRow key={sub.id ?? sub.code ?? sub.name} sub={sub} />
          ))}
        </div>
      ) : null}
    </div>
  );
};

// ── Props ────────────────────────────────────────────────────────────────────

interface ActivePlanViewProps {
  currentPlan: CurrentPlan | null;
  onEditPlan: () => void;
  onExploreDetail?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ActivePlanView = ({
  currentPlan,
  onEditPlan,
  onExploreDetail,
}: ActivePlanViewProps) => {
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

  const categories = Array.isArray(currentPlan.categories) ? currentPlan.categories : [];
  const hero = buildHeroCopy(currentPlan, categories);

  return (
    <section className={styles.root}>
      <div className={styles.focusGrid}>
        <div className={styles.focusCopy}>
          <span className={styles.eyebrow}>{hero.eyebrow}</span>
          <p className={styles.focusQuestion}>{hero.question}</p>
          <h2 className={styles.focusTitle}>{hero.title}</h2>
          <p className={styles.focusText}>{hero.text}</p>
        </div>

        <div className={styles.focusMetric}>
          <div className={styles.focusValue}>{hero.primaryValue}</div>
          <p className={styles.focusCaption}>{hero.primaryCaption}</p>
          <span className={[styles.statusBadge, styles[`badge_${currentPlan.status}`]].join(' ')}>
            {currentPlan.status}
          </span>
        </div>
      </div>

      <section className={styles.focusSupport}>
        <div className={styles.focusSupportHeader}>
          <h3 className={styles.focusSupportTitle}>{hero.supportTitle}</h3>
          <span className={styles.focusSupportValue}>{hero.supportValue}</span>
        </div>

        <div className={styles.focusRail}>
          <div
            className={[
              styles.focusRailFill,
              hero.supportWarn ? styles.focusRailFillWarn : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ width: `${hero.supportPct}%` }}
          />
        </div>

        <p className={styles.focusSupportText}>{hero.supportText}</p>
      </section>

      <div className={styles.focusMeta}>
        <span className={styles.focusBadge}>{categories.length} categorías</span>
        <span className={styles.focusBadge}>{hero.outOfRangeCount} alertas</span>
        <span className={styles.focusBadge}>{currentPlan.month_label ?? `${currentPlan.year}-${String(currentPlan.month).padStart(2, '0')}`}</span>
      </div>

      <div className={styles.focusActions}>
        <Button label="Editar plan" onClick={onEditPlan} />
        {onExploreDetail ? (
          <Button label="Ver detalle" variant="ghost" onClick={onExploreDetail} />
        ) : null}
      </div>
    </section>
  );
};