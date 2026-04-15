import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../atoms/Button';
import { NumberInput } from '../../atoms/NumberInput';
import { SelectInput } from '../../atoms/SelectInput';
import { TextInput } from '../../atoms/TextInput';
import { TextareaInput } from '../../atoms/TextareaInput';
import type { RecurringObligation, RecurringObligationPayload } from '../../../types/finance.types';
import styles from './RecurringObligationComposer.module.css';

interface Option {
  label: string;
  value: string | number;
}

interface Values {
  name: string;
  amount: number | '';
  dueDay: number | '';
  categoryId: number | '';
  active: string;
  notes: string;
}

const emptyValues: Values = {
  name: '',
  amount: '',
  dueDay: '',
  categoryId: '',
  active: 'true',
  notes: '',
};

const valuesFromObligation = (obligation: RecurringObligation | null): Values => {
  if (!obligation) {
    return emptyValues;
  }

  return {
    name: obligation.attributes.name,
    amount: obligation.attributes.amount,
    dueDay: obligation.attributes.due_day,
    categoryId: obligation.attributes.category_id ?? '',
    active: String(obligation.attributes.active ?? true),
    notes: obligation.attributes.notes ?? '',
  };
};

export interface RecurringObligationComposerProps {
  obligation?: RecurringObligation | null;
  loading?: boolean;
  categoryOptions: Option[];
  onCreate: (payload: RecurringObligationPayload) => Promise<void>;
  onUpdate: (id: string, payload: Partial<RecurringObligationPayload>) => Promise<void>;
  onCancel?: () => void;
}

export const RecurringObligationComposer = ({
  obligation = null,
  loading,
  categoryOptions,
  onCreate,
  onUpdate,
  onCancel,
}: RecurringObligationComposerProps) => {
  const [values, setValues] = useState<Values>(emptyValues);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(obligation);
  const submitLabel = useMemo(() => (isEditing ? 'Guardar cambios' : 'Crear recurrente'), [isEditing]);

  useEffect(() => {
    setValues(valuesFromObligation(obligation));
    setError(null);
  }, [obligation]);

  const reset = () => {
    setValues(emptyValues);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!values.name.trim() || values.amount === '' || values.amount <= 0 || values.dueDay === '' || values.dueDay < 1 || values.dueDay > 31) {
      setError('Completa nombre, monto y día de vencimiento válido.');
      return;
    }

    const payload: RecurringObligationPayload = {
      name: values.name.trim(),
      amount: Number(values.amount),
      due_day: values.dueDay,
      category_id: values.categoryId === '' ? null : Number(values.categoryId),
      active: values.active === 'true',
      notes: values.notes.trim(),
    };

    setError(null);

    try {
      if (obligation) {
        await onUpdate(obligation.id, payload);
      } else {
        await onCreate(payload);
        reset();
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No fue posible guardar el gasto recurrente.');
    }
  };

  const handleCancel = () => {
    reset();
    onCancel?.();
  };

  return (
    <section className={styles.panel}>
      <div className={styles.grid}>
        <div className={styles.spanTwo}>
          <TextInput
            name="recurring-name"
            label="Nombre"
            value={values.name}
            onChange={(name) => setValues((current) => ({ ...current, name }))}
            required
          />
        </div>
        <NumberInput
          name="recurring-amount"
          label="Monto"
          value={values.amount}
          onChange={(amount) => setValues((current) => ({ ...current, amount }))}
          format="currency"
          min={1}
          required
        />
        <NumberInput
          name="recurring-due-day"
          label="Día de vencimiento"
          value={values.dueDay}
          onChange={(dueDay) => setValues((current) => ({ ...current, dueDay }))}
          min={1}
          max={31}
          required
        />
        <SelectInput
          name="recurring-category"
          label="Categoría"
          value={values.categoryId}
          onChange={(categoryId) => setValues((current) => ({ ...current, categoryId: categoryId as number | '' }))}
          options={categoryOptions}
          placeholder="Sin categoría"
        />
        <SelectInput
          name="recurring-active"
          label="Estado"
          value={values.active}
          onChange={(active) => setValues((current) => ({ ...current, active: String(active) }))}
          options={[
            { label: 'Activa', value: 'true' },
            { label: 'Inactiva', value: 'false' },
          ]}
          required
        />
        <div className={styles.spanTwo}>
          <TextareaInput
            name="recurring-notes"
            label="Notas"
            value={values.notes}
            onChange={(notes) => setValues((current) => ({ ...current, notes }))}
            rows={4}
          />
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
