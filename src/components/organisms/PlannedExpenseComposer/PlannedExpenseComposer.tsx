import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../atoms/Button';
import { CheckboxInput } from '../../atoms/CheckboxInput';
import { DateInput } from '../../atoms/DateInput';
import { NumberInput } from '../../atoms/NumberInput';
import { SelectInput } from '../../atoms/SelectInput';
import { TextInput } from '../../atoms/TextInput';
import { TextareaInput } from '../../atoms/TextareaInput';
import { getCategoryDisplayName } from '../../../utils/categoryLabels';
import type { CategoryResource, PlannedExpense, PlannedExpensePayload } from '../../../types/finance.types';
import styles from '../ComposerForm.module.css';

interface Values {
  name: string;
  amountEstimated: number | '';
  targetDate: string;
  planningType: PlannedExpensePayload['planning_type'];
  status: PlannedExpensePayload['status'];
  categoryId: string;
  subcategoryId: string;
  notes: string;
  autoDebit: boolean;
}

const emptyValues: Values = {
  name: '',
  amountEstimated: '',
  targetDate: '',
  planningType: 'mandatory_one_off',
  status: 'planned',
  categoryId: '',
  subcategoryId: '',
  notes: '',
  autoDebit: false,
};

const valuesFromExpense = (expense: PlannedExpense | null): Values => {
  if (!expense) {
    return emptyValues;
  }

  return {
    name: expense.attributes.name,
    amountEstimated: expense.attributes.amount_estimated,
    targetDate: expense.attributes.target_date,
    planningType: expense.attributes.planning_type,
    status: expense.attributes.status,
    categoryId: expense.attributes.category_id ? String(expense.attributes.category_id) : '',
    subcategoryId: expense.attributes.subcategory_id ? String(expense.attributes.subcategory_id) : '',
    notes: expense.attributes.notes ?? '',
    autoDebit: Boolean(expense.attributes.sinking_fund?.auto_debit),
  };
};

export interface PlannedExpenseComposerProps {
  plannedExpense?: PlannedExpense | null;
  loading?: boolean;
  categories: CategoryResource[];
  onCreate: (payload: PlannedExpensePayload) => Promise<void>;
  onUpdate: (id: string, payload: Partial<PlannedExpensePayload>) => Promise<void>;
  onCancel?: () => void;
}

export const PlannedExpenseComposer = ({
  plannedExpense = null,
  loading,
  categories,
  onCreate,
  onUpdate,
  onCancel,
}: PlannedExpenseComposerProps) => {
  const [values, setValues] = useState<Values>(emptyValues);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(plannedExpense);
  const submitLabel = useMemo(() => (isEditing ? 'Guardar cambios' : 'Crear gasto planeado'), [isEditing]);
  const selectedCategory = useMemo(
    () => categories.find((category) => String(category.id) === values.categoryId) ?? null,
    [categories, values.categoryId],
  );
  const subcategoryOptions = useMemo(
    () =>
      (selectedCategory?.relationships?.subcategories?.data ?? []).map((subcategory) => ({
        label: subcategory.attributes?.name ?? 'Sin nombre',
        value: String(subcategory.id),
      })),
    [selectedCategory],
  );

  useEffect(() => {
    setValues(valuesFromExpense(plannedExpense));
    setError(null);
  }, [plannedExpense]);

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        label: getCategoryDisplayName({ name: category.attributes.name, code: category.attributes.code, type: category.attributes.category_type }),
        value: String(category.id),
      })),
    [categories],
  );

  const reset = () => {
    setValues(emptyValues);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!values.name.trim() || values.amountEstimated === '' || values.amountEstimated <= 0 || !values.targetDate || !values.categoryId || !values.subcategoryId) {
      setError('Completa nombre, monto, fecha objetivo, categoría y subcategoría.');
      return;
    }

    const payload: PlannedExpensePayload = {
      name: values.name.trim(),
      amount_estimated: Number(values.amountEstimated),
      target_date: values.targetDate,
      planning_type: values.planningType,
      status: values.status,
      category_id: Number(values.categoryId),
      subcategory_id: Number(values.subcategoryId),
      notes: values.notes.trim(),
      auto_debit: values.autoDebit,
    };

    setError(null);

    try {
      if (plannedExpense) {
        await onUpdate(plannedExpense.id, payload);
      } else {
        await onCreate(payload);
        reset();
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No fue posible guardar el gasto planeado.');
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
            <p className={styles.sectionEyebrow}>Planeación</p>
            <h3 className={styles.sectionTitle}>Gasto futuro previsible</h3>
          </div>
          <p className={styles.sectionText}>
            Úsalo para gastos que todavía no ocurrieron, no son mensuales fijos y tampoco deben nacer como transacción real.
          </p>
        </div>

        <div className={styles.grid}>
          <div className={styles.spanTwo}>
            <TextInput
              name="planned-expense-name"
              label="Nombre"
              value={values.name}
              onChange={(name) => setValues((current) => ({ ...current, name }))}
              required
            />
          </div>
          <NumberInput
            name="planned-expense-amount"
            label="Monto estimado"
            value={values.amountEstimated}
            onChange={(amountEstimated) => setValues((current) => ({ ...current, amountEstimated }))}
            format="currency"
            min={1}
            required
          />
          <DateInput
            name="planned-expense-target-date"
            label="Fecha objetivo"
            value={values.targetDate}
            onChange={(targetDate) => setValues((current) => ({ ...current, targetDate }))}
            required
          />
          <SelectInput
            name="planned-expense-type"
            label="Tipo de planeación"
            value={values.planningType}
            onChange={(planningType) =>
              setValues((current) => ({ ...current, planningType: planningType as PlannedExpensePayload['planning_type'] }))
            }
            options={[
              { label: 'Obligatorio puntual', value: 'mandatory_one_off' },
              { label: 'Mantenimiento irregular', value: 'irregular_maintenance' },
              { label: 'Deseo', value: 'wish' },
              { label: 'Compra planeada', value: 'planned_purchase' },
            ]}
            required
          />
          <SelectInput
            name="planned-expense-status"
            label="Estado"
            value={values.status}
            onChange={(status) => setValues((current) => ({ ...current, status: status as PlannedExpensePayload['status'] }))}
            options={[
              { label: 'Planeado', value: 'planned' },
              { label: 'Ejecutado', value: 'executed' },
              { label: 'Cancelado', value: 'cancelled' },
            ]}
            required
          />
          <SelectInput
            name="planned-expense-category"
            label="Categoría"
            value={values.categoryId}
            onChange={(categoryId) =>
              setValues((current) => ({
                ...current,
                categoryId: String(categoryId),
                subcategoryId: '',
              }))
            }
            options={categoryOptions}
            placeholder="Selecciona una categoría"
            required
          />
          <SelectInput
            name="planned-expense-subcategory"
            label="Subcategoría"
            value={values.subcategoryId}
            onChange={(subcategoryId) => setValues((current) => ({ ...current, subcategoryId: String(subcategoryId) }))}
            options={subcategoryOptions}
            placeholder={selectedCategory ? 'Selecciona una subcategoría' : 'Primero elige categoría'}
            disabled={!selectedCategory}
            required
          />
          <div className={styles.spanTwo}>
            <TextareaInput
              name="planned-expense-notes"
              label="Notas"
              value={values.notes}
              onChange={(notes) => setValues((current) => ({ ...current, notes }))}
              rows={4}
            />
          </div>
          <div className={styles.spanTwo}>
            <CheckboxInput
              name="planned-expense-auto-debit"
              label="Débito automático mensual (aparta la cuota en el bolsillo cada mes)"
              checked={values.autoDebit}
              onChange={(autoDebit) => setValues((current) => ({ ...current, autoDebit }))}
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
