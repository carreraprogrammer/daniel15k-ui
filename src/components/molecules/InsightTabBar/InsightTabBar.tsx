import { useHistory } from 'react-router-dom';
import styles from './InsightTabBar.module.css';

export type InsightTab = 'nocturno' | 'mensual' | 'anual';

interface Props {
  active: InsightTab;
  // Context params so each tab knows where to navigate
  date?: string;        // "YYYY-MM-DD" or "DD/MM" — for nocturno link
  month?: number;
  year?: number;
}

const TABS: { id: InsightTab; label: string }[] = [
  { id: 'nocturno', label: 'Nocturno' },
  { id: 'mensual',  label: 'Mensual'  },
  { id: 'anual',    label: 'Anual'    },
];

function todayStr() {
  const now = new Date();
  return `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export const InsightTabBar = ({ active, date, month, year }: Props) => {
  const history = useHistory();
  const now = new Date();
  const m = month ?? now.getMonth() + 1;
  const y = year ?? now.getFullYear();
  const d = date ?? todayStr();

  const navigate = (tab: InsightTab) => {
    if (tab === active) return;
    if (tab === 'nocturno') history.push(`/analisis/${d}`);
    if (tab === 'mensual')  history.push(`/planes/${y}/${m}`);
    if (tab === 'anual')    history.push(`/años/${y}`);
  };

  return (
    <div className={styles.bar}>
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`${styles.btn} ${active === t.id ? styles.active : ''}`}
          onClick={() => navigate(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
};
