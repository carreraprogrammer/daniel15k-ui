import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../atoms/Button';
import { NumberInput } from '../../atoms/NumberInput';
import { SelectInput } from '../../atoms/SelectInput';
import { TextInput } from '../../atoms/TextInput';
import type { IncomeSource, IncomeSourcePayload } from '../../../types/finance.types';
import styles from './IncomeSourceComposer.module.css';

const classificationOptions = [
  { label: 'Base (ingreso fijo, confiable)', value: 'base' },
  { label: 'Variable (freelance, comisiones)', value: 'variable' },
];

const reliabilityOptions = [
  { label: '25% — muy incierto', value: 25 },
  { label: '50% — la mitad de las veces', value: 50 },
  { label: '75% — casi siempre llega', value: 75 },
  { label: '100% — siempre llega', value: 100 },
];

interface Values {
  name: string;
  expectedAmount: number | '';
  expectedDayFrom: number | '';
  expectedDayTo: number | '';
  classification: 'base' | 'variable';
  reliabilityScore: number | '';
}

const emptyValues: Values = {
  name: '',
  expectedAmount: '',
  expectedDayFrom: '',
  expectedDayTo: '',
  classification: 'base',
  reliabilityScore: 100,
};

const fromSource = (source: IncomeSource | null): Values => {
  if (!source) return emptyValues;
  return {
    name: source.attributes.name,
    expectedAmount: source.attributes.expected_amount,
    expectedDayFrom: source.attributes.expected_day_from,
    expectedDayTo: source.attributes.expected_day_to,
    classification: source.attributes.classification ?? (source.attributes.is_variable ? 'variable' : 'base'),
    reliabilityScore: source.attributes.reliability_score ?? 100,
  };
};

export interface IncomeSourceComposerProps {
  source?: IncomeSource | null;
  loading?: boolean;
  onCreate: (payload: IncomeSourcePayload) => Promise<void>;
  onUpdate: (id: string, payload: Partial<IncomeSourcePayload>) => Promise<void>;
  onCancel?: () => void;
}

export const IncomeSourceComposer = ({ source = null, loading, onCreate, onUpdate, onCancel }: IncomeSourceComposerProps) => {
  const [values, setValues] = useState<Values>(emptyValues);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(source);
  const submitLabel = useMemo(() => (isEditing ? 'Guardar cambios' : 'Agregar ingreso'), [isEditing]);

  useEffect(() => {
    setValues(fromSource(source));
    setError(null);
  }, [source]);

  const reset = () => {
    setValues(emptyValues);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!values.name.trim() || values.expectedAmount === '' || values.expectedAmount <= 0) {
      setError('Completa el nombre y el monto con valores válidos.');
      return;
    }
    if (values.expectedDayFrom === '' || values.expectedDayTo === '') {
      setError('Indica el rango de días en que suele llegar este ingreso.');
      return;
    }

    const payload: IncomeSourcePayload = {
      name: values.name.trim(),
      expected_amount: Number(values.expectedAmount),
      expected_day_from: Number(values.expectedDayFrom),
      expected_day_to: Number(values.expectedDayTo),
      classification: values.classification,
      reliability_score: values.classification === 'variable' ? Number(values.reliabilityScore || 50) : 100,
      is_variable: values.classification === 'variable',
    };

    setError(null);

    try {
      if (source) {
        await onUpdate(source.id, payload);
      } else {
        await onCreate(payload);
        reset();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible guardar el ingreso.');
    }
  };

  return (
    <section className={styles.panel}>
      <div className={styles.grid}>
        <div className={styles.spanTwo}>
          <TextInput
            name="income-name"
            label="Nombre"
            value={values.name}
            onChange={(name) => setValues((v) => ({ ...v, name }))}
            placeholder="Ej. Salario EMAPTA, Freelance 525"
            required
          />
        </div>
        <NumberInput
          name="income-amount"
          label="Monto esperado"
          value={values.expectedAmount}
          onChange={(expectedAmount) => setValues((v) => ({ ...v, expectedAmount }))}
          format="currency"
          prefix="$"
          min={0}
          required
        />
        <SelectInput
          name="income-classification"
          label="Tipo"
          value={values.classification}
          onChange={(c) => setValues((v) => ({ ...v, classification: String(c) as 'base' | 'variable' }))}
          options={classificationOptions}
          required
        />
        <NumberInput
          name="income-day-from"
          label="Llega desde el día"
          value={values.expectedDayFrom}
          onChange={(expectedDayFrom) => setValues((v) => ({ ...v, expectedDayFrom }))}
          format="integer"
          min={1}
          max={31}
          required
        />
        <NumberInput
          name="income-day-to"
          label="Hasta el día"
          value={values.expectedDayTo}
          onChange={(expectedDayTo) => setValues((v) => ({ ...v, expectedDayTo }))}
          format="integer"
          min={1}
          max={31}
          required
        />
        {values.classification === 'variable' && (
          <div className={styles.spanTwo}>
            <SelectInput
              name="income-reliability"
              label="¿Qué tan seguido llega?"
              value={values.reliabilityScore}
              onChange={(r) => setValues((v) => ({ ...v, reliabilityScore: Number(r) }))}
              options={reliabilityOptions}
            />
          </div>
        )}
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.actions}>
        <Button label="Cancelar" variant="ghost" onClick={onCancel ?? reset} disabled={loading} />
        <Button label={submitLabel} onClick={() => void handleSubmit()} loading={loading} />
      </div>
    </section>
  );
};
