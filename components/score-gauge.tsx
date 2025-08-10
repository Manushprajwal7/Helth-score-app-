"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

type Props = {
  score?: number
  size?: number
}

export function ScoreGauge({ score = 0, size = 140 }: Props) {
  const [animated, setAnimated] = useState(0)
  useEffect(() => {
    const s = Math.max(0, Math.min(10, score))
    const target = (s / 10) * 100
    const start = animated
    const diff = target - start
    const duration = 700
    const startTime = performance.now()
    let raf = 0
    const step = (t: number) => {
      const p = Math.min(1, (t - startTime) / duration)
      const ease = 1 - Math.pow(1 - p, 3)
      setAnimated(start + diff * ease)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [score])

  const circumference = useMemo(() => 2 * Math.PI * 56, [])
  const dash = useMemo(() => (animated / 100) * circumference, [animated, circumference])

  const color = useMemo(() => {
    if (score >= 8) return "#10b981"
    if (score >= 6) return "#84cc16"
    if (score >= 4) return "#f59e0b"
    return "#ef4444"
  }, [score])

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        "relative grid place-items-center rounded-2xl border bg-gradient-to-br from-white to-neutral-50 p-4",
      )}
      style={{ width: size + 36, height: size + 36 }}
    >
      <svg width={size} height={size} viewBox="0 0 140 140" className="drop-shadow-sm">
        <defs>
          <linearGradient id="gaugeGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <g transform="translate(70,70) rotate(-90)">
          <circle cx="0" cy="0" r="56" fill="none" stroke="#e5e7eb" strokeWidth="12" />
          <motion.circle
            cx="0"
            cy="0"
            r="56"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeLinecap="round"
            strokeWidth="12"
            strokeDasharray={`${dash} ${circumference}`}
            transition={{ duration: 0.7 }}
          />
        </g>
      </svg>
      <div className="absolute text-center">
        <div className="text-4xl font-extrabold tabular-nums" aria-live="polite" aria-atomic="true">
          {Math.round((animated / 100) * 10)}
        </div>
        <div className="text-xs text-neutral-500">/10</div>
      </div>
    </motion.div>
  )
}
