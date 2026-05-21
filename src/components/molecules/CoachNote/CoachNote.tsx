import styles from './CoachNote.module.css';

interface CoachNoteProps {
  body: string;
  meta: string[];
}

export const CoachNote = ({ body, meta }: CoachNoteProps) => (
  <div className={styles.note}>
    <div className={styles.eyebrow}>
      <span className={styles.avatar} aria-hidden="true" />
      Tu coach te dejó una nota
    </div>
    <p className={styles.body}>{body}</p>
    <div className={styles.foot}>
      {meta.map((m, i) => (
        <span key={i} className={styles.footItem}>
          {i > 0 && <span className={styles.dot} aria-hidden="true" />}
          {m}
        </span>
      ))}
    </div>
  </div>
);
