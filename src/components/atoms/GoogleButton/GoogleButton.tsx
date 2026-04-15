import type { ButtonHTMLAttributes } from 'react';
import styles from './GoogleButton.module.css';

export interface GoogleButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  label?: string;
}

const GoogleIcon = () => (
  <svg
    aria-hidden="true"
    className={styles.icon}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 10.2v3.9h5.4c-.2 1.2-.9 2.2-1.9 2.9v2.4h3.1c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.4-.2-2.1H12Z" className={styles.googleBlue} />
    <path d="M12 21c2.6 0 4.8-.9 6.4-2.4l-3.1-2.4c-.9.6-2 .9-3.3.9-2.5 0-4.7-1.7-5.5-4h-3.2v2.5A9.7 9.7 0 0 0 12 21Z" className={styles.googleGreen} />
    <path d="M6.5 13.1A5.8 5.8 0 0 1 6.2 12c0-.4.1-.8.2-1.1V8.4H3.2A9.1 9.1 0 0 0 2.2 12c0 1.4.3 2.8 1 4l3.3-2.9Z" className={styles.googleYellow} />
    <path d="M12 6.8c1.4 0 2.7.5 3.7 1.4l2.8-2.8A9.5 9.5 0 0 0 12 3a9.7 9.7 0 0 0-8.8 5.4l3.2 2.5c.8-2.4 3-4.1 5.6-4.1Z" className={styles.googleRed} />
  </svg>
);

export const GoogleButton = ({ label = 'Continuar con Google', className, disabled, ...props }: GoogleButtonProps) => (
  <button type="button" className={[styles.button, className].filter(Boolean).join(' ')} disabled={disabled} {...props}>
    <span className={styles.content}>
      <GoogleIcon />
      <span>{label}</span>
    </span>
  </button>
);
