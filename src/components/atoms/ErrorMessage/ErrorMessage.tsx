import styles from './ErrorMessage.module.css'; export interface ErrorMessageProps { message?:string; }
export const ErrorMessage=({message}:ErrorMessageProps)=> message ? <p role='alert' className={styles.error}>{message}</p> : null;
