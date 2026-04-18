import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../atoms/Button';
import { NumberInput } from '../../atoms/NumberInput';
import { SelectInput } from '../../atoms/SelectInput';
import { TextInput } from '../../atoms/TextInput';
import type { IncomeSource, IncomeSourcePayload } from '../../../types/finance.types';
import {
  amountLabelForCadence,
  BIWEEKLY_DAY_OPTIONS,
  buildIncomeSchedules,
  INCOME_CADENCE_OPTIONS,
  INCOME_CLASSIFICATION_OPTIONS,
  MONTHLY_WINDOW_OPTIONS,
  monthlyTotalFromAmount,
  RELIABILITY_OPTIONS,
  inferWindowKey,
} from '../../../utils/incomeProfile';
import styles from './IncomeSourceComposer.module.css';

interface Values {
  name: string;
  expectedAmount: number | '';
  cadence: 'monthly' | 'biweekly' | 'weekly' | 'irregular';
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
  const schedules = source.attributes.schedules ?? [];
  const primarySchedule = schedules[0];
  const scheduleAnchor = (dayFrom?: number, dayTo?: number) =>
    dayFrom && dayTo ? Math.round((dayFrom + dayTo) / 2) : undefined;
  const inferredWindow = inferWindowKey(
    primarySchedule?.expected_day_from ?? source.attributes.expected_day_from,
    primarySchedule?.expected_day_to ?? source.attributes.expected_day_to,
  ) ?? 'mid';
  return {
    name: source.attributes.name,
    expectedAmount: cadence === 'biweekly'
      ? Math.round(source.attributes.expected_amount / 2)
      : cadence === 'weekly'
        ? Math.round(source.attributes.expected_amount / 4)
        : source.attributes.expected_amount,
    cadence,
    windowKey: inferredWindow,
    biweeklyDay1: scheduleAnchor(primarySchedule?.expected_day_from, primarySchedule?.expected_day_to) ?? source.attributes.expected_day_from,
    biweeklyDay2: scheduleAnchor(schedules[1]?.expected_day_from, schedules[1]?.expected_day_to) ?? source.attributes.expected_day_to,
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
  const amountLabel = useMemo(() => amountLabelForCadence(values.cadence), [values.cadence]);
  const monthlyExpected = useMemo(
    () => (values.expectedAmount === '' ? null : monthlyTotalFromAmount(values.cadence, Number(values.expectedAmount))),
    [values.cadence, values.expectedAmount],
  );

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

    const eventAmount = Number(values.expectedAmount);
    const schedules = buildIncomeSchedules(values.cadence, eventAmount, {
      windowKey: values.windowKey,
      biweeklyDay1: values.biweeklyDay1 === '' ? undefined : Number(values.biweeklyDay1),
      biweeklyDay2: values.biweeklyDay2 === '' ? undefined : Number(values.biweeklyDay2),
    });
    const dayFrom = Math.min(...schedules.map((schedule) => schedule.expected_day_from));
    const dayTo = Math.max(...schedules.map((schedule) => schedule.expected_day_to));
    const monthlyTotal = monthlyTotalFromAmount(values.cadence, eventAmount);

    const payload: IncomeSourcePayload = {
      name: values.name.trim(),
      expected_amount: monthlyTotal,
      expected_day_from: dayFrom,
      expected_day_to: dayTo,
      classification: values.classification,
      cadence: values.cadence,
      reliability_score: values.classification === 'base' ? 100 : Number(values.reliabilityScore || 50),
      is_variable: values.classification !== 'base',
      schedules,
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
          label={amountLabel}
          value={values.expectedAmount}
          onChange={(expectedAmount) => setValues((v) => ({ ...v, expectedAmount }))}
          format="currency"
          prefix="$"
          min={0}
          required
        />
        {(values.cadence === 'biweekly' || values.cadence === 'weekly') && monthlyExpected ? (
          <p className={[styles.hint, styles.spanTwo].join(' ')}>
            Total mensual esperado calculado: <strong>${monthlyExpected.toLocaleString('es-CO')}</strong>
          </p>
        ) : null}
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
        ) : null}
        {values.cadence === 'monthly' ? (
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
        ) : null}
        {values.cadence === 'irregular' ? (
          <p className={[styles.hint, styles.spanTwo].join(' ')}>
            Los ingresos irregulares se guardan con ventana de mes completo.
          </p>
        ) : null}
        {values.cadence === 'biweekly' ? (
          <p className={[styles.hint, styles.spanTwo].join(' ')}>
            Escribe el valor de cada quincena. El sistema sumará ambas para proyectar el total mensual.
          </p>
        ) : null}
        {values.cadence === 'weekly' ? (
          <p className={[styles.hint, styles.spanTwo].join(' ')}>
            Escribe el valor que suele llegar cada semana. El total mensual se calcula internamente.
          </p>
        ) : null}
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
