import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Buddy } from '../../atoms/Buddy'
import { useAuthStore } from '../../../store/authStore'
import { useBuddyStore } from '../../../store/buddyStore'
import type { Emotion } from '../../../store/buddyStore'
import { ChatPortal } from '../../pages/ChatPage/ChatPage'
import { financeService } from '../../../services/financeService'
import styles from './FloatingAgent.module.css'

type Point = { x: number; y: number }
type DragBounds = { left: number; top: number; right: number; bottom: number }

const STORAGE_KEY = 'daniel15k-floating-agent-position'
const DRAG_MARGIN = 12
const BUBBLE_SIZE = 56
const BUDDY_SIZE = 44

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function clampPoint(point: Point, bounds: DragBounds): Point {
  return {
    x: clamp(point.x, bounds.left, bounds.right),
    y: clamp(point.y, bounds.top, bounds.bottom),
  }
}

const TABBAR_FALLBACK_PX = 60

function getViewportBounds(): DragBounds {
  const w = window.innerWidth
  const h = window.innerHeight
  const tabBarH = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--app-viewport-tabbar-height') || '0',
  )
  const effectiveTabBarH = Number.isFinite(tabBarH) && tabBarH > 0 ? tabBarH : TABBAR_FALLBACK_PX
  return {
    left: DRAG_MARGIN,
    top: DRAG_MARGIN,
    right: Math.max(DRAG_MARGIN, w - BUBBLE_SIZE - DRAG_MARGIN),
    bottom: Math.max(DRAG_MARGIN, h - BUBBLE_SIZE - effectiveTabBarH - DRAG_MARGIN),
  }
}

function readStoredPosition() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Point>
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return null
    return parsed as Point
  } catch {
    return null
  }
}

export const FloatingAgent = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const persona = useBuddyStore((state) => state.persona)
  const [isOpen, setIsOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(() => document.body.hasAttribute('data-wizard-open'))
  const [emotion, setEmotion] = useState<Emotion>('calm')
  const [position, setPosition] = useState<Point | null>(readStoredPosition)
  const [isDragging, setIsDragging] = useState(false)
  const positionRef = useRef<Point | null>(position)
  const suppressClickRef = useRef(false)
  const dragRef = useRef({
    pointerId: -1,
    originX: 0,
    originY: 0,
    startX: 0,
    startY: 0,
    moved: false,
    bounds: { left: 0, top: 0, right: 0, bottom: 0 } as DragBounds,
  })

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setWizardOpen(document.body.hasAttribute('data-wizard-open'))
    })
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-wizard-open'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    financeService.fetchLatestInsight()
      .then((i) => { if (i?.status === 'new') setEmotion('cheer') })
      .catch(() => {})
  }, [isAuthenticated])

  const syncPosition = (candidate?: Point | null) => {
    if (typeof window === 'undefined') return
    const bounds = getViewportBounds()
    const fallback = { x: bounds.right, y: bounds.bottom }
    const next = clampPoint(candidate ?? positionRef.current ?? fallback, bounds)
    positionRef.current = next
    setPosition(next)
  }

  useEffect(() => {
    if (isOpen || dragRef.current.pointerId !== -1) return
    syncPosition(positionRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => {
    const handleResize = () => {
      if (isOpen || dragRef.current.pointerId !== -1) return
      syncPosition(positionRef.current)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (isOpen || dragRef.current.pointerId !== -1) return
      syncPosition(positionRef.current)
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })
    return () => observer.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => {
    positionRef.current = position
    if (!position) return
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(position))
  }, [position])

  const handlePointerMove = (event: PointerEvent) => {
    if (event.pointerId !== dragRef.current.pointerId) return
    const next = clampPoint(
      {
        x: dragRef.current.originX + (event.clientX - dragRef.current.startX),
        y: dragRef.current.originY + (event.clientY - dragRef.current.startY),
      },
      dragRef.current.bounds,
    )
    if (!dragRef.current.moved) {
      const distance = Math.hypot(event.clientX - dragRef.current.startX, event.clientY - dragRef.current.startY)
      if (distance > 4) {
        dragRef.current.moved = true
        setIsDragging(true)
      }
    }
    setPosition(next)
  }

  const handlePointerUp = (event: PointerEvent) => {
    if (event.pointerId !== dragRef.current.pointerId) return
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
    window.removeEventListener('pointercancel', handlePointerUp)
    if (dragRef.current.moved) {
      suppressClickRef.current = true
      window.setTimeout(() => { suppressClickRef.current = false }, 0)
    }
    dragRef.current.pointerId = -1
    dragRef.current.moved = false
    setIsDragging(false)
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragRef.current.pointerId !== -1) return
    const current = positionRef.current
    if (!current) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      originX: current.x,
      originY: current.y,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      bounds: getViewportBounds(),
    }
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
  }

  const handleClick = () => {
    if (suppressClickRef.current) return
    setIsOpen(true)
  }

  if (!isAuthenticated) return null
  if (!position) return null

  const style = {
    left: `${position.x}px`,
    top: `${position.y}px`,
  } as CSSProperties

  return (
    <>
      {isOpen && <ChatPortal onClose={() => setIsOpen(false)} />}

      {createPortal(
        <div className={styles.anchor} style={{ ...style, display: (isOpen || wizardOpen) ? 'none' : 'block' }}>
          <button
            className={`${styles.bubble} ${isDragging ? styles.bubbleDragging : ''}`}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onDragStart={(e) => e.preventDefault()}
            aria-label="Abrir asistente"
          >
            <Buddy persona={persona} emotion={emotion} size={BUDDY_SIZE} />
          </button>
        </div>,
        document.body,
      )}
    </>
  )
}
