#!/usr/bin/env node

/**
 * Test script for the vision analysis API endpoint
 * Run with: npm run test:vision
 */

const BASE_URL = "http://localhost:3000";

async function testVisionAPI() {
  console.log("🧪 Testing Vision Analysis API...\n");

  try {
    // Test 1: Check if endpoint is available
    console.log("1️⃣ Testing endpoint availability...");
    const optionsRes = await fetch(`${BASE_URL}/api/vision-analyze`, {
      method: "OPTIONS",
    });

    if (optionsRes.ok) {
      console.log("✅ OPTIONS request successful");
      console.log(
        "   CORS headers:",
        Object.fromEntries(optionsRes.headers.entries())
      );
    } else {
      console.log("❌ OPTIONS request failed:", optionsRes.status);
    }

    // Test 2: Test with sample image data
    console.log("\n2️⃣ Testing vision analysis with sample data...");

    const sampleData = {
      imageData:
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
      description: "A fresh green apple with red blush, organic, whole fruit",
    };

    const visionRes = await fetch(`${BASE_URL}/api/vision-analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sampleData),
    });

    if (visionRes.ok) {
      const result = await visionRes.json();
      console.log("✅ Vision analysis successful");
      console.log("   AI Provider:", result.aiProvider);
      console.log("   Enhanced:", result.enhanced);
      console.log("   Product Name:", result.analysis.productName);
      console.log("   Health Score:", result.analysis.healthScore);
      console.log("   Pros:", result.analysis.pros.length, "items");
      console.log("   Cons:", result.analysis.cons.length, "items");
      console.log(
        "   Rationale:",
        result.analysis.rationale.substring(0, 100) + "..."
      );
    } else {
      const errorData = await visionRes.json().catch(() => ({}));
      console.log("❌ Vision analysis failed:", visionRes.status);
      console.log("   Error:", errorData.error || "Unknown error");
      console.log("   Details:", errorData.details || "No details");
    }

    // Test 3: Test error handling
    console.log("\n3️⃣ Testing error handling...");

    const invalidRes = await fetch(`${BASE_URL}/api/vision-analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageData: "invalid" }), // Missing description
    });

    if (invalidRes.status === 400) {
      console.log("✅ Error handling working correctly");
      const errorData = await invalidRes.json();
      console.log("   Expected error:", errorData.error);
    } else {
      console.log(
        "❌ Error handling not working as expected:",
        invalidRes.status
      );
    }
  } catch (error) {
    console.error("❌ Test failed with error:", error.message);

    if (error.code === "ECONNREFUSED") {
      console.log("\n💡 Make sure the development server is running:");
      console.log("   npm run dev");
    }
  }

  console.log("\n🏁 Vision API testing complete!");
}

// Run the tests
testVisionAPI().catch(console.error);
