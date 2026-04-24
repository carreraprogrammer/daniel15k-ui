import type { CSSProperties } from 'react';
import type { CurrentPlan, CurrentPlanCategory } from '../../../types/finance.types';
import { Button } from '../../atoms/Button';
import styles from './ActivePlanView.module.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatCOP = (amount: number): string =>
  '$' + Math.round(amount).toLocaleString('es-CO').replace(/,/g, '.');

// ── Sub-components ────────────────────────────────────────────────────────────

interface CategoryGroupProps {
  category: CurrentPlanCategory;
}

const CategoryGroup = ({ category }: CategoryGroupProps) => {
  const totalBudgeted = category.budgeted ?? 0;
  const totalSpent = category.spent ?? 0;
  const totalProjected = category.projected ?? 0;

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
    </div>
  );
};

// ── Props ────────────────────────────────────────────────────────────────────

interface ActivePlanViewProps {
  currentPlan: CurrentPlan | null;
  onEditPlan: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ActivePlanView = ({ currentPlan, onEditPlan }: ActivePlanViewProps) => {
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

  return (
    <section className={styles.root}>
      <div className={styles.planHeader}>
        <div>
          <h3 className={styles.planTitle}>
            Plan de {currentPlan.month_label ?? currentPlan.month}
          </h3>
          <span className={[styles.statusBadge, styles[`badge_${currentPlan.status}`]].join(' ')}>
            {currentPlan.status}
          </span>
        </div>
        <button type="button" className={styles.editBtn} onClick={onEditPlan}>
          Editar plan
        </button>
      </div>

      <div className={styles.groupList}>
        {categories.map((category) => (
          <CategoryGroup
            key={category.code ?? category.name ?? 'unknown-category'}
            category={category}
          />
        ))}
      </div>
    </section>
  );
};