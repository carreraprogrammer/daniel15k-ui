import type { WizardData } from '../../../types/finance.types';
import { formatCurrencyCompact } from '../../../utils/formatCurrency';
import styles from './BudgetIncomeStep.module.css';

// ── Types ────────────────────────────────────────────────────────────────────

interface BudgetIncomeStepProps {
  wizardData: WizardData;
  totalIncome: number;
  includeVariable: boolean;
  onToggleVariable: () => void;
  onGoToIncomeSource: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export const BudgetIncomeStep = ({
  wizardData,
  totalIncome,
  includeVariable,
  onToggleVariable,
  onGoToIncomeSource,
}: BudgetIncomeStepProps) => {
  const hasVariableSources = wizardData.income.sources.some((s) => s.is_variable);
  const hasSources = wizardData.income.sources.length > 0;

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.headerMain}>
          <div className={styles.iconWrap}>
            <span className={styles.icon}>↑</span>
          </div>
          <div className={styles.headerCopy}>
            <h2 className={styles.title}>Confirmá el ingreso base</h2>
            <p className={styles.description}>
              El wizard lee tus ingresos desde su fuente de verdad. Si quieres un escenario
              más conservador, deja por fuera los ingresos variables.
            </p>
          </div>
        </div>
      </div>

      <div className={styles.sourceList}>
        {hasSources ? (
          wizardData.income.sources.map((source, index) => {
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
                  <span className={styles.amountText}>
                    {formatCurrencyCompact(source.monthly_amount)}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className={styles.emptyCard}>
            <strong className={styles.emptyTitle}>Faltan ingresos estructurales</strong>
            <p className={styles.emptyText}>
              Antes de cerrar este plan, registra al menos una fuente de ingreso en la sección de ingresos.
            </p>
            <button type="button" className={styles.sourceLinkBtn} onClick={onGoToIncomeSource}>
              Ir a ingresos
            </button>
          </div>
        )}
      </div>

      <div className={styles.sourceOfTruthCard}>
        <span className={styles.sourceOfTruthLabel}>Fuente de verdad</span>
        <p className={styles.sourceOfTruthText}>
          {wizardData.income.edit_hint ?? 'Los ingresos se administran fuera del wizard.'}
        </p>
        <button type="button" className={styles.sourceLinkBtn} onClick={onGoToIncomeSource}>
          Abrir ingresos
        </button>
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
        <span className={styles.totalLabel}>Ingreso base del plan</span>
        <span className={styles.totalAmount}>{formatCurrencyCompact(totalIncome)}</span>
      </div>

      <p className={styles.hint}>
        Este paso confirma el cálculo base; no redefine ingresos desde adentro.
      </p>
    </div>
  );
};
