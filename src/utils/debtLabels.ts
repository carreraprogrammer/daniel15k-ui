export const debtTypeOptions = [
  { label: 'Tarjeta de crédito', value: 'credit_card' },
  { label: 'Préstamo personal', value: 'personal_loan' },
  { label: 'Familiar', value: 'family' },
  { label: 'Hipoteca', value: 'mortgage' },
];

export const debtStatusOptions = [
  { label: 'Activa', value: 'active' },
  { label: 'Pagada', value: 'paid_off' },
  { label: 'Pausada', value: 'paused' },
  { label: 'En disputa', value: 'disputed' },
];

const humanizeCode = (value: string) =>
  value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const formatDebtType = (value?: string | null) => {
  if (!value) return 'Sin tipo';
  return debtTypeOptions.find((option) => option.value === value)?.label ?? humanizeCode(value);
};

export const formatDebtStatus = (value?: string | null) => {
  if (!value) return 'Sin estado';
  return debtStatusOptions.find((option) => option.value === value)?.label ?? humanizeCode(value);
};
