import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { soundFX } from "../utils/soundFX";
import { EmotionType, ServoPose, RgbThemeId, HardwareSyncState } from "../types";
import { RGB_THEMES, THEME_LIST } from "../utils/rgbThemes";
import { hardwareSync } from "../utils/hardwareSync";
import { RadarStatusIndicator } from "./RadarStatusIndicator";
import {
  Compass,
  Layers,
  Eye,
  Gauge,
  Battery,
  Cpu,
  Zap,
  SlidersVertical,
  Play,
  RotateCw,
  Palette,
} from "lucide-react";

interface Robot3DViewerProps {
  pose: ServoPose;
  expression: EmotionType;
  onArmChange?: (pose: ServoPose) => void;
  onExpressionChange?: (expr: EmotionType) => void;
  isTalking?: boolean;
  className?: string;
  allowPresets?: boolean;
  robotName?: string;
  rgbTheme?: RgbThemeId;
  onChangeRgbTheme?: (theme: RgbThemeId) => void;
}

export const Robot3DViewer: React.FC<Robot3DViewerProps> = ({
  pose,
  expression,
  onArmChange,
  onExpressionChange,
  isTalking = false,
  className = "",
  allowPresets = true,
  robotName = "Zonyx+",
  rgbTheme = "cyan",
  onChangeRgbTheme,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [exploded, setExploded] = useState(false);
  const [renderMode, setRenderMode] = useState<"shaded" | "wireframe" | "clay">("shaded");
  const [autoRotate, setAutoRotate] = useState(false);
  const [trackCursor, setTrackCursor] = useState(true);
  const [cameraPreset, setCameraPreset] = useState<"iso" | "front" | "side" | "back">("iso");
  const [syncState, setSyncState] = useState<HardwareSyncState>(hardwareSync.getState());

  useEffect(() => {
    const unsub = hardwareSync.subscribeState((st: HardwareSyncState) => setSyncState(st));
    return () => {
      unsub();
    };
  }, []);

  const currentTheme = RGB_THEMES[rgbTheme] || RGB_THEMES.cyan;

  // Ref to hold dynamic props so Three.js render loop reads state without re-initializing scene
  const propsRef = useRef({
    pose,
    expression,
    isTalking,
    exploded,
    autoRotate,
    trackCursor,
    rgbTheme,
    robotName,
  });

  useEffect(() => {
    propsRef.current = {
      pose,
      expression,
      isTalking,
      exploded,
      autoRotate,
      trackCursor,
      rgbTheme,
      robotName,
    };
  }, [pose, expression, isTalking, exploded, autoRotate, trackCursor, rgbTheme, robotName]);

  // Cursor tracking coordinates for head & LCD eyes
  const targetHeadLook = useRef({ x: 0, y: 0 });
  const currentHeadLook = useRef({ x: 0, y: 0 });
  const pointerStartPos = useRef({ x: 0, y: 0, time: 0 });
  const [pokeText, setPokeText] = useState<string | null>(null);

  // Three.js internal references
  const threeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    robotGroup: THREE.Group;
    headGroup: THREE.Group;
    screenMesh: THREE.Mesh;
    torsoGroup: THREE.Group;
    leftArmGroup: THREE.Group;
    rightArmGroup: THREE.Group;
    leftServoHorn: THREE.Group;
    rightServoHorn: THREE.Group;
    batteryMesh: THREE.Mesh;
    frontPlateMesh: THREE.Mesh;
    esp32BoardMesh: THREE.Mesh;
    screenCanvas: HTMLCanvasElement;
    screenCtx: CanvasRenderingContext2D;
    screenTexture: THREE.CanvasTexture;
    materials: THREE.Material[];
    accentPointLight?: THREE.PointLight;
    underglowMesh?: THREE.Mesh;
    isDragging: boolean;
    prevMousePos: { x: number; y: number };
    spherical: { radius: number; theta: number; phi: number };
    targetSpherical: { radius: number; theta: number; phi: number };
    explodedProgress: number;
    frameId: number;
    time: number;
  } | null>(null);

  // Draw Vibrant 1.8" IPS Color Screen face onto the Canvas Texture with pupil gaze offset & colorful graphics
  const drawFace = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      expr: EmotionType,
      time: number,
      eyeOffset: { x: number; y: number } = { x: 0, y: 0 },
      themeCfg: typeof currentTheme = currentTheme,
      talking: boolean = false,
      name: string = "Zonyx+"
    ) => {
      // 1. High-Contrast 1.8" IPS Screen Backlit Background
      const bgGrad = ctx.createRadialGradient(128, 128, 20, 128, 128, 150);
      bgGrad.addColorStop(0, "#101827");
      bgGrad.addColorStop(0.7, "#080d17");
      bgGrad.addColorStop(1, "#04060a");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 256, 256);

      // Fine subpixel IPS LCD matrix pattern (crisp, not glitchy)
      ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
      for (let y = 0; y < 256; y += 4) {
        ctx.fillRect(0, y, 256, 1);
      }

      // Clamped eye offsets for smooth pupil tracking
      const ox = Math.max(-12, Math.min(12, eyeOffset.x));
      const oy = Math.max(-9, Math.min(9, eyeOffset.y));

      // 2. Color LCD Status Bar (Top Header)
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(0, 0, 256, 32);
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.fillRect(0, 31, 256, 1);

      // WiFi Signal indicator (3 colorful arcs)
      ctx.strokeStyle = "#34d399";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(22, 22, 4, -Math.PI * 0.75, -Math.PI * 0.25);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(22, 22, 8, -Math.PI * 0.75, -Math.PI * 0.25);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(22, 22, 12, -Math.PI * 0.75, -Math.PI * 0.25);
      ctx.stroke();

      // Robot Name & LCD Mode Tag
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
      ctx.fillText(name, 40, 20);

      // Emotion Badge Tag
      const moodColor =
        expr === "ninja"
          ? "#38bdf8"
          : expr === "happy"
          ? "#5eead4"
          : expr === "roasting" || expr === "sassy"
          ? "#f43f5e"
          : expr === "thinking"
          ? "#c084fc"
          : expr === "surprised" || expr === "alert"
          ? "#fbbf24"
          : expr === "sleeping"
          ? "#818cf8"
          : themeCfg.primary;

      ctx.fillStyle = moodColor;
      ctx.font = "bold 9px monospace";
      ctx.fillText(expr === "ninja" ? "忍 NINJA" : expr.toUpperCase(), 138, 20);

      // Battery Pill (Color Gradient + Bolt)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(210, 11, 28, 12);
      ctx.fillRect(238, 14, 2, 6);
      ctx.fillStyle = "#10b981";
      ctx.fillRect(212, 13, 20, 8); // 88% charge
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 8px monospace";
      ctx.fillText("⚡", 217, 20);

      // Blinking logic (smooth blink every ~3.5 seconds)
      const isBlinking = Math.sin(time * 2.8) > 0.96;

      // Color LCD Eyes Definition
      const eyeMainColor =
        expr === "roasting" || expr === "sassy"
          ? "#f43f5e"
          : expr === "thinking"
          ? "#c084fc"
          : expr === "surprised" || expr === "alert"
          ? "#fbbf24"
          : expr === "sleeping"
          ? "#818cf8"
          : themeCfg.lcdEyeColor || themeCfg.primary;

      const irisColor =
        expr === "roasting" || expr === "sassy"
          ? "#be123c"
          : expr === "thinking"
          ? "#7c3aed"
          : expr === "surprised" || expr === "alert"
          ? "#d97706"
          : themeCfg.lcdIrisColor || themeCfg.secondary;

      // Draw Blushing Cheeks for Happy / Sassy / Wink
      if (expr === "happy" || expr === "wink" || expr === "sassy") {
        ctx.fillStyle = themeCfg.lcdCheekColor || "rgba(244, 114, 182, 0.4)";
        ctx.beginPath();
        ctx.arc(60, 158, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(196, 158, 16, 0, Math.PI * 2);
        ctx.fill();
      }

      if (expr === "happy" || expr === "wink") {
        if (isBlinking || expr === "wink") {
          // Left eye winking curve
          ctx.strokeStyle = eyeMainColor;
          ctx.lineWidth = 6;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(60, 118);
          ctx.quadraticCurveTo(86, 96, 112, 118);
          ctx.stroke();

          // Right eye wide anime eye
          drawAnimeEye(ctx, 172 + ox, 112 + oy, 26, eyeMainColor, irisColor);
        } else {
          // Both eyes full color anime eyes with pupils & glossy sparkle glints
          drawAnimeEye(ctx, 84 + ox, 112 + oy, 26, eyeMainColor, irisColor);
          drawAnimeEye(ctx, 172 + ox, 112 + oy, 26, eyeMainColor, irisColor);
        }

        // Animated Smiling / Talking Mouth
        ctx.strokeStyle = eyeMainColor;
        ctx.fillStyle = eyeMainColor;
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        if (talking) {
          const mouthOpen = 6 + Math.abs(Math.sin(time * 10)) * 14;
          ctx.beginPath();
          ctx.ellipse(128, 172, 18, mouthOpen, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#fb7185";
          ctx.beginPath();
          ctx.ellipse(128, 172 + mouthOpen * 0.4, 10, mouthOpen * 0.5, 0, 0, Math.PI);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(128, 162, 28, 0.15 * Math.PI, 0.85 * Math.PI, false);
          ctx.stroke();
        }
      } else if (expr === "thinking") {
        // Asymmetric curious eyebrows
        ctx.strokeStyle = eyeMainColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(60, 78);
        ctx.lineTo(108, 88);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(148, 88);
        ctx.lineTo(196, 72);
        ctx.stroke();

        // Focused inquisitive pupils
        drawAnimeEye(ctx, 84 + ox * 0.7, 116 + oy * 0.7, 22, eyeMainColor, irisColor);
        drawAnimeEye(ctx, 172 + ox * 0.7, 112 + oy * 0.7, 22, eyeMainColor, irisColor);

        // Wobbly thinking mouth
        ctx.strokeStyle = eyeMainColor;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(112, 174);
        ctx.quadraticCurveTo(128, 166, 144, 174);
        ctx.stroke();
      } else if (expr === "roasting" || expr === "sassy") {
        // Sassy flat-top half lids
        ctx.strokeStyle = eyeMainColor;
        ctx.fillStyle = eyeMainColor;
        ctx.lineWidth = 4;

        // Brow tilt
        ctx.beginPath();
        ctx.moveTo(60, 84);
        ctx.lineTo(108, 92);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(148, 92);
        ctx.lineTo(196, 84);
        ctx.stroke();

        // Half-lidded sassy eyes
        drawHalfLidEye(ctx, 84 + ox * 0.5, 116 + Math.max(0, oy * 0.5), 24, eyeMainColor, irisColor);
        drawHalfLidEye(ctx, 172 + ox * 0.5, 116 + Math.max(0, oy * 0.5), 24, eyeMainColor, irisColor);

        // Smirking smirk mouth
        ctx.strokeStyle = eyeMainColor;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(110, 172);
        ctx.quadraticCurveTo(132, 172, 148, 160);
        ctx.stroke();
      } else if (expr === "surprised" || expr === "alert") {
        // Big round surprised eyes
        drawAnimeEye(ctx, 84 + ox, 112 + oy, 30, eyeMainColor, irisColor);
        drawAnimeEye(ctx, 172 + ox, 112 + oy, 30, eyeMainColor, irisColor);

        // Surprised O-mouth
        ctx.strokeStyle = eyeMainColor;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.ellipse(128, 172, 12, 18, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (expr === "sleeping") {
        // Cute sleeping closed curved lashes
        ctx.strokeStyle = eyeMainColor;
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(84, 118, 22, 0.15 * Math.PI, 0.85 * Math.PI, false);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(172, 118, 22, 0.15 * Math.PI, 0.85 * Math.PI, false);
        ctx.stroke();

        // Floating 'Z z z'
        const zOff = (time * 1.5) % 3;
        ctx.fillStyle = eyeMainColor;
        ctx.font = "bold 16px monospace";
        ctx.fillText("z", 175 + zOff * 6, 85 - zOff * 8);
        ctx.font = "bold 20px monospace";
        ctx.fillText("Z", 195 + zOff * 6, 65 - zOff * 8);

        // Sleepy flat mouth
        ctx.beginPath();
        ctx.moveTo(116, 172);
        ctx.lineTo(140, 172);
        ctx.stroke();
      } else if (expr === "ninja") {
        // --- 🥷 SHINOBI NINJA FACE MASK & HEADBAND ---
        // 1. Ninja Headband (Hitai-ate) across upper forehead
        ctx.fillStyle = "#0c1322";
        ctx.fillRect(0, 32, 256, 44);
        ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(0, 32, 256, 44);

        // Swaying headband knot ties on the left side
        const tieWave = Math.sin(time * 3) * 5;
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.moveTo(10, 52);
        ctx.quadraticCurveTo(2, 72 + tieWave, 6, 94 + tieWave);
        ctx.lineTo(14, 92 + tieWave);
        ctx.quadraticCurveTo(10, 72 + tieWave, 18, 52);
        ctx.fill();

        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.moveTo(16, 52);
        ctx.quadraticCurveTo(24, 76 - tieWave, 18, 102 - tieWave);
        ctx.lineTo(26, 100 - tieWave);
        ctx.quadraticCurveTo(30, 76 - tieWave, 24, 52);
        ctx.fill();

        // Metallic Forehead Protector Plate
        const px = 84;
        const py = 38;
        const pw = 88;
        const ph = 32;

        const metalGrad = ctx.createLinearGradient(px, py, px, py + ph);
        metalGrad.addColorStop(0, "#e2e8f0");
        metalGrad.addColorStop(0.3, "#94a3b8");
        metalGrad.addColorStop(0.6, "#475569");
        metalGrad.addColorStop(1, "#334155");
        ctx.fillStyle = metalGrad;
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        if ((ctx as any).roundRect) {
          (ctx as any).roundRect(px, py, pw, ph, 5);
        } else {
          ctx.rect(px, py, pw, ph);
        }
        ctx.fill();
        ctx.stroke();

        // 4 Corner Screws / Rivets
        ctx.fillStyle = "#1e293b";
        [
          [px + 6, py + 6],
          [px + pw - 6, py + 6],
          [px + 6, py + ph - 6],
          [px + pw - 6, py + ph - 6],
        ].forEach(([rx, ry]) => {
          ctx.beginPath();
          ctx.arc(rx, ry, 2, 0, Math.PI * 2);
          ctx.fill();
        });

        // Kanji "忍" (Shinobi / Ninja) engraved on metal plate
        ctx.fillStyle = "#090d16";
        ctx.font = "bold 15px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("忍", px + pw / 2, py + 21);
        ctx.textAlign = "start";

        // 2. Ninja Mask (Mempo Cloth) over lower half of face
        const maskGrad = ctx.createLinearGradient(128, 134, 128, 240);
        maskGrad.addColorStop(0, "#080d16");
        maskGrad.addColorStop(0.4, "#0f172a");
        maskGrad.addColorStop(1, "#05080f");
        ctx.fillStyle = maskGrad;

        ctx.beginPath();
        ctx.moveTo(0, 142);
        ctx.lineTo(80, 140);
        ctx.lineTo(128, 131); // nose bridge peak
        ctx.lineTo(176, 140);
        ctx.lineTo(256, 142);
        ctx.lineTo(256, 240);
        ctx.lineTo(0, 240);
        ctx.closePath();
        ctx.fill();

        // Mask top seam border
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 142);
        ctx.lineTo(80, 140);
        ctx.lineTo(128, 131);
        ctx.lineTo(176, 140);
        ctx.lineTo(256, 142);
        ctx.stroke();

        // Cloth folds & breathing pleats
        ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(60, 156);
        ctx.quadraticCurveTo(128, 168, 196, 156);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(85, 180);
        ctx.quadraticCurveTo(128, 192, 171, 180);
        ctx.stroke();

        // Nose vertical center ridge
        ctx.beginPath();
        ctx.moveTo(128, 132);
        ctx.lineTo(128, 166);
        ctx.stroke();

        // 3. Fierce Slanted Ninja Eyebrows
        ctx.strokeStyle = "#0284c7";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(56, 88);
        ctx.lineTo(108, 96);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(200, 88);
        ctx.lineTo(148, 96);
        ctx.stroke();

        // 4. Sharpened Glowing Shinobi Eyes
        drawNinjaEye(ctx, 84 + ox * 0.75, 110 + oy * 0.5, true, time);
        drawNinjaEye(ctx, 172 + ox * 0.75, 110 + oy * 0.5, false, time);
      } else {
        // Neutral clean state
        drawAnimeEye(ctx, 84 + ox, 114 + oy, 24, eyeMainColor, irisColor);
        drawAnimeEye(ctx, 172 + ox, 114 + oy, 24, eyeMainColor, irisColor);

        ctx.strokeStyle = eyeMainColor;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(112, 168);
        ctx.lineTo(144, 168);
        ctx.stroke();
      }

      // Bottom Micro Screen Spec Bar
      ctx.fillStyle = expr === "ninja" ? "rgba(56, 189, 248, 0.85)" : "rgba(148, 163, 184, 0.4)";
      ctx.font = "9px monospace";
      ctx.fillText(
        expr === "ninja" ? "1.8\" IPS DISPLAY // SHINOBI JUTSU" : "1.8\" IPS DISPLAY // SPI DMA",
        expr === "ninja" ? 38 : 52,
        244
      );
    },
    [currentTheme]
  );

  // Helper: Draw multi-layer anime style colorful eye on LCD
  function drawAnimeEye(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    mainColor: string,
    irisColor: string
  ) {
    // Outer eye glow / sclera
    const eyeGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, radius);
    eyeGrad.addColorStop(0, mainColor);
    eyeGrad.addColorStop(0.7, irisColor);
    eyeGrad.addColorStop(1, "#0b101b");

    ctx.fillStyle = eyeGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Dark core pupil
    ctx.fillStyle = "#050811";
    ctx.beginPath();
    ctx.arc(cx, cy + 2, radius * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // Glossy primary white sparkle glint
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx - radius * 0.28, cy - radius * 0.28, radius * 0.26, 0, Math.PI * 2);
    ctx.fill();

    // Glossy secondary tiny sparkle glint
    ctx.beginPath();
    ctx.arc(cx + radius * 0.28, cy + radius * 0.28, radius * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }

  // Helper: Draw half-lidded sassy eye
  function drawHalfLidEye(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    mainColor: string,
    irisColor: string
  ) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx - radius - 5, cy - 2, (radius + 5) * 2, radius + 10);
    ctx.clip();

    drawAnimeEye(ctx, cx, cy + 4, radius, mainColor, irisColor);
    ctx.restore();

    // Sharp eyelid line
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy - 2);
    ctx.lineTo(cx + radius, cy - 2);
    ctx.stroke();
  }

  // Helper: Draw fierce anime ninja eye with sharp angular visor clip & shuriken iris reflections
  function drawNinjaEye(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    isLeft: boolean,
    time: number
  ) {
    const radius = 22;
    ctx.save();
    ctx.beginPath();
    if (isLeft) {
      // Left eye: sharp outer corner at top-left, determined slant
      ctx.moveTo(cx - 24, cy - 4);
      ctx.quadraticCurveTo(cx - 4, cy - 14, cx + 22, cy + 2);
      ctx.quadraticCurveTo(cx - 2, cy + 12, cx - 24, cy - 4);
    } else {
      // Right eye: sharp outer corner at top-right, determined slant
      ctx.moveTo(cx + 24, cy - 4);
      ctx.quadraticCurveTo(cx + 4, cy - 14, cx - 22, cy + 2);
      ctx.quadraticCurveTo(cx + 2, cy + 12, cx + 24, cy - 4);
    }
    ctx.closePath();
    ctx.clip();

    // Eye background - deep stealth blue
    ctx.fillStyle = "#050b14";
    ctx.fillRect(cx - 30, cy - 20, 60, 40);

    // Glowing Iris with subtle energetic breath pulse
    const pulse = 1 + Math.sin(time * 5) * 0.08;
    const irisGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, radius * pulse);
    irisGrad.addColorStop(0, "#38bdf8"); // bright cyan
    irisGrad.addColorStop(0.5, "#0284c7"); // electric blue
    irisGrad.addColorStop(1, "#082f49"); // deep navy
    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Dark core pupil
    ctx.fillStyle = "#020617";
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();

    // Shuriken 4-point star inside pupil
    ctx.fillStyle = "#38bdf8";
    const starRot = time * 2;
    for (let i = 0; i < 4; i++) {
      const angle = starRot + (i * Math.PI) / 2;
      const px = cx + Math.cos(angle) * 7;
      const py = cy + Math.sin(angle) * 7;
      ctx.beginPath();
      ctx.arc(px, py, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fierce glossy reflection sparkles
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx - 5, cy - 6, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 6, cy + 3, 1.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Sharp outer eyeliner
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (isLeft) {
      ctx.moveTo(cx - 24, cy - 4);
      ctx.quadraticCurveTo(cx - 4, cy - 14, cx + 22, cy + 2);
    } else {
      ctx.moveTo(cx + 24, cy - 4);
      ctx.quadraticCurveTo(cx + 4, cy - 14, cx - 22, cy + 2);
    }
    ctx.stroke();

    // Lower subtle lash line
    ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    if (isLeft) {
      ctx.moveTo(cx - 16, cy + 2);
      ctx.quadraticCurveTo(cx - 2, cy + 12, cx + 18, cy + 4);
    } else {
      ctx.moveTo(cx + 16, cy + 2);
      ctx.quadraticCurveTo(cx + 2, cy + 12, cx - 18, cy + 4);
    }
    ctx.stroke();
  }

  // Initialize Three.js Scene
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xddf4f0, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(4, 8, 6);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const initialThemeCfg = RGB_THEMES[rgbTheme || "cyan"] || RGB_THEMES.cyan;
    const cyanPoint = new THREE.PointLight(initialThemeCfg.hexNumber, 2.5, 16);
    cyanPoint.position.set(-4, 3, 2);
    scene.add(cyanPoint);

    const amberPoint = new THREE.PointLight(0xf2a65a, 1.6, 12);
    amberPoint.position.set(3, -3, -2);
    scene.add(amberPoint);

    // Glowing Cyber Underglow Ring
    const ringGeo = new THREE.RingGeometry(1.3, 1.75, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: initialThemeCfg.hexNumber,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
    });
    const underglowMesh = new THREE.Mesh(ringGeo, ringMat);
    underglowMesh.rotation.x = -Math.PI / 2;
    underglowMesh.position.y = -2.78;
    scene.add(underglowMesh);

    // Subtle floor shadow receiver plane
    const shadowGeo = new THREE.PlaneGeometry(12, 12);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.25 });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -2.8;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // Track materials for wireframe/clay toggles
    const allMaterials: THREE.Material[] = [];

    // Body Chassis Materials (Authentic Natural Kraft Cardboard)
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0xc49a6c, // Natural kraft cardboard brown
      roughness: 0.88, // Natural matte paper/cardboard fiber finish
      metalness: 0.04,
    });
    allMaterials.push(chassisMat);

    const darkAccentMat = new THREE.MeshStandardMaterial({
      color: 0xa4784a, // Scored fold line / corrugated edge
      roughness: 0.92,
      metalness: 0.02,
    });
    allMaterials.push(darkAccentMat);

    const servoCaseMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8, // SG90 iconic blue casing
      roughness: 0.2,
      metalness: 0.3,
      transparent: true,
      opacity: 0.88,
    });
    allMaterials.push(servoCaseMat);

    const servoHornMat = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      roughness: 0.3,
    });
    allMaterials.push(servoHornMat);

    const goldPinMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.85,
    });
    allMaterials.push(goldPinMat);

    const batteryMat = new THREE.MeshStandardMaterial({
      color: 0x059669, // Green wrapped 18650 Li-ion
      roughness: 0.3,
      metalness: 0.4,
    });
    allMaterials.push(batteryMat);

    const pcbMat = new THREE.MeshStandardMaterial({
      color: 0x064e3b, // Dark green PCB substrate
      roughness: 0.5,
      metalness: 0.2,
    });
    allMaterials.push(pcbMat);

    const espShieldMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db, // Metal RF shield of ESP32-WROOM
      roughness: 0.2,
      metalness: 0.9,
    });
    allMaterials.push(espShieldMat);

    // 1.8" IPS Color Screen Face Texture Canvas
    const screenCanvas = document.createElement("canvas");
    screenCanvas.width = 256;
    screenCanvas.height = 256;
    const screenCtx = screenCanvas.getContext("2d")!;
    const screenTexture = new THREE.CanvasTexture(screenCanvas);
    screenTexture.colorSpace = THREE.SRGBColorSpace;
    screenTexture.minFilter = THREE.LinearFilter;

    const screenMat = new THREE.MeshStandardMaterial({
      map: screenTexture,
      emissive: 0xffffff,
      emissiveMap: screenTexture,
      emissiveIntensity: 0.82,
      roughness: 0.15,
      metalness: 0.05,
    });
    allMaterials.push(screenMat);

    // ==========================================
    // Construct 3D Assembly Hierarchy
    // ==========================================
    const robotGroup = new THREE.Group();
    scene.add(robotGroup);

    // 1. Torso & Chassis Body
    const torsoGroup = new THREE.Group();
    robotGroup.add(torsoGroup);

    // Main back casing (48mm W x 68mm H x 11.8mm D)
    const backCaseGeo = new THREE.BoxGeometry(2.1, 2.8, 0.45);
    const backCaseMesh = new THREE.Mesh(backCaseGeo, chassisMat);
    backCaseMesh.position.set(0, -0.6, -0.15);
    backCaseMesh.castShadow = true;
    backCaseMesh.receiveShadow = true;
    torsoGroup.add(backCaseMesh);

    // Front decorative plate
    const frontPlateGeo = new THREE.BoxGeometry(2.0, 2.7, 0.25);
    const frontPlateMesh = new THREE.Mesh(frontPlateGeo, chassisMat);
    frontPlateMesh.position.set(0, -0.6, 0.2);
    frontPlateMesh.castShadow = true;
    torsoGroup.add(frontPlateMesh);

    // Battery vent slits
    for (let i = 0; i < 4; i++) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.05), darkAccentMat);
      vent.position.set(0, -1.3 + i * 0.12, 0.33);
      torsoGroup.add(vent);
    }

    // Bottom USB-C Port
    const usbPort = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.1, 0.2), darkAccentMat);
    usbPort.position.set(0, -2.05, 0);
    torsoGroup.add(usbPort);

    // 18650 Battery Cell (Cylinder inside lower compartment)
    const battGeo = new THREE.CylinderGeometry(0.32, 0.32, 2.1, 24);
    const batteryMesh = new THREE.Mesh(battGeo, batteryMat);
    batteryMesh.position.set(0, -0.6, 0);
    torsoGroup.add(batteryMesh);

    // ESP32 Board inside
    const pcbGeo = new THREE.BoxGeometry(1.6, 1.2, 0.08);
    const esp32BoardMesh = new THREE.Mesh(pcbGeo, pcbMat);
    esp32BoardMesh.position.set(0, -0.6, -0.05);
    const espShield = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.08), espShieldMat);
    espShield.position.set(0, 0.1, 0.05);
    esp32BoardMesh.add(espShield);
    torsoGroup.add(esp32BoardMesh);

    // Neck joint
    const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.35, 16), darkAccentMat);
    neckMesh.position.set(0, 0.9, 0);
    torsoGroup.add(neckMesh);

    // 2. Head & 1.8" IPS Screen
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.65, 0);
    robotGroup.add(headGroup);

    // Head outer enclosure (beveled look)
    const headCase = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.45, 0.75), chassisMat);
    headCase.castShadow = true;
    headGroup.add(headCase);

    // 1.8" IPS Color display surface
    const screenGeo = new THREE.PlaneGeometry(1.72, 1.22);
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(0, 0.02, 0.385);
    headGroup.add(screenMesh);

    // Screen bezel frame
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(1.84, 1.32, 0.05), darkAccentMat);
    bezel.position.set(0, 0.02, 0.36);
    headGroup.add(bezel);

    // Top Antenna / Sensor Nub
    const antMat = new THREE.MeshStandardMaterial({ color: 0x5eead4, emissive: 0x5eead4, emissiveIntensity: 0.9 });
    allMaterials.push(antMat);
    const antMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 12), antMat);
    antMesh.position.set(0, 0.75, 0);
    headGroup.add(antMesh);

    // Top Right Acoustic Microphone Hole
    const micRing = new THREE.Mesh(new THREE.RingGeometry(0.04, 0.08, 16), goldPinMat);
    micRing.rotation.x = -Math.PI / 2;
    micRing.position.set(0.8, 0.68, 0.1);
    headGroup.add(micRing);

    // 3. Left Arm & SG90 Micro-Servo
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-1.25, 0.2, 0);
    robotGroup.add(leftArmGroup);

    // Servo transparent blue body
    const leftServoBody = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.65, 0.5), servoCaseMat);
    leftArmGroup.add(leftServoBody);

    // Left Servo Horn (rotates around shoulder axis)
    const leftServoHorn = new THREE.Group();
    leftServoHorn.position.set(-0.25, 0, 0);
    leftArmGroup.add(leftServoHorn);

    const leftHornDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 16), servoHornMat);
    leftHornDisc.rotation.z = Math.PI / 2;
    leftServoHorn.add(leftHornDisc);

    // Left Arm Limb (Precision cut cardboard arm tab)
    const leftLimb = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.4, 0.22), chassisMat);
    leftLimb.position.set(0, -0.65, 0);
    leftLimb.castShadow = true;
    leftServoHorn.add(leftLimb);

    const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.35, 0.24), darkAccentMat);
    leftHand.position.set(0, -1.35, 0);
    leftServoHorn.add(leftHand);

    // 4. Right Arm & SG90 Micro-Servo
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(1.25, 0.2, 0);
    robotGroup.add(rightArmGroup);

    const rightServoBody = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.65, 0.5), servoCaseMat);
    rightArmGroup.add(rightServoBody);

    const rightServoHorn = new THREE.Group();
    rightServoHorn.position.set(0.25, 0, 0);
    rightArmGroup.add(rightServoHorn);

    const rightHornDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 16), servoHornMat);
    rightHornDisc.rotation.z = Math.PI / 2;
    rightServoHorn.add(rightHornDisc);

    const rightLimb = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.4, 0.22), chassisMat);
    rightLimb.position.set(0, -0.65, 0);
    rightLimb.castShadow = true;
    rightServoHorn.add(rightLimb);

    const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.35, 0.24), darkAccentMat);
    rightHand.position.set(0, -1.35, 0);
    rightServoHorn.add(rightHand);

    // Camera initial orbit coordinates
    const initialSpherical = { radius: 7.2, theta: 0.3, phi: 1.35 };

    threeRef.current = {
      scene,
      camera,
      renderer,
      robotGroup,
      headGroup,
      screenMesh,
      torsoGroup,
      leftArmGroup,
      rightArmGroup,
      leftServoHorn,
      rightServoHorn,
      batteryMesh,
      frontPlateMesh,
      esp32BoardMesh,
      screenCanvas,
      screenCtx,
      screenTexture,
      materials: allMaterials,
      accentPointLight: cyanPoint,
      underglowMesh: underglowMesh,
      isDragging: false,
      prevMousePos: { x: 0, y: 0 },
      spherical: { ...initialSpherical },
      targetSpherical: { ...initialSpherical },
      explodedProgress: 0,
      frameId: 0,
      time: 0,
    };

    // Animation Loop
    const animate = () => {
      if (!threeRef.current) return;
      const ref = threeRef.current;
      ref.time += 0.016;

      const {
        pose: currentPose,
        expression: currentExpr,
        isTalking: currentTalking,
        exploded: currentExploded,
        autoRotate: currentAutoRotate,
        trackCursor: currentTrackCursor,
        rgbTheme: currentRgbTheme,
        robotName: currentRobotName,
      } = propsRef.current;

      // Cursor tracking smooth interpolation
      currentHeadLook.current.x += (targetHeadLook.current.x - currentHeadLook.current.x) * 0.08;
      currentHeadLook.current.y += (targetHeadLook.current.y - currentHeadLook.current.y) * 0.08;

      // 1. Render animated Color LCD face onto screen canvas (with pupil offset following cursor!)
      const eyeOffsetX = currentTrackCursor ? Math.round(currentHeadLook.current.x * 8) : 0;
      const eyeOffsetY = currentTrackCursor ? Math.round(currentHeadLook.current.y * 6) : 0;
      const activeTheme = RGB_THEMES[currentRgbTheme || "cyan"] || RGB_THEMES.cyan;
      drawFace(
        ref.screenCtx,
        currentExpr,
        ref.time,
        { x: eyeOffsetX, y: eyeOffsetY },
        activeTheme,
        currentTalking,
        currentRobotName
      );
      ref.screenTexture.needsUpdate = true;

      // 2. Auto-rotate camera orbit if enabled
      if (currentAutoRotate && !ref.isDragging) {
        ref.targetSpherical.theta += 0.008;
      }

      // Smooth camera interpolation
      ref.spherical.theta += (ref.targetSpherical.theta - ref.spherical.theta) * 0.1;
      ref.spherical.phi += (ref.targetSpherical.phi - ref.spherical.phi) * 0.1;
      ref.spherical.radius += (ref.targetSpherical.radius - ref.spherical.radius) * 0.1;

      // Clamp vertical camera orbit
      ref.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, ref.spherical.phi));

      const cx = ref.spherical.radius * Math.sin(ref.spherical.phi) * Math.sin(ref.spherical.theta);
      const cy = ref.spherical.radius * Math.cos(ref.spherical.phi);
      const cz = ref.spherical.radius * Math.sin(ref.spherical.phi) * Math.cos(ref.spherical.theta);

      ref.camera.position.set(cx, cy, cz);
      ref.camera.lookAt(0, 0.2, 0);

      // 3. Smooth Servo Horn Movement
      const targetLeftRad = (currentPose.leftArm * Math.PI) / 180;
      const targetRightRad = (-currentPose.rightArm * Math.PI) / 180;

      ref.leftServoHorn.rotation.z += (targetLeftRad - ref.leftServoHorn.rotation.z) * 0.15;
      ref.rightServoHorn.rotation.z += (targetRightRad - ref.rightServoHorn.rotation.z) * 0.15;

      // 3b. Interactive Head Look-at-Cursor Easter Egg & Breathing Sway
      if (!currentExploded && currentTrackCursor) {
        // Yaw rotates horizontally towards mouse cursor + slight natural breath
        const targetYaw = currentHeadLook.current.x * 0.45 + Math.sin(ref.time * 1.5) * 0.02;
        // Pitch tilts up/down towards mouse cursor
        const targetPitch = currentHeadLook.current.y * 0.32;
        // Subtle natural roll
        const targetRoll = -currentHeadLook.current.x * 0.08 + Math.cos(ref.time * 1.2) * 0.02;

        ref.headGroup.rotation.y = targetYaw;
        ref.headGroup.rotation.x = targetPitch;
        ref.headGroup.rotation.z = targetRoll;
        ref.robotGroup.position.y = Math.sin(ref.time * 2.0) * 0.05;
      } else if (!currentExploded) {
        ref.headGroup.rotation.y = Math.sin(ref.time * 1.5) * 0.04;
        ref.headGroup.rotation.x = 0;
        ref.headGroup.rotation.z = Math.cos(ref.time * 1.2) * 0.02;
        ref.robotGroup.position.y = Math.sin(ref.time * 2.0) * 0.05;
      } else {
        ref.headGroup.rotation.set(0, 0, 0);
        ref.robotGroup.position.y = 0;
      }

      // 4. Smooth Exploded CAD View Animation
      const targetExplode = currentExploded ? 1 : 0;
      ref.explodedProgress += (targetExplode - ref.explodedProgress) * 0.08;
      const ep = ref.explodedProgress;

      ref.headGroup.position.set(0, 1.65 + ep * 1.5, ep * 0.3);
      ref.screenMesh.position.set(0, 0.02, 0.385 + ep * 0.8);
      ref.frontPlateMesh.position.set(0, -0.6, 0.2 + ep * 1.2);
      ref.leftArmGroup.position.set(-1.25 - ep * 1.3, 0.2, 0);
      ref.rightArmGroup.position.set(1.25 + ep * 1.3, 0.2, 0);
      ref.batteryMesh.position.set(0, -0.6, -ep * 0.9);
      ref.esp32BoardMesh.position.set(0, -0.6, -0.05 - ep * 0.4);

      ref.renderer.render(ref.scene, ref.camera);
      ref.frameId = requestAnimationFrame(animate);
    };

    threeRef.current.frameId = requestAnimationFrame(animate);

    // Global cursor tracking across screen
    const handlePointerMoveGlobal = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height * 0.4;

      // Normalized coordinates relative to viewer container
      const nx = Math.max(-1.5, Math.min(1.5, (e.clientX - centerX) / (rect.width * 0.55)));
      const ny = Math.max(-1.5, Math.min(1.5, (e.clientY - centerY) / (rect.height * 0.55)));

      targetHeadLook.current = { x: nx, y: ny };
    };

    window.addEventListener("mousemove", handlePointerMoveGlobal, { passive: true });

    // Responsive resize handler with ResizeObserver
    let resizeObserver: ResizeObserver | null = null;
    const handleResize = () => {
      if (!containerRef.current || !threeRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w === 0 || h === 0) return;
      threeRef.current.camera.aspect = w / h;
      threeRef.current.camera.updateProjectionMatrix();
      threeRef.current.renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener("mousemove", handlePointerMoveGlobal);
      window.removeEventListener("resize", handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (threeRef.current) {
        cancelAnimationFrame(threeRef.current.frameId);
        threeRef.current.renderer.dispose();
      }
    };
  }, [drawFace]);

  // Update render material modes (shaded, wireframe, clay)
  useEffect(() => {
    if (!threeRef.current) return;
    const { materials } = threeRef.current;
    materials.forEach((mat) => {
      if (mat instanceof THREE.MeshStandardMaterial) {
        if (renderMode === "wireframe") {
          mat.wireframe = true;
        } else {
          mat.wireframe = false;
          if (renderMode === "clay") {
            mat.roughness = 0.9;
            mat.metalness = 0.0;
          } else {
            mat.roughness = 0.35;
            mat.metalness = 0.15;
          }
        }
        mat.needsUpdate = true;
      }
    });
  }, [renderMode]);

  // Dynamic RGB Theme lighting update
  useEffect(() => {
    if (!threeRef.current) return;
    const cfg = RGB_THEMES[rgbTheme || "cyan"] || RGB_THEMES.cyan;
    if (threeRef.current.accentPointLight) {
      threeRef.current.accentPointLight.color.setHex(cfg.hexNumber);
    }
    if (threeRef.current.underglowMesh) {
      (threeRef.current.underglowMesh.material as THREE.MeshBasicMaterial).color.setHex(cfg.hexNumber);
    }
  }, [rgbTheme]);

  // Orbit drag interaction handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!threeRef.current) return;
    threeRef.current.isDragging = true;
    threeRef.current.prevMousePos = { x: e.clientX, y: e.clientY };
    pointerStartPos.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!threeRef.current || !threeRef.current.isDragging) return;
    const deltaX = e.clientX - threeRef.current.prevMousePos.x;
    const deltaY = e.clientY - threeRef.current.prevMousePos.y;

    threeRef.current.targetSpherical.theta -= deltaX * 0.008;
    threeRef.current.targetSpherical.phi -= deltaY * 0.008;

    threeRef.current.prevMousePos = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (threeRef.current) {
      threeRef.current.isDragging = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // pointer release fallback
      }

      // Check for tap / click without drag
      const dist = Math.hypot(e.clientX - pointerStartPos.current.x, e.clientY - pointerStartPos.current.y);
      const dt = Date.now() - pointerStartPos.current.time;
      if (dist < 8 && dt < 450) {
        soundFX.playBoop();
        const quips = ["Boop! 🤖", "Tickle! (^_~)", "SG90 servos primed!", "Looking sharp! ✨", "Zonyx+ ready!"];
        const pick = quips[Math.floor(Math.random() * quips.length)];
        setPokeText(pick);
        if (onExpressionChange) onExpressionChange("wink");
        setTimeout(() => {
          setPokeText(null);
          if (onExpressionChange) onExpressionChange("happy");
        }, 1800);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!threeRef.current) return;
    e.preventDefault();
    const newRadius = threeRef.current.targetSpherical.radius + e.deltaY * 0.005;
    threeRef.current.targetSpherical.radius = Math.max(3.8, Math.min(12, newRadius));
  };

  const setView = (view: "iso" | "front" | "side" | "back") => {
    soundFX.playClick();
    setCameraPreset(view);
    if (!threeRef.current) return;
    const target = threeRef.current.targetSpherical;
    if (view === "iso") {
      target.radius = 7.2;
      target.theta = 0.45;
      target.phi = 1.35;
    } else if (view === "front") {
      target.radius = 6.5;
      target.theta = 0;
      target.phi = 1.57;
    } else if (view === "side") {
      target.radius = 6.2;
      target.theta = Math.PI / 2;
      target.phi = 1.57;
    } else if (view === "back") {
      target.radius = 6.5;
      target.theta = Math.PI;
      target.phi = 1.57;
    }
  };

  const triggerGesture = (name: string, left: number, right: number, mood?: EmotionType) => {
    if (name === "Dance") {
      soundFX.playDance();
      if (onExpressionChange) onExpressionChange("happy");
      let count = 0;
      const interval = setInterval(() => {
        count++;
        if (count === 1 && onArmChange) onArmChange({ leftArm: 70, rightArm: -10 });
        else if (count === 2 && onArmChange) onArmChange({ leftArm: -10, rightArm: 70 });
        else if (count === 3 && onArmChange) onArmChange({ leftArm: 60, rightArm: 60 });
        else if (count >= 4) {
          clearInterval(interval);
          if (onArmChange) onArmChange({ leftArm: 20, rightArm: 20 });
        }
      }, 220);
      return;
    }

    if (name === "Sleep") {
      soundFX.playPowerDown();
      if (onExpressionChange) onExpressionChange("sleeping");
      if (onArmChange) onArmChange({ leftArm: -35, rightArm: -35 });
      return;
    }

    if (name === "Ninja Strike" || name === "Ninja") {
      soundFX.playNinjaSlash();
      soundFX.play8BitFanfare();
      if (onExpressionChange) onExpressionChange("ninja");
      if (onArmChange) onArmChange({ leftArm: 75, rightArm: -25 });
      return;
    }

    if (name === "Wave") {
      soundFX.playLaser();
      soundFX.playServoMove();
      if (onExpressionChange) onExpressionChange("happy");
    } else if (name === "High Five") {
      soundFX.playSuccess();
      soundFX.playServoMove();
      if (onExpressionChange) onExpressionChange("happy");
    } else if (name === "Sassy Burn") {
      soundFX.playRobotChirp("roasting");
      soundFX.playServoMove();
      if (onExpressionChange) onExpressionChange("roasting");
    } else if (name === "Shrug") {
      soundFX.playRobotChirp("thinking");
      soundFX.playServoMove();
      if (onExpressionChange) onExpressionChange("thinking");
    } else {
      soundFX.playServoMove();
      if (mood && onExpressionChange) onExpressionChange(mood);
    }

    if (onArmChange) {
      onArmChange({ leftArm: left, rightArm: right });
    }
  };

  // Global Konami Code Listener for 3D Viewer (synchronizes expression and shinobi stance)
  useEffect(() => {
    const handleKonamiNinja = (e: Event) => {
      const customEvent = e as CustomEvent<{ emotion?: EmotionType; pose?: ServoPose }>;
      const nextEmotion = customEvent.detail?.emotion || "ninja";
      const nextPose = customEvent.detail?.pose || { leftArm: 75, rightArm: -25 };
      if (onExpressionChange) onExpressionChange(nextEmotion);
      if (onArmChange) onArmChange(nextPose);
    };

    window.addEventListener("p1-konami-ninja", handleKonamiNinja);
    return () => window.removeEventListener("p1-konami-ninja", handleKonamiNinja);
  }, [onExpressionChange, onArmChange]);

  return (
    <div
      className={`relative bg-[#0d1017] border rounded-xl overflow-hidden shadow-2xl transition-all duration-500 ${className}`}
      style={{
        borderColor: `${currentTheme.primary}40`,
        boxShadow: `0 8px 32px -8px ${currentTheme.glow}`,
      }}
    >
      {/* 3D WebGL Canvas Stage */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        className="w-full h-full min-h-[360px] sm:min-h-[460px] cursor-grab active:cursor-grabbing touch-none relative select-none"
      >
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Blueprint background grid overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="w-full h-full bg-[radial-gradient(#5eead4_1px,transparent_1px)] [background-size:20px_20px]" />
        </div>

        {/* Floating Poke/Tap Speech Reaction */}
        {pokeText && (
          <div
            className="absolute top-14 sm:top-16 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-mono font-bold rounded-full shadow-xl pointer-events-none animate-bounce z-20 whitespace-nowrap"
            style={{ backgroundColor: currentTheme.primary, color: "#10131a" }}
          >
            {pokeText}
          </div>
        )}

        {/* Top Controls HUD (Responsive Wrapping) */}
        <div className="absolute top-2.5 inset-x-2.5 sm:top-3 sm:inset-x-3 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 pointer-events-auto z-20">
          <div className="flex flex-wrap items-center gap-1.5">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#141820]/90 border border-[#2a3140] rounded text-[11px] font-mono backdrop-blur-md"
              style={{ color: currentTheme.primary }}
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: currentTheme.primary }}
              />
              <span className="font-bold">Cardboard CAD</span>
            </div>

            {/* Radar Telemetry Indicator */}
            <div
              className="flex items-center gap-1.5 px-2 py-1 bg-[#141820]/90 border border-[#2a3140] hover:border-[#5eead4]/60 rounded text-[11px] font-mono backdrop-blur-md transition-colors"
              title={
                syncState.status === "connected"
                  ? `ESP32 Radar Scanning Active (${syncState.connectionType.toUpperCase()})`
                  : "Radar Sensor Scope (Standby)"
              }
            >
              <RadarStatusIndicator
                isActive={syncState.status === "connected"}
                size="xs"
                connectionType={syncState.connectionType}
              />
              <span className="hidden sm:inline text-[10px] text-[#8b93a7]">
                {syncState.status === "connected" ? "RADAR ACTIVE" : "RADAR"}
              </span>
            </div>

            {/* RGB Mood Selector inside 3D viewer */}
            <div className="flex items-center gap-1 px-2 py-1 bg-[#141820]/90 border border-[#2a3140] rounded backdrop-blur-md">
              <span className="text-[10px] font-mono text-[#8b93a7] mr-0.5 hidden xs:inline">RGB:</span>
              {THEME_LIST.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    soundFX.playBoop();
                    onChangeRgbTheme?.(t.id);
                  }}
                  title={`Robot LED Accent: ${t.name}`}
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full transition-transform active:scale-90 cursor-pointer ${
                    (rgbTheme || "cyan") === t.id ? "scale-125 ring-2 ring-white/70" : "opacity-60 hover:opacity-100"
                  }`}
                  style={{
                    backgroundColor: t.primary,
                    boxShadow: (rgbTheme || "cyan") === t.id ? `0 0 6px ${t.primary}` : "none",
                  }}
                />
              ))}
            </div>

            <button
              onClick={() => {
                soundFX.playClick();
                setAutoRotate(!autoRotate);
              }}
              className={`px-2 sm:px-2.5 py-1 text-[11px] font-mono rounded border backdrop-blur-md transition-all cursor-pointer flex items-center gap-1 ${
                autoRotate
                  ? "bg-[#5eead4]/15 border-[#5eead4] text-[#5eead4]"
                  : "bg-[#141820]/80 border-[#2a3140] text-[#8b93a7] hover:text-[#eef1f6]"
              }`}
            >
              <Compass className={`w-3 h-3 ${autoRotate ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{autoRotate ? "Auto-Orbiting" : "Orbit"}</span>
            </button>

            <button
              onClick={() => {
                soundFX.playClick();
                setTrackCursor(!trackCursor);
              }}
              className={`px-2 sm:px-2.5 py-1 text-[11px] font-mono rounded border backdrop-blur-md transition-all cursor-pointer flex items-center gap-1 ${
                trackCursor
                  ? "bg-[#5eead4]/15 border-[#5eead4] text-[#5eead4]"
                  : "bg-[#141820]/80 border-[#2a3140] text-[#8b93a7] hover:text-[#eef1f6]"
              }`}
              title="Easter Egg: 3D Robot Head & LCD Eyes follow your cursor!"
            >
              <Eye className={`w-3 h-3 ${trackCursor ? "text-[#5eead4]" : ""}`} />
              <span className="hidden sm:inline">{trackCursor ? "Eyes Following" : "Follow Cursor"}</span>
            </button>
          </div>

          {/* Top Right Explode Parts Toggle */}
          <button
            onClick={() => {
              soundFX.playClick();
              setExploded(!exploded);
            }}
            className={`px-2.5 sm:px-3 py-1 text-xs font-mono font-bold rounded border backdrop-blur-md transition-all cursor-pointer flex items-center gap-1.5 shadow-lg active:scale-95 ${
              exploded
                ? "bg-[#c084fc] border-[#c084fc] text-[#10131a]"
                : "bg-[#141820]/90 border-[#2a3140] text-[#c084fc] hover:border-[#c084fc]"
            }`}
            title="Explode/Assemble Parts"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">{exploded ? "Assembled" : "Explode Parts"}</span>
          </button>
        </div>

        {/* Bottom Floating Control Bar (Responsive) */}
        <div className="absolute bottom-2.5 inset-x-2.5 sm:bottom-3 sm:inset-x-3 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 pointer-events-none z-20">
          {/* Camera Presets */}
          <div className="flex items-center gap-1 bg-[#141820]/95 border border-[#2a3140] p-1 rounded backdrop-blur-md pointer-events-auto text-[11px] font-mono shadow-md">
            <span className="px-1.5 text-[#8b93a7] text-[10px] hidden sm:inline">Camera:</span>
            {(["iso", "front", "side", "back"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-2 py-0.5 rounded capitalize transition-all cursor-pointer ${
                  cameraPreset === v
                    ? "bg-[#5eead4] text-[#10131a] font-bold"
                    : "text-[#8b93a7] hover:text-[#eef1f6] hover:bg-[#191e27]"
                }`}
              >
                {v === "side" ? "11.8mm" : v}
              </button>
            ))}
          </div>

          {/* Shading modes */}
          <div className="flex items-center gap-1 bg-[#141820]/95 border border-[#2a3140] p-1 rounded backdrop-blur-md pointer-events-auto text-[11px] font-mono shadow-md">
            {(["shaded", "wireframe", "clay"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  soundFX.playClick();
                  setRenderMode(mode);
                }}
                className={`px-2 py-0.5 rounded capitalize transition-all cursor-pointer ${
                  renderMode === mode
                    ? "bg-[#f2a65a] text-[#10131a] font-bold"
                    : "text-[#8b93a7] hover:text-[#eef1f6] hover:bg-[#191e27]"
                }`}
              >
                {mode === "shaded" ? "Cardboard" : mode}
              </button>
            ))}
          </div>
        </div>

        {/* Exploded HUD Callout Overlay */}
        {exploded && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
            <div className="flex justify-between items-start">
              <div className="bg-[#141820]/90 border border-[#5eead4]/40 p-2.5 rounded text-xs font-mono text-[#5eead4] backdrop-blur-md max-w-[220px]">
                <div className="font-bold flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> 1.8" IPS Display
                </div>
                <div className="text-[10px] text-[#8b93a7] mt-0.5">1.8-inch SPI IPS (RGB 65K Color)</div>
              </div>

              <div className="bg-[#141820]/90 border border-[#f2a65a]/40 p-2.5 rounded text-xs font-mono text-[#f2a65a] backdrop-blur-md max-w-[200px]">
                <div className="font-bold flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5" /> Dual SG90 Servos
                </div>
                <div className="text-[10px] text-[#8b93a7] mt-0.5">GPIO 18 & 19 PWM output</div>
              </div>
            </div>

            <div className="flex justify-between items-end">
              <div className="bg-[#141820]/90 border border-[#c084fc]/40 p-2.5 rounded text-xs font-mono text-[#c084fc] backdrop-blur-md max-w-[200px]">
                <div className="font-bold flex items-center gap-1">
                  <Battery className="w-3.5 h-3.5" /> 18650 Li-ion
                </div>
                <div className="text-[10px] text-[#8b93a7] mt-0.5">2500mAh+ rechargeable cell</div>
              </div>

              <div className="bg-[#141820]/90 border border-emerald-400/40 p-2.5 rounded text-xs font-mono text-emerald-400 backdrop-blur-md max-w-[200px]">
                <div className="font-bold flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5" /> ESP32-WROOM
                </div>
                <div className="text-[10px] text-[#8b93a7] mt-0.5">Dual 240MHz + WiFi 802.11 b/g/n</div>
              </div>
            </div>
          </div>
        )}

        {/* Central Instruction Hint */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-40 text-center font-mono text-[11px] text-[#8b93a7]">
          <span>360° Drag to Rotate • Pinch/Scroll to Zoom</span>
        </div>
      </div>

      {/* Preset Physical Gestures Bar */}
      {allowPresets && (
        <div className="p-3 sm:p-3.5 bg-[#141820] border-t border-[#2a3140] flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#8b93a7] flex items-center gap-1.5 font-medium">
              <Zap className="w-3.5 h-3.5" style={{ color: currentTheme.primary }} />
              <span>Quick Gestures:</span>
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 sm:gap-2 text-xs font-mono">
            <button
              onClick={() => triggerGesture("Wave", 0, 75)}
              className="px-2.5 sm:px-3 py-1.5 min-h-[36px] bg-[#191e27] hover:bg-[#1f2937] active:scale-95 text-[#5eead4] border border-[#2a3140] hover:border-[#5eead4] rounded-lg transition-all cursor-pointer shadow-sm hover:shadow-[#5eead4]/10"
            >
              👋 Wave
            </button>
            <button
              onClick={() => triggerGesture("High Five", 80, 80)}
              className="px-2.5 sm:px-3 py-1.5 min-h-[36px] bg-[#191e27] hover:bg-[#1f2937] active:scale-95 text-[#f2a65a] border border-[#2a3140] hover:border-[#f2a65a] rounded-lg transition-all cursor-pointer shadow-sm hover:shadow-[#f2a65a]/10"
            >
              ✋ High Five
            </button>
            <button
              onClick={() => triggerGesture("Shrug", 45, 45)}
              className="px-2.5 sm:px-3 py-1.5 min-h-[36px] bg-[#191e27] hover:bg-[#1f2937] active:scale-95 text-[#c084fc] border border-[#2a3140] hover:border-[#c084fc] rounded-lg transition-all cursor-pointer shadow-sm hover:shadow-[#c084fc]/10"
            >
              🤷 Shrug
            </button>
            <button
              onClick={() => triggerGesture("Sassy Burn", -30, 60)}
              className="px-2.5 sm:px-3 py-1.5 min-h-[36px] bg-[#191e27] hover:bg-[#1f2937] active:scale-95 text-rose-400 border border-[#2a3140] hover:border-rose-400 rounded-lg transition-all cursor-pointer shadow-sm hover:shadow-rose-500/10"
            >
              🔥 Sassy Burn
            </button>
            <button
              onClick={() => triggerGesture("Dance", 60, 60)}
              className="px-2.5 sm:px-3 py-1.5 min-h-[36px] bg-[#191e27] hover:bg-[#1f2937] active:scale-95 text-pink-400 border border-[#2a3140] hover:border-pink-400 rounded-lg transition-all cursor-pointer shadow-sm hover:shadow-pink-500/10"
            >
              🕺 Dance
            </button>
            <button
              onClick={() => triggerGesture("Sleep", -35, -35)}
              className="px-2.5 sm:px-3 py-1.5 min-h-[36px] bg-[#191e27] hover:bg-[#1f2937] active:scale-95 text-indigo-400 border border-[#2a3140] hover:border-indigo-400 rounded-lg transition-all cursor-pointer shadow-sm hover:shadow-indigo-500/10"
            >
              💤 Sleep
            </button>
            <button
              onClick={() => triggerGesture("Ninja Strike", 75, -25, "ninja")}
              className="px-2.5 sm:px-3 py-1.5 min-h-[36px] bg-[#191e27] hover:bg-[#162725] active:scale-95 text-[#38bdf8] border border-[#2a3140] hover:border-[#38bdf8] rounded-lg transition-all cursor-pointer shadow-sm hover:shadow-[#38bdf8]/15 font-semibold"
              title="Konami Shinobi Ninja Mode (↑ ↑ ↓ ↓ ← → ← → B A)"
            >
              🥷 Ninja Strike
            </button>
            <button
              onClick={() => triggerGesture("Rest", -20, -20, "neutral")}
              className="px-2.5 sm:px-3 py-1.5 min-h-[36px] bg-[#191e27] hover:bg-[#1f2937] active:scale-95 text-[#8b93a7] border border-[#2a3140] hover:border-[#8b93a7] rounded-lg transition-all cursor-pointer"
            >
              Rest Pose
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
