import { Capacitor } from '@capacitor/core'
import { SpeechRecognition } from '@capacitor-community/speech-recognition'

// Platform-aware speech-to-text. On the mobile app (Capacitor/iOS) this uses
// the native SFSpeechRecognizer via @capacitor-community/speech-recognition;
// the browser path (Web Speech API) exists only for desktop development.

export interface VoiceSession {
  stop: () => Promise<void>
}

interface VoiceHandlers {
  onPartial?: (text: string) => void
  onFinal: (text: string) => void
  onError: (message: string) => void
}

const LANG = 'es-CO'
const isNative = () => Capacitor.isNativePlatform()

// ── support check ──────────────────────────────────────────────────────────
export async function isVoiceSupported(): Promise<boolean> {
  if (isNative()) {
    try {
      const { available } = await SpeechRecognition.available()
      return available
    } catch {
      return false
    }
  }
  return Boolean(getWebSpeech())
}

// ── start ────────────────────────────────────────────────────────────────
export async function startVoiceDictation(handlers: VoiceHandlers): Promise<VoiceSession> {
  return isNative() ? startNative(handlers) : startWeb(handlers)
}

// ── native (iOS / Android) ─────────────────────────────────────────────────
async function startNative({ onPartial, onFinal, onError }: VoiceHandlers): Promise<VoiceSession> {
  const perm = await SpeechRecognition.requestPermissions().catch(() => null)
  if (perm && perm.speechRecognition !== 'granted') {
    onError('Necesito permiso para escucharte. Actívalo en Ajustes o agrégalos a mano.')
    return { stop: async () => {} }
  }

  let last = ''
  await SpeechRecognition.removeAllListeners()
  await SpeechRecognition.addListener('partialResults', (data: { matches?: string[] }) => {
    const text = data?.matches?.[0]
    if (text) { last = text; onPartial?.(text) }
  })

  try {
    await SpeechRecognition.start({ language: LANG, partialResults: true, popup: false })
  } catch {
    onError('No pude iniciar el dictado. Intenta de nuevo o agrégalos a mano.')
    await SpeechRecognition.removeAllListeners()
    return { stop: async () => {} }
  }

  return {
    stop: async () => {
      try { await SpeechRecognition.stop() } catch { /* noop */ }
      await SpeechRecognition.removeAllListeners()
      onFinal(last.trim())
    },
  }
}

// ── web (development only) ─────────────────────────────────────────────────
interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

function getWebSpeech(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

function startWeb({ onPartial, onFinal, onError }: VoiceHandlers): VoiceSession {
  const Ctor = getWebSpeech()
  if (!Ctor) {
    onError('El dictado no está disponible aquí. Usa la app o agrégalos a mano.')
    return { stop: async () => {} }
  }
  const rec = new Ctor()
  rec.lang = LANG
  rec.interimResults = true
  rec.continuous = true
  let finalText = ''
  rec.onresult = (e) => {
    let interim = ''
    for (let i = 0; i < e.results.length; i++) {
      const r = e.results[i]
      const chunk = r[0]?.transcript ?? ''
      if (r.isFinal) finalText += chunk
      else interim += chunk
    }
    onPartial?.((finalText + ' ' + interim).trim())
  }
  rec.onerror = () => onError('No pude escucharte bien. Probá de nuevo o escríbelos.')
  rec.onend = () => onFinal(finalText.trim())
  try { rec.start() } catch { onError('No pude iniciar el dictado.') }
  return { stop: async () => { try { rec.stop() } catch { /* noop */ } } }
}
