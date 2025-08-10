import type { OFFProduct } from "./open-food-facts";

export type ScoreResult = {
  score: number;
  pros: string[];
  cons: string[];
  rationale: string;
  details?: {
    nutritionScore: number;
    processingScore: number;
    ingredientScore: number;
    labelScore: number;
  };
};

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

export function computeHealthScore(p: OFFProduct): ScoreResult {
  const pros: string[] = [];
  const cons: string[] = [];
  const nutr = p.nutriments || {};

  // Initialize component scores
  let nutritionScore = 0;
  let processingScore = 0;
  let ingredientScore = 0;
  let labelScore = 0;

  // 1. NUTRITION SCORING (0-40 points)
  const grade = String(p.nutriscore_grade || "").toLowerCase();
  const baseFromGrade: Record<string, number> = {
    a: 35,
    b: 28,
    c: 21,
    d: 14,
    e: 7,
  };
  nutritionScore = grade in baseFromGrade ? baseFromGrade[grade] : 20;

  if (grade) {
    pros.push(`Nutri-Score ${grade.toUpperCase()}`);
  }

  // Macro nutrients per 100g
  const sugar = num(nutr["sugars_100g"]);
  const satFat = num(nutr["saturated-fat_100g"]);
  const salt = num(nutr["salt_100g"]) || num(nutr["sodium_100g"]) * 2.5;
  const fiber = num(nutr["fiber_100g"]);
  const protein = num(nutr["proteins_100g"]);
  const kcal =
    num(nutr["energy-kcal_100g"]) || num(nutr["energy_100g"]) / 4.184;
  const totalFat = num(nutr["fat_100g"]);
  const carbs = num(nutr["carbohydrates_100g"]);

  // Sugar analysis
  if (sugar > 0) {
    if (sugar > 20) {
      cons.push("Very high in sugar");
      nutritionScore -= 8;
    } else if (sugar > 15) {
      cons.push("High in sugar");
      nutritionScore -= 6;
    } else if (sugar > 10) {
      cons.push("Moderately high in sugar");
      nutritionScore -= 4;
    } else if (sugar > 5) {
      cons.push("Moderate sugar content");
      nutritionScore -= 2;
    } else {
      pros.push("Low in sugar");
      nutritionScore += 2;
    }
  }

  // Saturated fat analysis
  if (satFat > 0) {
    if (satFat > 10) {
      cons.push("Very high in saturated fat");
      nutritionScore -= 7;
    } else if (satFat > 5) {
      cons.push("High in saturated fat");
      nutritionScore -= 5;
    } else if (satFat > 2) {
      cons.push("Moderate saturated fat");
      nutritionScore -= 2;
    } else {
      pros.push("Low saturated fat");
      nutritionScore += 2;
    }
  }

  // Salt analysis
  if (salt > 0) {
    if (salt > 2) {
      cons.push("Very high in salt");
      nutritionScore -= 6;
    } else if (salt > 1.2) {
      cons.push("High in salt");
      nutritionScore -= 4;
    } else if (salt > 0.6) {
      cons.push("Moderate salt content");
      nutritionScore -= 2;
    } else {
      pros.push("Low salt");
      nutritionScore += 2;
    }
  }

  // Positive nutritional factors
  if (fiber >= 6) {
    pros.push("Excellent source of fiber");
    nutritionScore += 4;
  } else if (fiber >= 3) {
    pros.push("Good source of fiber");
    nutritionScore += 2;
  }

  if (protein >= 12) {
    pros.push("High protein content");
    nutritionScore += 3;
  } else if (protein >= 8) {
    pros.push("Good protein content");
    nutritionScore += 2;
  }

  // Calorie density
  if (kcal > 0) {
    if (kcal > 450) {
      cons.push("High calorie density");
      nutritionScore -= 2;
    } else if (kcal < 200) {
      pros.push("Low calorie density");
      nutritionScore += 1;
    }
  }

  // Fat quality
  if (totalFat > 0 && satFat > 0) {
    const satFatRatio = satFat / totalFat;
    if (satFatRatio < 0.3) {
      pros.push("Good fat profile");
      nutritionScore += 1;
    } else if (satFatRatio > 0.6) {
      cons.push("Poor fat profile");
      nutritionScore -= 2;
    }
  }

  // 2. PROCESSING SCORING (0-25 points)
  const nova = Number(p.nova_group || 0);
  if (nova === 1) {
    pros.push("Unprocessed or minimally processed");
    processingScore = 25;
  } else if (nova === 2) {
    pros.push("Processed culinary ingredients");
    processingScore = 20;
  } else if (nova === 3) {
    pros.push("Processed foods");
    processingScore = 12;
    cons.push("Moderately processed");
  } else if (nova === 4) {
    cons.push("Ultra-processed (NOVA 4)");
    processingScore = 5;
  } else {
    processingScore = 15; // Unknown processing level
  }

  // 3. INGREDIENT SCORING (0-20 points)
  const additivesCount = (p.additives_tags || []).length;
  if (additivesCount === 0) {
    pros.push("No additives listed");
    ingredientScore = 20;
  } else if (additivesCount <= 2) {
    pros.push("Minimal additives");
    ingredientScore = 15;
  } else if (additivesCount <= 5) {
    cons.push("Contains several additives");
    ingredientScore = 10;
  } else {
    cons.push("Many artificial additives");
    ingredientScore = 5;
  }

  // Allergen consideration
  const allergens = p.allergens_tags || [];
  if (allergens.length > 0) {
    cons.push(`Contains allergens: ${allergens.slice(0, 3).join(", ")}`);
    ingredientScore -= 2;
  }

  // 4. LABEL SCORING (0-15 points)
  const labels = (p.labels_tags || []).map((l) => l.toLowerCase());

  if (labels.some((l) => l.includes("organic"))) {
    pros.push("Organic certified");
    labelScore += 8;
  }

  if (labels.some((l) => l.includes("vegan"))) {
    pros.push("Vegan friendly");
    labelScore += 3;
  }

  if (labels.some((l) => l.includes("gluten-free"))) {
    pros.push("Gluten-free");
    labelScore += 2;
  }

  if (labels.some((l) => l.includes("fair-trade"))) {
    pros.push("Fair trade certified");
    labelScore += 2;
  }

  // Calculate total score (0-100 scale, then convert to 1-10)
  const totalScore = clamp(
    nutritionScore + processingScore + ingredientScore + labelScore,
    0,
    100
  );
  const finalScore = Math.round((totalScore / 10) * 2) / 2; // Round to nearest 0.5
  const clampedScore = clamp(finalScore, 1, 10);

  // Generate rationale
  const rationale = generateRationale({
    nutritionScore,
    processingScore,
    ingredientScore,
    labelScore,
    totalScore,
    finalScore: clampedScore,
    grade,
    nova,
    additivesCount,
    labels,
  });

  // Clean up and deduplicate pros/cons
  const uniq = (arr: string[]) => Array.from(new Set(arr)).slice(0, 6);

  return {
    score: clampedScore,
    pros: uniq(pros),
    cons: uniq(cons),
    rationale,
    details: {
      nutritionScore: Math.round(nutritionScore),
      processingScore: Math.round(processingScore),
      ingredientScore: Math.round(ingredientScore),
      labelScore: Math.round(labelScore),
    },
  };
}

function generateRationale(data: {
  nutritionScore: number;
  processingScore: number;
  ingredientScore: number;
  labelScore: number;
  totalScore: number;
  finalScore: number;
  grade: string;
  nova: number;
  additivesCount: number;
  labels: string[];
}): string {
  const {
    nutritionScore,
    processingScore,
    ingredientScore,
    labelScore,
    totalScore,
    finalScore,
    grade,
    nova,
    additivesCount,
    labels,
  } = data;

  let rationale = `Health score: ${finalScore}/10. `;

  if (grade) {
    rationale += `Based on Nutri-Score ${grade.toUpperCase()}, `;
  }

  if (nova === 1) {
    rationale += "minimal processing, ";
  } else if (nova === 4) {
    rationale += "ultra-processed, ";
  }

  if (additivesCount === 0) {
    rationale += "no additives, ";
  } else if (additivesCount > 5) {
    rationale += "many additives, ";
  }

  if (labels.some((l) => l.includes("organic"))) {
    rationale += "organic certified, ";
  }

  rationale += `scoring ${Math.round(
    totalScore
  )}/100 across nutrition (${Math.round(
    nutritionScore
  )}), processing (${Math.round(processingScore)}), ingredients (${Math.round(
    ingredientScore
  )}), and labels (${Math.round(labelScore)}).`;

  return rationale;
}

function num(v: any): number {
  const n = Number(v);
  return isFinite(n) ? n : -1;
}

// Utility function to get score category
export function getScoreCategory(score: number): {
  name: string;
  color: string;
  description: string;
} {
  if (score >= 8.5) {
    return {
      name: "Excellent",
      color: "emerald",
      description: "Very healthy choice",
    };
  } else if (score >= 7) {
    return {
      name: "Good",
      color: "green",
      description: "Healthy option",
    };
  } else if (score >= 5.5) {
    return {
      name: "Fair",
      color: "yellow",
      description: "Moderate health impact",
    };
  } else if (score >= 4) {
    return {
      name: "Poor",
      color: "orange",
      description: "Limited health benefits",
    };
  } else {
    return {
      name: "Very Poor",
      color: "red",
      description: "Not recommended for health",
    };
  }
}
