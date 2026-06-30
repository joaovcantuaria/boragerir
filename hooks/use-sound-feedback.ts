"use client"

import { useCallback } from "react"

// Sons gerados via Web Audio API — sem arquivos externos
// O usuário pode desativar nas configurações (localStorage: "sound_enabled")

type SoundType = "success" | "error" | "click" | "cash"

function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem("sound_enabled") !== "false"
}

function createContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)()
  } catch {
    return null
  }
}

function playSoundInternal(type: SoundType) {
  if (!isSoundEnabled()) return
  const ctx = createContext()
  if (!ctx) return

  const g = ctx.createGain()
  g.connect(ctx.destination)

  switch (type) {
    case "success": {
      // Dois tons ascendentes — confirmação
      const o1 = ctx.createOscillator()
      const o2 = ctx.createOscillator()
      o1.connect(g); o2.connect(g)
      o1.frequency.value = 600
      o2.frequency.value = 900
      g.gain.setValueAtTime(0.12, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
      o1.start(ctx.currentTime)
      o1.stop(ctx.currentTime + 0.15)
      o2.start(ctx.currentTime + 0.12)
      o2.stop(ctx.currentTime + 0.35)
      break
    }
    case "cash": {
      // Tom de caixa registradora
      const o = ctx.createOscillator()
      o.connect(g)
      o.frequency.setValueAtTime(1200, ctx.currentTime)
      o.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.08)
      g.gain.setValueAtTime(0.15, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
      o.start(ctx.currentTime)
      o.stop(ctx.currentTime + 0.2)
      break
    }
    case "error": {
      // Tom grave descendente
      const o = ctx.createOscillator()
      o.connect(g)
      o.frequency.setValueAtTime(300, ctx.currentTime)
      o.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.25)
      g.gain.setValueAtTime(0.1, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
      o.start(ctx.currentTime)
      o.stop(ctx.currentTime + 0.25)
      break
    }
    case "click": {
      // Click sutil
      const o = ctx.createOscillator()
      o.connect(g)
      o.frequency.value = 800
      g.gain.setValueAtTime(0.05, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06)
      o.start(ctx.currentTime)
      o.stop(ctx.currentTime + 0.06)
      break
    }
  }

  // Fechar contexto depois
  setTimeout(() => ctx.close(), 1000)
}

export function useSoundFeedback() {
  const playSuccess = useCallback(() => playSoundInternal("success"), [])
  const playError   = useCallback(() => playSoundInternal("error"),   [])
  const playClick   = useCallback(() => playSoundInternal("click"),   [])
  const playCash    = useCallback(() => playSoundInternal("cash"),     [])

  const toggleSound = useCallback(() => {
    const current = isSoundEnabled()
    localStorage.setItem("sound_enabled", current ? "false" : "true")
    return !current
  }, [])

  const isSoundOn = useCallback(() => isSoundEnabled(), [])

  return { playSuccess, playError, playClick, playCash, toggleSound, isSoundOn }
}
