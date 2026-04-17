import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../atoms/Button';
import { NumberInput } from '../../atoms/NumberInput';
import { SelectInput } from '../../atoms/SelectInput';
import { TextInput } from '../../atoms/TextInput';
import type { IncomeSource, IncomeSourcePayload } from '../../../types/finance.types';
import {
  BIWEEKLY_DAY_OPTIONS,
  INCOME_CADENCE_OPTIONS,
  INCOME_CLASSIFICATION_OPTIONS,
  MONTHLY_WINDOW_OPTIONS,
  RELIABILITY_OPTIONS,
  dayWindow,
  inferWindowKey,
  windowRange,
} from '../../../utils/incomeProfile';
import styles from './IncomeSourceComposer.module.css';

interface Values {
  name: string;
  expectedAmount: number | '';
  cadence: 'monthly' | 'biweekly' | 'irregular';
  windowKey: 'early' | 'week1' | 'q1' | 'mid' | 'q2' | 'late';
  biweeklyDay1: number | '';
  biweeklyDay2: number | '';
  classification: 'base' | 'variable' | 'seasonal' | 'one_time';
  reliabilityScore: number | '';
}

const emptyValues: Values = {
  name: '',
  expectedAmount: '',
  cadence: 'monthly',
  windowKey: 'q2',
  biweeklyDay1: 5,
  biweeklyDay2: 20,
  classification: 'base',
  reliabilityScore: 100,
};

const fromSource = (source: IncomeSource | null): Values => {
  if (!source) return emptyValues;
  const cadence = source.attributes.cadence ?? 'monthly';
  const inferredWindow = inferWindowKey(source.attributes.expected_day_from, source.attributes.expected_day_to) ?? 'mid';
  return {
    name: source.attributes.name,
    expectedAmount: source.attributes.expected_amount,
    cadence,
    windowKey: inferredWindow,
    biweeklyDay1: source.attributes.expected_day_from,
    biweeklyDay2: source.attributes.expected_day_to,
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
    if (values.cadence === 'biweekly' && (values.biweeklyDay1 === '' || values.biweeklyDay2 === '' || values.biweeklyDay1 === values.biweeklyDay2)) {
      setError('Configura dos días distintos para el ingreso quincenal.');
      return;
    }

    const range = values.cadence === 'biweekly'
      ? dayWindow(Number(values.biweeklyDay1))
      : values.cadence === 'irregular'
        ? { dayFrom: 1, dayTo: 31 }
        : windowRange(values.windowKey);

    const payload: IncomeSourcePayload = {
      name: values.name.trim(),
      expected_amount: Number(values.expectedAmount),
      expected_day_from: range.dayFrom,
      expected_day_to: range.dayTo,
      classification: values.classification,
      cadence: values.cadence,
      reliability_score: values.classification === 'base' ? 100 : Number(values.reliabilityScore || 50),
      is_variable: values.classification !== 'base',
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
          label="Clasificación"
          value={values.classification}
          onChange={(classification) =>
            setValues((v) => ({ ...v, classification: String(classification) as Values['classification'] }))
          }
          options={INCOME_CLASSIFICATION_OPTIONS}
          required
        />
        <SelectInput
          name="income-cadence"
          label="Cadencia"
          value={values.cadence}
          onChange={(cadence) => setValues((v) => ({ ...v, cadence: String(cadence) as Values['cadence'] }))}
          options={INCOME_CADENCE_OPTIONS}
          required
        />
        {values.cadence === 'biweekly' ? (
          <>
            <SelectInput
              name="income-day-first"
              label="Primer pago"
              value={values.biweeklyDay1}
              onChange={(day) => setValues((v) => ({ ...v, biweeklyDay1: Number(day) }))}
              options={BIWEEKLY_DAY_OPTIONS}
              required
            />
            <SelectInput
              name="income-day-second"
              label="Segundo pago"
              value={values.biweeklyDay2}
              onChange={(day) => setValues((v) => ({ ...v, biweeklyDay2: Number(day) }))}
              options={BIWEEKLY_DAY_OPTIONS}
              required
            />
          </>
        ) : values.cadence === 'monthly' ? (
          <div className={styles.spanTwo}>
            <SelectInput
              name="income-window"
              label="Ventana esperada"
              value={values.windowKey}
              onChange={(windowKey) => setValues((v) => ({ ...v, windowKey: String(windowKey) as Values['windowKey'] }))}
              options={MONTHLY_WINDOW_OPTIONS}
              required
            />
          </div>
        ) : (
          <p className={[styles.hint, styles.spanTwo].join(' ')}>
            Los ingresos irregulares se guardan con ventana de mes completo.
          </p>
        )}
        {values.classification !== 'base' && (
          <div className={styles.spanTwo}>
            <SelectInput
              name="income-reliability"
              label="¿Qué tan seguido llega?"
              value={values.reliabilityScore}
              onChange={(r) => setValues((v) => ({ ...v, reliabilityScore: Number(r) }))}
              options={RELIABILITY_OPTIONS}
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
