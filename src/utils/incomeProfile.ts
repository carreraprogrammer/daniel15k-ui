import type { IncomeSource } from '../types/finance.types';

export type IncomeClassification = 'base' | 'variable' | 'seasonal' | 'one_time';
export type IncomeCadence = 'monthly' | 'biweekly' | 'irregular';
export type IncomeWindowKey = 'early' | 'week1' | 'q1' | 'mid' | 'q2' | 'late';

export const INCOME_CLASSIFICATION_OPTIONS = [
  { label: 'Base confiable', value: 'base' },
  { label: 'Variable', value: 'variable' },
  { label: 'Estacional', value: 'seasonal' },
  { label: 'Una sola vez', value: 'one_time' },
];

export const INCOME_CADENCE_OPTIONS = [
  { label: 'Mensual — una vez al mes', value: 'monthly' },
  { label: 'Quincenal — dos pagos al mes', value: 'biweekly' },
  { label: 'Irregular — sin fecha fija', value: 'irregular' },
];

export const RELIABILITY_OPTIONS = [
  { label: '25% — muy incierto', value: 25 },
  { label: '50% — la mitad de los meses', value: 50 },
  { label: '75% — casi siempre llega', value: 75 },
  { label: '100% — siempre llega', value: 100 },
];

export const MONTHLY_WINDOWS: Record<IncomeWindowKey, { label: string; dayFrom: number; dayTo: number }> = {
  early: { label: 'Inicio de mes (días 1-5)', dayFrom: 1, dayTo: 5 },
  week1: { label: 'Primera semana (días 1-7)', dayFrom: 1, dayTo: 7 },
  q1: { label: 'Primera quincena (días 1-15)', dayFrom: 1, dayTo: 15 },
  mid: { label: 'Mediados de mes (días 10-20)', dayFrom: 10, dayTo: 20 },
  q2: { label: 'Segunda quincena (días 15-31)', dayFrom: 15, dayTo: 31 },
  late: { label: 'Fin de mes (días 25-31)', dayFrom: 25, dayTo: 31 },
};

export const MONTHLY_WINDOW_OPTIONS = (Object.entries(MONTHLY_WINDOWS) as [IncomeWindowKey, { label: string }][]).map(
  ([value, config]) => ({ value, label: config.label }),
);

export const BIWEEKLY_DAY_OPTIONS = [1, 5, 10, 15, 20, 25, 30].map((day) => ({ label: `Día ${day}`, value: day }));

export const cadenceLabel = (cadence?: string | null) => {
  switch (cadence) {
    case 'monthly':
      return 'Mensual';
    case 'biweekly':
      return 'Quincenal';
    case 'irregular':
      return 'Irregular';
    default:
      return 'Sin definir';
  }
};

export const classificationLabel = (classification?: string | null, isVariable?: boolean) => {
  const normalized = classification ?? (isVariable ? 'variable' : 'base');
  switch (normalized) {
    case 'base':
      return 'Base';
    case 'variable':
      return 'Variable';
    case 'seasonal':
      return 'Estacional';
    case 'one_time':
      return 'Una vez';
    default:
      return 'Sin clasificar';
  }
};

export const reliabilityLabel = (score?: number | null) => {
  if (typeof score !== 'number') return 'Sin confirmar';
  if (score >= 100) return 'Muy confiable';
  if (score >= 75) return 'Casi siempre llega';
  if (score >= 50) return 'Llega a veces';
  return 'Alta incertidumbre';
};

export const dayWindow = (day: number) => ({
  dayFrom: Math.max(1, day - 2),
  dayTo: Math.min(31, day + 2),
});

export const windowRange = (key: IncomeWindowKey) => MONTHLY_WINDOWS[key];

export const inferWindowKey = (dayFrom: number, dayTo: number): IncomeWindowKey | null => {
  const match = (Object.entries(MONTHLY_WINDOWS) as [IncomeWindowKey, { dayFrom: number; dayTo: number }][])
    .find(([, config]) => config.dayFrom === dayFrom && config.dayTo === dayTo);
  return match?.[0] ?? null;
};

export const incomeWindowLabel = (source: IncomeSource['attributes']) => {
  const key = inferWindowKey(source.expected_day_from, source.expected_day_to);
  if (key) return MONTHLY_WINDOWS[key].label;
  return `Días ${source.expected_day_from}-${source.expected_day_to}`;
};
