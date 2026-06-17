import { useEffect, useRef, useState } from 'react'
import type { Persona } from '../../../store/buddyStore'
import { onboardingService } from '../../../services/onboardingService'
import { isVoiceSupported, startVoiceDictation } from '../../../services/voiceInput'
import type { VoiceSession } from '../../../services/voiceInput'
import { Icon } from './OnboardingIcons'
import { fmtCOP, parseMoney } from './helpers'
import { guessExpense } from './expenseHeuristics'
import type { OnbExpense } from './types'

type Mode = 'voz' | 'foto' | 'form'
type VoiceState = 'idle' | 'rec' | 'parsing'

export function ExpenseCapture({
  coach: _coach,
  hasItems,
  onParsed,
}: {
  coach: Persona
  hasItems: boolean
  onParsed: (expenses: OnbExpense[]) => void
}) {
  const [speechSupported, setSpeechSupported] = useState(true)
  const [mode, setMode] = useState<Mode>('voz')
  const [voice, setVoice] = useState<VoiceState>('idle')
  const [photo, setPhoto] = useState<'idle' | 'scan'>('idle')
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState('')
  const sessionRef = useRef<VoiceSession | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  // manual mini-form
  const [mName, setMName] = useState('')
  const [mAmount, setMAmount] = useState('')

  useEffect(() => {
    let cancelled = false
    isVoiceSupported().then((ok) => {
      if (cancelled) return
      setSpeechSupported(ok)
      if (!ok) setMode((m) => (m === 'voz' ? 'form' : m))
    })
    return () => { cancelled = true; void sessionRef.current?.stop() }
  }, [])

  // ── voice ────────────────────────────────────────────────────────────────
  const startVoice = async () => {
    setError('')
    setTranscript('')
    setVoice('rec')
    sessionRef.current = await startVoiceDictation({
      onPartial: setTranscript,
      onFinal: (text) => { if (text) void parse(text); else setVoice('idle') },
      onError: (m) => { setError(m); setVoice('idle') },
    })
  }

  const stopVoice = async () => { await sessionRef.current?.stop() }

  const parse = async (text: string) => {
    setVoice('parsing')
    try {
      const parsed = await onboardingService.parseExpenses({ transcript: text })
      if (parsed.length) onParsed(parsed)
      else setError('No reconocí gastos ahí. Probá otra vez o agrégalos a mano.')
    } catch {
      setError('No pude procesar lo que dijiste. Agrégalos a mano por ahora.')
      setMode('form')
    } finally {
      setVoice('idle'); setTranscript('')
    }
  }

  // ── photo (capture → backend parse; OCR server-side pending) ──────────────
  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(''); setPhoto('scan')
    try {
      const base64 = await fileToBase64(file)
      const parsed = await onboardingService.parseExpenses({ imageBase64: base64 })
      if (parsed.length) onParsed(parsed)
      else setError('Todavía no puedo leer fotos. Dímelos por voz o agrégalos a mano.')
    } catch {
      setError('No pude leer la imagen. Agrégalos a mano por ahora.')
      setMode('form')
    } finally {
      setPhoto('idle')
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // ── manual ───────────────────────────────────────────────────────────────
  const addManual = () => {
    const amount = parseMoney(mAmount)
    if (!mName.trim() || !amount) return
    onParsed([guessExpense(mName.trim(), amount)])
    setMName(''); setMAmount('')
  }

  return (
    <>
      <div className="ob2-modes">
        <div className={`ob2-mode ${mode === 'voz' ? 'on' : ''}`} onClick={() => setMode('voz')}>
          <span className="m-ic"><Icon.Mic size={19} /></span><span className="m-t">Dictar</span>
        </div>
        <div className={`ob2-mode ${mode === 'foto' ? 'on' : ''}`} onClick={() => setMode('foto')}>
          <span className="m-ic"><Icon.Calendar size={19} /></span><span className="m-t">Foto</span>
        </div>
        <div className={`ob2-mode ${mode === 'form' ? 'on' : ''}`} onClick={() => setMode('form')}>
          <span className="m-ic"><Icon.Plus size={19} /></span><span className="m-t">Uno a uno</span>
        </div>
      </div>

      {/* VOICE */}
      {mode === 'voz' && (
        <div className="ob2-dictate">
          <button
            className={`big-mic ${voice === 'rec' ? 'rec' : ''}`}
            onClick={voice === 'rec' ? stopVoice : startVoice}
            disabled={voice === 'parsing' || !speechSupported}
          >
            <Icon.Mic size={30} />
          </button>
          {voice === 'rec' ? (
            <div className="d-wave">{[10, 18, 8, 22, 14, 20, 9, 16, 12].map((_, i) => <i key={i} style={{ animationDelay: `${i * 0.08}s` }} />)}</div>
          ) : voice === 'parsing' ? (
            <div className="d-hint">Organizando lo que dijiste…</div>
          ) : speechSupported ? (
            <div className="d-hint">Toca y dímelos seguido:<br /><i>“arriendo 1.200.000, la cuota del carro 620 mil, Netflix…”</i></div>
          ) : (
            <div className="d-hint">El dictado no está disponible aquí. Usa “Uno a uno”.</div>
          )}
          {transcript && <div className="ob2-transcript"><span className="typed">{transcript}</span></div>}
        </div>
      )}

      {/* PHOTO */}
      {mode === 'foto' && (
        <div className="ob2-photo" onClick={() => fileRef.current?.click()}>
          <div className="p-ic"><Icon.Calendar size={22} /></div>
          <div className="p-t">{photo === 'scan' ? 'Leyendo tu extracto…' : 'Toma o sube una foto'}</div>
          <div className="p-s">Un extracto, la cuota del banco o una captura de un pago. Yo saco los datos.</div>
          <div className="ob2-photo-strip">{photo === 'scan' ? 'reconociendo texto…' : 'extracto / pantallazo'}</div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={onPickPhoto}
          />
        </div>
      )}

      {/* FORM (always-working manual entry) */}
      {mode === 'form' && (
        <div style={{ marginTop: 2 }}>
          <div className="ob2-deepen" style={{ marginTop: 0 }}>
            <div className="field-label">Nombre del gasto</div>
            <div className="ob2-mini-input" style={{ marginBottom: 10 }}>
              <input value={mName} onChange={(e) => setMName(e.target.value)} placeholder="Arriendo, Netflix, cuota del carro…" style={{ fontFamily: 'var(--f-sans)' }} />
            </div>
            <div className="field-label">¿Cuánto al mes?</div>
            <div className="ob2-mini-input">
              <span className="unit">$</span>
              <input inputMode="numeric" value={fmtCOP(parseMoney(mAmount))} onChange={(e) => setMAmount(e.target.value)} placeholder="0" />
            </div>
            <button className="ob2-cta" style={{ marginTop: 12 }} disabled={!mName.trim() || !parseMoney(mAmount)} onClick={addManual}>
              <Icon.Plus size={16} /> Agregar gasto
            </button>
          </div>
          {!hasItems && (
            <div style={{ fontSize: 12.5, color: 'var(--text-mute)', marginTop: 10, lineHeight: 1.5 }}>
              Arriendo, servicios, cuotas, suscripciones, lo que le mandas a la familia… todo cuenta.
            </div>
          )}
        </div>
      )}

      {error && <div className="ob2-error"><Icon.Bell size={13} /> {error}</div>}
    </>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
