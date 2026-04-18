import type { IncomeSource, IncomeSourceSchedule } from '../types/finance.types';

export type IncomeClassification = 'base' | 'variable' | 'seasonal' | 'one_time';
export type IncomeCadence = 'monthly' | 'biweekly' | 'weekly' | 'irregular';
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
  { label: 'Semanal — cuatro ventanas al mes', value: 'weekly' },
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
    case 'weekly':
      return 'Semanal';
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

export const WEEKLY_WINDOWS: IncomeSourceSchedule[] = [
  { ordinal: 1, label: 'Semana 1', expected_day_from: 1, expected_day_to: 7, expected_amount: 0 },
  { ordinal: 2, label: 'Semana 2', expected_day_from: 8, expected_day_to: 14, expected_amount: 0 },
  { ordinal: 3, label: 'Semana 3', expected_day_from: 15, expected_day_to: 21, expected_amount: 0 },
  { ordinal: 4, label: 'Semana 4', expected_day_from: 22, expected_day_to: 31, expected_amount: 0 },
];

export const windowRange = (key: IncomeWindowKey) => MONTHLY_WINDOWS[key];

export const inferWindowKey = (dayFrom: number, dayTo: number): IncomeWindowKey | null => {
  const match = (Object.entries(MONTHLY_WINDOWS) as [IncomeWindowKey, { dayFrom: number; dayTo: number }][])
    .find(([, config]) => config.dayFrom === dayFrom && config.dayTo === dayTo);
  return match?.[0] ?? null;
};

export const incomeWindowLabel = (source: IncomeSource['attributes']) => {
  const schedules = source.schedules ?? [];
  if (schedules.length > 1) {
    return schedules
      .map((schedule) => scheduleLabel(schedule))
      .join(' · ');
  }

  const [singleSchedule] = schedules;
  const dayFrom = singleSchedule?.expected_day_from ?? source.expected_day_from;
  const dayTo = singleSchedule?.expected_day_to ?? source.expected_day_to;
  const key = inferWindowKey(dayFrom, dayTo);
  if (key) return MONTHLY_WINDOWS[key].label;
  return `Días ${dayFrom}-${dayTo}`;
};

export const scheduleLabel = (schedule: Pick<IncomeSourceSchedule, 'label' | 'expected_day_from' | 'expected_day_to'>) => {
  const key = inferWindowKey(schedule.expected_day_from, schedule.expected_day_to);
  if (key) return schedule.label ?? MONTHLY_WINDOWS[key].label;
  return schedule.label ? `${schedule.label} (${schedule.expected_day_from}-${schedule.expected_day_to})` : `Días ${schedule.expected_day_from}-${schedule.expected_day_to}`;
};

export const buildIncomeSchedules = (
  cadence: IncomeCadence,
  amount: number,
  options: {
    windowKey?: IncomeWindowKey;
    biweeklyDay1?: number;
    biweeklyDay2?: number;
  } = {},
): IncomeSourceSchedule[] => {
  if (cadence === 'biweekly') {
    const firstDay = options.biweeklyDay1 ?? 5;
    const secondDay = options.biweeklyDay2 ?? 20;
    const firstWindow = dayWindow(firstDay);
    const secondWindow = dayWindow(secondDay);
    return [
      {
        ordinal: 1,
        label: 'Quincena 1',
        expected_day_from: firstWindow.dayFrom,
        expected_day_to: firstWindow.dayTo,
        expected_amount: amount,
      },
      {
        ordinal: 2,
        label: 'Quincena 2',
        expected_day_from: secondWindow.dayFrom,
        expected_day_to: secondWindow.dayTo,
        expected_amount: amount,
      },
    ];
  }

  if (cadence === 'weekly') {
    return WEEKLY_WINDOWS.map((window) => ({
      ...window,
      expected_amount: amount,
    }));
  }

  const range = cadence === 'irregular'
    ? { dayFrom: 1, dayTo: 31 }
    : windowRange(options.windowKey ?? 'mid');

  return [
    {
      ordinal: 1,
      label: cadence === 'irregular' ? 'Mes completo' : 'Ventana principal',
      expected_day_from: range.dayFrom,
      expected_day_to: range.dayTo,
      expected_amount: amount,
    },
  ];
};

export const monthlyTotalFromAmount = (cadence: IncomeCadence, amount: number) => {
  if (cadence === 'biweekly') return amount * 2;
  if (cadence === 'weekly') return amount * 4;
  return amount;
};

export const amountLabelForCadence = (cadence: IncomeCadence) => {
  switch (cadence) {
    case 'biweekly':
      return 'Monto por quincena';
    case 'weekly':
      return 'Monto por semana';
    case 'irregular':
      return 'Monto cuando llega';
    default:
      return 'Monto total mensual';
  }
};
