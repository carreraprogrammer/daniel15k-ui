import type { ReactNode } from 'react';
import styles from './Badge.module.css';

export type BadgeVariant = 'brand' | 'success' | 'warning' | 'error' | 'neutral';
export type BadgeStatus = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  status?: BadgeStatus;
  icon?: ReactNode;
  title?: string;
  onRemove?: () => void;
  size?: 'sm' | 'md';
}

const statusToVariant: Record<BadgeStatus, BadgeVariant> = {
  info: 'brand',
  success: 'success',
  warning: 'warning',
  danger: 'error',
  neutral: 'neutral',
};

export const Badge = ({
  label,
  variant,
  status = 'neutral',
  icon,
  title,
  onRemove,
  size = 'md',
}: BadgeProps) => {
  const resolvedVariant = variant ?? statusToVariant[status];

  return (
    <span className={[styles.badge, styles[resolvedVariant], styles[size]].join(' ')} title={title}>
      {icon ? <span className={styles.icon} aria-hidden="true">{icon}</span> : null}
      <span className={styles.label}>{label}</span>
      {onRemove ? (
        <button
          type="button"
          className={styles.removeButton}
          aria-label={`Quitar ${label}`}
          onClick={onRemove}
        >
          ×
        </button>
      ) : null}
    </span>
  );
};
