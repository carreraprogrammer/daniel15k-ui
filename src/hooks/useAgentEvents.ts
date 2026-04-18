import { useCallback, useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { financeService } from '../services/financeService';
import type { AgentUiEvent } from '../types/finance.types';

const POLL_INTERVAL_MS = 2000;

export function useAgentEvents(sessionId?: string) {
  const [events, setEvents] = useState<AgentUiEvent[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const history = useHistory();

  const handleNavigate = useCallback(
    async (event: AgentUiEvent) => {
      const payload = event.payload as unknown as { route: string };
      if (payload?.route) {
        history.push(payload.route);
      }
      await financeService.consumeAgentEvent(event.id);
    },
    [history],
  );

  const poll = useCallback(async () => {
    try {
      const pending = await financeService.getPendingAgentEvents(sessionId);
      if (pending.length === 0) return;

      const navigateEvents = pending.filter((e) => e.event_type === 'navigate');
      const uiEvents = pending.filter((e) => e.event_type !== 'navigate');

      for (const navEvent of navigateEvents) {
        void handleNavigate(navEvent);
      }

      if (uiEvents.length > 0) {
        setEvents((prev) => {
          const existingIds = new Set(prev.map((e) => e.id));
          const next = uiEvents.filter((e) => !existingIds.has(e.id));
          return next.length > 0 ? [...prev, ...next] : prev;
        });
      }
    } catch {
      // polling silencioso — no romper UI por error de red
    }
  }, [sessionId, handleNavigate]);

  useEffect(() => {
    void poll();
    timerRef.current = setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [poll]);

  const consume = useCallback(async (id: number) => {
    try {
      await financeService.consumeAgentEvent(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch {
      // silencioso
    }
  }, []);

  const consumeAll = useCallback(async () => {
    await Promise.allSettled(events.map((e) => financeService.consumeAgentEvent(e.id)));
    setEvents([]);
  }, [events]);

  return { events, consume, consumeAll };
}
