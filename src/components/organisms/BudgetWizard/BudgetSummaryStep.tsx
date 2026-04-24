import type { WizardCategory } from '../../../types/finance.types';
import { formatCurrencyCompact } from '../../../utils/formatCurrency';
import styles from './BudgetSummaryStep.module.css';

const formatPct = (pct: number): string => `${Math.round(pct)}%`;

interface BenchmarkWarning {
  code: string;
  limit: number;
}

const BENCHMARK_WARNINGS: BenchmarkWarning[] = [
  { code: 'committed',    limit: 50 },
  { code: 'necessary',    limit: 20 },
  { code: 'discretionary', limit: 15 },
];

function getWarningLimit(code: string): number | null {
  return BENCHMARK_WARNINGS.find((b) => b.code === code)?.limit ?? null;
}

// ── Types ────────────────────────────────────────────────────────────────────

interface BudgetSummaryStepProps {
  categories: WizardCategory[];
  stepData: Record<string, Record<string, number>>;
  totalIncome: number;
}

// ── Component ────────────────────────────────────────────────────────────────

export const BudgetSummaryStep = ({
  categories,
  stepData,
  totalIncome,
}: BudgetSummaryStepProps) => {
  const categoryTotals = categories.map((cat) => {
    const subAmounts = stepData[cat.code] ?? {};
    const total = cat.subcategories.reduce(
      (sum, sub) => sum + (subAmounts[sub.code] ?? sub.suggested_amount),
      0,
    );
    return { ...cat, total };
  });

  const totalAssigned = categoryTotals.reduce((sum, c) => sum + c.total, 0);
  const unassigned = totalIncome - totalAssigned;
  const incomeForCalc = totalIncome > 0 ? totalIncome : 1;

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h2 className={styles.title}>Resumen del plan</h2>
        <p className={styles.subtitle}>
          Revisá la distribución antes de guardar. Podés volver a cualquier categoría.
        </p>
      </div>

      {/* Income anchor */}
      <div className={styles.incomeRow}>
        <div className={styles.incomeBar} style={{ '--bar-color': 'var(--color-income)' } as React.CSSProperties} />
        <span className={styles.incomeName}>Ingreso total</span>
        <div className={styles.incomeNumbers}>
          <span className={styles.incomeAmount}>{formatCurrencyCompact(totalIncome)}</span>
          <span className={styles.incomePct}>100%</span>
        </div>
      </div>

      {/* Category rows */}
      <div className={styles.categoryList}>
        {categoryTotals.map((cat) => {
          const pct = (cat.total / incomeForCalc) * 100;
          const barWidth = Math.min(pct, 100);
          const warningLimit = getWarningLimit(cat.code);
          const isOverBenchmark = warningLimit !== null && pct > warningLimit;
          const catColorVar = `var(--color-${cat.code})`;
          const catSubtleVar = `var(--color-${cat.code}-subtle)`;

          return (
            <div
              key={cat.code}
              className={[
                styles.categoryRow,
                isOverBenchmark ? styles.categoryRowWarning : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{ '--cat-color': catColorVar, '--cat-subtle': catSubtleVar } as React.CSSProperties}
            >
              {/* Bar */}
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{ width: `${barWidth}%` }}
                />
              </div>

              {/* Info row */}
              <div className={styles.categoryInfo}>
                <div className={styles.categoryLeft}>
                  <div className={styles.colorDot} />
                  <span className={styles.categoryName}>{cat.name}</span>
                </div>
                <div className={styles.categoryRight}>
                  <span className={styles.categoryAmount}>{formatCurrencyCompact(cat.total)}</span>
                  <span className={styles.categoryPct}>{formatPct(pct)}</span>
                </div>
              </div>

              {/* Warning */}
              {isOverBenchmark && (
                <p className={styles.warning}>
                  Supera el benchmark recomendado de {warningLimit}% del ingreso
                </p>
              )}
            </div>
          );
        })}

        {/* Unassigned row */}
        <div
          className={[styles.categoryRow, styles.unassignedRow].join(' ')}
          style={
            {
              '--cat-color': unassigned >= 0 ? 'var(--color-success)' : 'var(--color-error)',
              '--cat-subtle': unassigned >= 0 ? 'var(--color-success-subtle)' : 'var(--color-error-subtle)',
            } as React.CSSProperties
          }
        >
          <div className={styles.barTrack}>
            <div
              className={styles.barFill}
              style={{ width: `${Math.min(Math.abs((unassigned / incomeForCalc) * 100), 100)}%` }}
            />
          </div>
          <div className={styles.categoryInfo}>
            <div className={styles.categoryLeft}>
              <div className={styles.colorDot} />
              <span className={styles.categoryName}>Sin asignar</span>
            </div>
            <div className={styles.categoryRight}>
              <span className={styles.categoryAmount}>{formatCurrencyCompact(unassigned)}</span>
              <span className={styles.categoryPct}>{formatPct((unassigned / incomeForCalc) * 100)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Totals footer */}
      <div className={styles.totalsCard}>
        <div className={styles.totalsRow}>
          <span className={styles.totalsLabel}>Total asignado</span>
          <span className={styles.totalsValue}>{formatCurrencyCompact(totalAssigned)}</span>
        </div>
        <div className={styles.totalsRow}>
          <span className={styles.totalsLabel}>Sin asignar</span>
          <strong
            className={[
              styles.totalsHighlight,
              unassigned < 0 ? styles.totalsNegative : styles.totalsPositive,
            ].join(' ')}
          >
            {formatCurrencyCompact(unassigned)}
          </strong>
        </div>
      </div>
    </div>
  );
};
