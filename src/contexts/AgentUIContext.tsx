import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import { useHistory } from 'react-router-dom';
import { financeService } from '../services/financeService';
import type { AgentUiEvent } from '../types/finance.types';

const ERR = (...args: unknown[]) => console.error('[AgentUI]', ...args);

// ─── State ────────────────────────────────────────────────────────────────────

type ChatStatus = 'idle' | 'loading' | 'active' | 'error';

interface AgentUIState {
  sessionId: string | null;
  status: ChatStatus;
  events: AgentUiEvent[];
  dataVersion: number;
}

type AgentReplyType =
  | 'form_submitted'
  | 'confirmed'
  | 'dismissed'
  | 'categories_selected'
  | 'amounts_confirmed'
  | 'callback';

const initialState: AgentUIState = {
  sessionId: null,
  status: 'idle',
  events: [],
  dataVersion: 0,
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type AgentUIAction =
  | { type: 'CHAT_STARTED'; payload: { sessionId: string } }
  | { type: 'CHAT_LOADING' }
  | { type: 'CHAT_ERROR' }
  | { type: 'EVENTS_RECEIVED'; payload: AgentUiEvent[] }
  | { type: 'EVENT_CONSUMED'; payload: { id: number } }
  | { type: 'DATA_CHANGED' }
  | { type: 'RESET' };

function reducer(state: AgentUIState, action: AgentUIAction): AgentUIState {
  switch (action.type) {
    case 'CHAT_LOADING':
      return { ...state, status: 'loading' };
    case 'CHAT_STARTED':
      // Keep status='loading' — typing dots stay visible until events arrive
      return { ...state, sessionId: action.payload.sessionId, status: 'loading', events: [] };
    case 'CHAT_ERROR':
      return { ...state, status: 'error' };
    case 'EVENTS_RECEIVED': {
      const existingIds = new Set(state.events.map((e) => e.id));
      const newEvents = action.payload.filter((e) => !existingIds.has(e.id));
      return newEvents.length > 0
        ? { ...state, status: 'active', events: [...state.events, ...newEvents] }
        : state;
    }
    case 'EVENT_CONSUMED':
      return { ...state, events: state.events.filter((e) => e.id !== action.payload.id) };
    case 'DATA_CHANGED':
      return { ...state, dataVersion: state.dataVersion + 1 };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AgentUIContextValue {
  state: AgentUIState;
  startChat: (message: string, source?: string) => Promise<boolean>;
  reply: (
    eventId: number,
    type: AgentReplyType,
    data?: Record<string, unknown>,
  ) => Promise<void>;
  consume: (id: number) => Promise<void>;
  reset: () => void;
  dataVersion: number;
}

const AgentUIContext = createContext<AgentUIContextValue | null>(null);

const POLL_MS = 2000;

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AgentUIProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const history = useHistory();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  sessionIdRef.current = state.sessionId;

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
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
      if (payload?.route) history.push(payload.route);
      await financeService.consumeAgentEvent(event.id).catch(() => null);
    },
    [history],
  );

  const poll = useCallback(async () => {
    try {
      const pending = await financeService.getPendingAgentEvents();
      if (!pending.length) return;

      const navigateEvents = pending.filter((e) => e.event_type === 'navigate');
      const dataChangedEvents = pending.filter((e) => e.event_type === 'data_changed');
      const uiEvents = pending.filter(
        (e) => e.event_type !== 'navigate' && e.event_type !== 'data_changed',
      );

      for (const ev of navigateEvents) {
        void handleNavigateEvent(ev);
      }

      for (const ev of dataChangedEvents) {
        void financeService.consumeAgentEvent(ev.id).catch(() => null);
      }
      if (dataChangedEvents.length > 0) {
        dispatch({ type: 'DATA_CHANGED' });
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
    timerRef.current = setInterval(() => void poll(), POLL_MS);
  }, [poll, stopPolling]);

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  // ─── Public API ─────────────────────────────────────────────────────────────

  const startChat = useCallback(
    async (message: string, source = 'web') => {
      dispatch({ type: 'CHAT_LOADING' });
      try {
        const result = await financeService.startWebChat(message, source);
        dispatch({ type: 'CHAT_STARTED', payload: { sessionId: result.session_id } });
        return true;
      } catch (err) {
        ERR('startChat error:', err);
        dispatch({ type: 'CHAT_ERROR' });
        return false;
      }
    },
    [startPolling],
  );

  const reply = useCallback(
    async (
      eventId: number,
      type: AgentReplyType,
      data?: Record<string, unknown>,
    ) => {
      dispatch({ type: 'CHAT_LOADING' });
      try {
        let sid = sessionIdRef.current;
        if (!sid) {
          const result = await financeService.startWebChat('', 'web');
          sid = result.session_id;
          dispatch({ type: 'CHAT_STARTED', payload: { sessionId: sid } });
        }
        await financeService.replyWebChat(sid, eventId, type, data);
        await financeService.consumeAgentEvent(eventId).catch(() => null);
        dispatch({ type: 'EVENT_CONSUMED', payload: { id: eventId } });
        // Keep status='loading' — typing dots stay until brain emits next events via polling
      } catch (err) {
        ERR('reply error:', err);
        dispatch({ type: 'CHAT_ERROR' });
      }
    },
    [],
  );

  const consume = useCallback(async (id: number) => {
    await financeService.consumeAgentEvent(id).catch(() => null);
    dispatch({ type: 'EVENT_CONSUMED', payload: { id } });
  }, []);

  const reset = useCallback(() => {
    stopPolling();
    dispatch({ type: 'RESET' });
  }, [stopPolling]);

  return (
    <AgentUIContext.Provider value={{ state, startChat, reply, consume, reset, dataVersion: state.dataVersion }}>
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
