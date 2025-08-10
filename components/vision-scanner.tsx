"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScanBarcode, Eye, Loader2, AlertCircle, Sparkles } from "lucide-react";
// ZXing fallback
import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from "@zxing/browser";

declare global {
  interface Window {
    BarcodeDetector?: any;
  }
}

type VisionAnalysisResult = {
  productName: string;
  productType: string;
  healthScore: number;
  pros: string[];
  cons: string[];
  rationale: string;
  nutritionalNotes: string;
  recommendations: string;
  confidence?: number;
  fallback?: boolean;
};

type Props = {
  onDetected?: (barcode: string, approxConfidence?: number) => void;
  onVisionAnalysis?: (result: VisionAnalysisResult) => void;
  scanning?: boolean;
  useBackCamera?: boolean;
  className?: string;
  showOverlay?: boolean;
  enableVision?: boolean;
};

export function VisionScanner({
  onDetected,
  onVisionAnalysis,
  scanning = true,
  useBackCamera = true,
  className,
  showOverlay = true,
  enableVision = true,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const cooldownRef = useRef<number>(0);
  const lastCodeRef = useRef<string>("");
  const detectorRef = useRef<any | null>(null);
  const startingRef = useRef<boolean>(false);
  const zxingRef = useRef<BrowserMultiFormatReader | null>(null);
  const zxingControlsRef = useRef<IScannerControls | null>(null);
  const scanningRef = useRef(scanning);
  const [visionMode, setVisionMode] = useState<"barcode" | "vision">("barcode");
  const [visionLoading, setVisionLoading] = useState(false);
  const [lastImageData, setLastImageData] = useState<string>("");
  const [visionError, setVisionError] = useState<string>("");

  useEffect(() => {
    scanningRef.current = scanning;
  }, [scanning]);

  const stopCamera = useCallback(() => {
    // stop rAF
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    // stop ZXing
    if (zxingControlsRef.current) {
      try {
        zxingControlsRef.current.stop();
      } catch {}
      zxingControlsRef.current = null;
    }
    if (zxingRef.current) {
      try {
        if (zxingRef.current && "reset" in zxingRef.current) {
          (zxingRef.current as any).reset();
        }
      } catch {}
      zxingRef.current = null;
    }
    // stop media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    // reset video element
    const video = videoRef.current;
    if (video) {
      try {
        video.pause();
      } catch {}
      // @ts-ignore - settable at runtime
      video.srcObject = null;
      video.removeAttribute("src");
      video.load();
    }
    startingRef.current = false;
  }, []);

  const captureImage = useCallback(async (): Promise<string | null> => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to base64
      return canvas.toDataURL("image/jpeg", 0.8);
    } catch (error) {
      console.error("Failed to capture image:", error);
      return null;
    }
  }, []);

  const analyzeImage = useCallback(
    async (imageData: string) => {
      if (!enableVision || !onVisionAnalysis) return;

      setVisionLoading(true);
      setVisionError("");

      try {
        // Generate a description of what we see
        const description =
          "Food product captured by camera - analyze for health assessment";

        const response = await fetch("/api/vision-analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageData, description }),
        });

        if (!response.ok) {
          throw new Error(`Vision analysis failed: ${response.status}`);
        }

        const result = await response.json();
        if (result.success && result.analysis) {
          onVisionAnalysis(result.analysis);
        } else {
          throw new Error("Invalid vision analysis response");
        }
      } catch (error) {
        console.error("Vision analysis error:", error);

        // Enhanced fallback with better user experience
        const manualDescription = prompt(
          "AI vision analysis failed. Please describe what you see in the image to get a health assessment:"
        );

        if (manualDescription) {
          try {
            const response = await fetch("/api/vision-analyze", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                imageData,
                description: `Manual description: ${manualDescription}`,
              }),
            });

            if (response.ok) {
              const result = await response.json();
              if (result.success && result.analysis) {
                onVisionAnalysis(result.analysis);
                return;
              }
            }
          } catch (fallbackError) {
            console.error("Fallback vision analysis failed:", fallbackError);
          }
        }

        // Final fallback - generate a basic assessment
        const fallbackResult: VisionAnalysisResult = {
          productName: "Unknown Product",
          productType: "Food Item",
          healthScore: 5,
          pros: ["Product identified", "Basic assessment available"],
          cons: ["Limited nutritional data", "AI analysis unavailable"],
          rationale:
            "Basic health assessment based on manual description. For more accurate results, try scanning a barcode or ensure better lighting for vision analysis.",
          nutritionalNotes:
            "Assessment based on visual identification and manual description.",
          recommendations:
            "Consider scanning the barcode for detailed nutritional information, or try vision analysis again with better lighting.",
          confidence: 0.3,
          fallback: true,
        };

        onVisionAnalysis(fallbackResult);
        setVisionError("Vision analysis failed. Using fallback assessment.");
      } finally {
        setVisionLoading(false);
      }
    },
    [enableVision, onVisionAnalysis]
  );

  const handleVisionCapture = useCallback(async () => {
    const imageData = await captureImage();
    if (imageData) {
      setLastImageData(imageData);
      await analyzeImage(imageData);
    }
  }, [captureImage, analyzeImage]);

  const drawOverlay = useCallback(() => {
    if (!showOverlay) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = (canvas.width = video.clientWidth || 640);
    const h = (canvas.height = video.clientHeight || 360);
    ctx.clearRect(0, 0, w, h);

    // Draw framing guide with corners
    const pad = Math.round(Math.min(w, h) * 0.08);
    const boxW = w - pad * 2;
    const boxH = Math.round(boxW * 0.35);
    const x = pad;
    const y = Math.round(h / 2 - boxH / 2);

    // Outer dim
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(0, 0, w, y);
    ctx.fillRect(0, y, x, boxH);
    ctx.fillRect(x + boxW, y, w - (x + boxW), boxH);
    ctx.fillRect(0, y + boxH, w, h - (y + boxH));

    // Enhanced corner lines with gradient
    const corner = Math.max(18, Math.round(Math.min(boxW, boxH) * 0.12));
    const gradient = ctx.createLinearGradient(x, y, x + boxW, y + boxH);

    if (visionMode === "vision") {
      gradient.addColorStop(0, "rgba(16, 185, 129, 0.95)"); // emerald
      gradient.addColorStop(1, "rgba(6, 182, 212, 0.95)"); // cyan
    } else {
      gradient.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      gradient.addColorStop(1, "rgba(156, 163, 175, 0.95)");
    }

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.shadowColor =
      visionMode === "vision"
        ? "rgba(16, 185, 129, 0.5)"
        : "rgba(255, 255, 255, 0.5)";
    ctx.shadowBlur = 8;

    // top-left
    ctx.beginPath();
    ctx.moveTo(x, y + corner);
    ctx.lineTo(x, y);
    ctx.lineTo(x + corner, y);
    ctx.stroke();
    // top-right
    ctx.beginPath();
    ctx.moveTo(x + boxW - corner, y);
    ctx.lineTo(x + boxW, y);
    ctx.lineTo(x + boxW, y + corner);
    ctx.stroke();
    // bottom-left
    ctx.beginPath();
    ctx.moveTo(x, y + boxH - corner);
    ctx.lineTo(x, y + boxH);
    ctx.lineTo(x + corner, y + boxH);
    ctx.stroke();
    // bottom-right
    ctx.beginPath();
    ctx.moveTo(x + boxW - corner, y + boxH);
    ctx.lineTo(x + boxW, y + boxH);
    ctx.lineTo(x + boxW, y + boxH - corner);
    ctx.stroke();

    // Enhanced animated scan line
    const time = Date.now() / 1000;
    const scanY = y + ((Math.sin(time * 2) + 1) / 2) * (boxH - 8) + 4;
    const scanGradient = ctx.createLinearGradient(x, scanY, x + boxW, scanY);

    if (visionMode === "vision") {
      scanGradient.addColorStop(0, "rgba(16, 185, 129, 0.0)");
      scanGradient.addColorStop(0.5, "rgba(16, 185, 129, 0.9)");
      scanGradient.addColorStop(1, "rgba(16, 185, 129, 0.0)");
    } else {
      scanGradient.addColorStop(0, "rgba(255, 255, 255, 0.0)");
      scanGradient.addColorStop(0.5, "rgba(255, 255, 255, 0.9)");
      scanGradient.addColorStop(1, "rgba(255, 255, 255, 0.0)");
    }

    ctx.strokeStyle = scanGradient;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(x + 6, scanY);
    ctx.lineTo(x + boxW - 6, scanY);
    ctx.stroke();

    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
  }, [showOverlay, visionMode]);

  const loop = useCallback(() => {
    const video = videoRef.current;
    const detector = detectorRef.current;
    if (!video) return;

    const tick = async () => {
      if (showOverlay) drawOverlay();

      if (!scanning || visionMode !== "barcode") {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }

      if (cooldownRef.current > 0) cooldownRef.current -= 16;

      if (detector && video.readyState === HTMLMediaElement.HAVE_ENOUGH_DATA) {
        try {
          const barcodes = await detector.detect(video);
          if (barcodes && barcodes.length > 0) {
            const best = barcodes[0];
            const code: string = best.rawValue || "";
            const conf: number =
              typeof best.confidence === "number" ? best.confidence : 0.88;
            if (code && cooldownRef.current <= 0) {
              cooldownRef.current = 1200;
              if (code !== lastCodeRef.current) {
                lastCodeRef.current = code;
                onDetected?.(code, conf);
              }
            }
          }
        } catch {
          // ignore and keep the loop running
        }
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
  }, [drawOverlay, onDetected, scanning, showOverlay, visionMode]);

  const startCamera = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;

    try {
      const video = videoRef.current;
      if (!video) {
        startingRef.current = false;
        return;
      }

      // iOS/Safari autoplay friendliness
      video.setAttribute("playsinline", "true");
      video.muted = true;

      // Prefer media stream + BarcodeDetector (fast and local)
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: useBackCamera
            ? { ideal: "environment" }
            : { ideal: "user" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // @ts-ignore - settable in browsers
      video.srcObject = stream;

      // Wait for metadata
      await new Promise<void>((resolve) => {
        if (video.readyState >= HTMLMediaElement.HAVE_METADATA) resolve();
        else
          video.addEventListener("loadedmetadata", () => resolve(), {
            once: true,
          });
      });

      const playPromise = video.play();
      if (playPromise && typeof playPromise.then === "function") {
        await playPromise.catch(() => {
          // swallow "interrupted by a new load request" types of errors
        });
      }

      // After setting up detector or ZXing, always run overlay loop
      if ("BarcodeDetector" in window) {
        try {
          detectorRef.current = new window.BarcodeDetector({
            formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
          });
        } catch {
          detectorRef.current = null;
        }
      } else {
        detectorRef.current = null;
      }

      // Start overlay/detection rAF loop regardless of method
      loop();

      // Fallback to ZXing decodeFromVideoDevice when BarcodeDetector is not available
      const reader = new BrowserMultiFormatReader();
      zxingRef.current = reader;
      zxingControlsRef.current = await reader.decodeFromVideoDevice(
        useBackCamera ? undefined : undefined,
        video,
        (result, err, controls) => {
          if (!scanningRef.current || visionMode !== "barcode") return;
          if (result) {
            const text = result.getText?.() || "";
            if (text && cooldownRef.current <= 0) {
              cooldownRef.current = 1200;
              if (text !== lastCodeRef.current) {
                lastCodeRef.current = text;
                onDetected?.(text, 0.8);
              }
            }
          }
          // Ignore errors
        }
      );
    } catch (e) {
      console.error("Camera error", e);
      stopCamera();
    } finally {
      startingRef.current = false;
    }
  }, [stopCamera, useBackCamera, onDetected, loop, visionMode]);

  // Start/stop and restart on back-camera toggle
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera, useBackCamera]);

  return (
    <div className={cn("relative h-full w-full", className)}>
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        playsInline
        aria-label="Live camera preview for product scanning"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        aria-hidden={!showOverlay}
      />

      {/* Enhanced Mode Toggle */}
      <div className="absolute top-4 left-4 flex items-center gap-3">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant={visionMode === "barcode" ? "default" : "secondary"}
            size="sm"
            onClick={() => setVisionMode("barcode")}
            className={cn(
              "bg-white/95 backdrop-blur-md border-0 shadow-lg transition-all duration-300",
              visionMode === "barcode"
                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600"
                : "hover:bg-white hover:shadow-xl"
            )}
          >
            <ScanBarcode className="mr-2 h-4 w-4" />
            Barcode
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant={visionMode === "vision" ? "default" : "secondary"}
            size="sm"
            onClick={() => setVisionMode("vision")}
            className={cn(
              "bg-white/95 backdrop-blur-md border-0 shadow-lg transition-all duration-300",
              visionMode === "vision"
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600"
                : "hover:bg-white hover:shadow-xl"
            )}
            disabled={!enableVision}
          >
            <Eye className="mr-2 h-4 w-4" />
            Vision
          </Button>
        </motion.div>
      </div>

      {/* Enhanced Vision Capture Button */}
      <AnimatePresence>
        {visionMode === "vision" && (
          <motion.div
            className="absolute bottom-4 left-4 flex items-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="default"
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg backdrop-blur-md border-0 transition-all duration-300"
                onClick={handleVisionCapture}
                disabled={visionLoading}
              >
                {visionLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Analyze Product
                  </>
                )}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Mode Indicator */}
      <motion.div
        className="absolute top-4 right-4"
        animate={{
          scale: visionMode === "vision" ? [1, 1.05, 1] : 1,
        }}
        transition={{
          duration: 2,
          repeat: visionMode === "vision" ? Number.POSITIVE_INFINITY : 0,
        }}
      >
        <Badge
          variant="secondary"
          className={cn(
            "bg-white/95 backdrop-blur-md border-0 shadow-lg transition-all duration-300",
            visionMode === "vision" &&
              "bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 border-emerald-300/50"
          )}
        >
          {visionMode === "barcode" ? (
            <>
              <ScanBarcode className="mr-2 h-4 w-4" />
              Barcode Mode
            </>
          ) : (
            <>
              <Eye className="mr-2 h-4 w-4" />
              Vision Mode
            </>
          )}
        </Badge>
      </motion.div>

      {/* Enhanced Vision Error Display */}
      <AnimatePresence>
        {visionError && (
          <motion.div
            className="absolute top-20 left-4 right-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="rounded-xl bg-amber-50/95 border border-amber-200/50 backdrop-blur-md p-4 text-amber-800 text-sm shadow-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{visionError}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Instructions */}
      <motion.div
        className="absolute bottom-4 right-4 hidden items-center gap-2 rounded-full bg-white/95 backdrop-blur-md px-4 py-2 text-xs text-neutral-700 shadow-lg border-0 sm:flex"
        animate={{
          y: [0, -2, 0],
        }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      >
        {visionMode === "barcode" ? (
          <>
            <ScanBarcode className="h-4 w-4 text-blue-600" />
            <span className="font-medium">Aim at barcode</span>
          </>
        ) : (
          <>
            <Eye className="h-4 w-4 text-emerald-600" />
            <span className="font-medium">Point at product</span>
          </>
        )}
      </motion.div>
    </div>
  );
}
