import { useEffect, useState } from 'react';
import {
  IonContent,
  IonIcon,
  IonModal,
} from '@ionic/react';
import { warningOutline } from 'ionicons/icons';
import { BrandMark } from '../../atoms/BrandMark';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';
import { financeService } from '../../../services/financeService';
import { formatCurrencyCompact, formatCurrencyFull } from '../../../utils/formatCurrency';
import type { BudgetAvailableCategory, BudgetProposal, BudgetProposalCategory } from '../../../types/finance.types';
import styles from './BudgetPlanModal.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const BudgetPlanModal = ({ isOpen, onClose, onSaved }: Props) => {
  const [proposal, setProposal] = useState<BudgetProposal | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeVariable, setIncludeVariable] = useState(false);
  // active categories = proposal.categories that user hasn't removed + ones they added
  const [activeCodes, setActiveCodes] = useState<Set<string>>(new Set());
  const [amounts, setAmounts] = useState<Record<string, number>>({});

  const loadProposal = async (variable: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const data = await financeService.proposeBudgetPlan({ includeVariable: variable });
      setProposal(data);
      const codes = new Set(data.categories.map((c) => c.code));
      setActiveCodes(codes);
      setAmounts(Object.fromEntries(data.categories.map((c) => [c.code, c.suggested_amount])));
    } catch {
      setError('No fue posible calcular la propuesta. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) void loadProposal(includeVariable);
  }, [isOpen]);

  const toggleVariable = (val: boolean) => {
    setIncludeVariable(val);
    void loadProposal(val);
  };

  const removeCategory = (code: string) => {
    setActiveCodes((prev) => { const n = new Set(prev); n.delete(code); return n; });
    setAmounts((prev) => { const n = { ...prev }; delete n[code]; return n; });
  };

  const addCategory = (cat: BudgetAvailableCategory) => {
    setActiveCodes((prev) => new Set([...prev, cat.code]));
    setAmounts((prev) => ({ ...prev, [cat.code]: 0 }));
  };

  const setAmount = (code: string, raw: string) => {
    const n = parseInt(raw.replace(/\D/g, ''), 10);
    setAmounts((prev) => ({ ...prev, [code]: isNaN(n) ? 0 : n }));
  };

  const activeCategories: BudgetProposalCategory[] = proposal
    ? [
        ...proposal.categories.filter((c) => activeCodes.has(c.code)),
        // categories the user added from available_categories
        ...proposal.available_categories
          .filter((c) => activeCodes.has(c.code))
          .map((c): BudgetProposalCategory => ({
            ...c,
            suggested_amount: 0,
            avg_spent: null,
            months_with_data: 0,
          })),
      ]
    : [];

  const committed = proposal?.committed.total ?? 0;
  const planningIncome = proposal?.income.planning_income ?? 0;
  const totalCategories = Object.entries(amounts)
    .filter(([code]) => activeCodes.has(code))
    .reduce((sum, [, v]) => sum + v, 0);
  const margin = planningIncome - committed - totalCategories;

  const availableToAdd = proposal?.available_categories.filter((c) => !activeCodes.has(c.code)) ?? [];

  const handleConfirm = async () => {
    if (!proposal) return;
    setSaving(true);
    try {
      const plan = await financeService.generateMonthlyPlan(includeVariable ? 'expected' : 'conservative');
      await financeService.confirmMonthlyPlan(
        plan.id,
        {
          base_budget_income:          proposal.income.fixed_total,
          expected_variable_income:    proposal.income.variable_projection,
          recurring_obligations_total: proposal.committed.obligations_total,
          debt_minimums_total:         proposal.committed.debt_minimums_total,
          discretionary_limit:         totalCategories,
        },
        Object.entries(amounts)
          .filter(([code, amt]) => activeCodes.has(code) && amt > 0)
          .map(([code, amount_limit]) => ({ category_code: code, amount_limit })) as never,
      );
      onSaved();
      onClose();
    } catch {
      setError('No fue posible guardar el plan. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <IonModal
      className={styles.modal}
      isOpen={isOpen}
      onDidDismiss={onClose}
      style={{ '--border-radius': '28px', '--width': 'min(1100px, 98vw)', '--height': 'min(94dvh, 960px)' }}
    >
      <IonContent className={styles.body}>
        <div className={styles.panel}>
          <div className={styles.topbar}>
            <div className={styles.topbarBrand}>
              <BrandMark variant="monoline" size="md" />
              <div className={styles.topbarCopy}>
                <span className={styles.topbarEyebrow}>Ascent</span>
                <div className={styles.topbarTitleRow}>
                  <h2 className={styles.topbarTitle}>Plan mensual</h2>
                  {proposal?.mode === 'provisional' && (
                    <span className={styles.provisionalBadge}>Provisional</span>
                  )}
                </div>
              </div>
            </div>
            <button type="button" onClick={onClose} className={styles.closeBtn}>Cerrar</button>
          </div>

        {loading && (
          <div className={styles.loadingState}>
            <Spinner size="lg" />
            <p className={styles.loadingText}>Calculando propuesta...</p>
          </div>
        )}

        {!loading && error && (
          <div className={styles.errorState}>
            <p className={styles.errorText}>{error}</p>
            <Button label="Reintentar" onClick={() => void loadProposal(includeVariable)} />
          </div>
        )}

        {!loading && !error && proposal && (
          <div className={styles.content}>

            {/* No-history notice */}
            {!proposal.has_history && (
              <div className={styles.noHistoryBanner}>
                <p className={styles.noHistoryText}>
                  Sin historial de transacciones — los montos son rangos de referencia para Colombia.
                  Ajustá cada categoría y revisá el plan después del primer mes.
                </p>
              </div>
            )}

            {/* Income */}
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Ingreso base</h3>
              <div className={styles.incomeRow}>
                <div>
                  <p className={styles.incomeValue}>{formatCurrencyCompact(proposal.income.fixed_total)}</p>
                  <p className={styles.incomeLabel}>
                    {proposal.income.fixed_sources.map((s) => s.name).join(', ') || 'Ingreso fijo'}
                  </p>
                </div>
                {proposal.income.variable_sources.length > 0 && (
                  <label className={styles.toggleLabel}>
                    <input
                      type="checkbox"
                      className={styles.toggleInput}
                      checked={includeVariable}
                      onChange={(e) => toggleVariable(e.target.checked)}
                    />
                    <span className={styles.toggleText}>
                      + variable ({formatCurrencyCompact(proposal.income.variable_projection)})
                    </span>
                  </label>
                )}
              </div>
            </section>

            {/* Committed */}
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Comprometido (fijo)</h3>
              <div className={styles.committedList}>
                {Object.entries(
                  (proposal.committed.by_category ?? {}) as Record<string, { total: number }>
                ).map(([cat, data]) => (
                  <div key={cat} className={styles.committedRow}>
                    <span className={styles.committedName}>{cat}</span>
                    <span className={styles.committedAmount}>{formatCurrencyCompact(data.total)}</span>
                  </div>
                ))}
                {proposal.committed.debt_minimums_total > 0 && (
                  <div className={styles.committedRow}>
                    <span className={styles.committedName}>Mínimos de deuda</span>
                    <span className={styles.committedAmount}>{formatCurrencyCompact(proposal.committed.debt_minimums_total)}</span>
                  </div>
                )}
                {proposal.committed.sinking_funds_total > 0 && (
                  <div className={styles.committedRow}>
                    <span className={styles.committedName}>Bolsillos</span>
                    <span className={styles.committedAmount}>{formatCurrencyCompact(proposal.committed.sinking_funds_total)}</span>
                  </div>
                )}
                <div className={`${styles.committedRow} ${styles.committedTotal}`}>
                  <span className={styles.committedName}>Total comprometido</span>
                  <span className={styles.committedAmount}>{formatCurrencyCompact(committed)}</span>
                </div>
              </div>
            </section>

            {/* Category budgets */}
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>
                {proposal.has_history
                  ? `Presupuesto por categoría · promedio ${activeCategories[0]?.months_with_data ?? 0} meses`
                  : 'Presupuesto por categoría · ajustá los montos'}
              </h3>

              <div className={styles.categoryList}>
                {activeCategories.map((cat: BudgetProposalCategory) => (
                  <div key={cat.code} className={styles.categoryRow}>
                    <div className={styles.categoryMeta}>
                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => removeCategory(cat.code)}
                        title="Quitar categoría"
                      >
                        ×
                      </button>
                      <div>
                        <span className={styles.categoryName}>{cat.name}</span>
                        {cat.range_hint && amounts[cat.code] === 0 && (
                          <span className={styles.rangeHint}>{cat.range_hint}</span>
                        )}
                      </div>
                      <span className={`${styles.categoryType} ${styles[`type_${cat.category_type}`]}`}>
                        {cat.category_type}
                      </span>
                    </div>
                    <input
                      type="text"
                      className={styles.amountInput}
                      value={amounts[cat.code] ? formatCurrencyFull(amounts[cat.code]) : ''}
                      onChange={(e) => setAmount(cat.code, e.target.value)}
                      placeholder={cat.range_hint ?? '$0'}
                    />
                  </div>
                ))}
              </div>

              {/* Add category */}
              {availableToAdd.length > 0 && (
                <div className={styles.addSection}>
                  <p className={styles.addLabel}>Agregar categoría</p>
                  <div className={styles.addChips}>
                    {availableToAdd.map((cat) => (
                      <button
                        key={cat.code}
                        type="button"
                        className={styles.addChip}
                        onClick={() => addCategory(cat)}
                        title={cat.range_hint ?? ''}
                      >
                        + {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Warnings */}
            {proposal.warnings.length > 0 && (
              <div className={styles.warnings}>
                {proposal.warnings.map((w, i) => (
                  <p key={i} className={styles.warningItem}>
                    <IonIcon icon={warningOutline} aria-hidden="true" /> {w}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

          {!loading && !error && proposal && (
            <div className={styles.actionsBar}>
              <div className={styles.footerSummary}>
                <div className={styles.footerRow}>
                  <span className={styles.footerLabel}>Total asignado</span>
                  <span className={styles.footerValue}>{formatCurrencyCompact(committed + totalCategories)}</span>
                </div>
                <div className={styles.footerRow}>
                  <span className={styles.footerLabel}>Sin asignar</span>
                  <strong className={margin >= 0 ? styles.marginPositive : styles.marginNegative}>
                    {formatCurrencyCompact(margin)}
                  </strong>
                </div>
              </div>
              <div className={styles.actions}>
                <Button label="Cerrar" variant="ghost" onClick={onClose} />
                <Button
                  label={saving ? 'Guardando...' : 'Confirmar plan'}
                  onClick={() => void handleConfirm()}
                  disabled={saving || margin < 0}
                />
              </div>
            </div>
          )}
        </div>
      </IonContent>
    </IonModal>
  );
};
