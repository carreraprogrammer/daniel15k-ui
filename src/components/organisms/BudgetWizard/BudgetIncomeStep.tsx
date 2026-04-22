import { useState } from 'react';
import type { WizardData } from '../../../types/finance.types';
import styles from './BudgetIncomeStep.module.css';

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatCOP = (amount: number): string =>
  '$' + Math.round(amount).toLocaleString('es-CO').replace(/,/g, '.');

// ── Types ────────────────────────────────────────────────────────────────────

interface BudgetIncomeStepProps {
  wizardData: WizardData;
  incomeSources: number[];
  totalIncome: number;
  includeVariable: boolean;
  onIncomeChange: (sourceIndex: number, amount: number) => void;
  onToggleVariable: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export const BudgetIncomeStep = ({
  wizardData,
  incomeSources,
  totalIncome,
  includeVariable,
  onIncomeChange,
  onToggleVariable,
}: BudgetIncomeStepProps) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const hasVariableSources = wizardData.income.sources.some((s) => s.is_variable);

  const startEdit = (index: number, currentAmount: number) => {
    setEditingIndex(index);
    setEditValue(String(Math.round(currentAmount)));
  };

  const commitEdit = (index: number) => {
    const parsed = parseInt(editValue.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed >= 0) {
      onIncomeChange(index, parsed);
    }
    setEditingIndex(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') commitEdit(index);
    if (e.key === 'Escape') {
      setEditingIndex(null);
      setEditValue('');
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.iconWrap}>
          <span className={styles.icon}>↑</span>
        </div>
        <div>
          <h2 className={styles.title}>Ingreso</h2>
          <p className={styles.description}>
            Base de tu presupuesto. El resto de las categorías se distribuyen desde acá.
          </p>
        </div>
      </div>

      <div className={styles.sourceList}>
        {wizardData.income.sources.map((source, index) => {
          const isExcluded = source.is_variable && !includeVariable;
          return (
            <div
              key={index}
              className={[styles.sourceRow, isExcluded ? styles.sourceRowExcluded : '']
                .filter(Boolean)
                .join(' ')}
            >
              <div className={styles.sourceInfo}>
                <span className={styles.sourceName}>{source.name}</span>
                {source.is_variable && (
                  <span className={styles.variableBadge}>variable</span>
                )}
              </div>
              <div className={styles.sourceAmount}>
                {editingIndex === index ? (
                  <input
                    type="number"
                    className={styles.amountInput}
                    value={editValue}
                    min={0}
                    autoFocus
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => commitEdit(index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    aria-label={`Monto de ${source.name}`}
                  />
                ) : (
                  <>
                    <span className={styles.amountText}>
                      {formatCOP(incomeSources[index] ?? source.monthly_amount)}
                    </span>
                    <button
                      type="button"
                      className={styles.editBtn}
                      onClick={() => startEdit(index, incomeSources[index] ?? source.monthly_amount)}
                      aria-label={`Editar monto de ${source.name}`}
                    >
                      ✎
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Variable income toggle — only shown when variable sources exist */}
      {hasVariableSources && (
        <button
          type="button"
          className={styles.variableToggle}
          onClick={onToggleVariable}
          aria-pressed={includeVariable}
        >
          <span className={[styles.toggleTrack, includeVariable ? styles.toggleTrackOn : ''].filter(Boolean).join(' ')}>
            <span className={styles.toggleThumb} />
          </span>
          <span className={styles.toggleText}>
            <span className={styles.toggleLabel}>
              {includeVariable
                ? 'Incluyendo ingresos variables'
                : 'Sin ingresos variables'}
            </span>
            <span className={styles.toggleHint}>
              {includeVariable
                ? 'Presupuestar solo ingresos fijos da más margen de seguridad'
                : 'Los ingresos variables no se contarán en el presupuesto base'}
            </span>
          </span>
        </button>
      )}

      <div className={styles.totalRow}>
        <span className={styles.totalLabel}>Total ingreso base</span>
        <span className={styles.totalAmount}>{formatCOP(totalIncome)}</span>
      </div>

      <p className={styles.hint}>
        Editá cada fuente si el monto no refleja lo que realmente entra este mes.
      </p>
    </div>
  );
};
