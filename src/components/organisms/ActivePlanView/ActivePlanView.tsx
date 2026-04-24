import { useMemo, useState, type CSSProperties } from 'react';
import { IonIcon } from '@ionic/react';
import { chevronDownOutline, chevronForwardOutline } from 'ionicons/icons';
import type { CurrentPlan, CurrentPlanCategory, CurrentPlanSubcategory } from '../../../types/finance.types';
import { Button } from '../../atoms/Button';
import { resolveNamedIcon } from '../BudgetWizard/iconRegistry';
import styles from './ActivePlanView.module.css';

const formatCOP = (amount: number): string =>
  '$' + Math.round(amount).toLocaleString('es-CO').replace(/,/g, '.');

const clampPct = (value: number): number => Math.max(0, Math.min(Math.round(value), 999));

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
  const topRiskOverrun = topRisk ? Math.max((topRisk.projected ?? 0) - (topRisk.budgeted ?? 0), 0) : 0;
  const assigned = categories.reduce((sum, category) => sum + (category.budgeted ?? 0), 0);
  const freeMargin = (currentPlan.total_income ?? 0) - assigned;

  return {
    eyebrow: 'Plan activo',
    title: outOfRangeCount
      ? `${outOfRangeCount} categorías piden atención`
      : 'Tu plan mensual sigue bajo control',
    text: outOfRangeCount
      ? `${topRisk?.name ?? 'La categoría principal'} es la señal más útil para revisar primero. El resto del detalle puede esperar hasta que abras las secciones.`
      : 'La portada del presupuesto debería bastar para decirte si el mes sigue sano sin obligarte a leer toda la estructura.',
    headlineValue: topRisk
      ? formatCOP(topRisk.projected ?? 0)
      : formatCOP(currentPlan.total_income ?? 0),
    headlineCaption: topRisk
      ? `Proyección actual de ${topRisk.name ?? 'la categoría principal'}`
      : 'Ingreso total presupuestado',
    supportLabel: outOfRangeCount ? 'Exceso proyectado' : 'Margen libre',
    supportValue: outOfRangeCount ? formatCOP(topRiskOverrun) : formatCOP(freeMargin),
    supportTone: outOfRangeCount ? 'warning' : 'calm',
    outOfRangeCount,
  };
};

const buildStatusLabel = (category: CurrentPlanCategory) => {
  const projected = category.projected ?? 0;
  const budgeted = category.budgeted ?? 0;
  if (projected > budgeted) return 'Fuera de rango';
  if ((category.spent ?? 0) === 0) return 'Sin movimiento';
  return 'En ritmo';
};

const SubcategoryCard = ({ sub, accentColor }: { sub: CurrentPlanSubcategory; accentColor: string }) => {
  const budgeted = sub.budgeted ?? 0;
  const spent = sub.spent ?? 0;
  const projected = sub.projected ?? 0;
  const remaining = budgeted - spent;
  const pct = budgeted > 0 ? clampPct((spent / budgeted) * 100) : 0;
  const projectedPct = budgeted > 0 ? clampPct((projected / budgeted) * 100) : 0;
  const isOver = projected > budgeted;

  return (
    <article
      className={styles.subcategoryCard}
      style={{ '--subcategory-accent': accentColor } as CSSProperties}
    >
      <div className={styles.subcategoryTop}>
        <div className={styles.subcategoryIdentity}>
          <span className={styles.subcategoryIconWrap}>
            <IonIcon icon={resolveNamedIcon(sub.icon)} className={styles.subcategoryIcon} />
          </span>
          <div className={styles.subcategoryCopy}>
            <h4 className={styles.subcategoryName}>{sub.name ?? sub.code ?? 'Sin nombre'}</h4>
            <p className={styles.subcategoryMeta}>
              {formatCOP(spent)} de {formatCOP(budgeted)}
            </p>
          </div>
        </div>
        <span className={[styles.subcategoryState, isOver ? styles.subcategoryStateWarn : ''].filter(Boolean).join(' ')}>
          {isOver ? 'Exceso' : `${pct}%`}
        </span>
      </div>

      <div className={styles.subcategoryRail} aria-hidden="true">
        <div
          className={[styles.subcategoryRailFill, isOver ? styles.subcategoryRailFillWarn : ''].filter(Boolean).join(' ')}
          style={{ width: `${Math.min(projectedPct, 100)}%` }}
        />
      </div>

      <dl className={styles.subcategoryStats}>
        <div className={styles.subcategoryStat}>
          <dt>Presupuesto</dt>
          <dd>{formatCOP(budgeted)}</dd>
        </div>
        <div className={styles.subcategoryStat}>
          <dt>Proyección</dt>
          <dd>{formatCOP(projected)}</dd>
        </div>
        <div className={styles.subcategoryStat}>
          <dt>Restante</dt>
          <dd className={remaining < 0 ? styles.negativeValue : ''}>{formatCOP(remaining)}</dd>
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
  const totalProjected = category.projected ?? 0;
  const categoryCode = category.code ?? 'unknown';
  const categoryName = category.name ?? 'Sin categoría';
  const categoryIcon = category.icon ?? 'ellipseOutline';
  const subcategories = category.subcategories ?? [];
  const spentPct = totalBudgeted > 0 ? clampPct((totalSpent / totalBudgeted) * 100) : 0;
  const projectedPct = totalBudgeted > 0 ? clampPct((totalProjected / totalBudgeted) * 100) : 0;
  const remaining = totalBudgeted - totalSpent;
  const statusLabel = buildStatusLabel(category);
  const colorVar = `var(--color-${categoryCode})`;
  const subtleVar = `var(--color-${categoryCode}-subtle)`;
  const isOverProjected = totalProjected > totalBudgeted;

  return (
    <section
      className={[styles.categorySection, expanded ? styles.categorySectionExpanded : ''].filter(Boolean).join(' ')}
      style={{ '--cat-color': colorVar, '--cat-subtle': subtleVar } as CSSProperties}
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
              <span className={[styles.categoryState, isOverProjected ? styles.categoryStateWarn : ''].filter(Boolean).join(' ')}>
                {statusLabel}
              </span>
            </div>
            <p className={styles.categorySummary}>
              {formatCOP(totalSpent)} gastados de {formatCOP(totalBudgeted)}. Proyección: {formatCOP(totalProjected)}.
            </p>
          </div>
        </div>

        <div className={styles.categoryAside}>
          <div className={styles.categoryPct}>{spentPct}%</div>
          <IonIcon icon={expanded ? chevronDownOutline : chevronForwardOutline} className={styles.categoryChevron} />
        </div>
      </button>

      <div className={styles.categoryRail} aria-hidden="true">
        <div
          className={[styles.categoryRailFill, isOverProjected ? styles.categoryRailFillWarn : ''].filter(Boolean).join(' ')}
          style={{ width: `${Math.min(projectedPct, 100)}%` }}
        />
      </div>

      {expanded ? (
        <div className={styles.categoryBody}>
          <dl className={styles.categoryStats}>
            <div className={styles.categoryStat}>
              <dt>Presupuesto</dt>
              <dd>{formatCOP(totalBudgeted)}</dd>
            </div>
            <div className={styles.categoryStat}>
              <dt>Gastado</dt>
              <dd>{formatCOP(totalSpent)}</dd>
            </div>
            <div className={styles.categoryStat}>
              <dt>Restante</dt>
              <dd className={remaining < 0 ? styles.negativeValue : ''}>{formatCOP(remaining)}</dd>
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
          <Button label="Editar plan" onClick={onEditPlan} />
          {onExploreDetail ? (
            <Button label="Ver detalle" variant="ghost" onClick={onExploreDetail} />
          ) : null}
        </div>
      </div>
    </section>
  );
};
