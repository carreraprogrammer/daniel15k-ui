import styles from './Spinner.module.css'; export interface SpinnerProps { size?:'sm'|'md'|'lg'; color?:string; }
export const Spinner=({size='md',color}:SpinnerProps)=><span aria-label='loading' className={[styles.spinner,styles[`spinner${size.charAt(0).toUpperCase()+size.slice(1)}`]].join(' ')} style={color ? ({['--spinner-color' as string]: color} as React.CSSProperties) : undefined} />;
