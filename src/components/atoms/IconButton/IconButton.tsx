import type { ReactNode } from 'react';
import styles from './IconButton.module.css';

export interface IconButtonProps {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
}

export const IconButton = ({ label, icon, onClick, variant = 'ghost', disabled }: IconButtonProps) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    disabled={disabled}
    className={[styles.button, styles[variant]].filter(Boolean).join(' ')}
  >
    {icon}
  </button>
);
