import styles from './CurrencyValue.module.css';
import { formatCurrency, type CurrencyDisplayMode } from '../../../utils/formatCurrency';

export interface CurrencyValueProps {
  amount: number;
  currency?: string;
  locale?: string;
  mode?: CurrencyDisplayMode;
  className?: string;
  exactOnHover?: boolean;
}

export const CurrencyValue = ({
  amount,
  currency = 'COP',
  locale = 'es-CO',
  mode = 'full',
  className,
  exactOnHover = true,
}: CurrencyValueProps) => {
  const visibleValue = formatCurrency(amount, { currency, locale, mode });
  const exactValue = exactOnHover
    ? formatCurrency(amount, { currency, locale, mode: 'full' })
    : undefined;

  return (
    <span
      className={[styles.value, className].filter(Boolean).join(' ')}
      title={exactValue}
      aria-label={exactValue ?? visibleValue}
    >
      {visibleValue}
    </span>
  );
};
