import { create } from 'zustand'
import { api } from '../services/api'

interface EmailConnectionState {
  /** null = todavía no cargado, true/false = conocido */
  connected: boolean | null
  /** remitentes bancarios guardados — [] = modo keyword automático */
  bankSenders: string[]
  /** cargando el status inicial */
  loading: boolean
  /** operación en curso (conectar / desconectar / guardar remitentes) */
  actionLoading: boolean
  error: string | null

  fetchStatus: () => Promise<void>
  startOAuth: () => Promise<void>
  disconnect: () => Promise<void>
  updateSenders: (senders: string[]) => Promise<void>
  /** Llamar desde el deep-link handler con los params del redirect de Google */
  handleDeepLinkResult: (status: string, reason?: string | null) => void
}

export const useEmailConnectionStore = create<EmailConnectionState>((set) => ({
  connected: null,
  bankSenders: [],
  loading: false,
  actionLoading: false,
  error: null,

  fetchStatus: async () => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get('/api/v1/me/email_connection')
      const d = data as { data: { connected: boolean } }
      set({ connected: d.data.connected, loading: false })
    } catch {
      set({ loading: false, error: 'No se pudo verificar la conexión de correo.' })
    }
  },

  startOAuth: async () => {
    set({ actionLoading: true, error: null })
    try {
      const { data } = await api.post('/api/v1/auth/gmail')
      const d = data as { data: { authorization_url: string } }
      // Abre el navegador del sistema (convención Capacitor para URLs externas)
      window.open(d.data.authorization_url, '_system')
      set({ actionLoading: false })
    } catch {
      set({ actionLoading: false, error: 'No se pudo iniciar la conexión con Gmail.' })
    }
  },

  disconnect: async () => {
    set({ actionLoading: true, error: null })
    try {
      await api.delete('/api/v1/me/email_connection')
      set({ connected: false, bankSenders: [], actionLoading: false })
    } catch {
      set({ actionLoading: false, error: 'No se pudo desconectar Gmail.' })
    }
  },

  updateSenders: async (senders: string[]) => {
    set({ actionLoading: true, error: null })
    try {
      const { data } = await api.patch('/api/v1/me/email_connection/senders', { bank_senders: senders })
      const d = data as { data: { bank_senders: string[] } }
      set({ bankSenders: d.data.bank_senders, actionLoading: false })
    } catch {
      set({ actionLoading: false, error: 'No se pudo guardar los remitentes.' })
    }
  },

  handleDeepLinkResult: (status: string, reason?: string | null) => {
    if (status === 'connected') {
      set({ connected: true, error: null })
    } else {
      const msg =
        reason === 'invalid_state'    ? 'El enlace expiró. Volvé a intentarlo.'
        : reason === 'exchange_failed' ? 'No se pudo completar la autorización. Intentá de nuevo.'
        : 'No se pudo conectar Gmail.'
      set({ error: msg })
    }
  },
}))
