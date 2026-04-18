import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../atoms/Button';
import { DateInput } from '../../atoms/DateInput';
import { NumberInput } from '../../atoms/NumberInput';
import { SelectInput } from '../../atoms/SelectInput';
import { TextInput } from '../../atoms/TextInput';
import type {
  Transaction,
  TransactionCreatePayload,
  TransactionStatus,
  TransactionType,
  TransactionUpdatePayload,
} from '../../../types/finance.types';
import styles from './TransactionComposer.module.css';

const transactionTypeOptions = [
  { label: 'Gasto', value: 'expense' },
  { label: 'Ingreso', value: 'income' },
];

const transactionStatusOptions = [
  { label: 'Confirmada', value: 'confirmed' },
  { label: 'Pendiente', value: 'pending' },
];

interface TransactionComposerValues {
  date: string;
  concept: string;
  product: string;
  amount: number | '';
  transactionType: TransactionType;
  status: TransactionStatus;
}

const emptyValues: TransactionComposerValues = {
  date: '',
  concept: '',
  product: '',
  amount: '',
  transactionType: 'expense',
  status: 'confirmed',
};

const toInputDate = (value: string) => {
  if (!value) {
    return '';
  }

  const parts = value.split('/');
  if (parts.length !== 3) {
    return value;
  }

  return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
};

const toApiDate = (value: string) => {
  if (!value) {
    return '';
  }

  const parts = value.split('-');
  if (parts.length !== 3) {
    return value;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const valuesFromTransaction = (transaction: Transaction | null): TransactionComposerValues => {
  if (!transaction) {
    return emptyValues;
  }

  return {
    date: toInputDate(transaction.attributes.date),
    concept: transaction.attributes.concept,
    product: transaction.attributes.product,
    amount: transaction.attributes.amount,
    transactionType: transaction.attributes.transaction_type ?? 'expense',
    status: transaction.attributes.status ?? 'confirmed',
  };
};

export interface TransactionComposerProps {
  transaction?: Transaction | null;
  loading?: boolean;
  onCreate: (payload: TransactionCreatePayload) => Promise<void>;
  onUpdate: (id: string, payload: TransactionUpdatePayload) => Promise<void>;
  onCancel?: () => void;
}

export const TransactionComposer = ({
  transaction = null,
  loading,
  onCreate,
  onUpdate,
  onCancel,
}: TransactionComposerProps) => {
  const [values, setValues] = useState<TransactionComposerValues>(emptyValues);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(transaction);
  const submitLabel = useMemo(() => (isEditing ? 'Guardar cambios' : 'Crear transacción'), [isEditing]);

  useEffect(() => {
    setValues(valuesFromTransaction(transaction));
    setError(null);
  }, [transaction]);

  const reset = () => {
    setValues(emptyValues);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!values.date || !values.concept.trim() || !values.product.trim() || values.amount === '' || values.amount <= 0) {
      setError('Completa fecha, concepto, producto y un monto mayor a cero.');
      return;
    }

    setError(null);

    const basePayload = {
      date: toApiDate(values.date),
      concept: values.concept.trim(),
      product: values.product.trim(),
      amount: Number(values.amount),
      status: values.status,
      source: 'manual' as const,
    };

    try {
      if (transaction) {
        await onUpdate(transaction.id, basePayload);
      } else {
        await onCreate({
          ...basePayload,
          transaction_type: values.transactionType,
        });
        reset();
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No fue posible guardar la transacción.');
    }
  };

  const handleCancel = () => {
    reset();
    onCancel?.();
  };

  return (
    <section className={styles.panel}>
      <div className={styles.grid}>
        <DateInput
          name="transaction-date"
          label="Fecha"
          value={values.date}
          onChange={(date) => setValues((current) => ({ ...current, date }))}
          required
        />
        <SelectInput
          name="transaction-type"
          label="Tipo"
          value={values.transactionType}
          onChange={(transactionType) =>
            setValues((current) => ({ ...current, transactionType: transactionType as TransactionType }))
          }
          options={transactionTypeOptions}
          disabled={isEditing}
          required
        />
        <SelectInput
          name="transaction-status"
          label="Estado"
          value={values.status}
          onChange={(status) => setValues((current) => ({ ...current, status: status as TransactionStatus }))}
          options={transactionStatusOptions}
          required
        />
        <NumberInput
          name="transaction-amount"
          label="Monto"
          value={values.amount}
          onChange={(amount) => setValues((current) => ({ ...current, amount }))}
          format="currency"
          min={1}
          required
        />
        <div className={styles.spanTwo}>
          <TextInput
            name="transaction-concept"
            label="Concepto"
            value={values.concept}
            onChange={(concept) => setValues((current) => ({ ...current, concept }))}
            placeholder="Ej. pago suscripción, mercado, ingreso cliente"
            required
          />
        </div>
        <div className={styles.spanTwo}>
          <TextInput
            name="transaction-product"
            label="Producto"
            value={values.product}
            onChange={(product) => setValues((current) => ({ ...current, product }))}
            placeholder="Ej. Nequi, débito, TC LifeMiles"
            required
          />
        </div>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.actions}>
        <Button label="Cancelar" variant="ghost" onClick={handleCancel} disabled={loading} />
        <Button
          label={submitLabel}
          onClick={() => void handleSubmit()}
          loading={loading}
        />
      </div>
    </section>
  );
};
