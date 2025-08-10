#!/usr/bin/env node

/**
 * Test script for Live Health Scorer API endpoints
 * Run with: node scripts/test-api.js
 */

const BASE_URL = "http://localhost:3000";

async function testAPI() {
  console.log("🧪 Testing Live Health Scorer API...\n");

  // Test 1: Check AI availability
  console.log("1. Testing AI availability...");
  try {
    const aiCheck = await fetch(`${BASE_URL}/api/ai-score`, {
      method: "OPTIONS",
    });
    console.log(`   Status: ${aiCheck.status} ${aiCheck.statusText}`);
    console.log(`   AI Available: ${aiCheck.ok ? "✅ Yes" : "❌ No"}`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 2: Test with sample product data
  console.log("\n2. Testing AI scoring with sample data...");
  try {
    const sampleProduct = {
      product: {
        product_name: "Organic Whole Grain Bread",
        brands: "Healthy Grains Co",
        categories: "Bread and bakery products",
        ingredients_text:
          "Organic whole wheat flour, water, organic honey, sea salt, organic yeast",
        nutriments: {
          "energy-kcal_100g": 250,
          proteins_100g: 8,
          carbohydrates_100g: 45,
          fat_100g: 2,
          "saturated-fat_100g": 0.5,
          sugars_100g: 3,
          fiber_100g: 6,
          salt_100g: 0.8,
        },
        nutriscore_grade: "A",
        nova_group: 2,
        additives_tags: [],
        labels_tags: ["organic", "whole-grain", "vegan"],
        allergens_tags: ["gluten"],
      },
      baseScore: 8.5,
      basePros: ["High in fiber", "Low in sugar", "Organic ingredients"],
      baseCons: ["Contains gluten"],
    };

    const response = await fetch(`${BASE_URL}/api/ai-score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sampleProduct),
    });

    if (response.ok) {
      const result = await response.json();
      console.log("   ✅ AI scoring successful!");
      console.log(`   Score: ${result.score}/10`);
      console.log(`   AI Provider: ${result.aiProvider || "Unknown"}`);
      console.log(`   Enhanced: ${result.enhanced ? "Yes" : "No"}`);
      console.log(`   Pros: ${result.pros.length} items`);
      console.log(`   Cons: ${result.cons.length} items`);
      console.log(`   Rationale: ${result.rationale?.substring(0, 100)}...`);
    } else {
      const error = await response.text();
      console.log(
        `   ❌ AI scoring failed: ${response.status} ${response.statusText}`
      );
      console.log(`   Error: ${error}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 3: Test error handling
  console.log("\n3. Testing error handling...");
  try {
    const response = await fetch(`${BASE_URL}/api/ai-score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invalid: "data" }),
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);
    if (!response.ok) {
      const error = await response.json();
      console.log(`   ✅ Error handling working: ${error.error}`);
    } else {
      console.log("   ⚠️  Unexpected success with invalid data");
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  console.log("\n🏁 API testing complete!");
}

// Run tests
testAPI().catch(console.error);
