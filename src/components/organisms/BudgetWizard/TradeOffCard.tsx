import styles from './TradeOffCard.module.css';

interface TradeOffCardProps {
  tag: string;
  title: string;
  body: string;
  cost: string;
  color: string;
  onChoose?: () => void;
  onWhyClick?: () => void;
}

export const TradeOffCard = ({ tag, title, body, cost, color, onChoose, onWhyClick }: TradeOffCardProps) => (
  <div className={styles.card} style={{ '--tradeoff-color': color } as React.CSSProperties}>
    <div className={styles.top}>
      <span className={styles.tag}>{tag}</span>
      <span className={styles.cost}>cuesta: {cost}</span>
    </div>
    <div className={styles.title}>{title}</div>
    <div className={styles.body}>{body}</div>
    <div className={styles.actions}>
      <button type="button" className={styles.chooseBtn} onClick={onChoose}>
        Elijo esta
      </button>
      <button type="button" className={styles.whyBtn} onClick={onWhyClick}>
        ¿Por qué?
      </button>
    </div>
  </div>
);
