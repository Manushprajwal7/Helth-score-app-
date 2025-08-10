"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Camera,
  RefreshCw,
  Volume2,
  VolumeX,
  RotateCcw,
  Salad,
  Info,
  Sparkles,
  ScanBarcode,
  AlertCircle,
  Eye,
  Brain,
  Zap,
} from "lucide-react";
import { VisionScanner } from "@/components/vision-scanner";
import { ScoreGauge } from "@/components/score-gauge";
import { ProsCons } from "@/components/pros-cons";
import { ProductCard } from "@/components/product-card";
import {
  fetchProductByBarcode,
  type OFFProduct,
  type OFFResponse,
} from "@/lib/open-food-facts";
import {
  computeHealthScore,
  type ScoreResult,
  getScoreCategory,
} from "@/lib/scoring";
import { useSpeech } from "@/hooks/use-speech";
import { cn } from "@/lib/utils";

export default function Page() {
  const [scanning, setScanning] = useState<boolean>(true);
  const [lastBarcode, setLastBarcode] = useState<string>("");
  const [product, setProduct] = useState<OFFProduct | null>(null);
  const [score, setScore] = useState<ScoreResult>({
    score: 0,
    pros: [],
    cons: [],
    rationale: "",
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [muted, setMuted] = useState<boolean>(false);
  const [useBackCamera, setUseBackCamera] = useState<boolean>(true);
  const [enhanceWithAI, setEnhanceWithAI] = useState<boolean>(false);
  const [aiAvailable, setAiAvailable] = useState<boolean>(false);
  const [aiBusy, setAiBusy] = useState<boolean>(false);
  const [confidence, setConfidence] = useState<number>(0);
  const [visionMode, setVisionMode] = useState<"barcode" | "vision">("barcode");
  const [visionAnalysis, setVisionAnalysis] = useState<any>(null);
  const [unknownProduct, setUnknownProduct] = useState<{
    barcode: string;
    description: string;
  } | null>(null);
  const [scanHistory, setScanHistory] = useState<
    Array<{
      barcode: string;
      product: OFFProduct;
      score: ScoreResult;
      timestamp: number;
    }>
  >([]);
  const { speak, cancel } = useSpeech();
  const vibrate = (ms = 20) =>
    "vibrate" in navigator ? navigator.vibrate(ms) : undefined;

  // Detect if AI keys exist on the server
  useEffect(() => {
    const checkAI = async () => {
      try {
        const res = await fetch("/api/ai-score", { method: "OPTIONS" });
        setAiAvailable(res.ok);
      } catch {
        setAiAvailable(false);
      }
    };
    checkAI();
  }, []);

  const speakScore = useCallback(
    (s: ScoreResult) => {
      if (muted) return;
      const category = getScoreCategory(s.score);
      const prosText = s.pros.slice(0, 2).join(", ");
      const consText = s.cons.slice(0, 2).join(", ");
      const utterance =
        `${category.name} health score: ${s.score} out of 10. ` +
        (prosText ? `Benefits: ${prosText}. ` : "") +
        (consText ? `Concerns: ${consText}. ` : "");
      speak(utterance, { rate: 1.02, pitch: 1.0, volume: 1.0 });
    },
    [muted, speak]
  );

  const analyzeUnknownProduct = useCallback(
    async (barcode: string, description: string) => {
      if (!aiAvailable) {
        setError(
          "AI analysis not available. Please try scanning a different product or check your connection."
        );
        return;
      }

      setLoading(true);
      setError("");
      setUnknownProduct({ barcode, description });

      try {
        const response = await fetch("/api/ai-score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product: {
              product_name: `Unknown Product (${barcode})`,
              brands: "",
              categories: "Unknown",
              ingredients_text: description,
              nutriments: {},
              nutriscore_grade: "",
              nova_group: "",
              additives_tags: [],
              labels_tags: [],
              allergens_tags: [],
              traces_tags: [],
            },
            baseScore: 5,
            basePros: ["Product identified", "AI analysis available"],
            baseCons: ["Limited nutritional data", "Product not in database"],
            description: description,
          }),
        });

        if (response.ok) {
          const aiResult: ScoreResult = await response.json();
          setScore(aiResult);
          speakScore(aiResult);

          // Add to scan history
          setScanHistory((prev) => [
            {
              barcode,
              product: {
                product_name: `Unknown Product (${barcode})`,
                brands: "",
                categories: "Unknown",
                ingredients_text: description,
                nutriments: {},
                nutriscore_grade: "",
                nova_group: "",
                additives_tags: [],
                labels_tags: [],
                allergens_tags: [],
                traces_tags: [],
              } as any,
              score: aiResult,
              timestamp: Date.now(),
            },
            ...prev.slice(0, 9),
          ]);
        } else {
          throw new Error("AI analysis failed");
        }
      } catch (e) {
        console.error("Unknown product analysis error:", e);
        setError(
          "Failed to analyze unknown product. Please try again or scan a different product."
        );
      } finally {
        setLoading(false);
      }
    },
    [aiAvailable, speakScore]
  );

  const onDetected = useCallback(
    async (barcode: string, approxConfidence?: number) => {
      if (!barcode || barcode === lastBarcode) return;
      setLastBarcode(barcode);
      if (typeof approxConfidence === "number") {
        setConfidence(Math.max(0, Math.min(1, approxConfidence)));
      }
      vibrate(15);

      setError("");
      setLoading(true);
      setProduct(null);
      setScore({ score: 0, pros: [], cons: [], rationale: "" });
      setUnknownProduct(null);
      setVisionAnalysis(null);

      try {
        const data: OFFResponse | null = await fetchProductByBarcode(barcode);

        if (!data) {
          setError(
            "Network error. Please check your connection and try again."
          );
          setLoading(false);
          return;
        }

        if (data.status !== 1 || !data.product) {
          if (data.status === 404) {
            // Product not found - offer AI analysis
            const shouldAnalyze = confirm(
              `Product with barcode ${barcode} not found in our database. Would you like to analyze it using AI vision analysis instead?`
            );

            if (shouldAnalyze) {
              // Switch to vision mode and prompt for description
              setVisionMode("vision");
              const description = prompt(
                "Please describe what you see in the product to get an AI-powered health assessment:"
              );

              if (description) {
                await analyzeUnknownProduct(barcode, description);
                return;
              }
            }

            setError(
              "Product not found in our database. Try another product, use computer vision, or check the barcode."
            );
          } else if (data.status === 429) {
            setError(
              "Too many requests. Please wait a moment before scanning again."
            );
          } else if (data.error) {
            setError(data.error);
          } else {
            setError("Unable to fetch product information. Please try again.");
          }
          setLoading(false);
          return;
        }

        setProduct(data.product);
        const baseScore = computeHealthScore(data.product);
        setScore(baseScore);
        speakScore(baseScore);

        // Add to scan history
        setScanHistory((prev) => [
          {
            barcode,
            product: data.product!,
            score: baseScore,
            timestamp: Date.now(),
          },
          ...prev.slice(0, 9), // Keep last 10 scans
        ]);

        if (enhanceWithAI && aiAvailable) {
          setAiBusy(true);
          try {
            const resp = await fetch("/api/ai-score", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                product: {
                  product_name: data.product.product_name,
                  brands: data.product.brands,
                  categories: data.product.categories,
                  ingredients_text: data.product.ingredients_text,
                  nutriments: data.product.nutriments,
                  nutriscore_grade: data.product.nutriscore_grade,
                  nova_group: data.product.nova_group,
                  additives_tags: data.product.additives_tags,
                  labels_tags: data.product.labels_tags,
                  allergens_tags: data.product.allergens_tags,
                  traces_tags: data.product.traces_tags,
                },
                baseScore: baseScore.score,
                basePros: baseScore.pros,
                baseCons: baseScore.cons,
              }),
            });

            if (resp.ok) {
              const enriched: ScoreResult = await resp.json();
              setScore(enriched);
              speakScore(enriched);

              // Update scan history with AI-enhanced score
              setScanHistory((prev) =>
                prev.map((item) =>
                  item.barcode === barcode ? { ...item, score: enriched } : item
                )
              );
            } else {
              const errorData = await resp.json().catch(() => ({}));
              console.warn(
                "AI enhancement failed:",
                errorData.error || "Unknown error"
              );
              // Continue with base score - this is not a critical error
            }
          } catch (aiError) {
            console.warn("AI enhancement error:", aiError);
            // Continue with base score - this is not a critical error
          } finally {
            setAiBusy(false);
          }
        }
      } catch (e) {
        console.error("Scanning error:", e);
        setError("An unexpected error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [
      aiAvailable,
      enhanceWithAI,
      lastBarcode,
      speakScore,
      analyzeUnknownProduct,
      setVisionMode,
    ]
  );

  const resetScan = () => {
    setLastBarcode("");
    setProduct(null);
    setScore({ score: 0, pros: [], cons: [], rationale: "" });
    setError("");
    setConfidence(0);
    setVisionAnalysis(null);
    setUnknownProduct(null);
  };

  const handleVisionAnalysis = useCallback(
    async (result: any) => {
      setError("");
      setLoading(true);
      setProduct(null);
      setVisionAnalysis(result);

      // Convert vision analysis to our score format
      const visionScore: ScoreResult = {
        score: result.healthScore,
        pros: result.pros || [],
        cons: result.cons || [],
        rationale: result.rationale || "",
      };

      setScore(visionScore);
      speakScore(visionScore);

      // Add to scan history
      setScanHistory((prev) => [
        {
          barcode: `vision_${Date.now()}`,
          product: {
            product_name: result.productName,
            brands: "",
            categories: result.productType,
            ingredients_text: "",
            nutriments: {},
            nutriscore_grade: "",
            nova_group: "",
            additives_tags: [],
            labels_tags: [],
            allergens_tags: [],
            traces_tags: [],
          } as any,
          score: visionScore,
          timestamp: Date.now(),
        },
        ...prev.slice(0, 9), // Keep last 10 scans
      ]);

      setLoading(false);
    },
    [speakScore]
  );

  const healthGrad = useMemo(() => {
    const s = score.score || 0;
    if (s >= 8) return "from-emerald-500 via-green-500 to-teal-500";
    if (s >= 6) return "from-lime-500 via-yellow-400 to-amber-400";
    if (s >= 4) return "from-orange-500 via-amber-500 to-yellow-500";
    return "from-rose-500 via-red-500 to-pink-500";
  }, [score.score]);

  const scoreCategory = useMemo(
    () => getScoreCategory(score.score),
    [score.score]
  );

  return (
    <main className="min-h-[100svh] w-full bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-50 text-neutral-900">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6 md:py-8">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-12 w-12 rounded-2xl bg-gradient-to-br p-[2px]",
                healthGrad
              )}
            >
              <div className="flex h-full w-full items-center justify-center rounded-[22px] bg-white/90">
                <Salad
                  className="h-7 w-7 text-emerald-600"
                  aria-hidden="true"
                />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-cyan-600 sm:text-4xl">
                Live Health Scorer
              </h1>
              <p className="text-sm text-neutral-600">
                Scan barcodes or use computer vision to analyze food products
                and get real-time health scores with AI-powered insights.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border bg-white/80 backdrop-blur-sm px-3 py-2 shadow-sm">
              <Brain className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-neutral-600">AI enhance</span>
              <Switch
                checked={enhanceWithAI && aiAvailable}
                onCheckedChange={(v) => setEnhanceWithAI(v)}
                disabled={!aiAvailable}
                aria-label="Toggle AI-enhanced scoring"
              />
            </div>
            <div className="flex items-center gap-2 rounded-full border bg-white/80 backdrop-blur-sm px-3 py-2 shadow-sm">
              <Camera className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-neutral-600">Back camera</span>
              <Switch
                checked={useBackCamera}
                onCheckedChange={setUseBackCamera}
                aria-label="Toggle back camera"
              />
            </div>
            <Button
              variant="ghost"
              className="gap-2 hover:bg-white/80"
              onClick={() => setMuted((m) => (m ? (cancel(), false) : true))}
              aria-label={muted ? "Unmute voice" : "Mute voice"}
            >
              {muted ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
              <span className="hidden sm:inline">
                {muted ? "Muted" : "Voice"}
              </span>
            </Button>
          </div>
        </motion.header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Scanner panel */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white to-emerald-50/50">
              <CardHeader className="pb-3 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Smart Scanner
                </CardTitle>
                <CardDescription className="text-emerald-100">
                  Scan barcodes or use computer vision to analyze products.
                  Switch between modes using the buttons.
                </CardDescription>
              </CardHeader>
              <CardContent className="relative p-6">
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl border-2 border-emerald-200 bg-black shadow-lg">
                  <VisionScanner
                    onDetected={onDetected}
                    onVisionAnalysis={handleVisionAnalysis}
                    scanning={scanning}
                    useBackCamera={useBackCamera}
                    showOverlay
                    enableVision={aiAvailable}
                  />

                  {/* Gradient aura on detection */}
                  <motion.div
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none absolute inset-0 opacity-60",
                      score.score > 0
                        ? "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] " +
                            healthGrad
                        : ""
                    )}
                    animate={{ opacity: score.score > 0 ? 0.55 : 0 }}
                    transition={{ duration: 0.6 }}
                  />

                  {/* Confidence indicator */}
                  <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="bg-white/90 backdrop-blur border-emerald-200"
                    >
                      Confidence: {Math.round(confidence * 100)}%
                    </Badge>
                  </div>

                  {/* Controls */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <Button
                      variant="secondary"
                      className="bg-white/90 backdrop-blur border-emerald-200 hover:bg-emerald-50"
                      onClick={() => setScanning((s) => !s)}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {scanning ? "Pause" : "Resume"}
                    </Button>
                    <Button
                      variant="secondary"
                      className="bg-white/90 backdrop-blur border-emerald-200 hover:bg-emerald-50"
                      onClick={resetScan}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset
                    </Button>
                  </div>

                  {/* Barcode hint on mobile */}
                  <div className="absolute bottom-3 right-3 hidden items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs text-neutral-700 shadow-sm backdrop-blur sm:flex">
                    <ScanBarcode className="h-4 w-4" />
                    Aim at barcode
                  </div>
                </div>

                {error ? (
                  <Alert
                    variant="destructive"
                    className="mt-6 border-red-200 bg-red-50"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Scan issue</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-white to-emerald-50 p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-neutral-600">
                          Last Barcode
                        </span>
                        <Badge variant="outline" className="border-emerald-200">
                          {lastBarcode ? "Detected" : "—"}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-lg font-semibold text-emerald-800">
                        {lastBarcode || "Waiting..."}
                      </p>
                    </div>

                    <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-white to-blue-50 p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-neutral-600">
                          Status
                        </span>
                        {aiBusy ? (
                          <Badge className="bg-purple-600">AI refining</Badge>
                        ) : loading ? (
                          <Badge className="bg-amber-500">Fetching</Badge>
                        ) : visionAnalysis ? (
                          <Badge className="bg-emerald-600">
                            Vision analyzed
                          </Badge>
                        ) : product ? (
                          <Badge className="bg-emerald-600">Analyzed</Badge>
                        ) : (
                          <Badge variant="outline" className="border-blue-200">
                            Idle
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 truncate text-lg font-semibold text-blue-800">
                        {aiBusy
                          ? "Enhancing insights..."
                          : loading
                          ? "Fetching product..."
                          : visionAnalysis
                          ? "Vision analyzed"
                          : product
                          ? "Ready"
                          : "Waiting..."}
                      </p>
                    </div>
                  </div>
                )}

                {/* Scan History */}
                {scanHistory.length > 0 && (
                  <div className="mt-6 rounded-xl border border-cyan-200 bg-gradient-to-br from-white to-cyan-50 p-4 shadow-sm">
                    <h4 className="mb-3 text-sm font-semibold text-cyan-800">
                      Recent Scans
                    </h4>
                    <div className="space-y-2">
                      {scanHistory.slice(0, 3).map((item, index) => (
                        <div
                          key={item.barcode + index}
                          className="flex items-center justify-between rounded-lg border border-cyan-200 bg-gradient-to-r from-cyan-50 to-blue-50 px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-cyan-800">
                              {item.product.product_name || "Unknown Product"}
                            </p>
                            <p className="text-xs text-neutral-600">
                              {item.barcode.startsWith("vision_")
                                ? "Computer Vision"
                                : item.barcode}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="ml-2 border-cyan-300 text-cyan-700"
                          >
                            {item.score.score}/10
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Results panel */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
          >
            <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white to-blue-50/50">
              <CardHeader className="pb-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-300" />
                  Health Score
                </CardTitle>
                <CardDescription className="text-blue-100 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Live scoring with animated insights
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-6">
                  <div className="flex flex-col items-stretch gap-5 sm:flex-row sm:items-center">
                    <ScoreGauge score={score.score} />
                    <div className="min-w-0 flex-1">
                      <ProductCard product={product} loading={loading} />
                    </div>
                  </div>

                  {/* Score Category */}
                  {score.score > 0 && (
                    <div className="rounded-xl border border-teal-200 bg-gradient-to-br from-white to-teal-50 p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-teal-800">
                            Health Rating
                          </h4>
                          <p className="text-xs text-neutral-600">
                            {scoreCategory.description}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "border-2",
                            scoreCategory.color === "emerald" &&
                              "border-emerald-500 text-emerald-700",
                            scoreCategory.color === "green" &&
                              "border-green-500 text-green-700",
                            scoreCategory.color === "yellow" &&
                              "border-yellow-500 text-yellow-700",
                            scoreCategory.color === "orange" &&
                              "border-orange-500 text-orange-700",
                            scoreCategory.color === "red" &&
                              "border-red-500 text-red-700"
                          )}
                        >
                          {scoreCategory.name}
                        </Badge>
                      </div>
                    </div>
                  )}

                  <Separator className="my-1" />

                  <ProsCons pros={score.pros} cons={score.cons} />

                  {score.rationale ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="rounded-xl border border-emerald-200 bg-gradient-to-br from-white to-emerald-50 p-4 shadow-sm"
                    >
                      <p className="text-sm text-neutral-700">
                        {score.rationale}
                      </p>
                    </motion.div>
                  ) : null}

                  {/* Vision Analysis Details */}
                  {visionAnalysis && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-4 shadow-sm"
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <Eye className="h-4 w-4 text-emerald-600" />
                        <h4 className="text-sm font-semibold text-emerald-800">
                          AI Vision Analysis
                        </h4>
                        <Badge
                          variant="outline"
                          className="bg-emerald-100 text-emerald-700 border-emerald-300"
                        >
                          Computer Vision
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-emerald-700">
                            Product Type
                          </p>
                          <p className="text-sm text-emerald-800">
                            {visionAnalysis.productType}
                          </p>
                        </div>

                        {visionAnalysis.nutritionalNotes && (
                          <div>
                            <p className="text-xs font-medium text-emerald-700">
                              Nutritional Notes
                            </p>
                            <p className="text-sm text-emerald-800">
                              {visionAnalysis.nutritionalNotes}
                            </p>
                          </div>
                        )}

                        {visionAnalysis.recommendations && (
                          <div>
                            <p className="text-xs font-medium text-emerald-700">
                              Recommendations
                            </p>
                            <p className="text-sm text-emerald-800">
                              {visionAnalysis.recommendations}
                            </p>
                          </div>
                        )}

                        {visionAnalysis.fallback && (
                          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
                            <div className="flex items-center gap-2 text-amber-800">
                              <AlertCircle className="h-4 w-4" />
                              <span className="text-sm font-medium">
                                Fallback Assessment
                              </span>
                            </div>
                            <p className="text-xs text-amber-700 mt-1">
                              This assessment was generated using fallback
                              methods due to AI analysis limitations.
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Unknown Product Analysis */}
                  {unknownProduct && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-4 shadow-sm"
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-purple-600" />
                        <h4 className="text-sm font-semibold text-purple-800">
                          AI Analysis for Unknown Product
                        </h4>
                        <Badge
                          variant="outline"
                          className="bg-purple-100 text-purple-700 border-purple-300"
                        >
                          AI Enhanced
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-purple-700">
                            Barcode
                          </p>
                          <p className="text-sm text-purple-800 font-mono">
                            {unknownProduct.barcode}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-purple-700">
                            Description
                          </p>
                          <p className="text-sm text-purple-800">
                            {unknownProduct.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Voice controls */}
                  <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-white to-blue-50 p-4 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-blue-800">
                          Voice Settings
                        </h4>
                        <p className="text-xs text-neutral-600">
                          Uses your browser&apos;s speech synthesis. Enable AI
                          for richer reasoning and summaries.
                        </p>
                      </div>
                      <div className="flex w-full items-center gap-4 sm:w-auto">
                        <div className="w-full sm:w-40">
                          <label
                            htmlFor="rate"
                            className="mb-1 block text-xs text-neutral-600"
                          >
                            Rate
                          </label>
                          <Slider
                            id="rate"
                            min={0.7}
                            max={1.3}
                            step={0.01}
                            defaultValue={[1.02]}
                            onValueChange={(v) =>
                              speak(undefined, { rate: v[0] })
                            }
                          />
                        </div>
                        <div className="w-full sm:w-40">
                          <label
                            htmlFor="pitch"
                            className="mb-1 block text-xs text-neutral-600"
                          >
                            Pitch
                          </label>
                          <Slider
                            id="pitch"
                            min={0.7}
                            max={1.3}
                            step={0.01}
                            defaultValue={[1.0]}
                            onValueChange={(v) =>
                              speak(undefined, { pitch: v[0] })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {!aiAvailable ? (
                    <Alert className="bg-gradient-to-br from-white to-amber-50 border-amber-200">
                      <AlertTitle>Optional AI Refinement</AlertTitle>
                      <AlertDescription>
                        Add an AI provider key to enhance scoring and generate
                        richer insights. This app uses the AI SDK to connect to
                        models like GPT&#45;4o or Grok.
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  {/* ARIA live region for screen readers */}
                  <div
                    className="sr-only"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {product?.product_name
                      ? `Product ${product.product_name}. Health score ${score.score}. Rating: ${scoreCategory.name}.`
                      : "Awaiting product."}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <footer className="mt-12 text-center text-xs text-neutral-500">
          <div className="flex items-center justify-center gap-2">
            <div className="h-1 w-1 rounded-full bg-emerald-400"></div>
            <div className="h-1 w-1 rounded-full bg-cyan-400"></div>
            <div className="h-1 w-1 rounded-full bg-blue-400"></div>
          </div>
          <p className="mt-2">
            Privacy friendly: camera frames stay on device. Barcode lookup uses
            Open Food Facts API. Computer vision analysis powered by AI.
            Optional AI enhancement via the AI SDK.
          </p>
        </footer>
      </div>
    </main>
  );
}
