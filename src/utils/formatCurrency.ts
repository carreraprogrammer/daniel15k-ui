export type CurrencyDisplayMode = 'full' | 'compact';

export interface FormatCurrencyOptions {
  currency?: string;
  locale?: string;
  mode?: CurrencyDisplayMode;
}

const DEFAULT_LOCALE = 'es-CO';
const DEFAULT_CURRENCY = 'COP';

export const formatCurrency = (
  amount: number,
  {
    currency = DEFAULT_CURRENCY,
    locale = DEFAULT_LOCALE,
    mode = 'full',
  }: FormatCurrencyOptions = {},
): string => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  if (mode === 'compact') {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: safeAmount >= 1_000_000 ? 1 : 0,
    }).format(safeAmount);
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(safeAmount);
};
