"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
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

type Props = {
  onDetected?: (barcode: string, approxConfidence?: number) => void;
  scanning?: boolean;
  useBackCamera?: boolean;
  className?: string;
  showOverlay?: boolean;
};

export function CameraScanner({
  onDetected,
  scanning = true,
  useBackCamera = true,
  className,
  showOverlay = true,
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

    // Corner lines
    const corner = Math.max(18, Math.round(Math.min(boxW, boxH) * 0.12));
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 3;

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

    // Scan line
    const time = Date.now() / 1000;
    const scanY = y + ((Math.sin(time * 2) + 1) / 2) * (boxH - 8) + 4;
    const gradient = ctx.createLinearGradient(x, scanY, x + boxW, scanY);
    gradient.addColorStop(0, "rgba(255,255,255,0.0)");
    gradient.addColorStop(0.5, "rgba(255,255,255,0.9)");
    gradient.addColorStop(1, "rgba(255,255,255,0.0)");
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 6, scanY);
    ctx.lineTo(x + boxW - 6, scanY);
    ctx.stroke();
  }, [showOverlay]);

  const loop = useCallback(() => {
    const video = videoRef.current;
    const detector = detectorRef.current;
    if (!video) return;

    const tick = async () => {
      if (showOverlay) drawOverlay();

      if (!scanning) {
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
  }, [drawOverlay, onDetected, scanning, showOverlay]);

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
          if (!scanningRef.current) return;
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
  }, [stopCamera, useBackCamera, onDetected]);

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
        aria-label="Live camera preview for barcode scanning"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        aria-hidden={!showOverlay}
      />
    </div>
  );
}
