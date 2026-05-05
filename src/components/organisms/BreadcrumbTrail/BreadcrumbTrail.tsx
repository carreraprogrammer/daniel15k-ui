import { Link } from 'react-router-dom';
import styles from './BreadcrumbTrail.module.css';

export type BreadcrumbItem = {
  label: string;
  to?: string;
  onClick?: () => void;
};

type BreadcrumbTrailProps = {
  items: BreadcrumbItem[];
};

export const BreadcrumbTrail = ({ items }: BreadcrumbTrailProps) => {
  if (items.length < 2) return null;

  return (
    <nav className={styles.trail} aria-label="Ruta de navegación">
      <ol className={styles.list}>
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className={styles.item}>
              {isCurrent ? (
                <span className={styles.current} aria-current="page">
                  {item.label}
                </span>
              ) : item.to ? (
                <Link className={styles.action} to={item.to}>
                  {item.label}
                </Link>
              ) : (
                <button className={styles.action} type="button" onClick={item.onClick}>
                  {item.label}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
