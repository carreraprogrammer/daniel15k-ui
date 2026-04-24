export type CurrencyDisplayMode = 'full' | 'compact';

export interface FormatCurrencyOptions {
  currency?: string;
  locale?: string;
  mode?: CurrencyDisplayMode;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

const DEFAULT_LOCALE = 'es-CO';
const DEFAULT_CURRENCY = 'COP';

export const formatCurrency = (
  amount: number,
  {
    currency = DEFAULT_CURRENCY,
    locale = DEFAULT_LOCALE,
    mode = 'full',
    minimumFractionDigits,
    maximumFractionDigits,
  }: FormatCurrencyOptions = {},
): string => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const resolvedMaximumFractionDigits = maximumFractionDigits ?? (mode === 'compact' ? 2 : 0);
  const resolvedMinimumFractionDigits = minimumFractionDigits ?? 0;

  if (mode === 'compact') {
    const compactValue = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation: 'compact',
      compactDisplay: 'short',
      minimumFractionDigits: resolvedMinimumFractionDigits,
      maximumFractionDigits: resolvedMaximumFractionDigits,
    }).format(safeAmount);

    return locale.startsWith('es')
      ? compactValue.replace(/\bK\b/gu, 'mil')
      : compactValue;
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: resolvedMinimumFractionDigits,
    maximumFractionDigits: resolvedMaximumFractionDigits,
  }).format(safeAmount);
};

export const formatCurrencyCompact = (
  amount: number,
  options: Omit<FormatCurrencyOptions, 'mode'> = {},
): string =>
  formatCurrency(amount, {
    ...options,
    mode: 'compact',
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  });

export const formatCurrencyFull = (
  amount: number,
  options: Omit<FormatCurrencyOptions, 'mode'> = {},
): string =>
  formatCurrency(amount, {
    ...options,
    mode: 'full',
    maximumFractionDigits: options.maximumFractionDigits ?? 0,
  });
