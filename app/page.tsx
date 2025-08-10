"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Info,
  Sparkles,
  AlertCircle,
  Eye,
  Brain,
  Zap,
  Heart,
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

// Floating orb component for background animation
const FloatingOrb = ({
  delay = 0,
  duration = 20,
  size = "w-32 h-32",
  color = "bg-gradient-to-br from-emerald-400/20 to-cyan-400/20",
}) => (
  <motion.div
    className={cn("absolute rounded-full blur-xl", size, color)}
    animate={{
      x: [0, 100, -50, 0],
      y: [0, -100, 50, 0],
      scale: [1, 1.2, 0.8, 1],
    }}
    transition={{
      duration,
      delay,
      repeat: Number.POSITIVE_INFINITY,
      ease: "easeInOut",
    }}
  />
);

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
    if (s >= 8) return "from-emerald-400 via-green-400 to-teal-400";
    if (s >= 6) return "from-lime-400 via-yellow-400 to-amber-400";
    if (s >= 4) return "from-orange-400 via-amber-400 to-rose-400";
    return "from-rose-400 via-red-400 to-pink-400";
  }, [score.score]);

  const scoreCategory = useMemo(
    () => getScoreCategory(score.score),
    [score.score]
  );

  return (
    <main className="relative min-h-[100svh] w-full overflow-hidden bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-50 text-neutral-900">
      {/* Animated Background Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <FloatingOrb
          delay={0}
          duration={25}
          size="w-64 h-64"
          color="bg-gradient-to-br from-emerald-300/10 to-cyan-300/10"
          style={{ top: "10%", left: "5%" }}
        />
        <FloatingOrb
          delay={5}
          duration={30}
          size="w-48 h-48"
          color="bg-gradient-to-br from-teal-300/10 to-blue-300/10"
          style={{ top: "60%", right: "10%" }}
        />
        <FloatingOrb
          delay={10}
          duration={20}
          size="w-32 h-32"
          color="bg-gradient-to-br from-purple-300/10 to-violet-300/10"
          style={{ bottom: "20%", left: "15%" }}
        />
        <FloatingOrb
          delay={15}
          duration={35}
          size="w-40 h-40"
          color="bg-gradient-to-br from-rose-300/10 to-orange-300/10"
          style={{ top: "30%", right: "30%" }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-4 sm:py-6 md:py-8">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-4">
            <motion.div
              className={cn(
                "relative h-16 w-16 rounded-3xl bg-gradient-to-br p-[3px] shadow-lg",
                healthGrad
              )}
              animate={{
                scale: score.score > 0 ? [1, 1.05, 1] : 1,
                rotate: score.score > 0 ? [0, 5, -5, 0] : 0,
              }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            >
              <div className="flex h-full w-full items-center justify-center rounded-[20px] bg-white/95 backdrop-blur-sm">
                <motion.div
                  animate={{
                    scale: score.score > 0 ? [1, 1.2, 1] : 1,
                  }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  <Heart
                    className={cn(
                      "h-8 w-8 transition-colors duration-500",
                      score.score >= 8
                        ? "text-emerald-600"
                        : score.score >= 6
                        ? "text-lime-600"
                        : score.score >= 4
                        ? "text-orange-600"
                        : "text-rose-600"
                    )}
                    fill={score.score > 0 ? "currentColor" : "none"}
                  />
                </motion.div>
              </div>
            </motion.div>
            <div>
              <motion.h1
                className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 sm:text-5xl"
                animate={{
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{
                  duration: 8,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                }}
                style={{ backgroundSize: "200% 200%" }}
              >
                Healthscore
              </motion.h1>
              <p className="text-sm text-neutral-600 max-w-md">
                Scan barcodes or use computer vision to analyze food products
                and get real-time health scores with AI-powered insights.
              </p>
            </div>
          </div>

          <motion.div
            className="flex flex-wrap items-center gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <motion.div
              className="flex items-center gap-3 rounded-2xl border border-purple-200/50 bg-white/80 backdrop-blur-md px-4 py-3 shadow-lg"
              whileHover={{ scale: 1.02, y: -2 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <Brain className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-neutral-700">
                AI enhance
              </span>
              <Switch
                checked={enhanceWithAI && aiAvailable}
                onCheckedChange={(v) => setEnhanceWithAI(v)}
                disabled={!aiAvailable}
                aria-label="Toggle AI-enhanced scoring"
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-purple-500 data-[state=checked]:to-violet-500"
              />
            </motion.div>

            <motion.div
              className="flex items-center gap-3 rounded-2xl border border-cyan-200/50 bg-white/80 backdrop-blur-md px-4 py-3 shadow-lg"
              whileHover={{ scale: 1.02, y: -2 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <Camera className="h-5 w-5 text-cyan-600" />
              <span className="text-sm font-medium text-neutral-700">
                Back camera
              </span>
              <Switch
                checked={useBackCamera}
                onCheckedChange={setUseBackCamera}
                aria-label="Toggle back camera"
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-cyan-500 data-[state=checked]:to-blue-500"
              />
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                className="gap-2 rounded-2xl bg-white/80 backdrop-blur-md border border-neutral-200/50 hover:bg-white/90 hover:shadow-lg transition-all duration-300"
                onClick={() => setMuted((m) => (m ? (cancel(), false) : true))}
                aria-label={muted ? "Unmute voice" : "Mute voice"}
              >
                {muted ? (
                  <VolumeX className="h-5 w-5 text-neutral-600" />
                ) : (
                  <Volume2 className="h-5 w-5 text-emerald-600" />
                )}
                <span className="hidden sm:inline font-medium">
                  {muted ? "Muted" : "Voice"}
                </span>
              </Button>
            </motion.div>
          </motion.div>
        </motion.header>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Scanner panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-emerald-50/60 via-green-50/40 to-emerald-50/60 backdrop-blur-xl relative">
              {/* Subtle animated background pattern */}
              <div className="absolute inset-0 opacity-30">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,_rgba(16,185,129,0.1)_0%,_transparent_50%)] animate-pulse"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_rgba(6,182,212,0.08)_0%,_transparent_50%)]"></div>
              </div>
              <CardHeader className="pb-4 text-black relative overflow-hidden">
                <div className="relative z-10">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <motion.div
                      animate={{ rotate: scanning ? 360 : 0 }}
                      transition={{
                        duration: 2,
                        repeat: scanning ? Number.POSITIVE_INFINITY : 0,
                        ease: "linear",
                      }}
                    >
                      <Camera className="h-6 w-6 drop-shadow-sm" />
                    </motion.div>
                    <span className="font-bold tracking-wide">
                      Smart Scanner
                    </span>
                    <motion.div
                      className="ml-auto h-2 w-2 rounded-full bg-black/80"
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.8, 1, 0.8],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                      }}
                    />
                  </CardTitle>
                  <CardDescription className="text-black font-medium">
                    Scan barcodes or use computer vision to analyze products.
                    Switch between modes using the buttons.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="relative p-6 z-10">
                <div className="relative aspect-video w-full overflow-hidden rounded-3xl border-2 border-emerald-200/50 bg-black shadow-2xl">
                  <VisionScanner
                    onDetected={onDetected}
                    onVisionAnalysis={handleVisionAnalysis}
                    scanning={scanning}
                    useBackCamera={useBackCamera}
                    showOverlay
                    enableVision={aiAvailable}
                  />

                  {/* Enhanced gradient aura on detection */}
                  <AnimatePresence>
                    {score.score > 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.6 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
                        className={cn(
                          "pointer-events-none absolute inset-0 bg-gradient-radial",
                          healthGrad
                        )}
                        style={{
                          background: `radial-gradient(ellipse at center, transparent 30%, ${
                            score.score >= 8
                              ? "rgba(16, 185, 129, 0.3)"
                              : score.score >= 6
                              ? "rgba(132, 204, 22, 0.3)"
                              : score.score >= 4
                              ? "rgba(245, 158, 11, 0.3)"
                              : "rgba(239, 68, 68, 0.3)"
                          } 70%)`,
                        }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Pulsing confidence indicator */}
                  <motion.div
                    className="pointer-events-none absolute right-4 top-4 flex items-center gap-2"
                    animate={{
                      scale: confidence > 0.8 ? [1, 1.1, 1] : 1,
                    }}
                    transition={{
                      duration: 1,
                      repeat: confidence > 0.8 ? Number.POSITIVE_INFINITY : 0,
                    }}
                  >
                    <Badge
                      variant="secondary"
                      className="bg-white/95 backdrop-blur-md border-emerald-200/50 shadow-lg"
                    >
                      <motion.div
                        className={cn(
                          "mr-2 h-2 w-2 rounded-full",
                          confidence > 0.8
                            ? "bg-emerald-500"
                            : confidence > 0.5
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        )}
                        animate={{
                          opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Number.POSITIVE_INFINITY,
                        }}
                      />
                      Confidence: {Math.round(confidence * 100)}%
                    </Badge>
                  </motion.div>

                  {/* Enhanced controls */}
                  <div className="absolute bottom-4 left-4 flex items-center gap-3">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="secondary"
                        className="bg-white/95 backdrop-blur-md border-emerald-200/50 hover:bg-emerald-50/90 shadow-lg transition-all duration-300"
                        onClick={() => setScanning((s) => !s)}
                      >
                        <motion.div
                          animate={{ rotate: scanning ? 0 : 180 }}
                          transition={{ duration: 0.3 }}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                        </motion.div>
                        {scanning ? "Pause" : "Resume"}
                      </Button>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="secondary"
                        className="bg-white/95 backdrop-blur-md border-emerald-200/50 hover:bg-emerald-50/90 shadow-lg transition-all duration-300"
                        onClick={resetScan}
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reset
                      </Button>
                    </motion.div>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {error ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Alert
                        variant="destructive"
                        className="mt-6 border-rose-200/50 bg-gradient-to-br from-rose-50/80 to-red-50/80 backdrop-blur-sm"
                      >
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Scan issue</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    </motion.div>
                  ) : (
                    <motion.div
                      className="mt-6 grid gap-4 sm:grid-cols-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    >
                      <motion.div
                        className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-white/90 to-emerald-50/90 backdrop-blur-sm p-5 shadow-lg relative overflow-hidden"
                        whileHover={{ scale: 1.02, y: -2 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 25,
                        }}
                      >
                        {/* Subtle shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        <div className="flex items-center justify-between relative z-10">
                          <span className="text-sm font-semibold text-emerald-800">
                            Last Barcode
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "border-emerald-300/60 transition-all duration-300 font-medium",
                              lastBarcode
                                ? "bg-emerald-100/90 text-emerald-800 shadow-sm"
                                : "bg-neutral-100/80"
                            )}
                          >
                            {lastBarcode ? "✓ Detected" : "—"}
                          </Badge>
                        </div>
                        <p className="mt-2 truncate text-lg font-bold text-emerald-900">
                          {lastBarcode || "Waiting..."}
                        </p>
                      </motion.div>

                      <motion.div
                        className="rounded-2xl border border-teal-200/60 bg-gradient-to-br from-white/90 to-teal-50/90 backdrop-blur-sm p-5 shadow-lg relative overflow-hidden"
                        whileHover={{ scale: 1.02, y: -2 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 25,
                        }}
                      >
                        {/* Subtle shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        <div className="flex items-center justify-between relative z-10">
                          <span className="text-sm font-semibold text-teal-800">
                            Status
                          </span>
                          <motion.div
                            animate={{
                              scale: aiBusy || loading ? [1, 1.1, 1] : 1,
                            }}
                            transition={{
                              duration: 1,
                              repeat:
                                aiBusy || loading
                                  ? Number.POSITIVE_INFINITY
                                  : 0,
                            }}
                          >
                            {aiBusy ? (
                              <Badge className="bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg border-0">
                                <Sparkles className="mr-1 h-3 w-3" />
                                AI refining
                              </Badge>
                            ) : loading ? (
                              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg border-0">
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{
                                    duration: 1,
                                    repeat: Number.POSITIVE_INFINITY,
                                    ease: "linear",
                                  }}
                                  className="mr-1 h-3 w-3 border-2 border-white border-t-transparent rounded-full"
                                />
                                Fetching
                              </Badge>
                            ) : visionAnalysis ? (
                              <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg border-0">
                                <Eye className="mr-1 h-3 w-3" />
                                Vision analyzed
                              </Badge>
                            ) : product ? (
                              <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg border-0">
                                ✓ Analyzed
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-teal-300/60 bg-teal-100/80 text-teal-700"
                              >
                                Idle
                              </Badge>
                            )}
                          </motion.div>
                        </div>
                        <p className="mt-2 truncate text-lg font-bold text-teal-900">
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
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Enhanced Scan History */}
                <AnimatePresence>
                  {scanHistory.length > 0 && (
                    <motion.div
                      className="mt-6 rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-white/90 to-emerald-50/90 backdrop-blur-sm p-5 shadow-lg relative overflow-hidden"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      {/* Decorative background elements */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-200/20 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-teal-200/20 to-transparent rounded-full translate-y-12 -translate-x-12"></div>

                      <h4 className="mb-4 text-sm font-bold text-emerald-800 flex items-center gap-2 relative z-10">
                        <Sparkles className="h-4 w-4" />
                        Recent Scans
                        <div className="ml-auto text-xs bg-emerald-100/80 text-emerald-700 px-2 py-1 rounded-full font-medium">
                          {scanHistory.length}
                        </div>
                      </h4>
                      <div className="space-y-3 relative z-10">
                        {scanHistory.slice(0, 3).map((item, index) => (
                          <motion.div
                            key={item.barcode + index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            className="flex items-center justify-between rounded-xl border border-emerald-200/50 bg-gradient-to-r from-emerald-50/90 to-teal-50/90 backdrop-blur-sm px-4 py-3 shadow-sm hover:shadow-md transition-all duration-300 group"
                            whileHover={{ scale: 1.02, x: 4 }}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-emerald-800 group-hover:text-emerald-900 transition-colors">
                                {item.product.product_name || "Unknown Product"}
                              </p>
                              <p className="text-xs text-emerald-600/80 font-medium">
                                {item.barcode.startsWith("vision_")
                                  ? "🔍 Computer Vision"
                                  : `📊 ${item.barcode}`}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                "ml-3 border-2 font-bold shadow-sm transition-all duration-300",
                                item.score.score >= 8
                                  ? "border-emerald-400 text-emerald-700 bg-emerald-50/80 group-hover:bg-emerald-100"
                                  : item.score.score >= 6
                                  ? "border-lime-400 text-lime-700 bg-lime-50/80 group-hover:bg-lime-100"
                                  : item.score.score >= 4
                                  ? "border-orange-400 text-orange-700 bg-orange-50/80 group-hover:bg-orange-100"
                                  : "border-rose-400 text-rose-700 bg-rose-50/80 group-hover:bg-rose-100"
                              )}
                            >
                              {item.score.score}/10
                            </Badge>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>

          {/* Results panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-blue-50/60 via-cyan-50/40 to-blue-50/60 backdrop-blur-xl relative">
              {/* Subtle animated background pattern */}
              <div className="absolute inset-0 opacity-30">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,_rgba(59,130,246,0.1)_0%,_transparent_50%)] animate-pulse"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,_rgba(6,182,212,0.08)_0%,_transparent_50%)]"></div>
              </div>

              <CardHeader className="pb-4 text-black relative overflow-hidden">
                <div className="relative z-10">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <motion.div
                      animate={{
                        rotate: [0, 10, -10, 0],
                        scale: score.score > 0 ? [1, 1.2, 1] : 1,
                      }}
                      transition={{
                        duration: 2,
                        repeat: score.score > 0 ? Number.POSITIVE_INFINITY : 0,
                        repeatType: "reverse",
                      }}
                    >
                      <Sparkles className="h-6 w-6 text-yellow-500 drop-shadow-sm" />
                    </motion.div>
                    <span className="font-bold tracking-wide">
                      Health Score
                    </span>
                    <motion.div
                      className="ml-auto flex items-center gap-1"
                      animate={{
                        scale: score.score > 0 ? [1, 1.1, 1] : 1,
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: score.score > 0 ? Number.POSITIVE_INFINITY : 0,
                      }}
                    >
                      <div className="h-2 w-2 rounded-full bg-yellow-500/80"></div>
                      <div className="h-1.5 w-1.5 rounded-full bg-black/60"></div>
                    </motion.div>
                  </CardTitle>
                  <CardDescription className="text-black flex items-center gap-2 font-medium">
                    <Info className="h-4 w-4" />
                    Live scoring with animated insights
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="p-6 relative z-10">
                <div className="grid gap-6">
                  <motion.div
                    className="flex flex-col items-stretch gap-6 sm:flex-row sm:items-center"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    <ScoreGauge score={score.score} />
                    <div className="min-w-0 flex-1">
                      <ProductCard product={product} loading={loading} />
                    </div>
                  </motion.div>

                  {/* Enhanced Score Category */}
                  <AnimatePresence>
                    {score.score > 0 && (
                      <motion.div
                        className="rounded-2xl border border-teal-200/50 bg-gradient-to-br from-white/80 to-teal-50/80 backdrop-blur-sm p-5 shadow-lg"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-bold text-teal-800">
                              Health Rating
                            </h4>
                            <p className="text-xs text-neutral-600">
                              {scoreCategory.description}
                            </p>
                          </div>
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 25,
                              delay: 0.2,
                            }}
                          >
                            <Badge
                              variant="outline"
                              className={cn(
                                "border-2 font-bold shadow-lg",
                                scoreCategory.color === "emerald" &&
                                  "border-emerald-500 text-emerald-700 bg-emerald-50",
                                scoreCategory.color === "green" &&
                                  "border-green-500 text-green-700 bg-green-50",
                                scoreCategory.color === "yellow" &&
                                  "border-yellow-500 text-yellow-700 bg-yellow-50",
                                scoreCategory.color === "orange" &&
                                  "border-orange-500 text-orange-700 bg-orange-50",
                                scoreCategory.color === "red" &&
                                  "border-red-500 text-red-700 bg-red-50"
                              )}
                            >
                              {scoreCategory.name}
                            </Badge>
                          </motion.div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Separator className="my-2 bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

                  <ProsCons pros={score.pros} cons={score.cons} />

                  <AnimatePresence>
                    {score.rationale && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4 }}
                        className="rounded-2xl border border-emerald-200/50 bg-gradient-to-br from-white/80 to-emerald-50/80 backdrop-blur-sm p-5 shadow-lg"
                        whileHover={{ scale: 1.01 }}
                      >
                        <p className="text-sm text-neutral-700 leading-relaxed">
                          {score.rationale}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Enhanced Vision Analysis Details */}
                  <AnimatePresence>
                    {visionAnalysis && (
                      <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ duration: 0.5 }}
                        className="rounded-2xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50/80 to-green-50/80 backdrop-blur-sm p-5 shadow-lg"
                        whileHover={{ scale: 1.02, y: -2 }}
                      >
                        <div className="mb-4 flex items-center gap-3">
                          <motion.div
                            animate={{ rotate: [0, 360] }}
                            transition={{
                              duration: 2,
                              repeat: Number.POSITIVE_INFINITY,
                              ease: "linear",
                            }}
                          >
                            <Eye className="h-5 w-5 text-emerald-600" />
                          </motion.div>
                          <h4 className="text-sm font-bold text-emerald-800">
                            AI Vision Analysis
                          </h4>
                          <Badge
                            variant="outline"
                            className="bg-emerald-100/80 text-emerald-700 border-emerald-300/50 shadow-sm"
                          >
                            Computer Vision
                          </Badge>
                        </div>

                        <div className="space-y-4">
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                          >
                            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                              Product Type
                            </p>
                            <p className="text-sm text-emerald-800 font-medium">
                              {visionAnalysis.productType}
                            </p>
                          </motion.div>

                          {visionAnalysis.nutritionalNotes && (
                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.2 }}
                            >
                              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                                Nutritional Notes
                              </p>
                              <p className="text-sm text-emerald-800">
                                {visionAnalysis.nutritionalNotes}
                              </p>
                            </motion.div>
                          )}

                          {visionAnalysis.recommendations && (
                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.3 }}
                            >
                              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                                Recommendations
                              </p>
                              <p className="text-sm text-emerald-800">
                                {visionAnalysis.recommendations}
                              </p>
                            </motion.div>
                          )}

                          {visionAnalysis.fallback && (
                            <motion.div
                              className="mt-4 rounded-xl bg-amber-50/80 border border-amber-200/50 p-4 backdrop-blur-sm"
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.4 }}
                            >
                              <div className="flex items-center gap-2 text-amber-800">
                                <AlertCircle className="h-4 w-4" />
                                <span className="text-sm font-semibold">
                                  Fallback Assessment
                                </span>
                              </div>
                              <p className="text-xs text-amber-700 mt-2">
                                This assessment was generated using fallback
                                methods due to AI analysis limitations.
                              </p>
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Enhanced Unknown Product Analysis */}
                  <AnimatePresence>
                    {unknownProduct && (
                      <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ duration: 0.5 }}
                        className="rounded-2xl border border-purple-200/50 bg-gradient-to-br from-purple-50/80 to-pink-50/80 backdrop-blur-sm p-5 shadow-lg"
                        whileHover={{ scale: 1.02, y: -2 }}
                      >
                        <div className="mb-4 flex items-center gap-3">
                          <motion.div
                            animate={{
                              scale: [1, 1.2, 1],
                              rotate: [0, 180, 360],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Number.POSITIVE_INFINITY,
                            }}
                          >
                            <Zap className="h-5 w-5 text-purple-600" />
                          </motion.div>
                          <h4 className="text-sm font-bold text-purple-800">
                            AI Analysis for Unknown Product
                          </h4>
                          <Badge
                            variant="outline"
                            className="bg-purple-100/80 text-purple-700 border-purple-300/50 shadow-sm"
                          >
                            AI Enhanced
                          </Badge>
                        </div>

                        <div className="space-y-4">
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                          >
                            <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                              Barcode
                            </p>
                            <p className="text-sm text-purple-800 font-mono bg-purple-100/50 rounded-lg px-2 py-1">
                              {unknownProduct.barcode}
                            </p>
                          </motion.div>

                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                          >
                            <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                              Description
                            </p>
                            <p className="text-sm text-purple-800">
                              {unknownProduct.description}
                            </p>
                          </motion.div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Enhanced voice controls */}
                  <motion.div
                    className="rounded-2xl border border-blue-200/50 bg-gradient-to-br from-white/80 to-blue-50/80 backdrop-blur-sm p-5 shadow-lg"
                    whileHover={{ scale: 1.01, y: -2 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-blue-800 flex items-center gap-2">
                          <Volume2 className="h-4 w-4" />
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
                            className="mb-2 block text-xs font-semibold text-neutral-600"
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
                            className="[&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-blue-500 [&_[role=slider]]:to-cyan-500"
                          />
                        </div>
                        <div className="w-full sm:w-40">
                          <label
                            htmlFor="pitch"
                            className="mb-2 block text-xs font-semibold text-neutral-600"
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
                            className="[&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-blue-500 [&_[role=slider]]:to-cyan-500"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <AnimatePresence>
                    {!aiAvailable && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4 }}
                      >
                        <Alert className="bg-gradient-to-br from-white/80 to-amber-50/80 border-amber-200/50 backdrop-blur-sm shadow-lg">
                          <AlertTitle className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-amber-600" />
                            Optional AI Refinement
                          </AlertTitle>
                          <AlertDescription>
                            Add an AI provider key to enhance scoring and
                            generate richer insights. This app uses the AI SDK
                            to connect to models like GPT&#45;4o or Grok.
                          </AlertDescription>
                        </Alert>
                      </motion.div>
                    )}
                  </AnimatePresence>

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

        <motion.footer
          className="mt-16 text-center text-xs text-neutral-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <motion.div
              className="h-2 w-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400"
              animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                delay: 0,
              }}
            />
            <motion.div
              className="h-2 w-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-400"
              animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                delay: 0.3,
              }}
            />
            <motion.div
              className="h-2 w-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-400"
              animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                delay: 0.6,
              }}
            />
          </div>
          <p className="leading-relaxed">
            Privacy friendly: camera frames stay on device. Barcode lookup uses
            Open Food Facts API. Computer vision analysis powered by AI.
            Optional AI enhancement via the AI SDK.
          </p>
        </motion.footer>
      </div>
    </main>
  );
}
