import styles from './ReasoningAccordion.module.css';

interface ReasoningAccordionProps {
  text: string;
}

export const ReasoningAccordion = ({ text }: ReasoningAccordionProps) => (
  <details className={styles.accordion}>
    <summary className={styles.summary}>Por qué te dije esto</summary>
    <p className={styles.body}>{text}</p>
  </details>
);
