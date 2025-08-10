"use client"

import type { OFFProduct } from "@/lib/open-food-facts"

type Props = {
  product: OFFProduct | null
  loading?: boolean
}

export function ProductCard({ product, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 rounded-md border bg-white">
          <div className="h-full w-full animate-pulse bg-neutral-200"></div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 h-5 w-4/5 animate-pulse rounded bg-neutral-200"></div>
          <div className="h-4 w-2/5 animate-pulse rounded bg-neutral-200"></div>
          <div className="mt-2 flex gap-2">
            <div className="h-5 w-20 animate-pulse rounded bg-neutral-200"></div>
            <div className="h-5 w-24 animate-pulse rounded bg-neutral-200"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="relative h-16 w-16 overflow-hidden rounded-md border bg-white">
        <img
          src={product?.image_front_url || "/placeholder.svg?height=64&width=64&query=food product image placeholder"}
          alt={product?.product_name ? `${product.product_name} image` : "Product image"}
          className="h-full w-full object-cover"
          loading="lazy"
          width={64}
          height={64}
        />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-xl font-semibold">{product?.product_name || "No product detected"}</h3>
        <p className="truncate text-neutral-600">{product?.brands ? `Brand: ${product.brands}` : "—"}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {product?.nutriscore_grade && (
            <span className="inline-flex items-center rounded border bg-emerald-600 px-2 py-0.5 text-xs text-white">
              Nutri-Score {String(product.nutriscore_grade).toUpperCase()}
            </span>
          )}
          {product?.nova_group && (
            <span className="inline-flex items-center rounded border bg-neutral-100 px-2 py-0.5 text-xs text-neutral-800">
              NOVA {product.nova_group}
            </span>
          )}
          {product?.categories && (
            <span className="inline-flex max-w-[220px] items-center truncate rounded border bg-white px-2 py-0.5 text-xs text-neutral-800">
              {product.categories.split(",")[0]}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
