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
}

interface Line {
  p1: number;
  p2: number;
  maxAlpha: number;
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

function perimeterPoint(cx: number, cy: number, halfW: number, halfH: number, angle: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const absCos = Math.abs(cos);
  const absSin = Math.abs(sin);
  let px: number, py: number;
  if (absCos * halfH > absSin * halfW) {
    const sign = cos > 0 ? 1 : -1;
    px = cx + sign * halfW;
    py = cy + sin * (halfW / absCos);
  } else {
    const sign = sin > 0 ? 1 : -1;
    px = cx + cos * (halfH / absSin);
    py = cy + sign * halfH;
  }
  return { x: px, y: py };
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

  useEffect(() => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const canvasSize = size * 1.8;
    canvas.width = canvasSize * dpr;
    canvas.height = canvasSize * dpr;
    canvas.style.width = `${canvasSize}px`;
    canvas.style.height = `${canvasSize}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const cx = canvasSize / 2;
    const cy = canvasSize / 2;
    const logoHalf = size * 0.41;
    const margin = 8;

    const PARTICLE_COUNT = 100;
    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.3;
      const spreadDist = canvasSize * 0.35 + Math.random() * canvasSize * 0.2;
      const target = perimeterPoint(cx, cy, logoHalf + margin + Math.random() * 12, logoHalf + margin + Math.random() * 12, angle);
      return {
        x: cx + Math.cos(angle) * spreadDist,
        y: cy + Math.sin(angle) * spreadDist,
        originX: cx + Math.cos(angle) * spreadDist,
        originY: cy + Math.sin(angle) * spreadDist,
        targetX: target.x,
        targetY: target.y,
        size: 1 + Math.random() * 2,
        alpha: 0,
        color: randomGold(),
        speed: 0.6 + Math.random() * 0.4,
        offset: Math.random(),
      };
    });

    const geoShapes: GeoShape[] = Array.from({ length: 12 }, () => ({
      angle: Math.random() * Math.PI * 2,
      distance: logoHalf + 20 + Math.random() * 30,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.03,
      size: 3 + Math.random() * 7,
      sides: [3, 4, 6][Math.floor(Math.random() * 3)],
      alpha: 0,
      orbitSpeed: 0.0008 + Math.random() * 0.0015,
      offset: Math.random(),
    }));

    const lines: Line[] = [];
    for (let i = 0; i < 25; i++) {
      const p1 = Math.floor(Math.random() * PARTICLE_COUNT);
      let p2: number;
      do { p2 = Math.floor(Math.random() * PARTICLE_COUNT); } while (p2 === p1);
      lines.push({ p1, p2, maxAlpha: 0.12 + Math.random() * 0.2 });
    }

    const CYCLE = 6000;

    function animate(timestamp: number) {
      const cycle = (timestamp % CYCLE) / CYCLE;

      let phase: "scatter" | "converge" | "orbit" | "fade";
      let phaseT: number;
      if (cycle < 0.15) {
        phase = "scatter";
        phaseT = cycle / 0.15;
      } else if (cycle < 0.55) {
        phase = "converge";
        phaseT = (cycle - 0.15) / 0.4;
      } else if (cycle < 0.8) {
        phase = "orbit";
        phaseT = (cycle - 0.55) / 0.25;
      } else {
        phase = "fade";
        phaseT = (cycle - 0.8) / 0.2;
      }

      ctx.clearRect(0, 0, canvasSize, canvasSize);

      for (const p of particles) {
        const pDelay = p.offset * 0.08;

        if (phase === "scatter") {
          p.alpha = Math.min(phaseT / 0.5, 0.8);
          const drift = Math.sin(timestamp * 0.001 + p.offset * 10) * 3;
          p.x = p.originX + drift;
          p.y = p.originY + drift * 0.7;
        } else if (phase === "converge") {
          const t = Math.min(Math.max(phaseT - pDelay, 0) / (1 - pDelay), 1);
          const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          p.x = p.originX + (p.targetX - p.originX) * ease;
          p.y = p.originY + (p.targetY - p.originY) * ease;
          p.alpha = 0.5 + ease * 0.5;
        } else if (phase === "orbit") {
          const wobble = Math.sin(timestamp * 0.003 * p.speed + p.offset * Math.PI * 2) * 4;
          p.x = p.targetX + wobble;
          p.y = p.targetY + Math.cos(timestamp * 0.002 * p.speed + p.offset * Math.PI * 2) * 3;
          p.alpha = 0.7 + Math.sin(timestamp * 0.004 + p.offset * 6) * 0.3;
        } else {
          p.alpha = (1 - phaseT) * 0.7;
          p.x = p.targetX + (p.originX - p.targetX) * phaseT * 0.3;
          p.y = p.targetY + (p.originY - p.targetY) * phaseT * 0.3;
        }

        if (p.alpha > 0.02) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 5;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        }
      }

      if (phase === "converge" || phase === "orbit") {
        const lineAlphaScale = phase === "converge" ? Math.min(phaseT * 2, 1) : 1 - (phase === "orbit" && phaseT > 0.7 ? (phaseT - 0.7) / 0.3 : 0);
        for (const line of lines) {
          const pa = particles[line.p1];
          const pb = particles[line.p2];
          if (!pa || !pb) continue;
          const d = dist(pa.x, pa.y, pb.x, pb.y);
          if (d < 80 && d > 3) {
            const alpha = line.maxAlpha * Math.min(pa.alpha, pb.alpha) * (1 - d / 80) * lineAlphaScale;
            if (alpha > 0.01) {
              ctx.beginPath();
              ctx.moveTo(pa.x, pa.y);
              ctx.lineTo(pb.x, pb.y);
              ctx.strokeStyle = `rgba(201, 168, 76, ${alpha})`;
              ctx.lineWidth = 0.5;
              ctx.shadowColor = "rgba(201, 168, 76, 0.3)";
              ctx.shadowBlur = 3;
              ctx.stroke();
              ctx.shadowBlur = 0;
            }
          }
        }
      }

      for (const shape of geoShapes) {
        shape.angle += shape.orbitSpeed;
        shape.rotation += shape.rotationSpeed;

        let shapeAlpha = 0;
        if (phase === "scatter") {
          shapeAlpha = phaseT * 0.3;
        } else if (phase === "converge") {
          shapeAlpha = 0.3 + phaseT * 0.3;
        } else if (phase === "orbit") {
          shapeAlpha = 0.4 + Math.sin(timestamp * 0.003 + shape.offset * Math.PI * 4) * 0.2;
        } else {
          shapeAlpha = (1 - phaseT) * 0.4;
        }

        const sDist = phase === "scatter"
          ? shape.distance + 40 * (1 - phaseT)
          : phase === "converge"
            ? shape.distance + 40 * (1 - phaseT)
            : shape.distance + Math.sin(timestamp * 0.002 + shape.offset * 5) * 6;

        const sx = cx + Math.cos(shape.angle) * sDist;
        const sy = cy + Math.sin(shape.angle) * sDist;
        const sSize = phase === "converge" ? shape.size * (0.7 + phaseT * 0.3) : shape.size;

        if (shapeAlpha > 0.02) {
          ctx.save();
          ctx.globalAlpha = shapeAlpha;
          ctx.strokeStyle = "#C9A84C";
          ctx.lineWidth = 0.7;
          ctx.shadowColor = "rgba(201, 168, 76, 0.25)";
          ctx.shadowBlur = 3;
          drawPolygon(ctx, sx, sy, sSize, shape.sides, shape.rotation);
          ctx.stroke();
          ctx.restore();
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    }

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [reducedMotion, size]);

  return (
    <div
      className="mx-auto mb-8 relative flex items-center justify-center"
      style={{ width: `${size * 1.8}px`, height: `${size * 1.8}px` }}
      data-testid="logo-animation-container"
    >
      {!reducedMotion && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
          data-testid="canvas-logo-animation"
        />
      )}
      <div
        className="relative z-10 rounded-2xl overflow-hidden animate-float"
        style={{
          width: `${size * 0.82}px`,
          height: `${size * 0.82}px`,
          boxShadow: "0 0 60px rgba(201,168,76,0.3), 0 0 120px rgba(201,168,76,0.1)",
        }}
      >
        <img src={logoSrc} alt="LIMJIBA" className="w-full h-full object-contain bg-white/10 p-2" />
      </div>
    </div>
  );
}
