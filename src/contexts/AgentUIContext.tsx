import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { financeService } from '../services/financeService';
import type { AgentUiEvent } from '../types/finance.types';

const LOG = (...args: unknown[]) => console.log('[AgentUI]', ...args);
const ERR = (...args: unknown[]) => console.error('[AgentUI]', ...args);

// ─── State ────────────────────────────────────────────────────────────────────

type ChatStatus = 'idle' | 'loading' | 'active' | 'error';

interface AgentUIState {
  sessionId: string | null;
  status: ChatStatus;
  events: AgentUiEvent[];
}

const initialState: AgentUIState = {
  sessionId: null,
  status: 'idle',
  events: [],
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type AgentUIAction =
  | { type: 'CHAT_STARTED'; payload: { sessionId: string } }
  | { type: 'CHAT_LOADING' }
  | { type: 'CHAT_ERROR' }
  | { type: 'EVENTS_RECEIVED'; payload: AgentUiEvent[] }
  | { type: 'EVENT_CONSUMED'; payload: { id: number } }
  | { type: 'RESET' };

function reducer(state: AgentUIState, action: AgentUIAction): AgentUIState {
  LOG('dispatch', action.type, 'payload' in action ? action.payload : '');
  switch (action.type) {
    case 'CHAT_LOADING':
      return { ...state, status: 'loading' };
    case 'CHAT_STARTED':
      return { ...state, sessionId: action.payload.sessionId, status: 'active', events: [] };
    case 'CHAT_ERROR':
      return { ...state, status: 'error' };
    case 'EVENTS_RECEIVED': {
      const existingIds = new Set(state.events.map((e) => e.id));
      const newEvents = action.payload.filter((e) => !existingIds.has(e.id));
      LOG('EVENTS_RECEIVED — new:', newEvents.length, 'existing:', existingIds.size);
      return newEvents.length > 0
        ? { ...state, events: [...state.events, ...newEvents] }
        : state;
    }
    case 'EVENT_CONSUMED':
      return { ...state, events: state.events.filter((e) => e.id !== action.payload.id) };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AgentUIContextValue {
  state: AgentUIState;
  startChat: (message: string) => Promise<void>;
  reply: (
    eventId: number,
    type: 'form_submitted' | 'confirmed' | 'dismissed',
    data?: Record<string, unknown>,
  ) => Promise<void>;
  consume: (id: number) => Promise<void>;
  reset: () => void;
}

const AgentUIContext = createContext<AgentUIContextValue | null>(null);

const POLL_MS = 2000;

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AgentUIProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  sessionIdRef.current = state.sessionId;

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      LOG('polling stopped');
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleNavigateEvent = useCallback(
    async (event: AgentUiEvent) => {
      const payload = event.payload as unknown as { route: string };
      LOG('navigate event → route:', payload?.route);
      if (payload?.route) navigate(payload.route);
      await financeService.consumeAgentEvent(event.id).catch(() => null);
    },
    [navigate],
  );

  const poll = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;

    try {
      const pending = await financeService.getPendingAgentEvents(sid);
      LOG('poll — session:', sid, 'pending events:', pending.length);

      if (!pending.length) return;

      const navigateEvents = pending.filter((e) => e.event_type === 'navigate');
      const uiEvents = pending.filter((e) => e.event_type !== 'navigate');

      LOG('poll — ui events:', uiEvents.map((e) => e.event_type), 'navigate:', navigateEvents.length);

      for (const ev of navigateEvents) {
        void handleNavigateEvent(ev);
      }

      if (uiEvents.length > 0) {
        if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
        dispatch({ type: 'EVENTS_RECEIVED', payload: uiEvents });
      }
    } catch (err) {
      ERR('poll error:', err);
    }
  }, [handleNavigateEvent]);

  const startPolling = useCallback(() => {
    stopPolling();
    LOG('polling started every', POLL_MS, 'ms');
    timerRef.current = setInterval(() => void poll(), POLL_MS);
    timeoutRef.current = setTimeout(() => {
      LOG('session timeout — no events received in 90s, resetting');
      stopPolling();
      dispatch({ type: 'RESET' });
    }, 90_000);
  }, [poll, stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  // ─── Public API ─────────────────────────────────────────────────────────────

  const startChat = useCallback(
    async (message: string) => {
      LOG('startChat called — message:', message);
      dispatch({ type: 'CHAT_LOADING' });
      try {
        const result = await financeService.startWebChat(message);
        LOG('startWebChat response:', result);
        dispatch({ type: 'CHAT_STARTED', payload: { sessionId: result.session_id } });
        startPolling();
      } catch (err) {
        ERR('startChat error:', err);
        dispatch({ type: 'CHAT_ERROR' });
      }
    },
    [startPolling],
  );

  const reply = useCallback(
    async (
      eventId: number,
      type: 'form_submitted' | 'confirmed' | 'dismissed',
      data?: Record<string, unknown>,
    ) => {
      const sid = sessionIdRef.current;
      LOG('reply — eventId:', eventId, 'type:', type, 'sessionId:', sid);
      if (!sid) { ERR('reply called without sessionId'); return; }
      dispatch({ type: 'CHAT_LOADING' });
      try {
        await financeService.replyWebChat(sid, eventId, type, data);
        dispatch({ type: 'EVENT_CONSUMED', payload: { id: eventId } });
        dispatch({ type: 'CHAT_STARTED', payload: { sessionId: sid } });
      } catch (err) {
        ERR('reply error:', err);
        dispatch({ type: 'CHAT_ERROR' });
      }
    },
    [],
  );

  const consume = useCallback(async (id: number) => {
    LOG('consume event id:', id);
    await financeService.consumeAgentEvent(id).catch(() => null);
    dispatch({ type: 'EVENT_CONSUMED', payload: { id } });
  }, []);

  const reset = useCallback(() => {
    LOG('reset');
    stopPolling();
    dispatch({ type: 'RESET' });
  }, [stopPolling]);

  LOG('render — status:', state.status, 'sessionId:', state.sessionId, 'events:', state.events.length);

  return (
    <AgentUIContext.Provider value={{ state, startChat, reply, consume, reset }}>
      {children}
    </AgentUIContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAgentUI() {
  const ctx = useContext(AgentUIContext);
  if (!ctx) throw new Error('useAgentUI must be used within AgentUIProvider');
  return ctx;
}
