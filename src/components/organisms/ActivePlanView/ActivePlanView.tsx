import type { CurrentPlan, CurrentPlanLine } from '../../../types/finance.types';
import { Button } from '../../atoms/Button';
import styles from './ActivePlanView.module.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatCOP = (amount: number): string =>
  '$' + Math.round(amount).toLocaleString('es-CO').replace(/,/g, '.');

/** Group plan lines by behavioral category, preserving order of first appearance. */
function groupByCategory(
  lines: CurrentPlanLine[],
): Array<{ categoryCode: string; categoryName: string; lines: CurrentPlanLine[] }> {
  const order: string[] = [];
  const map = new Map<string, { categoryCode: string; categoryName: string; lines: CurrentPlanLine[] }>();

  for (const line of lines) {
    if (!map.has(line.category_code)) {
      order.push(line.category_code);
      map.set(line.category_code, {
        categoryCode: line.category_code,
        categoryName: line.category_name,
        lines: [],
      });
    }
    map.get(line.category_code)!.lines.push(line);
  }

  return order.map((code) => map.get(code)!);
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface CategoryGroupProps {
  categoryCode: string;
  categoryName: string;
  lines: CurrentPlanLine[];
}

const CategoryGroup = ({ categoryCode, categoryName, lines }: CategoryGroupProps) => {
  const totalBudgeted = lines.reduce((sum, l) => sum + l.budgeted, 0);
  const totalSpent = lines.reduce((sum, l) => sum + l.spent, 0);
  const totalProjected = lines.reduce((sum, l) => sum + l.projected, 0);

  const pct = totalBudgeted > 0 ? Math.min((totalSpent / totalBudgeted) * 100, 100) : 0;
  const isOverProjected = totalProjected > totalBudgeted;
  const colorVar = `var(--color-${categoryCode})`;
  const subtleVar = `var(--color-${categoryCode}-subtle)`;

  return (
    <div
      className={styles.categoryGroup}
      style={{ '--cat-color': colorVar, '--cat-subtle': subtleVar } as React.CSSProperties}
    >
      {/* Category header row */}
      <div className={styles.categoryHeader}>
        <div className={styles.colorDot} />
        <span className={styles.categoryName}>{categoryName}</span>
        <span className={styles.budgetFigures}>
          {formatCOP(totalSpent)}{' '}
          <span className={styles.separator}>/</span>{' '}
          {formatCOP(totalBudgeted)}
        </span>
      </div>

      {/* Progress bar */}
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

      {/* Status row */}
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

      {/* Subcategory detail */}
      {lines.length > 1 && (
        <ul className={styles.subList}>
          {lines.map((line) => {
            const linePct =
              line.budgeted > 0
                ? Math.min((line.spent / line.budgeted) * 100, 100)
                : 0;
            return (
              <li key={line.subcategory_code} className={styles.subRow}>
                <span className={styles.subName}>{line.subcategory_name}</span>
                <span className={styles.subFigures}>
                  {formatCOP(line.spent)}{' '}
                  <span className={styles.separator}>/</span>{' '}
                  {formatCOP(line.budgeted)}
                </span>
                <span className={styles.subPct}>{Math.round(linePct)}%</span>
              </li>
            );
          })}
        </ul>
      )}
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

  const groups = groupByCategory(currentPlan.lines);

  return (
    <section className={styles.root}>
      <div className={styles.planHeader}>
        <div>
          <h3 className={styles.planTitle}>Plan de {currentPlan.month}</h3>
          <span className={[styles.statusBadge, styles[`badge_${currentPlan.status}`]].join(' ')}>
            {currentPlan.status}
          </span>
        </div>
        <button type="button" className={styles.editBtn} onClick={onEditPlan}>
          Editar plan
        </button>
      </div>

      <div className={styles.groupList}>
        {groups.map((group) => (
          <CategoryGroup
            key={group.categoryCode}
            categoryCode={group.categoryCode}
            categoryName={group.categoryName}
            lines={group.lines}
          />
        ))}
      </div>
    </section>
  );
};
