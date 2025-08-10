"use client"

import { useCallback, useRef } from "react"

type SpeechOpts = {
  rate?: number
  pitch?: number
  volume?: number
}

export function useSpeech() {
  const optsRef = useRef<Required<SpeechOpts>>({ rate: 1.02, pitch: 1.0, volume: 1.0 })

  const speak = useCallback((text?: string, opts?: SpeechOpts) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return
    if (opts) {
      optsRef.current = { ...optsRef.current, ...opts }
    }
    if (!text) return // allow updating options without speaking
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = optsRef.current.rate
    u.pitch = optsRef.current.pitch
    u.volume = optsRef.current.volume
    window.speechSynthesis.speak(u)
  }, [])

  const cancel = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return
    window.speechSynthesis.cancel()
  }, [])

  return { speak, cancel }
}
