"use client"

import { CheckCircle2, XCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

type Props = {
  pros?: string[]
  cons?: string[]
}

export function ProsCons({ pros = [], cons = [] }: Props) {
  const item = {
    initial: { opacity: 0, x: -8 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -8 },
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-lg border bg-gradient-to-br from-emerald-50 to-white p-4">
        <div className="mb-2 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <h4 className="text-sm font-semibold">Pros</h4>
        </div>
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {pros.length === 0 ? (
              <li key="no-pros" className="text-sm text-neutral-500">
                None detected yet.
              </li>
            ) : (
              pros.map((p, i) => (
                <motion.li
                  key={p + i}
                  variants={item}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.25, delay: i * 0.03 }}
                  className="text-sm"
                >
                  {p}
                </motion.li>
              ))
            )}
          </AnimatePresence>
        </ul>
      </div>
      <div className="rounded-lg border bg-gradient-to-br from-rose-50 to-white p-4">
        <div className="mb-2 flex items-center gap-2">
          <XCircle className="h-5 w-5 text-rose-600" />
          <h4 className="text-sm font-semibold">Cons</h4>
        </div>
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {cons.length === 0 ? (
              <li key="no-cons" className="text-sm text-neutral-500">
                None detected yet.
              </li>
            ) : (
              cons.map((c, i) => (
                <motion.li
                  key={c + i}
                  variants={item}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.25, delay: i * 0.03 }}
                  className="text-sm"
                >
                  {c}
                </motion.li>
              ))
            )}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  )
}
