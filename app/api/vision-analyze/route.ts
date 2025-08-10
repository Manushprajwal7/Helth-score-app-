import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { xai } from "@ai-sdk/xai";

// CORS headers for the vision analysis endpoint
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    // Check if we have any AI provider configured
    const openaiKey = process.env.OPENAI_API_KEY;
    const xaiKey = process.env.XAI_API_KEY;

    if (!openaiKey && !xaiKey) {
      return NextResponse.json(
        { error: "No AI provider configured" },
        { status: 503, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { imageData, description } = body;

    // Validate input
    if (!imageData || !description) {
      return NextResponse.json(
        { error: "Missing required fields: imageData and description" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Choose AI provider (prefer OpenAI if both are available)
    const aiProvider = openaiKey ? openai : xai;
    const providerName = openaiKey ? "OpenAI" : "xAI";

    // Create a comprehensive prompt for product identification and health analysis
    const systemPrompt = `You are a professional nutritionist and health expert specializing in food product analysis. Your task is to:

1. Identify the food product from the image description
2. Analyze its potential health impact
3. Provide a comprehensive health assessment

IMPORTANT: Respond with ONLY a valid JSON object in this exact format:
{
  "productName": "string",
  "productType": "string", 
  "healthScore": number (1-10),
  "pros": ["string", "string", "string"],
  "cons": ["string", "string", "string"],
  "rationale": "string",
  "nutritionalNotes": "string",
  "recommendations": "string"
}

Guidelines:
- Health score: 1-10 scale where 10 is extremely healthy, 1 is very unhealthy
- Pros: 3-4 positive health aspects
- Cons: 3-4 health concerns or limitations
- Rationale: Brief explanation of the score
- Nutritional notes: Key nutritional highlights
- Recommendations: How to consume this product healthily

Be objective, evidence-based, and consider factors like:
- Processing level (whole vs processed)
- Nutrient density
- Sugar, salt, and fat content
- Additives and preservatives
- Organic/natural status
- Portion control importance`;

    const userPrompt = `Analyze this food product:

Image Description: ${description}

Please provide a comprehensive health assessment following the JSON format specified.`;

    try {
      const result = await generateText({
        model: aiProvider("gpt-4o-mini"),
        system: systemPrompt,
        prompt: userPrompt,

        temperature: 0.3,
      });

      // Extract JSON from the response
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to extract JSON from AI response");
      }

      const analysis = JSON.parse(jsonMatch[0]);

      // Validate the response structure
      if (!analysis.productName || typeof analysis.healthScore !== "number") {
        throw new Error("Invalid AI response structure");
      }

      // Ensure health score is within bounds
      analysis.healthScore = Math.max(1, Math.min(10, analysis.healthScore));

      return NextResponse.json(
        {
          success: true,
          analysis,
          aiProvider: providerName,
          enhanced: true,
        },
        { headers: corsHeaders }
      );
    } catch (aiError) {
      console.error("AI generation error:", aiError);
      return NextResponse.json(
        {
          error: "AI analysis failed",
          details: aiError instanceof Error ? aiError.message : "Unknown error",
        },
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error("Vision analysis error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
