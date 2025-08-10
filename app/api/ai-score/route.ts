import { NextResponse } from "next/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { xai } from "@ai-sdk/xai";

// AI refinement via the AI SDK (provider-agnostic)
export async function OPTIONS() {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasXAI = !!process.env.XAI_API_KEY;
  const ok = hasOpenAI || hasXAI;

  return new NextResponse(null, {
    status: ok ? 200 : 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(req: Request) {
  try {
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasXAI = !!process.env.XAI_API_KEY;

    if (!hasOpenAI && !hasXAI) {
      return NextResponse.json(
        {
          error:
            "AI not configured. Please add OPENAI_API_KEY or XAI_API_KEY to your environment variables.",
        },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body?.product) {
      return NextResponse.json(
        { error: "Missing product data" },
        { status: 400 }
      );
    }

    const { product, baseScore, basePros, baseCons } = body as {
      product: any;
      baseScore: number;
      basePros: string[];
      baseCons: string[];
    };

    // Validate input data
    if (typeof baseScore !== "number" || baseScore < 1 || baseScore > 10) {
      return NextResponse.json(
        { error: "Invalid base score. Must be a number between 1-10." },
        { status: 400 }
      );
    }

    if (!Array.isArray(basePros) || !Array.isArray(baseCons)) {
      return NextResponse.json(
        { error: "Invalid pros/cons arrays" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a professional nutritionist and health expert. Your task is to analyze food product data and provide a comprehensive health assessment.

Given the product information, produce:
1. A health score from 1-10 (10 being healthiest)
2. 3-6 specific health benefits (pros)
3. 3-6 specific health concerns (cons)
4. A brief, evidence-based rationale for the score

Guidelines:
- Base your assessment on the provided base score and existing pros/cons
- Consider nutritional values, ingredients, processing level, and additives
- Be specific and actionable in your recommendations
- Use scientific evidence when possible
- Keep language simple and accessible

Return ONLY valid JSON with this exact structure:
{
  "score": number,
  "pros": string[],
  "cons": string[],
  "rationale": string
}`;

    const userPrompt = `Analyze this food product and provide a health assessment:

Base Assessment:
- Score: ${baseScore}/10
- Current Pros: ${basePros.join(", ") || "None identified"}
- Current Cons: ${baseCons.join(", ") || "None identified"}

Product Data:
${JSON.stringify(product, null, 2)}

Provide your assessment in valid JSON format.`;

    // Select AI provider
    let provider;
    let modelName;

    if (hasOpenAI) {
      provider = openai("gpt-4o");
      modelName = "GPT-4o";
    } else {
      provider = xai("grok-3");
      modelName = "Grok-3";
    }

    const { text } = await generateText({
      model: provider,
      system: systemPrompt,
      prompt: userPrompt,

      temperature: 0.3,
    });

    // Extract JSON from response
    let parsed;
    try {
      // Find JSON in the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("Raw response:", text);

      // Fallback to base score with enhanced rationale
      return NextResponse.json({
        score: baseScore,
        pros: basePros,
        cons: baseCons,
        rationale: `AI analysis completed but response parsing failed. Using base assessment: ${baseScore}/10 score based on nutritional analysis.`,
        fallback: true,
      });
    }

    // Validate and sanitize AI response
    const score = Math.max(
      1,
      Math.min(10, Math.round(Number(parsed.score) || baseScore))
    );
    const pros = Array.isArray(parsed.pros)
      ? parsed.pros
          .filter((p: any) => typeof p === "string" && p.trim().length > 0)
          .slice(0, 6)
      : basePros;
    const cons = Array.isArray(parsed.cons)
      ? parsed.cons
          .filter((c: any) => typeof c === "string" && c.trim().length > 0)
          .slice(0, 6)
      : baseCons;
    const rationale =
      typeof parsed.rationale === "string" && parsed.rationale.trim().length > 0
        ? parsed.rationale.trim()
        : `AI-enhanced assessment using ${modelName}. Score: ${score}/10 based on comprehensive nutritional analysis.`;

    // Merge with base assessment for better coverage
    const finalPros = Array.from(new Set([...pros, ...basePros])).slice(0, 6);
    const finalCons = Array.from(new Set([...cons, ...baseCons])).slice(0, 6);

    return NextResponse.json({
      score,
      pros: finalPros,
      cons: finalCons,
      rationale,
      aiProvider: modelName,
      enhanced: true,
    });
  } catch (error) {
    console.error("AI scoring error:", error);

    return NextResponse.json(
      {
        error: "AI processing failed. Please try again or use base scoring.",
        details:
          process.env.NODE_ENV === "development"
            ? (error as any).message
            : undefined,
      },
      { status: 500 }
    );
  }
}
