import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../atoms/Button';
import { CheckboxInput } from '../../atoms/CheckboxInput';
import { DateInput } from '../../atoms/DateInput';
import { NumberInput } from '../../atoms/NumberInput';
import { SelectInput } from '../../atoms/SelectInput';
import { TextInput } from '../../atoms/TextInput';
import { TextareaInput } from '../../atoms/TextareaInput';
import type { SinkingFund, SinkingFundPayload } from '../../../types/finance.types';
import styles from '../ComposerForm.module.css';

// Un bolsillo siempre pertenece a una gaveta de agencia (el corazón YNAB).
const BUDGET_CATEGORY_OPTIONS = [
  { label: 'Comprometido', value: 'committed' },
  { label: 'Necesario', value: 'necessary' },
  { label: 'Discrecional', value: 'discretionary' },
  { label: 'Inversión', value: 'investment' },
  { label: 'Social', value: 'social' },
];

interface Values {
  name: string;
  monthlyContribution: number | '';
  targetAmount: number | '';
  targetDate: string;
  currentBalance: number | '';
  budgetCategory: string;
  autoDebit: boolean;
  debitDay: number | '';
  notes: string;
}

const emptyValues: Values = {
  name: '',
  monthlyContribution: '',
  targetAmount: '',
  targetDate: '',
  currentBalance: '',
  budgetCategory: '',
  autoDebit: false,
  debitDay: 1,
  notes: '',
};

const valuesFromFund = (fund: SinkingFund | null): Values => {
  if (!fund) {
    return emptyValues;
  }

  return {
    name: fund.name,
    monthlyContribution: fund.monthly_contribution,
    targetAmount: fund.target_amount ?? '',
    targetDate: fund.target_date ?? '',
    currentBalance: fund.current_balance,
    budgetCategory: fund.budget_category ?? '',
    autoDebit: Boolean(fund.auto_debit),
    debitDay: fund.debit_day ?? 1,
    notes: fund.notes ?? '',
  };
};

export interface SinkingFundComposerProps {
  fund?: SinkingFund | null;
  loading?: boolean;
  onCreate: (payload: SinkingFundPayload) => Promise<void>;
  onUpdate: (id: number, payload: Partial<SinkingFundPayload>) => Promise<void>;
  onCancel?: () => void;
}

export const SinkingFundComposer = ({
  fund = null,
  loading,
  onCreate,
  onUpdate,
  onCancel,
}: SinkingFundComposerProps) => {
  const [values, setValues] = useState<Values>(emptyValues);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(fund);
  const submitLabel = useMemo(() => (isEditing ? 'Guardar cambios' : 'Crear bolsillo'), [isEditing]);

  useEffect(() => {
    setValues(valuesFromFund(fund));
    setError(null);
  }, [fund]);

  const reset = () => {
    setValues(emptyValues);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!values.name.trim() || values.monthlyContribution === '' || Number(values.monthlyContribution) < 0 || !values.budgetCategory) {
      setError('Completa nombre, aporte mensual y la categoría a la que pertenece el bolsillo.');
      return;
    }

    const payload: SinkingFundPayload = {
      name: values.name.trim(),
      monthly_contribution: Number(values.monthlyContribution),
      budget_category: values.budgetCategory,
      auto_debit: values.autoDebit,
      debit_day: values.autoDebit ? Number(values.debitDay || 1) : undefined,
      target_amount: values.targetAmount === '' ? null : Number(values.targetAmount),
      target_date: values.targetDate || null,
      notes: values.notes.trim() || null,
    };
    // El saldo inicial solo se setea al crear; al editar lo manejan aportes/retiros.
    if (!isEditing) {
      payload.current_balance = values.currentBalance === '' ? 0 : Number(values.currentBalance);
    }

    setError(null);

    try {
      if (fund) {
        await onUpdate(fund.id, payload);
      } else {
        await onCreate(payload);
        reset();
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No fue posible guardar el bolsillo.');
    }
  };

  const handleCancel = () => {
    reset();
    onCancel?.();
  };

  return (
    <section className={styles.panel}>
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Bolsillo</p>
            <h3 className={styles.sectionTitle}>Reserva para un gasto futuro</h3>
          </div>
          <p className={styles.sectionText}>
            Aparta dinero cada mes hacia un gasto futuro puntual (SOAT, mantenimiento, ropa). El bolsillo
            pertenece a una de tus categorías y acumula hasta que llega el gasto.
          </p>
        </div>

        <div className={styles.grid}>
          <div className={styles.spanTwo}>
            <TextInput
              name="sinking-fund-name"
              label="Nombre"
              value={values.name}
              onChange={(name) => setValues((current) => ({ ...current, name }))}
              required
            />
          </div>
          <NumberInput
            name="sinking-fund-monthly"
            label="Aporte mensual"
            value={values.monthlyContribution}
            onChange={(monthlyContribution) => setValues((current) => ({ ...current, monthlyContribution }))}
            format="currency"
            min={0}
            required
          />
          <SelectInput
            name="sinking-fund-category"
            label="Categoría"
            value={values.budgetCategory}
            onChange={(budgetCategory) => setValues((current) => ({ ...current, budgetCategory: String(budgetCategory) }))}
            options={BUDGET_CATEGORY_OPTIONS}
            placeholder="¿A qué categoría pertenece?"
            required
          />
          <NumberInput
            name="sinking-fund-target"
            label="Meta (opcional)"
            value={values.targetAmount}
            onChange={(targetAmount) => setValues((current) => ({ ...current, targetAmount }))}
            format="currency"
            min={0}
          />
          <DateInput
            name="sinking-fund-target-date"
            label="Fecha objetivo (opcional)"
            value={values.targetDate}
            onChange={(targetDate) => setValues((current) => ({ ...current, targetDate }))}
          />
          {!isEditing ? (
            <NumberInput
              name="sinking-fund-balance"
              label="Saldo inicial (opcional)"
              value={values.currentBalance}
              onChange={(currentBalance) => setValues((current) => ({ ...current, currentBalance }))}
              format="currency"
              min={0}
            />
          ) : null}
          <div className={styles.spanTwo}>
            <CheckboxInput
              name="sinking-fund-auto-debit"
              label="Débito automático mensual (aparta la cuota cada mes)"
              checked={values.autoDebit}
              onChange={(autoDebit) => setValues((current) => ({ ...current, autoDebit }))}
            />
          </div>
          {values.autoDebit ? (
            <NumberInput
              name="sinking-fund-debit-day"
              label="Día del débito (1-28)"
              value={values.debitDay}
              onChange={(debitDay) => setValues((current) => ({ ...current, debitDay }))}
              min={1}
              max={28}
            />
          ) : null}
          <div className={styles.spanTwo}>
            <TextareaInput
              name="sinking-fund-notes"
              label="Notas"
              value={values.notes}
              onChange={(notes) => setValues((current) => ({ ...current, notes }))}
              rows={3}
            />
          </div>
        </div>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.actions}>
        <Button label="Cancelar" variant="ghost" onClick={handleCancel} />
        <Button label={submitLabel} onClick={() => void handleSubmit()} loading={loading} />
      </div>
    </section>
  );
};
