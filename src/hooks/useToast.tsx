import { useCallback, useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';

type ToastColor = 'success' | 'danger' | 'primary';

export const useToast = () => {
  const [message, setMessage] = useState('');
  const [color, setColor] = useState<ToastColor>('primary');
  const [open, setOpen] = useState(false);

  const show = useCallback((nextMessage: string, nextColor: ToastColor) => {
    setMessage(nextMessage);
    setColor(nextColor);
    setOpen(true);
  }, []);

  const showSuccess = useCallback((nextMessage: string) => show(nextMessage, 'success'), [show]);
  const showError = useCallback((nextMessage: string) => show(nextMessage, 'danger'), [show]);
  const showInfo = useCallback((nextMessage: string) => show(nextMessage, 'primary'), [show]);

  const toast = useMemo(
    () => (
      <IonToast
        isOpen={open}
        message={message}
        color={color}
        duration={2500}
        onDidDismiss={() => setOpen(false)}
      />
    ),
    [color, message, open],
  );

  return { showSuccess, showError, showInfo, toast };
};
