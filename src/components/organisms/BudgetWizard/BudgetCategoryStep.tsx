import { useState } from 'react';
import type { WizardCategory, WizardSubcategory } from '../../../types/finance.types';
import styles from './BudgetCategoryStep.module.css';

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatCOP = (amount: number): string =>
  '$' + Math.round(amount).toLocaleString('es-CO').replace(/,/g, '.');

/** Convert camelCase Ionicon name to kebab-case for the web component */
const toKebab = (name: string): string =>
  name.replace(/([A-Z])/g, '-$1').toLowerCase();

const CONFIDENCE_LABELS: Record<WizardSubcategory['confidence'], string> = {
  high:   '●',
  medium: '◐',
  low:    '○',
};

const CONFIDENCE_TITLES: Record<WizardSubcategory['confidence'], string> = {
  high:   'Confirmado por recurrentes',
  medium: 'Estimado por historial',
  low:    'Referencia de benchmark',
};

// ── Types ────────────────────────────────────────────────────────────────────

interface BudgetCategoryStepProps {
  category: WizardCategory;
  amounts: Record<string, number>;
  totalIncome: number;
  alreadyCommitted: number;
  onAmountChange: (subcategoryCode: string, amount: number) => void;
  onAddSubcategory: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export const BudgetCategoryStep = ({
  category,
  amounts,
  totalIncome,
  alreadyCommitted,
  onAmountChange,
  onAddSubcategory,
}: BudgetCategoryStepProps) => {
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (code: string, currentAmount: number) => {
    setEditingCode(code);
    setEditValue(String(Math.round(currentAmount)));
  };

  const commitEdit = (code: string) => {
    const parsed = parseInt(editValue.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed >= 0) {
      onAmountChange(code, parsed);
    }
    setEditingCode(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, code: string) => {
    if (e.key === 'Enter') commitEdit(code);
    if (e.key === 'Escape') {
      setEditingCode(null);
      setEditValue('');
    }
  };

  const categoryTotal = category.subcategories.reduce(
    (sum, sub) => sum + (amounts[sub.code] ?? sub.suggested_amount),
    0,
  );

  const remaining = totalIncome - alreadyCommitted - categoryTotal;

  const catColorVar = `var(--color-${category.code})`;
  const catSubtleVar = `var(--color-${category.code}-subtle)`;

  return (
    <div className={styles.root}>
      {/* Category header */}
      <div
        className={styles.header}
        style={{ '--cat-color': catColorVar, '--cat-subtle': catSubtleVar } as React.CSSProperties}
      >
        <div className={styles.colorBar} />
        <div className={styles.headerContent}>
          <h2 className={styles.title}>{category.name}</h2>
          <p className={styles.description}>{category.description}</p>
        </div>
      </div>

      {/* Subcategory list */}
      <div className={styles.subList}>
        {category.subcategories.map((sub) => {
          const amount = amounts[sub.code] ?? sub.suggested_amount;
          const isEditing = editingCode === sub.code;

          return (
            <div
              key={sub.code}
              className={styles.subRow}
              style={{ '--cat-color': catColorVar } as React.CSSProperties}
            >
              {/* Icon */}
              <div className={styles.subIconWrap}>
                {/* Use web component directly for dynamic icon names */}
                <ion-icon
                  name={toKebab(sub.icon)}
                  class={styles.subIcon}
                  aria-hidden="true"
                />
              </div>

              {/* Name + confidence */}
              <div className={styles.subMeta}>
                <span className={styles.subName}>{sub.name}</span>
                <span
                  className={styles.confidence}
                  data-level={sub.confidence}
                  title={CONFIDENCE_TITLES[sub.confidence]}
                >
                  {CONFIDENCE_LABELS[sub.confidence]}
                </span>
              </div>

              {/* Amount */}
              <div className={styles.amountCell}>
                {isEditing ? (
                  <input
                    type="number"
                    className={styles.amountInput}
                    value={editValue}
                    min={0}
                    autoFocus
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => commitEdit(sub.code)}
                    onKeyDown={(e) => handleKeyDown(e, sub.code)}
                    aria-label={`Monto de ${sub.name}`}
                  />
                ) : (
                  <>
                    <span className={styles.amountText}>{formatCOP(amount)}</span>
                    <button
                      type="button"
                      className={styles.editBtn}
                      onClick={() => startEdit(sub.code, amount)}
                      aria-label={`Editar monto de ${sub.name}`}
                    >
                      ✎
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Add subcategory */}
        <button
          type="button"
          className={styles.addBtn}
          style={{ '--cat-color': catColorVar } as React.CSSProperties}
          onClick={onAddSubcategory}
        >
          <span className={styles.addPlus}>＋</span>
          Agregar subcategoría
        </button>
      </div>

      {/* Footer totals */}
      <div
        className={styles.footer}
        style={{ '--cat-color': catColorVar, '--cat-subtle': catSubtleVar } as React.CSSProperties}
      >
        <div className={styles.footerRow}>
          <span className={styles.footerLabel}>Total {category.name}</span>
          <span className={styles.footerCategoryTotal}>{formatCOP(categoryTotal)}</span>
        </div>
        <div className={styles.footerRow}>
          <span className={styles.footerLabel}>Disponible restante</span>
          <span
            className={[
              styles.footerRemaining,
              remaining < 0 ? styles.footerRemainingNegative : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {formatCOP(remaining)}
          </span>
        </div>
      </div>
    </div>
  );
};
