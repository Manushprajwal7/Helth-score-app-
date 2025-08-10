"use client";

import { motion } from "framer-motion";
import type { OFFProduct } from "@/lib/open-food-facts";

type Props = {
  product: OFFProduct | null;
  loading?: boolean;
};

export function ProductCard({ product, loading }: Props) {
  if (loading) {
    return (
      <motion.div
        className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-white/80 to-neutral-50/80 backdrop-blur-sm border border-neutral-200/50 shadow-lg"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="h-20 w-20 rounded-xl border-2 border-neutral-200/50 bg-white shadow-sm overflow-hidden">
          <motion.div
            className="h-full w-full bg-gradient-to-br from-neutral-200 to-neutral-300"
            animate={{
              background: [
                "linear-gradient(45deg, #e5e7eb, #d1d5db)",
                "linear-gradient(45deg, #d1d5db, #e5e7eb)",
                "linear-gradient(45deg, #e5e7eb, #d1d5db)",
              ],
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <motion.div
            className="h-6 w-4/5 rounded-lg bg-gradient-to-r from-neutral-200 to-neutral-300"
            animate={{
              background: [
                "linear-gradient(90deg, #e5e7eb, #d1d5db)",
                "linear-gradient(90deg, #d1d5db, #e5e7eb)",
                "linear-gradient(90deg, #e5e7eb, #d1d5db)",
              ],
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="h-4 w-2/5 rounded-lg bg-gradient-to-r from-neutral-200 to-neutral-300"
            animate={{
              background: [
                "linear-gradient(90deg, #e5e7eb, #d1d5db)",
                "linear-gradient(90deg, #d1d5db, #e5e7eb)",
                "linear-gradient(90deg, #e5e7eb, #d1d5db)",
              ],
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
              delay: 0.2,
            }}
          />
          <div className="mt-3 flex gap-2">
            <motion.div
              className="h-6 w-20 rounded-full bg-gradient-to-r from-neutral-200 to-neutral-300"
              animate={{
                background: [
                  "linear-gradient(90deg, #e5e7eb, #d1d5db)",
                  "linear-gradient(90deg, #d1d5db, #e5e7eb)",
                  "linear-gradient(90deg, #e5e7eb, #d1d5db)",
                ],
              }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
                delay: 0.4,
              }}
            />
            <motion.div
              className="h-6 w-24 rounded-full bg-gradient-to-r from-neutral-200 to-neutral-300"
              animate={{
                background: [
                  "linear-gradient(90deg, #e5e7eb, #d1d5db)",
                  "linear-gradient(90deg, #d1d5db, #e5e7eb)",
                  "linear-gradient(90deg, #e5e7eb, #d1d5db)",
                ],
              }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
                delay: 0.6,
              }}
            />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex min-w-0 items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-white/80 to-neutral-50/80 backdrop-blur-sm border border-neutral-200/50 shadow-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        type: "spring",
        stiffness: 400,
        damping: 25,
      }}
      whileHover={{ scale: 1.02, y: -2 }}
    >
      <motion.div
        className="relative h-20 w-20 overflow-hidden rounded-xl border-2 border-white/50 bg-white shadow-lg"
        whileHover={{ scale: 1.05, rotate: 2 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <motion.img
          src={
            product?.image_front_url ||
            "/placeholder.svg?height=80&width=80&query=food product image placeholder"
          }
          alt={
            product?.product_name
              ? `${product.product_name} image`
              : "Product image"
          }
          className="h-full w-full object-cover"
          loading="lazy"
          width={80}
          height={80}
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
        {/* Subtle overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
      </motion.div>

      <div className="min-w-0 flex-1">
        <motion.h3
          className="truncate text-xl font-bold text-neutral-800"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          {product?.product_name || "No product detected"}
        </motion.h3>

        <motion.p
          className="truncate text-neutral-600 font-medium"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          {product?.brands ? `Brand: ${product.brands}` : "—"}
        </motion.p>

        <motion.div
          className="mt-3 flex flex-wrap gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {product?.nutriscore_grade && (
            <motion.span
              className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-500 to-green-500 px-3 py-1 text-xs font-bold text-white shadow-lg"
              whileHover={{ scale: 1.05 }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 500 }}
            >
              Nutri-Score {String(product.nutriscore_grade).toUpperCase()}
            </motion.span>
          )}
          {product?.nova_group && (
            <motion.span
              className="inline-flex items-center rounded-full bg-gradient-to-r from-blue-100 to-cyan-100 border border-blue-200/50 px-3 py-1 text-xs font-bold text-blue-800 shadow-sm"
              whileHover={{ scale: 1.05 }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 500 }}
            >
              NOVA {product.nova_group}
            </motion.span>
          )}
          {product?.categories && (
            <motion.span
              className="inline-flex max-w-[220px] items-center truncate rounded-full bg-gradient-to-r from-neutral-100 to-gray-100 border border-neutral-200/50 px-3 py-1 text-xs font-bold text-neutral-700 shadow-sm"
              whileHover={{ scale: 1.05 }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, type: "spring", stiffness: 500 }}
            >
              {product.categories.split(",")[0]}
            </motion.span>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
