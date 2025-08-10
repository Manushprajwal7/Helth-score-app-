export type OFFProduct = {
  code: string;
  product_name?: string;
  brands?: string;
  categories?: string;
  ingredients_text?: string;
  nutriments?: Record<string, any>;
  nutriscore_grade?: string;
  nova_group?: number;
  additives_tags?: string[];
  labels_tags?: string[];
  image_front_url?: string;
  image_ingredients_url?: string;
  image_nutrition_url?: string;
  allergens_tags?: string[];
  traces_tags?: string[];
  nutrition_data_per?: string;
  nutrition_grade_fr?: string;
  ecoscore_grade?: string;
  environment_impact_level_tags?: string[];
  origins?: string;
  manufacturing_places?: string;
  emb_codes?: string;
  stores?: string;
  countries_tags?: string[];
  languages_tags?: string[];
  last_modified_t?: number;
  created_t?: number;
  states_tags?: string[];
  completeness?: number;
  popularity_key?: number;
};

export type OFFResponse = {
  status: number;
  status_verbose?: string;
  product?: OFFProduct;
  code?: string;
  error?: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_OFF_API_BASE_URL ||
  "https://world.openfoodfacts.org/api/v2";

// Simple in-memory cache for product data
const productCache = new Map<
  string,
  { data: OFFResponse; timestamp: number }
>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function fetchProductByBarcode(
  barcode: string
): Promise<OFFResponse | null> {
  try {
    // Validate barcode
    if (!barcode || barcode.length < 8) {
      return {
        status: 400,
        error: "Invalid barcode format",
      };
    }

    // Check cache first
    const cached = productCache.get(barcode);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    // Fetch from API
    const url = `${API_BASE_URL}/product/${encodeURIComponent(barcode)}.json`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "LiveHealthScorer/1.0 (https://github.com/your-repo)",
        Accept: "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 404) {
        return {
          status: 404,
          error: "Product not found in database",
        };
      }
      if (res.status === 429) {
        return {
          status: 429,
          error: "Rate limit exceeded. Please try again later.",
        };
      }
      return {
        status: res.status,
        error: `API error: ${res.statusText}`,
      };
    }

    const json = await res.json();

    // Validate response structure
    if (!json || typeof json !== "object") {
      return {
        status: 500,
        error: "Invalid response format from API",
      };
    }

    // Check if product exists
    if (!json.product && json.status === 0) {
      return {
        status: 404,
        error: "Product not found in Open Food Facts database",
      };
    }

    // Cache the successful response
    if (json.product) {
      productCache.set(barcode, {
        data: json,
        timestamp: Date.now(),
      });
    }

    return json;
  } catch (error) {
    console.error("Error fetching product:", error);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return {
          status: 408,
          error: "Request timeout. Please try again.",
        };
      }
      if (error.message.includes("fetch")) {
        return {
          status: 503,
          error: "Network error. Please check your connection.",
        };
      }
    }

    return {
      status: 500,
      error: "Failed to fetch product data. Please try again.",
    };
  }
}

// Utility function to get product image URL with fallback
export function getProductImageUrl(
  product: OFFProduct,
  size: "small" | "medium" | "large" = "medium"
): string {
  if (product.image_front_url) {
    // Open Food Facts image URLs can be modified for different sizes
    const baseUrl = product.image_front_url;
    switch (size) {
      case "small":
        return baseUrl.replace("/images/products/", "/images/products/100/");
      case "large":
        return baseUrl.replace("/images/products/", "/images/products/400/");
      default:
        return baseUrl;
    }
  }

  // Fallback placeholder
  return `/placeholder.svg?height=200&width=200&query=food+product`;
}

// Utility function to get nutrition facts summary
export function getNutritionSummary(product: OFFProduct): Record<string, any> {
  const nutr = product.nutriments || {};

  return {
    energy: nutr["energy-kcal_100g"] || nutr["energy_100g"] / 4.184,
    protein: nutr["proteins_100g"],
    carbs: nutr["carbohydrates_100g"],
    fat: nutr["fat_100g"],
    saturatedFat: nutr["saturated-fat_100g"],
    sugar: nutr["sugars_100g"],
    fiber: nutr["fiber_100g"],
    salt:
      nutr["salt_100g"] ||
      (nutr["sodium_100g"] ? nutr["sodium_100g"] * 2.5 : null),
    sodium: nutr["sodium_100g"],
  };
}

// Utility function to check if product is organic
export function isOrganic(product: OFFProduct): boolean {
  const labels = product.labels_tags || [];
  return labels.some(
    (label) =>
      label.toLowerCase().includes("organic") ||
      label.toLowerCase().includes("bio") ||
      label.toLowerCase().includes("ecologique")
  );
}

// Utility function to get processing level description
export function getNovaDescription(novaGroup: number): string {
  switch (novaGroup) {
    case 1:
      return "Unprocessed or minimally processed";
    case 2:
      return "Processed culinary ingredients";
    case 3:
      return "Processed foods";
    case 4:
      return "Ultra-processed foods";
    default:
      return "Unknown processing level";
  }
}
