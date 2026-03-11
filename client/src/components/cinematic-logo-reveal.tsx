import { useRef, useEffect, useState, useCallback } from "react";

import camelSrc from "@/assets/cinematic-logo/camel.png";
import airplaneSrc from "@/assets/cinematic-logo/airplane.png";
import angularSrc from "@/assets/cinematic-logo/angular-shape.png";
import worldMapSrc from "@/assets/cinematic-logo/world-map.png";
import logoSrc from "@assets/WhatsApp_Image_2026-03-09_at_20.11.18-removebg-preview_1773192470477.png";

interface CinematicLogoRevealProps {
  width?: number;
  height?: number;
  onComplete?: () => void;
}

interface Particle {
  x: number;
  y: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
  color: string;
  type: "logo" | "dust" | "spark" | "ray" | "trail";
  delay: number;
  settled: boolean;
}

const GOLD = "#C9A84C";
const GOLD_LIGHT = "#D4B55A";
const GOLD_DARK = "#B8963F";
const GOLD_PALE = "#E8D48B";
const NAVY = "#0A1628";
const DEEP_BLACK = "#060B14";
const DURATION = 12000;

function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeInOutCubic(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function easeOutQuart(t: number) { return 1 - Math.pow(1 - t, 4); }
function easeOutQuint(t: number) { return 1 - Math.pow(1 - t, 5); }
function easeInQuad(t: number) { return t * t; }
function easeOutExpo(t: number) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }
function easeInOutQuad(t: number) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
function lerp(a: number, b: number, t: number) { return a + (b - a) * Math.max(0, Math.min(1, t)); }
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function sampleLogoPixels(
  logo: HTMLImageElement, targetW: number, targetH: number, cx: number, cy: number, sampleStep: number
): { x: number; y: number }[] {
  const offCanvas = document.createElement("canvas");
  offCanvas.width = targetW;
  offCanvas.height = targetH;
  const offCtx = offCanvas.getContext("2d")!;
  offCtx.drawImage(logo, 0, 0, targetW, targetH);
  const imageData = offCtx.getImageData(0, 0, targetW, targetH);
  const pixels: { x: number; y: number }[] = [];
  const offsetX = cx - targetW / 2;
  const offsetY = cy - targetH / 2;
  const MAX_PARTICLES = 600;
  for (let y = 0; y < targetH; y += sampleStep) {
    for (let x = 0; x < targetW; x += sampleStep) {
      const idx = (y * targetW + x) * 4;
      if (imageData.data[idx + 3] > 100) {
        pixels.push({ x: x + offsetX, y: y + offsetY });
      }
    }
  }
  if (pixels.length > MAX_PARTICLES) {
    const stride = pixels.length / MAX_PARTICLES;
    const sampled: typeof pixels = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      sampled.push(pixels[Math.floor(i * stride)]);
    }
    return sampled;
  }
  return pixels;
}

export function CinematicLogoReveal({
  width = 500,
  height = 500,
  onComplete,
}: CinematicLogoRevealProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [completed, setCompleted] = useState(false);
  const imagesRef = useRef<{
    camel: HTMLImageElement;
    airplane: HTMLImageElement;
    angular: HTMLImageElement;
    worldMap: HTMLImageElement;
    logo: HTMLImageElement;
  } | null>(null);
  const logoParticlesRef = useRef<Particle[]>([]);
  const ambientParticlesRef = useRef<Particle[]>([]);
  const particleSpriteRef = useRef<HTMLCanvasElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState(
    typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadImage(camelSrc),
      loadImage(airplaneSrc),
      loadImage(angularSrc),
      loadImage(worldMapSrc),
      loadImage(logoSrc),
    ])
      .then(([camel, airplane, angular, worldMap, logo]) => {
        if (cancelled) return;
        imagesRef.current = { camel, airplane, angular, worldMap, logo };
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load cinematic logo images:", err);
        if (!cancelled) { setLoadError(true); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (loading || !imagesRef.current || completed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    if (reducedMotion) {
      const imgs = imagesRef.current;
      ctx.fillStyle = DEEP_BLACK;
      ctx.fillRect(0, 0, width, height);
      const logoW = width * 0.65;
      const logoH = (imgs.logo.height / imgs.logo.width) * logoW;
      ctx.drawImage(imgs.logo, (width - logoW) / 2, (height - logoH) / 2 - height * 0.05, logoW, logoH);
      ctx.fillStyle = NAVY;
      ctx.font = `bold ${Math.round(width * 0.09)}px 'Amiri', 'Traditional Arabic', serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("لمجيبة", width / 2, height * 0.78);
      ctx.fillStyle = GOLD;
      ctx.font = `700 ${Math.round(width * 0.04)}px 'Montserrat', sans-serif`;
      ctx.fillText("IMPORTING", width / 2, height * 0.86);
      setCompleted(true);
      onComplete?.();
      return;
    }

    const cx = width / 2;
    const cy = height / 2 - height * 0.05;
    const imgs = imagesRef.current;

    const logoW = width * 0.55;
    const logoH = (imgs.logo.height / imgs.logo.width) * logoW;
    const step = Math.max(2, Math.round(Math.sqrt(logoW * logoH) / 55));
    const pixels = sampleLogoPixels(imgs.logo, logoW, logoH, cx, cy, step);

    const goldColors = [GOLD, GOLD_LIGHT, GOLD_DARK, GOLD_PALE, "#F0E0A0"];

    const logoParts: Particle[] = pixels.map((p, i) => {
      const angle = Math.atan2(p.y - cy, p.x - cx) + (Math.random() - 0.5) * 0.5;
      const dist = 150 + Math.random() * 250;
      return {
        x: cx + Math.cos(angle) * dist + (Math.random() - 0.5) * 100,
        y: cy + Math.sin(angle) * dist + (Math.random() - 0.5) * 100,
        tx: p.x,
        ty: p.y,
        vx: 0, vy: 0,
        size: 1.2 + Math.random() * 1.5,
        opacity: 0.6 + Math.random() * 0.4,
        life: 0, maxLife: 9999,
        color: goldColors[i % goldColors.length],
        type: "logo" as const,
        delay: Math.random() * 0.35,
        settled: false,
      };
    });
    logoParticlesRef.current = logoParts;

    const ambient: Particle[] = [];
    for (let i = 0; i < 50; i++) {
      ambient.push({
        x: Math.random() * width,
        y: Math.random() * height,
        tx: 0, ty: 0, vx: (Math.random() - 0.5) * 0.3, vy: -0.1 - Math.random() * 0.4,
        size: 0.5 + Math.random() * 2,
        opacity: 0.15 + Math.random() * 0.35,
        life: 0, maxLife: 200 + Math.random() * 300,
        color: goldColors[Math.floor(Math.random() * goldColors.length)],
        type: "dust" as const,
        delay: Math.random(),
        settled: false,
      });
    }
    ambientParticlesRef.current = ambient;

    const spriteSize = 12;
    const spriteCanvas = document.createElement("canvas");
    spriteCanvas.width = spriteSize * 2;
    spriteCanvas.height = spriteSize * 2;
    const spriteCtx = spriteCanvas.getContext("2d")!;
    const spriteGrad = spriteCtx.createRadialGradient(spriteSize, spriteSize, 0, spriteSize, spriteSize, spriteSize);
    spriteGrad.addColorStop(0, GOLD);
    spriteGrad.addColorStop(0.4, GOLD_LIGHT);
    spriteGrad.addColorStop(1, "transparent");
    spriteCtx.fillStyle = spriteGrad;
    spriteCtx.fillRect(0, 0, spriteSize * 2, spriteSize * 2);
    particleSpriteRef.current = spriteCanvas;

    startTimeRef.current = performance.now();

    const render = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const t = Math.min(elapsed / DURATION, 1);
      drawFrame(ctx, t, elapsed, imgs, cx, cy);
      if (t < 1) {
        animRef.current = requestAnimationFrame(render);
      } else {
        setCompleted(true);
        onComplete?.();
      }
    };
    animRef.current = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(animRef.current); };
  }, [loading, completed, width, height, onComplete, reducedMotion]);

  const drawFrame = useCallback((
    ctx: CanvasRenderingContext2D, t: number, elapsed: number,
    imgs: NonNullable<typeof imagesRef.current>, cx: number, cy: number
  ) => {
    ctx.fillStyle = DEEP_BLACK;
    ctx.fillRect(0, 0, width, height);

    drawFilmGrain(ctx, t, elapsed);
    drawDramaticOpening(ctx, t, elapsed, cx, cy);
    drawWorldMap(ctx, imgs, t, elapsed, cx, cy);
    drawVolumetricRays(ctx, t, elapsed, cx, cy);
    drawLogoParticleAssembly(ctx, t, elapsed, imgs, cx, cy);
    drawMetallicSheen(ctx, t, elapsed, cx, cy, imgs);
    drawAirplaneCinematic(ctx, imgs, t, elapsed, cx, cy);
    drawLensFlare(ctx, t, elapsed, cx, cy);
    drawArabicText(ctx, t, elapsed, cx, cy);
    drawImportingText(ctx, t, elapsed, cx, cy);
    drawAmbientParticles(ctx, t, elapsed);
    drawFinalSettle(ctx, t, elapsed, cx, cy);
    drawShockwave(ctx, t, cx, cy);
  }, [width, height]);

  const drawFilmGrain = (ctx: CanvasRenderingContext2D, t: number, elapsed: number) => {
    if (t < 0.05 || t > 0.98) return;
    ctx.save();
    ctx.globalAlpha = 0.03;
    const grainSize = 3;
    for (let i = 0; i < 80; i++) {
      const gx = Math.random() * width;
      const gy = Math.random() * height;
      const brightness = Math.random() * 60 + 20;
      ctx.fillStyle = `rgb(${brightness},${brightness},${brightness})`;
      ctx.fillRect(gx, gy, grainSize, grainSize);
    }
    ctx.restore();
  };

  const drawDramaticOpening = (ctx: CanvasRenderingContext2D, t: number, elapsed: number, cx: number, cy: number) => {
    const lineStart = 0.0;
    const lineEnd = 0.12;
    const burstEnd = 0.2;

    if (t < lineEnd) {
      const lt = clamp((t - lineStart) / (lineEnd - lineStart), 0, 1);
      const eased = easeOutExpo(lt);
      const lineWidth = width * 0.8 * eased;
      const lineThickness = 1.5 + eased * 1.5;

      ctx.save();
      const grad = ctx.createLinearGradient(cx - lineWidth / 2, cy, cx + lineWidth / 2, cy);
      grad.addColorStop(0, "transparent");
      grad.addColorStop(0.15, `rgba(201,168,76,${0.3 * eased})`);
      grad.addColorStop(0.5, `rgba(201,168,76,${0.9 * eased})`);
      grad.addColorStop(0.85, `rgba(201,168,76,${0.3 * eased})`);
      grad.addColorStop(1, "transparent");
      ctx.strokeStyle = grad;
      ctx.lineWidth = lineThickness;
      ctx.beginPath();
      ctx.moveTo(cx - lineWidth / 2, cy);
      ctx.lineTo(cx + lineWidth / 2, cy);
      ctx.stroke();

      ctx.globalAlpha = eased * 0.4;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, lineWidth * 0.3);
      glow.addColorStop(0, `rgba(201,168,76,0.15)`);
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    if (t >= lineEnd && t < burstEnd) {
      const bt = clamp((t - lineEnd) / (burstEnd - lineEnd), 0, 1);
      const eased = easeOutQuart(bt);
      ctx.save();
      ctx.globalAlpha = (1 - bt) * 0.6;
      const burstR = width * 0.6 * eased;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, burstR);
      grad.addColorStop(0, `rgba(201,168,76,0.5)`);
      grad.addColorStop(0.3, `rgba(201,168,76,0.15)`);
      grad.addColorStop(0.7, `rgba(201,168,76,0.03)`);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  };

  const drawWorldMap = (
    ctx: CanvasRenderingContext2D, imgs: NonNullable<typeof imagesRef.current>,
    t: number, elapsed: number, cx: number, cy: number
  ) => {
    const mapStart = 0.08;
    const mapPeak = 0.35;
    const mapFade = 0.55;
    if (t < mapStart) return;

    const mapW = width * 0.9;
    const mapH = (imgs.worldMap.height / imgs.worldMap.width) * mapW;
    const mapX = cx - mapW / 2;
    const mapY = cy - mapH / 2;

    let alpha: number;
    if (t < mapPeak) {
      alpha = easeOutCubic(clamp((t - mapStart) / (mapPeak - mapStart), 0, 1)) * 0.25;
    } else if (t < mapFade) {
      alpha = 0.25 * (1 - easeInQuad(clamp((t - mapPeak) / (mapFade - mapPeak), 0, 1)) * 0.7);
    } else {
      alpha = 0.075;
    }

    ctx.save();
    ctx.globalAlpha = alpha;

    const rotateAngle = Math.sin(elapsed * 0.0003) * 0.015;
    const perspective = 1 + Math.sin(elapsed * 0.0005) * 0.02;
    ctx.translate(cx, cy);
    ctx.rotate(rotateAngle);
    ctx.scale(perspective, 1);
    ctx.translate(-cx, -cy);

    ctx.drawImage(imgs.worldMap, mapX, mapY, mapW, mapH);

    ctx.globalAlpha = alpha * 0.5;
    if (t < mapFade) {
      const pulse = 0.5 + Math.sin(elapsed * 0.002) * 0.5;
      const cities = [
        { x: cx - mapW * 0.12, y: cy - mapH * 0.1 },
        { x: cx + mapW * 0.2, y: cy - mapH * 0.15 },
        { x: cx + mapW * 0.05, y: cy + mapH * 0.1 },
        { x: cx - mapW * 0.25, y: cy + mapH * 0.05 },
        { x: cx + mapW * 0.3, y: cy + mapH * 0.0 },
      ];
      cities.forEach((city, i) => {
        const cityPulse = 0.5 + Math.sin(elapsed * 0.003 + i * 1.2) * 0.5;
        ctx.fillStyle = GOLD;
        ctx.globalAlpha = alpha * cityPulse * 0.8;
        ctx.beginPath();
        ctx.arc(city.x, city.y, 2 + cityPulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = alpha * cityPulse * 0.15;
        const pingR = 4 + cityPulse * 8;
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(city.x, city.y, pingR, 0, Math.PI * 2);
        ctx.stroke();
      });

      ctx.globalAlpha = alpha * 0.2;
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 6]);
      for (let i = 0; i < cities.length - 1; i++) {
        const from = cities[i];
        const to = cities[i + 1];
        const midX = (from.x + to.x) / 2;
        const midY = Math.min(from.y, to.y) - 20;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(midX, midY, to.x, to.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    ctx.restore();
  };

  const drawVolumetricRays = (ctx: CanvasRenderingContext2D, t: number, elapsed: number, cx: number, cy: number) => {
    if (t < 0.4 || t > 0.95) return;

    let rayAlpha: number;
    if (t < 0.55) {
      rayAlpha = easeOutCubic(clamp((t - 0.4) / 0.15, 0, 1)) * 0.12;
    } else if (t > 0.88) {
      rayAlpha = 0.12 * (1 - clamp((t - 0.88) / 0.07, 0, 1));
    } else {
      rayAlpha = 0.12;
    }

    ctx.save();
    const numRays = 12;
    const rayLength = width * 0.7;

    for (let i = 0; i < numRays; i++) {
      const baseAngle = (i / numRays) * Math.PI * 2;
      const wobble = Math.sin(elapsed * 0.0008 + i * 0.8) * 0.05;
      const angle = baseAngle + wobble;
      const rayW = 0.04 + Math.sin(elapsed * 0.001 + i * 1.5) * 0.015;

      ctx.globalAlpha = rayAlpha * (0.5 + Math.sin(elapsed * 0.0015 + i * 2) * 0.5);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(
        cx + Math.cos(angle - rayW) * rayLength,
        cy + Math.sin(angle - rayW) * rayLength
      );
      ctx.lineTo(
        cx + Math.cos(angle + rayW) * rayLength,
        cy + Math.sin(angle + rayW) * rayLength
      );
      ctx.closePath();

      const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, rayLength);
      grad.addColorStop(0, `rgba(201,168,76,0.15)`);
      grad.addColorStop(0.5, `rgba(201,168,76,0.04)`);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fill();
    }
    ctx.restore();
  };

  const drawLogoParticleAssembly = (
    ctx: CanvasRenderingContext2D, t: number, elapsed: number,
    imgs: NonNullable<typeof imagesRef.current>, cx: number, cy: number
  ) => {
    const assemblyStart = 0.18;
    const assemblyEnd = 0.5;
    const lockTime = 0.48;

    if (t < assemblyStart) return;

    const particles = logoParticlesRef.current;
    const assemblyT = clamp((t - assemblyStart) / (assemblyEnd - assemblyStart), 0, 1);

    particles.forEach((p) => {
      const delayedT = clamp((assemblyT - p.delay) / (1 - p.delay), 0, 1);
      const eased = easeOutQuint(delayedT);

      p.x = lerp(p.x, p.tx, eased < 0.01 ? 0 : eased);
      p.y = lerp(p.y, p.ty, eased < 0.01 ? 0 : eased);

      if (eased > 0.95) p.settled = true;
    });

    if (t >= lockTime) {
      const logoW = width * 0.55;
      const logoH = (imgs.logo.height / imgs.logo.width) * logoW;
      const logoX = cx - logoW / 2;
      const logoY = cy - logoH / 2;

      let logoAlpha: number;
      if (t < assemblyEnd) {
        logoAlpha = easeOutCubic(clamp((t - lockTime) / (assemblyEnd - lockTime), 0, 1));
      } else {
        logoAlpha = 1;
      }

      ctx.save();
      ctx.globalAlpha = logoAlpha;

      if (t < assemblyEnd + 0.05) {
        ctx.shadowColor = GOLD;
        ctx.shadowBlur = 20 * (1 - clamp((t - lockTime) / 0.1, 0, 1));
      }

      ctx.drawImage(imgs.logo, logoX, logoY, logoW, logoH);
      ctx.restore();
      return;
    }

    ctx.save();
    particles.forEach((p) => {
      const delayedT = clamp((assemblyT - p.delay) / (1 - p.delay), 0, 1);
      if (delayedT <= 0) return;

      const alpha = p.opacity * (delayedT < 0.1 ? delayedT * 10 : 1);
      ctx.globalAlpha = alpha;

      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.5);
      g.addColorStop(0, p.color);
      g.addColorStop(0.4, p.color);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
      ctx.fill();

      if (delayedT > 0.1 && delayedT < 0.85) {
        const dx = p.tx - p.x;
        const dy = p.ty - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 3) {
          ctx.globalAlpha = alpha * 0.25;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size * 0.4;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          const trailLen = Math.min(dist * 0.6, 25);
          const angle = Math.atan2(dy, dx);
          ctx.lineTo(p.x - Math.cos(angle) * trailLen, p.y - Math.sin(angle) * trailLen);
          ctx.stroke();
        }
      }
    });
    ctx.restore();
  };

  const drawShockwave = (ctx: CanvasRenderingContext2D, t: number, cx: number, cy: number) => {
    const shockStart = 0.48;
    const shockEnd = 0.58;
    if (t < shockStart || t > shockEnd) return;

    const st = clamp((t - shockStart) / (shockEnd - shockStart), 0, 1);
    const radius = width * 0.5 * easeOutQuart(st);
    const alpha = (1 - easeInQuad(st)) * 0.3;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2.5 * (1 - st);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = alpha * 0.3;
    ctx.lineWidth = 6 * (1 - st);
    ctx.strokeStyle = GOLD_LIGHT;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.95, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };

  const drawMetallicSheen = (
    ctx: CanvasRenderingContext2D, t: number, elapsed: number, cx: number, cy: number,
    imgs: NonNullable<typeof imagesRef.current>
  ) => {
    const sheenStart = 0.46;
    const sheenEnd = 0.62;
    if (t < sheenStart || t > sheenEnd) return;

    const logoW = width * 0.55;
    const logoH = (imgs.logo.height / imgs.logo.width) * logoW;
    const logoX = cx - logoW / 2;
    const logoY = cy - logoH / 2;

    const st = clamp((t - sheenStart) / (sheenEnd - sheenStart), 0, 1);

    const passes = [
      { offset: 0, intensity: 0.35, width: 50 },
      { offset: 0.2, intensity: 0.18, width: 35 },
      { offset: 0.45, intensity: 0.1, width: 25 },
    ];

    ctx.save();
    ctx.beginPath();
    ctx.rect(logoX, logoY, logoW, logoH);
    ctx.clip();

    passes.forEach((pass) => {
      const passT = clamp((st - pass.offset) / (1 - pass.offset), 0, 1);
      if (passT <= 0 || passT >= 1) return;

      const sweepX = logoX + logoW * easeInOutCubic(passT);
      const fadeAlpha = passT < 0.1 ? passT * 10 : passT > 0.85 ? (1 - passT) / 0.15 : 1;

      ctx.globalAlpha = pass.intensity * fadeAlpha;

      const grad = ctx.createLinearGradient(
        sweepX - pass.width, logoY,
        sweepX + pass.width, logoY + logoH
      );
      grad.addColorStop(0, "transparent");
      grad.addColorStop(0.3, `rgba(255,255,255,0.1)`);
      grad.addColorStop(0.5, `rgba(255,255,255,0.6)`);
      grad.addColorStop(0.7, `rgba(255,255,255,0.1)`);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(logoX, logoY, logoW, logoH);
    });
    ctx.restore();
  };

  const drawAirplaneCinematic = (
    ctx: CanvasRenderingContext2D, imgs: NonNullable<typeof imagesRef.current>,
    t: number, elapsed: number, cx: number, cy: number
  ) => {
    const planeStart = 0.3;
    const planeFlyEnd = 0.55;
    const planeSettleEnd = 0.65;

    if (t < planeStart) return;

    const planeW = width * 0.38;
    const planeH = (imgs.airplane.height / imgs.airplane.width) * planeW;
    const finalX = cx - planeW * 0.5;
    const finalY = cy - planeH * 0.15;

    if (t < planeFlyEnd) {
      const flyT = clamp((t - planeStart) / (planeFlyEnd - planeStart), 0, 1);
      const eased = easeInOutCubic(flyT);

      const startX = -planeW * 1.5;
      const startY = height * 0.7;
      const cp1x = width * 0.2;
      const cp1y = height * 0.1;
      const cp2x = width * 0.7;
      const cp2y = cy - height * 0.2;

      const bt = eased;
      const mt = 1 - bt;
      const curX = mt * mt * mt * startX + 3 * mt * mt * bt * cp1x + 3 * mt * bt * bt * cp2x + bt * bt * bt * finalX;
      const curY = mt * mt * mt * startY + 3 * mt * mt * bt * cp1y + 3 * mt * bt * bt * cp2y + bt * bt * bt * finalY;

      const dt = 0.01;
      const bt2 = Math.min(bt + dt, 1);
      const mt2 = 1 - bt2;
      const nextX = mt2 * mt2 * mt2 * startX + 3 * mt2 * mt2 * bt2 * cp1x + 3 * mt2 * bt2 * bt2 * cp2x + bt2 * bt2 * bt2 * finalX;
      const nextY = mt2 * mt2 * mt2 * startY + 3 * mt2 * mt2 * bt2 * cp1y + 3 * mt2 * bt2 * bt2 * cp2y + bt2 * bt2 * bt2 * finalY;
      const rotation = Math.atan2(nextY - curY, nextX - curX);

      const scaleVal = lerp(0.2, 1, easeOutCubic(flyT));
      const alpha = Math.min(flyT * 5, 1);

      ctx.save();

      if (flyT > 0.15 && flyT < 0.9) {
        const contrailAlpha = Math.min((flyT - 0.15) * 4, 1) * (flyT > 0.7 ? (0.9 - flyT) / 0.2 : 1) * 0.12;
        ctx.globalAlpha = contrailAlpha;
        ctx.strokeStyle = GOLD_LIGHT;
        ctx.lineWidth = 1.5 * scaleVal;
        ctx.beginPath();
        ctx.moveTo(curX, curY);
        const prevT = Math.max(bt - 0.15, 0);
        const prevMt = 1 - prevT;
        const prevX = prevMt * prevMt * prevMt * startX + 3 * prevMt * prevMt * prevT * cp1x + 3 * prevMt * prevT * prevT * cp2x + prevT * prevT * prevT * finalX;
        const prevY = prevMt * prevMt * prevMt * startY + 3 * prevMt * prevMt * prevT * cp1y + 3 * prevMt * prevT * prevT * cp2y + prevT * prevT * prevT * finalY;
        ctx.lineTo(prevX, prevY);
        ctx.stroke();

        ctx.lineWidth = 0.8 * scaleVal;
        ctx.globalAlpha = contrailAlpha * 0.5;
        ctx.beginPath();
        const offset = 4;
        ctx.moveTo(curX, curY + offset);
        ctx.lineTo(prevX, prevY + offset);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(curX, curY - offset);
        ctx.lineTo(prevX, prevY - offset);
        ctx.stroke();
      }

      for (let trail = 3; trail >= 1; trail--) {
        const trailT = Math.max(bt - trail * 0.025, 0);
        const tMt = 1 - trailT;
        const tX = tMt * tMt * tMt * startX + 3 * tMt * tMt * trailT * cp1x + 3 * tMt * trailT * trailT * cp2x + trailT * trailT * trailT * finalX;
        const tY = tMt * tMt * tMt * startY + 3 * tMt * tMt * trailT * cp1y + 3 * tMt * trailT * trailT * cp2y + trailT * trailT * trailT * finalY;
        const tScale = lerp(0.2, 1, easeOutCubic(trailT));

        ctx.save();
        ctx.globalAlpha = 0.06 * (4 - trail) * alpha;
        ctx.translate(tX + planeW / 2 * tScale, tY + planeH / 2 * tScale);
        ctx.scale(tScale, tScale);
        ctx.rotate(rotation);
        ctx.drawImage(imgs.airplane, -planeW / 2, -planeH / 2, planeW, planeH);
        ctx.restore();
      }

      ctx.globalAlpha = alpha;
      ctx.translate(curX + planeW / 2 * scaleVal, curY + planeH / 2 * scaleVal);
      ctx.scale(scaleVal, scaleVal);
      ctx.rotate(rotation);

      if (flyT < 0.5) {
        ctx.shadowColor = GOLD;
        ctx.shadowBlur = 20 * (1 - flyT * 2);
      }

      ctx.drawImage(imgs.airplane, -planeW / 2, -planeH / 2, planeW, planeH);
      ctx.restore();

    } else if (t < planeSettleEnd) {
      const settleT = clamp((t - planeFlyEnd) / (planeSettleEnd - planeFlyEnd), 0, 1);
      const bob = Math.sin(settleT * Math.PI * 2) * 3 * (1 - settleT);
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.drawImage(imgs.airplane, finalX, finalY - bob, planeW, planeH);
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.drawImage(imgs.airplane, finalX, finalY, planeW, planeH);
      ctx.restore();
    }
  };

  const drawLensFlare = (ctx: CanvasRenderingContext2D, t: number, elapsed: number, cx: number, cy: number) => {
    if (t < 0.5 || t > 0.7) return;

    const ft = clamp((t - 0.5) / 0.2, 0, 1);
    const fadeIn = ft < 0.3 ? ft / 0.3 : 1;
    const fadeOut = ft > 0.6 ? (1 - ft) / 0.4 : 1;
    const masterAlpha = fadeIn * fadeOut;

    const flareX = cx + width * 0.12;
    const flareY = cy - height * 0.15;

    ctx.save();

    ctx.globalAlpha = masterAlpha * 0.35;
    const coreGlow = ctx.createRadialGradient(flareX, flareY, 0, flareX, flareY, width * 0.05);
    coreGlow.addColorStop(0, "rgba(255,255,255,0.9)");
    coreGlow.addColorStop(0.3, `rgba(232,212,139,0.4)`);
    coreGlow.addColorStop(1, "transparent");
    ctx.fillStyle = coreGlow;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = masterAlpha * 0.15;
    const halo = ctx.createRadialGradient(flareX, flareY, width * 0.06, flareX, flareY, width * 0.15);
    halo.addColorStop(0, `rgba(201,168,76,0.2)`);
    halo.addColorStop(0.5, `rgba(201,168,76,0.05)`);
    halo.addColorStop(1, "transparent");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = masterAlpha * 0.12;
    const streakGrad = ctx.createLinearGradient(flareX - width * 0.35, flareY, flareX + width * 0.35, flareY);
    streakGrad.addColorStop(0, "transparent");
    streakGrad.addColorStop(0.4, `rgba(201,168,76,0.3)`);
    streakGrad.addColorStop(0.5, `rgba(255,255,255,0.5)`);
    streakGrad.addColorStop(0.6, `rgba(201,168,76,0.3)`);
    streakGrad.addColorStop(1, "transparent");
    ctx.fillStyle = streakGrad;
    ctx.fillRect(flareX - width * 0.35, flareY - 2, width * 0.7, 4);

    const ghosts = [
      { dist: 0.3, size: 12, alpha: 0.08 },
      { dist: 0.5, size: 8, alpha: 0.06 },
      { dist: 0.7, size: 15, alpha: 0.04 },
      { dist: -0.2, size: 10, alpha: 0.05 },
    ];
    ghosts.forEach((g) => {
      const gx = flareX + (cx - flareX) * g.dist * 2;
      const gy = flareY + (cy - flareY) * g.dist * 2;
      ctx.globalAlpha = masterAlpha * g.alpha;
      const gg = ctx.createRadialGradient(gx, gy, 0, gx, gy, g.size);
      gg.addColorStop(0, GOLD_PALE);
      gg.addColorStop(1, "transparent");
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.arc(gx, gy, g.size, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  };

  const drawArabicText = (ctx: CanvasRenderingContext2D, t: number, elapsed: number, cx: number, cy: number) => {
    const arStart = 0.58;
    const arEnd = 0.75;
    if (t < arStart) return;

    const arT = clamp((t - arStart) / (arEnd - arStart), 0, 1);
    const eased = easeOutQuart(arT);

    ctx.save();
    ctx.globalAlpha = eased;

    const fontSize = Math.round(width * 0.095);
    ctx.font = `bold ${fontSize}px 'Amiri', 'Traditional Arabic', serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const textY = cy + height * 0.3;
    const slideX = lerp(cx + 40, cx, eased);

    ctx.shadowColor = GOLD_DARK;
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = NAVY;
    ctx.fillText("لمجيبة", slideX, textY);

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    if (arT > 0.4 && arT < 1) {
      const shimmerT = (arT - 0.4) / 0.6;
      const shimmerX = slideX - width * 0.15 + width * 0.3 * easeInOutCubic(shimmerT);
      ctx.globalAlpha = Math.sin(shimmerT * Math.PI) * 0.2;
      const shimGrad = ctx.createLinearGradient(shimmerX - 20, textY, shimmerX + 20, textY);
      shimGrad.addColorStop(0, "transparent");
      shimGrad.addColorStop(0.5, GOLD);
      shimGrad.addColorStop(1, "transparent");
      ctx.fillStyle = shimGrad;
      ctx.fillText("لمجيبة", slideX, textY);
    }

    ctx.restore();
  };

  const drawImportingText = (ctx: CanvasRenderingContext2D, t: number, elapsed: number, cx: number, cy: number) => {
    const impStart = 0.7;
    const impEnd = 0.85;
    if (t < impStart) return;

    const impT = clamp((t - impStart) / (impEnd - impStart), 0, 1);
    const text = "IMPORTING";
    const impFontSize = Math.round(width * 0.042);
    const textY = cy + height * 0.38;

    ctx.save();
    ctx.font = `700 ${impFontSize}px 'Montserrat', 'Segoe UI', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const charCount = Math.floor(impT * text.length * 1.5);
    const visibleChars = Math.min(charCount, text.length);

    const totalWidth = ctx.measureText(text).width;
    const letterSpacing = width * 0.008;
    const totalSpacing = letterSpacing * (text.length - 1);
    let startX = cx - (totalWidth + totalSpacing) / 2;

    for (let i = 0; i < visibleChars; i++) {
      const charT = clamp((impT * text.length * 1.5 - i) / 1.5, 0, 1);
      const charAlpha = easeOutCubic(charT);
      const charScale = lerp(1.3, 1, easeOutQuart(charT));
      const charY = textY + lerp(3, 0, easeOutQuart(charT));

      const charW = ctx.measureText(text[i]).width;
      const charCx = startX + charW / 2;

      ctx.save();
      ctx.globalAlpha = charAlpha;
      ctx.translate(charCx, charY);
      ctx.scale(charScale, charScale);

      const grad = ctx.createLinearGradient(-charW / 2, -impFontSize / 2, charW / 2, impFontSize / 2);
      grad.addColorStop(0, GOLD_DARK);
      grad.addColorStop(0.4, GOLD_LIGHT);
      grad.addColorStop(0.6, GOLD);
      grad.addColorStop(1, GOLD_DARK);
      ctx.fillStyle = grad;

      ctx.fillText(text[i], 0, 0);
      ctx.restore();

      startX += charW + letterSpacing;
    }

    if (impT > 0.7) {
      const sheenT = (impT - 0.7) / 0.3;
      const sheenX = cx - totalWidth / 2 + (totalWidth + totalSpacing) * easeInOutCubic(sheenT);
      ctx.globalAlpha = (1 - sheenT) * 0.25;
      const sg = ctx.createLinearGradient(sheenX - 15, textY - impFontSize, sheenX + 15, textY + impFontSize);
      sg.addColorStop(0, "transparent");
      sg.addColorStop(0.5, "rgba(255,255,255,0.6)");
      sg.addColorStop(1, "transparent");
      ctx.fillStyle = sg;
      ctx.fillRect(sheenX - 15, textY - impFontSize, 30, impFontSize * 2);
    }

    ctx.restore();
  };

  const drawAmbientParticles = (ctx: CanvasRenderingContext2D, t: number, elapsed: number) => {
    if (t < 0.1) return;

    const particles = ambientParticlesRef.current;
    const fadeIn = t < 0.2 ? (t - 0.1) / 0.1 : 1;
    const fadeOut = t > 0.92 ? (1 - t) / 0.08 : 1;
    const masterAlpha = fadeIn * fadeOut;

    ctx.save();
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx + Math.sin(elapsed * 0.001 + i) * 0.1;
      p.y += p.vy;
      p.life++;

      if (p.life > p.maxLife || p.y < -10) {
        p.x = Math.random() * width;
        p.y = height + 10;
        p.life = 0;
        p.maxLife = 200 + Math.random() * 300;
        continue;
      }

      const lifeRatio = p.life / p.maxLife;
      const alpha = (lifeRatio < 0.1 ? lifeRatio * 10 : lifeRatio > 0.8 ? (1 - lifeRatio) / 0.2 : 1) * p.opacity * masterAlpha;

      ctx.globalAlpha = alpha;
      const sprite = particleSpriteRef.current;
      if (sprite) {
        const drawSize = p.size * 5;
        ctx.drawImage(sprite, p.x - drawSize / 2, p.y - drawSize / 2, drawSize, drawSize);
      }
    }
    ctx.restore();
  };

  const drawFinalSettle = (ctx: CanvasRenderingContext2D, t: number, elapsed: number, cx: number, cy: number) => {
    if (t < 0.83) return;

    const settleT = clamp((t - 0.83) / 0.17, 0, 1);
    const breathe = 0.5 + Math.sin(elapsed * 0.002) * 0.5;

    ctx.save();
    ctx.globalAlpha = easeOutCubic(settleT) * 0.08 * (0.6 + breathe * 0.4);
    const aura = ctx.createRadialGradient(cx, cy, width * 0.05, cx, cy, width * 0.45);
    aura.addColorStop(0, GOLD);
    aura.addColorStop(0.3, `rgba(201,168,76,0.2)`);
    aura.addColorStop(1, "transparent");
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    if (t > 0.88 && t < 0.98) {
      const sweepT = (t - 0.88) / 0.1;
      const sweepX = width * easeInOutQuad(sweepT);
      ctx.save();
      ctx.globalAlpha = (1 - sweepT) * 0.12;
      const sg = ctx.createLinearGradient(sweepX - 30, 0, sweepX + 30, 0);
      sg.addColorStop(0, "transparent");
      sg.addColorStop(0.5, GOLD_LIGHT);
      sg.addColorStop(1, "transparent");
      ctx.fillStyle = sg;
      ctx.fillRect(sweepX - 30, height * 0.1, 60, height * 0.8);
      ctx.restore();
    }

    if (settleT > 0.5) {
      const edgeT = (settleT - 0.5) / 0.5;
      ctx.save();
      ctx.globalAlpha = edgeT * 0.15;
      const vignette = ctx.createRadialGradient(cx, cy, width * 0.25, cx, cy, width * 0.65);
      vignette.addColorStop(0, "transparent");
      vignette.addColorStop(0.7, "transparent");
      vignette.addColorStop(1, `rgba(201,168,76,0.08)`);
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  };

  if (loading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ width, height }}
        data-testid="cinematic-logo-loading"
      >
        <div className="relative">
          <div
            className="rounded-full animate-pulse"
            style={{
              width: width * 0.15,
              height: width * 0.15,
              background: `radial-gradient(circle, ${GOLD}40, transparent)`,
            }}
          />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className="mx-auto flex items-center justify-center"
        style={{ width, height }}
        data-testid="cinematic-logo-fallback"
      >
        <img
          src={logoSrc}
          alt="LIMJIBA"
          style={{ maxWidth: width * 0.7, maxHeight: height * 0.7, objectFit: "contain" }}
        />
      </div>
    );
  }

  return (
    <div
      className="mx-auto flex items-center justify-center"
      style={{ width, height }}
      data-testid="cinematic-logo-reveal-container"
    >
      <canvas
        ref={canvasRef}
        style={{
          width,
          height,
          willChange: "transform",
          borderRadius: 8,
        }}
        data-testid="cinematic-logo-canvas"
      />
    </div>
  );
}
