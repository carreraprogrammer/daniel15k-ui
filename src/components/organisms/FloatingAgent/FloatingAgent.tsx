import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { AvatarNucleus } from '../../atoms/AvatarNucleus'
import { useAuthStore } from '../../../store/authStore'
import { useProgressStore } from '../../../store/progressStore'
import { ChatPortal } from '../../pages/ChatPage/ChatPage'
import styles from './FloatingAgent.module.css'

type Point = {
  x: number
  y: number
}

type DragBounds = {
  left: number
  top: number
  right: number
  bottom: number
}

const STORAGE_KEY = 'daniel15k-floating-agent-position'
const DRAG_MARGIN = 12

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function clampPoint(point: Point, bounds: DragBounds): Point {
  return {
    x: clamp(point.x, bounds.left, bounds.right),
    y: clamp(point.y, bounds.top, bounds.bottom),
  }
}

function getViewportBounds(bubbleWidth: number, bubbleHeight: number): DragBounds {
  const w = window.innerWidth
  const h = window.innerHeight
  const tabBarH = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--app-viewport-tabbar-height') || '0',
  )
  return {
    left: DRAG_MARGIN,
    top: DRAG_MARGIN,
    right: Math.max(DRAG_MARGIN, w - bubbleWidth - DRAG_MARGIN),
    bottom: Math.max(DRAG_MARGIN, h - bubbleHeight - (Number.isFinite(tabBarH) ? tabBarH : 0) - DRAG_MARGIN),
  }
}

function getBubbleMetrics(level: number) {
  const avatarSize = level >= 3 ? 16 : 14
  const auraInset = level >= 5 ? 12 : level >= 4 ? 10 : level >= 3 ? 8 : 6
  const avatarBounds = avatarSize + auraInset * 2
  const bubbleDiameter = 46

  return {
    avatarBounds,
    avatarSize,
    bubbleWidth: bubbleDiameter,
    bubbleHeight: bubbleDiameter,
  }
}

function readStoredPosition() {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<Point>
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') {
      return null
    }

    return parsed as Point
  } catch {
    return null
  }
}

export const FloatingAgent = () => {
  const location = useLocation()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const { data, loading, fetchProgress, getEffectiveLevel } = useProgressStore()
  const [isOpen, setIsOpen] = useState(false)
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
    if (isAuthenticated) fetchProgress()
  }, [fetchProgress, isAuthenticated])

  const level = getEffectiveLevel()
  const seed = data?.avatarSeed ?? '0'
  const metrics = useMemo(() => getBubbleMetrics(level), [level])

  const syncPosition = (candidate?: Point | null) => {
    if (typeof window === 'undefined') return
    const bounds = getViewportBounds(metrics.bubbleWidth, metrics.bubbleHeight)
    const fallback = { x: bounds.right, y: bounds.bottom }
    const next = clampPoint(candidate ?? positionRef.current ?? fallback, bounds)
    positionRef.current = next
    setPosition(next)
  }

  // Re-clamp when route or bubble size changes (not during open or active drag)
  useEffect(() => {
    if (isOpen || dragRef.current.pointerId !== -1) return
    syncPosition(positionRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, metrics.bubbleWidth, metrics.bubbleHeight, isOpen])

  // Re-clamp on viewport resize
  useEffect(() => {
    const handleResize = () => {
      if (isOpen || dragRef.current.pointerId !== -1) return
      syncPosition(positionRef.current)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, metrics.bubbleWidth, metrics.bubbleHeight])

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
      window.setTimeout(() => {
        suppressClickRef.current = false
      }, 0)
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
      bounds: getViewportBounds(metrics.bubbleWidth, metrics.bubbleHeight),
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
  if (loading && !data) return null
  if (!position) return null

  const style = {
    left: `${position.x}px`,
    top: `${position.y}px`,
    '--agent-bubble-width': `${metrics.bubbleWidth}px`,
    '--agent-bubble-height': `${metrics.bubbleHeight}px`,
    '--agent-avatar-bounds': `${metrics.avatarBounds}px`,
  } as CSSProperties

  return (
    <>
      {isOpen && (
        <ChatPortal
          seed={seed}
          level={level}
          onClose={() => setIsOpen(false)}
        />
      )}

      {createPortal(
        <div className={styles.anchor} style={{ ...style, display: isOpen ? 'none' : 'block' }}>
          <button
            className={`${styles.bubble} ${isDragging ? styles.bubbleDragging : ''}`}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onDragStart={(e) => e.preventDefault()}
            aria-label="Abrir asistente"
          >
            <span className={styles.avatarSlot}>
              <AvatarNucleus seed={seed} level={level} size={metrics.avatarSize} />
            </span>
            <span className={styles.glowBadge} aria-hidden="true" />
          </button>
        </div>,
        document.body
      )}
    </>
  )
}
