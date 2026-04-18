import { useCallback, useState } from 'react';
import { financeService } from '../services/financeService';

type WebChatStatus = 'idle' | 'loading' | 'active' | 'error';

export function useWebChat() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<WebChatStatus>('idle');

  const start = useCallback(async (message: string) => {
    setStatus('loading');
    try {
      const { session_id } = await financeService.startWebChat(message);
      setSessionId(session_id);
      setStatus('active');
      return session_id;
    } catch {
      setStatus('error');
      return null;
    }
  }, []);

  const reply = useCallback(
    async (
      eventId: number,
      type: 'form_submitted' | 'confirmed' | 'dismissed',
      data?: Record<string, unknown>,
    ) => {
      if (!sessionId) return;
      setStatus('loading');
      try {
        await financeService.replyWebChat(sessionId, eventId, type, data);
        setStatus('active');
      } catch {
        setStatus('error');
      }
    },
    [sessionId],
  );

  const reset = useCallback(() => {
    setSessionId(null);
    setStatus('idle');
  }, []);

  return { sessionId, status, start, reply, reset };
}
