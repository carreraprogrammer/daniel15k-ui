import styles from './Label.module.css'; export interface LabelProps { text:string; htmlFor?:string; required?:boolean; }
export const Label=({text,htmlFor,required}:LabelProps)=><label htmlFor={htmlFor} className={`${styles.label} ${required ? styles.required : ''}`.trim()}>{text}</label>;
