"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

const THRESHOLD = 80 // px que precisa arrastar para ativar o refresh

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [pulling, setPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(0)
  const currentY = useRef(0)
  const isPulling = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const canPull = useCallback(() => {
    // Só permite pull-to-refresh se o scroll está no topo
    return window.scrollY <= 0
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!canPull()) return
    startY.current = e.touches[0].clientY
    isPulling.current = true
  }, [canPull])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || refreshing) return
    if (!canPull()) {
      isPulling.current = false
      setPulling(false)
      setPullDistance(0)
      return
    }

    currentY.current = e.touches[0].clientY
    const diff = currentY.current - startY.current

    if (diff > 0) {
      // Resistência progressiva — quanto mais puxa, mais difícil fica
      const distance = Math.min(diff * 0.5, 120)
      setPullDistance(distance)
      setPulling(true)
    } else {
      setPulling(false)
      setPullDistance(0)
    }
  }, [refreshing, canPull])

  const handleTouchEnd = useCallback(() => {
    if (!isPulling.current) return
    isPulling.current = false

    if (pullDistance >= THRESHOLD && !refreshing) {
      // Ativar refresh
      setRefreshing(true)
      setPullDistance(THRESHOLD * 0.6)
      router.refresh()
      // Delay para dar tempo do refresh visual
      setTimeout(() => {
        setRefreshing(false)
        setPulling(false)
        setPullDistance(0)
      }, 800)
    } else {
      setPulling(false)
      setPullDistance(0)
    }
  }, [pullDistance, refreshing, router])

  const progress = Math.min(pullDistance / THRESHOLD, 1)

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Indicador de pull-to-refresh */}
      {(pulling || refreshing) && (
        <div
          className="absolute left-0 right-0 flex items-center justify-center z-30 pointer-events-none"
          style={{
            top: -8,
            height: pullDistance,
            transition: refreshing ? "height 0.3s ease" : "none",
          }}
        >
          <div
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white border border-border shadow-md"
            style={{
              opacity: progress,
              transform: `scale(${0.5 + progress * 0.5}) rotate(${progress * 360}deg)`,
              transition: refreshing ? "transform 0.3s ease" : "none",
            }}
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            ) : (
              <svg
                className="w-4 h-4 text-primary"
                style={{ transform: `rotate(${progress >= 1 ? 180 : 0}deg)`, transition: "transform 0.2s" }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Conteúdo com offset */}
      <div
        style={{
          transform: pulling || refreshing ? `translateY(${pullDistance}px)` : "none",
          transition: refreshing ? "transform 0.3s ease" : pulling ? "none" : "transform 0.3s ease",
        }}
      >
        {children}
      </div>
    </div>
  )
}
