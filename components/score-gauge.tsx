"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type Props = {
  score?: number;
  size?: number;
};

export function ScoreGauge({ score = 0, size = 140 }: Props) {
  const [animated, setAnimated] = useState(0);
  const [pulseActive, setPulseActive] = useState(false);

  useEffect(() => {
    const s = Math.max(0, Math.min(10, score));
    const target = (s / 10) * 100;
    const start = animated;
    const diff = target - start;
    const duration = 1200; // Longer animation for smoother effect
    const startTime = performance.now();
    let raf = 0;

    // Activate pulse when score changes
    if (s > 0 && s !== animated / 10) {
      setPulseActive(true);
      setTimeout(() => setPulseActive(false), 2000);
    }

    const step = (t: number) => {
      const p = Math.min(1, (t - startTime) / duration);
      // Enhanced easing function for smoother animation
      const ease = 1 - Math.pow(1 - p, 4);
      setAnimated(start + diff * ease);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [score, animated]);

  const circumference = useMemo(() => 2 * Math.PI * 56, []);
  const dash = useMemo(
    () => (animated / 100) * circumference,
    [animated, circumference]
  );

  const colors = useMemo(() => {
    if (score >= 8)
      return {
        primary: "#10b981", // emerald-500
        secondary: "#06d6a0", // custom teal
        bg: "from-emerald-50 to-teal-50",
      };
    if (score >= 6)
      return {
        primary: "#84cc16", // lime-500
        secondary: "#fbbf24", // amber-400
        bg: "from-lime-50 to-yellow-50",
      };
    if (score >= 4)
      return {
        primary: "#f59e0b", // amber-500
        secondary: "#fb7185", // rose-400
        bg: "from-amber-50 to-orange-50",
      };
    return {
      primary: "#ef4444", // red-500
      secondary: "#f43f5e", // rose-500
      bg: "from-red-50 to-rose-50",
    };
  }, [score]);

  const displayScore = Math.round((animated / 100) * 10);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: 1,
        scale: pulseActive ? [1, 1.1, 1] : 1,
      }}
      transition={{
        opacity: { duration: 0.5 },
        scale: { duration: 0.6, ease: "easeInOut" },
      }}
      className={cn(
        "relative grid place-items-center rounded-3xl border-2 border-white/50 shadow-2xl backdrop-blur-sm p-6",
        `bg-gradient-to-br ${colors.bg}`
      )}
      style={{ width: size + 48, height: size + 48 }}
    >
      {/* Animated background glow */}
      <motion.div
        className="absolute inset-0 rounded-3xl opacity-20"
        animate={{
          background: [
            `radial-gradient(circle, ${colors.primary}20 0%, transparent 70%)`,
            `radial-gradient(circle, ${colors.secondary}20 0%, transparent 70%)`,
            `radial-gradient(circle, ${colors.primary}20 0%, transparent 70%)`,
          ],
        }}
        transition={{
          duration: 3,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />

      <svg
        width={size}
        height={size}
        viewBox="0 0 140 140"
        className="drop-shadow-lg relative z-10"
      >
        <defs>
          <linearGradient
            id={`gaugeGradient-${score}`}
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop offset="0%" stopColor={colors.primary} />
            <stop offset="50%" stopColor={colors.secondary} />
            <stop offset="100%" stopColor={colors.primary} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g transform="translate(70,70) rotate(-90)">
          {/* Background circle */}
          <circle
            cx="0"
            cy="0"
            r="56"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
            opacity="0.3"
          />
          {/* Animated progress circle */}
          <motion.circle
            cx="0"
            cy="0"
            r="56"
            fill="none"
            stroke={`url(#gaugeGradient-${score})`}
            strokeLinecap="round"
            strokeWidth="8"
            strokeDasharray={`${dash} ${circumference}`}
            filter="url(#glow)"
            animate={{
              strokeWidth: pulseActive ? [8, 12, 8] : 8,
            }}
            transition={{
              strokeWidth: { duration: 0.8, ease: "easeInOut" },
              strokeDasharray: { duration: 1.2, ease: "easeOut" },
            }}
          />
        </g>
      </svg>

      {/* Score display */}
      <div className="absolute text-center z-10">
        <motion.div
          className="text-5xl font-black tabular-nums"
          style={{ color: colors.primary }}
          animate={{
            scale: pulseActive ? [1, 1.2, 1] : 1,
            color: [colors.primary, colors.secondary, colors.primary],
          }}
          transition={{
            scale: { duration: 0.6, ease: "easeInOut" },
            color: {
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            },
          }}
          aria-live="polite"
          aria-atomic="true"
        >
          {displayScore}
        </motion.div>
        <motion.div
          className="text-sm font-semibold opacity-70"
          style={{ color: colors.primary }}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        >
          /10
        </motion.div>
      </div>

      {/* Floating particles effect */}
      <AnimatePresence>
        {score > 0 && (
          <>
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full opacity-60"
                style={{ backgroundColor: colors.primary }}
                initial={{
                  x: 0,
                  y: 0,
                  scale: 0,
                  opacity: 0,
                }}
                animate={{
                  x: [0, Math.random() * 40 - 20, Math.random() * 60 - 30, 0],
                  y: [0, Math.random() * 40 - 20, Math.random() * 60 - 30, 0],
                  scale: [0, 1, 0.5, 0],
                  opacity: [0, 0.8, 0.4, 0],
                }}
                transition={{
                  duration: 3 + i,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: i * 0.5,
                  ease: "easeInOut",
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
