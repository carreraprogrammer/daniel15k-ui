import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../atoms/Button';
import { DateInput } from '../../atoms/DateInput';
import { NumberInput } from '../../atoms/NumberInput';
import { SelectInput } from '../../atoms/SelectInput';
import { TextInput } from '../../atoms/TextInput';
import { TextareaInput } from '../../atoms/TextareaInput';
import type { Debt, DebtPayload } from '../../../types/finance.types';
import styles from '../ComposerForm.module.css';

const debtTypeOptions = [
  { label: 'Tarjeta de crédito', value: 'credit_card' },
  { label: 'Préstamo personal', value: 'personal_loan' },
  { label: 'Familiar', value: 'family' },
  { label: 'Hipoteca', value: 'mortgage' },
];

const debtStatusOptions = [
  { label: 'Activa', value: 'active' },
  { label: 'Pagada', value: 'paid_off' },
  { label: 'Pausada', value: 'paused' },
  { label: 'En disputa', value: 'disputed' },
];

interface DebtComposerValues {
  name: string;
  debtType: string;
  originalAmount: number | '';
  currentBalance: number | '';
  monthlyPayment: number | '';
  interestRate: number | '';
  status: string;
  payoffDate: string;
  notes: string;
}

const emptyValues: DebtComposerValues = {
  name: '',
  debtType: 'personal_loan',
  originalAmount: '',
  currentBalance: '',
  monthlyPayment: '',
  interestRate: '',
  status: 'active',
  payoffDate: '',
  notes: '',
};

const toInputDate = (value?: string | null) => value ?? '';

const valuesFromDebt = (debt: Debt | null): DebtComposerValues => {
  if (!debt) {
    return emptyValues;
  }

  return {
    name: debt.attributes.name,
    debtType: debt.attributes.debt_type,
    originalAmount: debt.attributes.original_amount,
    currentBalance: debt.attributes.current_balance,
    monthlyPayment: debt.attributes.monthly_payment,
    interestRate: debt.attributes.interest_rate,
    status: debt.attributes.status,
    payoffDate: toInputDate(debt.attributes.payoff_date),
    notes: debt.attributes.notes ?? '',
  };
};

export interface DebtComposerProps {
  debt?: Debt | null;
  loading?: boolean;
  onCreate: (payload: DebtPayload) => Promise<void>;
  onUpdate: (id: string, payload: Partial<DebtPayload>) => Promise<void>;
  onCancel?: () => void;
}

export const DebtComposer = ({ debt = null, loading, onCreate, onUpdate, onCancel }: DebtComposerProps) => {
  const [values, setValues] = useState<DebtComposerValues>(emptyValues);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(debt);
  const submitLabel = useMemo(() => (isEditing ? 'Guardar cambios' : 'Crear deuda'), [isEditing]);

  useEffect(() => {
    setValues(valuesFromDebt(debt));
    setError(null);
  }, [debt]);

  const reset = () => {
    setValues(emptyValues);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!values.name.trim() || values.currentBalance === '' || values.currentBalance < 0 || values.monthlyPayment === '' || values.monthlyPayment < 0) {
      setError('Completa nombre, saldo y pago mensual con valores válidos.');
      return;
    }

    const payload: DebtPayload = {
      name: values.name.trim(),
      debt_type: values.debtType,
      original_amount: Number(values.originalAmount || values.currentBalance),
      current_balance: Number(values.currentBalance),
      monthly_payment: Number(values.monthlyPayment),
      interest_rate: Number(values.interestRate || 0),
      status: values.status,
      payoff_date: values.payoffDate || null,
      notes: values.notes.trim(),
    };

    setError(null);

    try {
      if (debt) {
        await onUpdate(debt.id, payload);
      } else {
        await onCreate(payload);
        reset();
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No fue posible guardar la deuda.');
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
            <p className={styles.sectionEyebrow}>Estructura</p>
            <h3 className={styles.sectionTitle}>Perfil de la deuda</h3>
          </div>
          <p className={styles.sectionText}>
            Mantén primero los datos que definen el instrumento y luego el estado operativo para revisar la carga mensual con claridad.
          </p>
        </div>

        <div className={styles.grid}>
          <div className={styles.spanTwo}>
            <TextInput
              name="debt-name"
              label="Nombre"
              value={values.name}
              onChange={(name) => setValues((current) => ({ ...current, name }))}
              placeholder="Ej. Crediexpress, TC LifeMiles"
              required
            />
          </div>
          <SelectInput
            name="debt-type"
            label="Tipo"
            value={values.debtType}
            onChange={(debtType) => setValues((current) => ({ ...current, debtType: String(debtType) }))}
            options={debtTypeOptions}
            required
          />
          <SelectInput
            name="debt-status"
            label="Estado"
            value={values.status}
            onChange={(status) => setValues((current) => ({ ...current, status: String(status) }))}
            options={debtStatusOptions}
            required
          />
          <NumberInput
            name="debt-original-amount"
            label="Monto original"
            value={values.originalAmount}
            onChange={(originalAmount) => setValues((current) => ({ ...current, originalAmount }))}
            format="currency"
            min={0}
          />
          <NumberInput
            name="debt-current-balance"
            label="Saldo actual"
            value={values.currentBalance}
            onChange={(currentBalance) => setValues((current) => ({ ...current, currentBalance }))}
            format="currency"
            min={0}
            required
          />
          <NumberInput
            name="debt-monthly-payment"
            label="Pago mensual"
            value={values.monthlyPayment}
            onChange={(monthlyPayment) => setValues((current) => ({ ...current, monthlyPayment }))}
            format="currency"
            min={0}
            required
          />
          <NumberInput
            name="debt-interest-rate"
            label="Interés %"
            value={values.interestRate}
            onChange={(interestRate) => setValues((current) => ({ ...current, interestRate }))}
            min={0}
            step={0.01}
          />
          <DateInput
            name="debt-payoff-date"
            label="Fecha objetivo"
            value={values.payoffDate}
            onChange={(payoffDate) => setValues((current) => ({ ...current, payoffDate }))}
          />
          <div className={styles.spanTwo}>
            <TextareaInput
              name="debt-notes"
              label="Notas"
              value={values.notes}
              onChange={(notes) => setValues((current) => ({ ...current, notes }))}
              rows={4}
            />
          </div>
        </div>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.actions}>
        <Button label="Cancelar" variant="ghost" onClick={handleCancel} disabled={loading} />
        <Button label={submitLabel} onClick={() => void handleSubmit()} loading={loading} />
      </div>
    </section>
  );
};
