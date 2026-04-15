import { Button } from '../../atoms/Button';
import styles from './ConfirmModal.module.css';

export interface ConfirmModalProps { isOpen:boolean; title:string; message:string; confirmLabel?:string; cancelLabel?:string; onConfirm:()=>void; onCancel:()=>void; danger?:boolean; }
export const ConfirmModal=({isOpen,title,message,confirmLabel='Confirmar',cancelLabel='Cancelar',onConfirm,onCancel,danger}:ConfirmModalProps)=> isOpen ? <div className={styles.backdrop} role='presentation' onClick={onCancel}><div role='dialog' aria-modal='true' className={styles.modal} onClick={(event)=>event.stopPropagation()}><h2 className={styles.title}>{title}</h2><p className={styles.message}>{message}</p><div className={styles.actions}><Button label={cancelLabel} variant='ghost' onClick={onCancel} /><Button label={confirmLabel} variant={danger?'danger':'primary'} onClick={onConfirm} /></div></div></div> : null;
