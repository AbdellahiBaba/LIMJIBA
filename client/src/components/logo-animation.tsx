import { useRef, useEffect, useState } from "react";

interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  originX: number;
  originY: number;
  size: number;
  alpha: number;
  color: string;
  speed: number;
  offset: number;
}

interface GeoShape {
  angle: number;
  distance: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
  sides: number;
  alpha: number;
  orbitSpeed: number;
  offset: number;
  targetX: number;
  targetY: number;
  originX: number;
  originY: number;
}

const GOLD_COLORS = [
  "#C9A84C", "#D4B55A", "#B8963F", "#E0C76A",
  "#A8872E", "#F0D87A", "#C4A040",
];

function randomGold() {
  return GOLD_COLORS[Math.floor(Math.random() * GOLD_COLORS.length)];
}

function dist(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function drawPolygon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, sides: number, rotation: number) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides + rotation;
    const px = x + r * Math.cos(angle);
    const py = y + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function sampleLogoPixels(
  img: HTMLImageElement,
  canvasSize: number,
  logoDisplaySize: number,
  maxParticles: number
): { x: number; y: number }[] {
  const offCanvas = document.createElement("canvas");
  const sampleRes = 200;
  offCanvas.width = sampleRes;
  offCanvas.height = sampleRes;
  const offCtx = offCanvas.getContext("2d");
  if (!offCtx) return [];

  offCtx.fillStyle = "#FFFFFF";
  offCtx.fillRect(0, 0, sampleRes, sampleRes);

  const padding = sampleRes * 0.08;
  const drawSize = sampleRes - padding * 2;
  offCtx.drawImage(img, padding, padding, drawSize, drawSize);

  const imageData = offCtx.getImageData(0, 0, sampleRes, sampleRes);
  const pixels = imageData.data;

  const candidates: { x: number; y: number }[] = [];
  const step = 2;
  const threshold = 200;

  for (let y = 0; y < sampleRes; y += step) {
    for (let x = 0; x < sampleRes; x += step) {
      const idx = (y * sampleRes + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const brightness = (r + g + b) / 3;
      if (brightness < threshold) {
        const offsetX = (canvasSize - logoDisplaySize) / 2;
        const offsetY = (canvasSize - logoDisplaySize) / 2;
        candidates.push({
          x: offsetX + (x / sampleRes) * logoDisplaySize,
          y: offsetY + (y / sampleRes) * logoDisplaySize,
        });
      }
    }
  }

  if (candidates.length <= maxParticles) return candidates;

  const selected: { x: number; y: number }[] = [];
  const used = new Set<number>();
  while (selected.length < maxParticles && selected.length < candidates.length) {
    let idx: number;
    do {
      idx = Math.floor(Math.random() * candidates.length);
    } while (used.has(idx));
    used.add(idx);
    selected.push(candidates[idx]);
  }
  return selected;
}

export function LogoAnimation({
  logoSrc,
  size = 128,
}: {
  logoSrc: string;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [reducedMotion] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
    };
    img.src = logoSrc;
  }, [logoSrc]);

  useEffect(() => {
    if (reducedMotion || !imgLoaded || !imgRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const canvasSize = size * 2;
    canvas.width = canvasSize * dpr;
    canvas.height = canvasSize * dpr;
    canvas.style.width = `${canvasSize}px`;
    canvas.style.height = `${canvasSize}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const cx = canvasSize / 2;
    const cy = canvasSize / 2;
    const logoDisplaySize = size * 0.9;

    const PARTICLE_COUNT = 180;
    const pixelTargets = sampleLogoPixels(imgRef.current, canvasSize, logoDisplaySize, PARTICLE_COUNT);

    if (pixelTargets.length === 0) return;

    const particles: Particle[] = pixelTargets.map((target) => {
      const angle = Math.random() * Math.PI * 2;
      const spreadDist = canvasSize * 0.4 + Math.random() * canvasSize * 0.3;
      return {
        x: cx + Math.cos(angle) * spreadDist,
        y: cy + Math.sin(angle) * spreadDist,
        originX: cx + Math.cos(angle) * spreadDist,
        originY: cy + Math.sin(angle) * spreadDist,
        targetX: target.x,
        targetY: target.y,
        size: 1.2 + Math.random() * 1.5,
        alpha: 0,
        color: randomGold(),
        speed: 0.5 + Math.random() * 0.5,
        offset: Math.random(),
      };
    });

    const GEO_COUNT = 18;
    const geoShapes: GeoShape[] = Array.from({ length: GEO_COUNT }, (_, i) => {
      const geoTarget = pixelTargets[Math.floor(Math.random() * pixelTargets.length)];
      const angle = Math.random() * Math.PI * 2;
      const spreadDist = canvasSize * 0.35 + Math.random() * canvasSize * 0.25;
      return {
        angle: Math.random() * Math.PI * 2,
        distance: 0,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.04,
        size: 3 + Math.random() * 6,
        sides: [3, 4, 5, 6][Math.floor(Math.random() * 4)],
        alpha: 0,
        orbitSpeed: 0.001 + Math.random() * 0.002,
        offset: Math.random(),
        targetX: geoTarget.x,
        targetY: geoTarget.y,
        originX: cx + Math.cos(angle) * spreadDist,
        originY: cy + Math.sin(angle) * spreadDist,
      };
    });

    const LINE_COUNT = 40;
    const lines: { p1: number; p2: number; maxAlpha: number }[] = [];
    for (let i = 0; i < LINE_COUNT; i++) {
      const p1 = Math.floor(Math.random() * particles.length);
      let p2: number;
      do { p2 = Math.floor(Math.random() * particles.length); } while (p2 === p1);
      lines.push({ p1, p2, maxAlpha: 0.1 + Math.random() * 0.15 });
    }

    const CYCLE = 8000;

    function animate(timestamp: number) {
      const cycle = (timestamp % CYCLE) / CYCLE;

      let phase: "scatter" | "converge" | "hold" | "disperse";
      let phaseT: number;
      if (cycle < 0.12) {
        phase = "scatter";
        phaseT = cycle / 0.12;
      } else if (cycle < 0.50) {
        phase = "converge";
        phaseT = (cycle - 0.12) / 0.38;
      } else if (cycle < 0.78) {
        phase = "hold";
        phaseT = (cycle - 0.50) / 0.28;
      } else {
        phase = "disperse";
        phaseT = (cycle - 0.78) / 0.22;
      }

      ctx.clearRect(0, 0, canvasSize, canvasSize);

      for (const p of particles) {
        const pDelay = p.offset * 0.1;

        if (phase === "scatter") {
          p.alpha = Math.min(phaseT / 0.4, 0.7);
          const drift = Math.sin(timestamp * 0.0015 + p.offset * 10) * 5;
          p.x = p.originX + drift;
          p.y = p.originY + drift * 0.6;
        } else if (phase === "converge") {
          const t = Math.min(Math.max(phaseT - pDelay, 0) / (1 - pDelay), 1);
          const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          p.x = p.originX + (p.targetX - p.originX) * ease;
          p.y = p.originY + (p.targetY - p.originY) * ease;
          p.alpha = 0.4 + ease * 0.6;
        } else if (phase === "hold") {
          const wobble = Math.sin(timestamp * 0.004 * p.speed + p.offset * Math.PI * 2) * 0.8;
          p.x = p.targetX + wobble;
          p.y = p.targetY + Math.cos(timestamp * 0.003 * p.speed + p.offset * Math.PI * 2) * 0.6;
          p.alpha = 0.85 + Math.sin(timestamp * 0.005 + p.offset * 6) * 0.15;
        } else {
          const ease = phaseT < 0.5 ? 2 * phaseT * phaseT : 1 - Math.pow(-2 * phaseT + 2, 2) / 2;
          p.x = p.targetX + (p.originX - p.targetX) * ease;
          p.y = p.targetY + (p.originY - p.targetY) * ease;
          p.alpha = (1 - ease) * 0.8;
        }

        if (p.alpha > 0.02) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = p.alpha > 0.6 ? 8 : 4;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        }
      }

      if (phase === "converge" || phase === "hold") {
        const lineAlpha = phase === "converge" ? Math.min(phaseT * 1.5, 1) : 1;
        for (const line of lines) {
          const pa = particles[line.p1];
          const pb = particles[line.p2];
          if (!pa || !pb) continue;
          const d = dist(pa.x, pa.y, pb.x, pb.y);
          if (d < 50 && d > 2) {
            const alpha = line.maxAlpha * Math.min(pa.alpha, pb.alpha) * (1 - d / 50) * lineAlpha;
            if (alpha > 0.01) {
              ctx.beginPath();
              ctx.moveTo(pa.x, pa.y);
              ctx.lineTo(pb.x, pb.y);
              ctx.strokeStyle = `rgba(201, 168, 76, ${alpha})`;
              ctx.lineWidth = 0.6;
              ctx.shadowColor = "rgba(201, 168, 76, 0.2)";
              ctx.shadowBlur = 2;
              ctx.stroke();
              ctx.shadowBlur = 0;
            }
          }
        }
      } else if (phase === "disperse") {
        const lineAlpha = Math.max(1 - phaseT * 2, 0);
        if (lineAlpha > 0) {
          for (const line of lines) {
            const pa = particles[line.p1];
            const pb = particles[line.p2];
            if (!pa || !pb) continue;
            const d = dist(pa.x, pa.y, pb.x, pb.y);
            if (d < 50 && d > 2) {
              const alpha = line.maxAlpha * Math.min(pa.alpha, pb.alpha) * (1 - d / 50) * lineAlpha;
              if (alpha > 0.01) {
                ctx.beginPath();
                ctx.moveTo(pa.x, pa.y);
                ctx.lineTo(pb.x, pb.y);
                ctx.strokeStyle = `rgba(201, 168, 76, ${alpha})`;
                ctx.lineWidth = 0.6;
                ctx.stroke();
              }
            }
          }
        }
      }

      for (const shape of geoShapes) {
        shape.rotation += shape.rotationSpeed;

        let sx: number, sy: number, shapeAlpha: number;
        const sDelay = shape.offset * 0.1;

        if (phase === "scatter") {
          sx = shape.originX + Math.sin(timestamp * 0.001 + shape.offset * 8) * 4;
          sy = shape.originY + Math.cos(timestamp * 0.001 + shape.offset * 6) * 3;
          shapeAlpha = Math.min(phaseT / 0.5, 0.35);
        } else if (phase === "converge") {
          const t = Math.min(Math.max(phaseT - sDelay, 0) / (1 - sDelay), 1);
          const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          sx = shape.originX + (shape.targetX - shape.originX) * ease;
          sy = shape.originY + (shape.targetY - shape.originY) * ease;
          shapeAlpha = 0.2 + ease * 0.5;
        } else if (phase === "hold") {
          sx = shape.targetX + Math.sin(timestamp * 0.003 + shape.offset * 5) * 1;
          sy = shape.targetY + Math.cos(timestamp * 0.002 + shape.offset * 4) * 0.8;
          shapeAlpha = 0.5 + Math.sin(timestamp * 0.004 + shape.offset * Math.PI * 2) * 0.2;
        } else {
          const ease = phaseT < 0.5 ? 2 * phaseT * phaseT : 1 - Math.pow(-2 * phaseT + 2, 2) / 2;
          sx = shape.targetX + (shape.originX - shape.targetX) * ease;
          sy = shape.targetY + (shape.originY - shape.targetY) * ease;
          shapeAlpha = (1 - ease) * 0.5;
        }

        if (shapeAlpha > 0.02) {
          ctx.save();
          ctx.globalAlpha = shapeAlpha;
          ctx.strokeStyle = "#C9A84C";
          ctx.lineWidth = 0.8;
          ctx.shadowColor = "rgba(201, 168, 76, 0.3)";
          ctx.shadowBlur = 3;
          drawPolygon(ctx, sx, sy, shape.size, shape.sides, shape.rotation);
          ctx.stroke();
          ctx.restore();
        }
      }

      if (phase === "hold" && phaseT > 0.2) {
        const glowAlpha = Math.min((phaseT - 0.2) / 0.3, 0.15) * (1 + Math.sin(timestamp * 0.003) * 0.3);
        const gradient = ctx.createRadialGradient(cx, cy, logoDisplaySize * 0.1, cx, cy, logoDisplaySize * 0.6);
        gradient.addColorStop(0, `rgba(201, 168, 76, ${glowAlpha})`);
        gradient.addColorStop(1, "rgba(201, 168, 76, 0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasSize, canvasSize);
      }

      animFrameRef.current = requestAnimationFrame(animate);
    }

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [reducedMotion, size, imgLoaded]);

  const canvasSize = size * 2;

  if (reducedMotion) {
    return (
      <div
        className="mx-auto mb-8 flex items-center justify-center"
        style={{ width: `${canvasSize}px`, height: `${canvasSize}px` }}
        data-testid="logo-animation-container"
      >
        <img
          src={logoSrc}
          alt="LIMJIBA"
          className="rounded-2xl object-contain bg-white/10 p-2"
          style={{ width: `${size * 0.82}px`, height: `${size * 0.82}px` }}
        />
      </div>
    );
  }

  return (
    <div
      className="mx-auto mb-8 relative flex items-center justify-center"
      style={{ width: `${canvasSize}px`, height: `${canvasSize}px` }}
      data-testid="logo-animation-container"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        data-testid="canvas-logo-animation"
      />
    </div>
  );
}
