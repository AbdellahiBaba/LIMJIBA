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
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
  color: string;
  type: "dust" | "streak" | "spark";
}

const GOLD = "#C9A84C";
const GOLD_LIGHT = "#D4B55A";
const GOLD_DARK = "#B8963F";
const NAVY = "#0A1628";
const DURATION = 8500;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}
function easeInQuad(t: number): number {
  return t * t;
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
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
  const particlesRef = useRef<Particle[]>([]);
  const [reducedMotion, setReducedMotion] = useState(
    typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  const createParticle = useCallback(
    (
      cx: number,
      cy: number,
      type: Particle["type"] = "dust"
    ): Particle => {
      const angle = Math.random() * Math.PI * 2;
      const speed = type === "spark" ? 1 + Math.random() * 3 : 0.2 + Math.random() * 0.8;
      const colors = [GOLD, GOLD_LIGHT, GOLD_DARK, "#E8D48B"];
      return {
        x: cx + (Math.random() - 0.5) * width * 0.8,
        y: cy + (Math.random() - 0.5) * height * 0.8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (type === "spark" ? 1 : 0),
        size: type === "streak" ? 1 + Math.random() * 2 : 1 + Math.random() * 3,
        opacity: 0.3 + Math.random() * 0.7,
        life: 0,
        maxLife: 60 + Math.random() * 120,
        color: colors[Math.floor(Math.random() * colors.length)],
        type,
      };
    },
    [width, height]
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
        if (!cancelled) {
          setLoadError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading || !imagesRef.current || completed) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    if (reducedMotion) {
      const imgs = imagesRef.current;
      const logoW = width * 0.7;
      const logoH = (imgs.logo.height / imgs.logo.width) * logoW;
      ctx.drawImage(
        imgs.logo,
        (width - logoW) / 2,
        (height - logoH) / 2,
        logoW,
        logoH
      );
      setCompleted(true);
      onComplete?.();
      return;
    }

    const cx = width / 2;
    const cy = height / 2;

    particlesRef.current = [];
    for (let i = 0; i < 60; i++) {
      particlesRef.current.push(createParticle(cx, cy, "dust"));
    }

    startTimeRef.current = performance.now();

    const render = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / DURATION, 1);

      ctx.clearRect(0, 0, width, height);

      const imgs = imagesRef.current!;

      drawScene(ctx, progress, elapsed, imgs, cx, cy);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(render);
      } else {
        setCompleted(true);
        onComplete?.();
      }
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [loading, completed, width, height, onComplete, createParticle]);

  const drawScene = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      progress: number,
      elapsed: number,
      imgs: NonNullable<typeof imagesRef.current>,
      cx: number,
      cy: number
    ) => {
      const t = progress;

      updateParticles(ctx, elapsed, cx, cy, t);

      drawWorldMap(ctx, imgs, t, cx, cy);

      drawAngularShape(ctx, imgs, t, cx, cy);

      drawCamel(ctx, imgs, t, cx, cy);

      drawAirplane(ctx, imgs, t, elapsed, cx, cy);

      drawAtmosphere(ctx, t, elapsed, cx, cy);

      drawText(ctx, t, cx, cy);

      drawFinalGlow(ctx, t, elapsed, cx, cy);
    },
    [width, height]
  );

  const updateParticles = (
    ctx: CanvasRenderingContext2D,
    elapsed: number,
    cx: number,
    cy: number,
    t: number
  ) => {
    const particles = particlesRef.current;

    if (t < 0.85 && particles.length < 80 && Math.random() < 0.3) {
      particles.push(createParticle(cx, cy, Math.random() < 0.2 ? "streak" : "dust"));
    }
    if (t > 0.3 && t < 0.7 && Math.random() < 0.15) {
      particles.push(createParticle(cx, cy, "spark"));
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;

      if (p.type === "dust") {
        p.vy -= 0.005;
        p.vx += Math.sin(elapsed * 0.001 + p.x * 0.01) * 0.02;
      }

      const lifeRatio = p.life / p.maxLife;
      const alpha =
        lifeRatio < 0.1
          ? lifeRatio * 10
          : lifeRatio > 0.7
            ? (1 - lifeRatio) / 0.3
            : 1;

      if (p.life >= p.maxLife) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = alpha * p.opacity * (t < 0.1 ? t * 10 : 1) * (t > 0.92 ? (1 - t) / 0.08 : 1);

      if (p.type === "streak") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * 0.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 8, p.y - p.vy * 8);
        ctx.stroke();
      } else {
        const glow = ctx.createRadialGradient(
          p.x,
          p.y,
          0,
          p.x,
          p.y,
          p.size * 2
        );
        glow.addColorStop(0, p.color);
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  };

  const drawWorldMap = (
    ctx: CanvasRenderingContext2D,
    imgs: NonNullable<typeof imagesRef.current>,
    t: number,
    cx: number,
    cy: number
  ) => {
    const mapStart = 0.0;
    const mapEnd = 0.65;
    const mapT = clamp((t - mapStart) / (mapEnd - mapStart), 0, 1);

    if (mapT <= 0) return;

    const mapW = width * 0.85;
    const mapH = (imgs.worldMap.height / imgs.worldMap.width) * mapW;
    const mapX = cx - mapW / 2;
    const mapY = cy - mapH / 2 - height * 0.08;

    ctx.save();
    ctx.globalAlpha = easeOutCubic(mapT) * 0.3;

    const scale = 0.95 + easeOutCubic(mapT) * 0.05;
    ctx.translate(cx, cy - height * 0.08);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -(cy - height * 0.08));

    ctx.drawImage(imgs.worldMap, mapX, mapY, mapW, mapH);
    ctx.restore();
  };

  const drawAngularShape = (
    ctx: CanvasRenderingContext2D,
    imgs: NonNullable<typeof imagesRef.current>,
    t: number,
    cx: number,
    cy: number
  ) => {
    const shapeStart = 0.25;
    const shapeEnd = 0.6;
    const shapeT = clamp((t - shapeStart) / (shapeEnd - shapeStart), 0, 1);

    if (shapeT <= 0) return;

    const shapeW = width * 0.35;
    const shapeH = (imgs.angular.height / imgs.angular.width) * shapeW;
    const finalX = cx - shapeW * 0.15;
    const finalY = cy - shapeH * 0.45;

    ctx.save();

    const slideX = lerp(finalX + width * 0.3, finalX, easeOutQuart(shapeT));
    const slideY = lerp(finalY - height * 0.1, finalY, easeOutQuart(shapeT));
    const alpha = easeOutCubic(Math.min(shapeT * 2, 1));

    ctx.globalAlpha = alpha * 0.85;

    ctx.translate(slideX + shapeW / 2, slideY + shapeH / 2);
    const rot = lerp(0.15, 0, easeOutQuart(shapeT));
    ctx.rotate(rot);
    ctx.translate(-(slideX + shapeW / 2), -(slideY + shapeH / 2));

    ctx.drawImage(imgs.angular, slideX, slideY, shapeW, shapeH);

    if (shapeT > 0.5 && shapeT < 0.9) {
      const sweepProgress = (shapeT - 0.5) / 0.4;
      const sweepX = slideX + shapeW * sweepProgress;
      const grad = ctx.createLinearGradient(
        sweepX - 20,
        slideY,
        sweepX + 20,
        slideY
      );
      grad.addColorStop(0, "transparent");
      grad.addColorStop(0.5, `rgba(201,168,76,${0.3 * (1 - sweepProgress)})`);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(sweepX - 20, slideY, 40, shapeH);
    }

    ctx.restore();
  };

  const drawCamel = (
    ctx: CanvasRenderingContext2D,
    imgs: NonNullable<typeof imagesRef.current>,
    t: number,
    cx: number,
    cy: number
  ) => {
    const camelStart = 0.15;
    const camelEnd = 0.55;
    const camelT = clamp((t - camelStart) / (camelEnd - camelStart), 0, 1);

    if (camelT <= 0) return;

    const camelW = width * 0.32;
    const camelH = (imgs.camel.height / imgs.camel.width) * camelW;
    const finalX = cx - camelW * 0.55;
    const finalY = cy - camelH * 0.55;

    ctx.save();

    const alpha = easeOutCubic(Math.min(camelT * 1.5, 1));
    ctx.globalAlpha = alpha;

    const scaleVal = lerp(0.8, 1, easeOutQuart(camelT));
    const posY = lerp(finalY + 20, finalY, easeOutQuart(camelT));

    ctx.translate(finalX + camelW / 2, posY + camelH / 2);
    ctx.scale(scaleVal, scaleVal);
    ctx.translate(-(finalX + camelW / 2), -(posY + camelH / 2));

    if (camelT < 0.4) {
      ctx.shadowColor = GOLD;
      ctx.shadowBlur = 30 * (1 - camelT / 0.4);
    }

    ctx.drawImage(imgs.camel, finalX, posY, camelW, camelH);

    ctx.restore();
  };

  const drawAirplane = (
    ctx: CanvasRenderingContext2D,
    imgs: NonNullable<typeof imagesRef.current>,
    t: number,
    elapsed: number,
    cx: number,
    cy: number
  ) => {
    const planeStart = 0.08;
    const planeFlyEnd = 0.45;
    const planeSettleEnd = 0.65;

    if (t < planeStart) return;

    const planeW = width * 0.42;
    const planeH = (imgs.airplane.height / imgs.airplane.width) * planeW;
    const finalX = cx - planeW * 0.5;
    const finalY = cy - planeH * 0.1;

    if (t < planeFlyEnd) {
      const flyT = clamp((t - planeStart) / (planeFlyEnd - planeStart), 0, 1);
      const eased = easeInOutCubic(flyT);

      const startX = -planeW * 1.2;
      const startY = cy - height * 0.3;
      const midX = cx + width * 0.1;
      const midY = cy + height * 0.05;

      const curX = flyT < 0.6
        ? lerp(startX, midX, easeOutCubic(flyT / 0.6))
        : lerp(midX, finalX, easeInQuad((flyT - 0.6) / 0.4));
      const curY = flyT < 0.6
        ? lerp(startY, midY, easeOutCubic(flyT / 0.6))
        : lerp(midY, finalY, easeInQuad((flyT - 0.6) / 0.4));

      const scaleVal = lerp(0.3, 1, easeOutCubic(flyT));
      const rotation = lerp(-0.15, 0, eased);
      const alpha = Math.min(flyT * 4, 1);

      ctx.save();

      for (let trail = 3; trail >= 1; trail--) {
        const trailT = Math.max(0, flyT - trail * 0.03);
        const trailEased = easeInOutCubic(trailT);
        const tX = trailT < 0.6
          ? lerp(startX, midX, easeOutCubic(trailT / 0.6))
          : lerp(midX, finalX, easeInQuad((trailT - 0.6) / 0.4));
        const tY = trailT < 0.6
          ? lerp(startY, midY, easeOutCubic(trailT / 0.6))
          : lerp(midY, finalY, easeInQuad((trailT - 0.6) / 0.4));
        const tScale = lerp(0.3, 1, easeOutCubic(trailT));

        ctx.save();
        ctx.globalAlpha = 0.08 * (4 - trail) * alpha;
        ctx.translate(tX + planeW / 2, tY + planeH / 2);
        ctx.scale(tScale, tScale);
        ctx.rotate(lerp(-0.15, 0, trailEased));
        ctx.drawImage(imgs.airplane, -planeW / 2, -planeH / 2, planeW, planeH);
        ctx.restore();
      }

      ctx.globalAlpha = alpha;
      ctx.translate(curX + planeW / 2, curY + planeH / 2);
      ctx.scale(scaleVal, scaleVal);
      ctx.rotate(rotation);

      ctx.shadowColor = GOLD;
      ctx.shadowBlur = 15 * (1 - flyT);

      ctx.drawImage(imgs.airplane, -planeW / 2, -planeH / 2, planeW, planeH);

      if (flyT > 0.1 && flyT < 0.8) {
        const contrailAlpha = flyT < 0.3 ? (flyT - 0.1) / 0.2 : flyT > 0.6 ? (0.8 - flyT) / 0.2 : 1;
        ctx.globalAlpha = contrailAlpha * 0.15;
        const grad = ctx.createLinearGradient(
          -planeW, 0,
          -planeW * 2.5, planeH * 0.1
        );
        grad.addColorStop(0, GOLD_LIGHT);
        grad.addColorStop(1, "transparent");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-planeW * 0.3, planeH * 0.05);
        ctx.quadraticCurveTo(-planeW * 1, planeH * 0.15, -planeW * 2, planeH * 0.1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-planeW * 0.3, -planeH * 0.05);
        ctx.quadraticCurveTo(-planeW * 1, -planeH * 0.15, -planeW * 2, -planeH * 0.1);
        ctx.stroke();
      }

      ctx.restore();
    } else if (t < planeSettleEnd) {
      const settleT = clamp(
        (t - planeFlyEnd) / (planeSettleEnd - planeFlyEnd),
        0,
        1
      );
      ctx.save();
      ctx.globalAlpha = 1;
      const bob = Math.sin(settleT * Math.PI) * 3;
      ctx.drawImage(
        imgs.airplane,
        finalX,
        finalY - bob,
        planeW,
        planeH
      );
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.drawImage(imgs.airplane, finalX, finalY, planeW, planeH);
      ctx.restore();
    }
  };

  const drawAtmosphere = (
    ctx: CanvasRenderingContext2D,
    t: number,
    elapsed: number,
    cx: number,
    cy: number
  ) => {
    if (t < 0.1 || t > 0.95) return;

    const atmAlpha = t < 0.2 ? (t - 0.1) / 0.1 : t > 0.85 ? (0.95 - t) / 0.1 : 1;

    ctx.save();
    ctx.globalAlpha = atmAlpha * 0.06;

    const sweepX = (elapsed * 0.05) % (width * 2) - width * 0.5;
    const sweepGrad = ctx.createLinearGradient(
      sweepX - 60,
      0,
      sweepX + 60,
      height
    );
    sweepGrad.addColorStop(0, "transparent");
    sweepGrad.addColorStop(0.3, GOLD_LIGHT);
    sweepGrad.addColorStop(0.5, GOLD);
    sweepGrad.addColorStop(0.7, GOLD_LIGHT);
    sweepGrad.addColorStop(1, "transparent");
    ctx.fillStyle = sweepGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    if (t > 0.15 && t < 0.5) {
      ctx.save();
      const flareT = (t - 0.15) / 0.35;
      ctx.globalAlpha = Math.sin(flareT * Math.PI) * 0.12;
      const flareGrad = ctx.createRadialGradient(
        cx + width * 0.15,
        cy - height * 0.2,
        0,
        cx + width * 0.15,
        cy - height * 0.2,
        width * 0.3
      );
      flareGrad.addColorStop(0, GOLD_LIGHT);
      flareGrad.addColorStop(0.5, `${GOLD}44`);
      flareGrad.addColorStop(1, "transparent");
      ctx.fillStyle = flareGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  };

  const drawText = (
    ctx: CanvasRenderingContext2D,
    t: number,
    cx: number,
    cy: number
  ) => {
    const arStart = 0.65;
    const arEnd = 0.8;
    const arT = clamp((t - arStart) / (arEnd - arStart), 0, 1);

    if (arT > 0) {
      ctx.save();
      const arAlpha = easeOutCubic(arT);
      ctx.globalAlpha = arAlpha;
      ctx.fillStyle = NAVY;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const fontSize = Math.round(width * 0.1);
      ctx.font = `bold ${fontSize}px 'Amiri', 'Traditional Arabic', serif`;

      const textY = cy + height * 0.27;
      const slideX = lerp(cx + 30, cx, easeOutQuart(arT));

      ctx.fillText("لمجيبة", slideX, textY);

      if (arT > 0.3 && arT < 0.8) {
        const shimmerT = (arT - 0.3) / 0.5;
        ctx.globalAlpha = Math.sin(shimmerT * Math.PI) * 0.3;
        ctx.fillStyle = GOLD;
        ctx.fillText("لمجيبة", slideX, textY);
      }

      ctx.restore();
    }

    const impStart = 0.72;
    const impEnd = 0.88;
    const impT = clamp((t - impStart) / (impEnd - impStart), 0, 1);

    if (impT > 0) {
      ctx.save();
      const impAlpha = easeOutCubic(impT);
      ctx.globalAlpha = impAlpha;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const impFontSize = Math.round(width * 0.045);
      ctx.font = `700 ${impFontSize}px 'Montserrat', 'Segoe UI', sans-serif`;
      ctx.letterSpacing = `${width * 0.012}px`;

      const impY = cy + height * 0.35;

      const impGrad = ctx.createLinearGradient(
        cx - width * 0.15,
        impY,
        cx + width * 0.15,
        impY
      );
      impGrad.addColorStop(0, GOLD_DARK);
      impGrad.addColorStop(0.5, GOLD_LIGHT);
      impGrad.addColorStop(1, GOLD);
      ctx.fillStyle = impGrad;

      const scaleVal = lerp(0.8, 1, easeOutQuart(impT));
      ctx.translate(cx, impY);
      ctx.scale(scaleVal, scaleVal);
      ctx.fillText("IMPORTING", 0, 0);

      ctx.restore();
    }
  };

  const drawFinalGlow = (
    ctx: CanvasRenderingContext2D,
    t: number,
    elapsed: number,
    cx: number,
    cy: number
  ) => {
    if (t < 0.85) return;

    const glowT = clamp((t - 0.85) / 0.15, 0, 1);
    const pulse = 0.5 + Math.sin(elapsed * 0.003) * 0.5;

    ctx.save();
    ctx.globalAlpha = easeOutCubic(glowT) * 0.08 * (0.7 + pulse * 0.3);

    const auraGrad = ctx.createRadialGradient(
      cx,
      cy,
      width * 0.05,
      cx,
      cy,
      width * 0.5
    );
    auraGrad.addColorStop(0, GOLD);
    auraGrad.addColorStop(0.4, `${GOLD}44`);
    auraGrad.addColorStop(1, "transparent");
    ctx.fillStyle = auraGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    if (t > 0.9) {
      const sweepT = (t - 0.9) / 0.1;
      const sweepX = width * easeInOutCubic(sweepT);

      ctx.save();
      ctx.globalAlpha = (1 - sweepT) * 0.15;
      const sg = ctx.createLinearGradient(
        sweepX - 40,
        0,
        sweepX + 40,
        0
      );
      sg.addColorStop(0, "transparent");
      sg.addColorStop(0.5, GOLD_LIGHT);
      sg.addColorStop(1, "transparent");
      ctx.fillStyle = sg;
      ctx.fillRect(sweepX - 40, height * 0.1, 80, height * 0.8);
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
        }}
        data-testid="cinematic-logo-canvas"
      />
    </div>
  );
}
