import { Button } from '../../atoms/Button'; import { ErrorMessage } from '../../atoms/ErrorMessage';
export const ErrorState=({message,onRetry}:{message:string;onRetry:()=>void;})=><div><ErrorMessage message={message} /><Button label='Reintentar' onClick={onRetry} /></div>;
