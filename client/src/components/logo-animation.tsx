import { useRef, useEffect, useState, useCallback } from "react";

interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  delay: number;
}

interface GeoShape {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
  sides: number;
  alpha: number;
  delay: number;
}

interface Line {
  p1: number;
  p2: number;
  alpha: number;
  maxAlpha: number;
}

const GOLD_COLORS = [
  "#C9A84C",
  "#D4B55A",
  "#B8963F",
  "#E0C76A",
  "#A8872E",
  "#F0D87A",
  "#C4A040",
];

function randomGold() {
  return GOLD_COLORS[Math.floor(Math.random() * GOLD_COLORS.length)];
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function dist(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
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

export function LogoAnimation({
  logoSrc,
  onComplete,
  size = 128,
}: {
  logoSrc: string;
  onComplete?: () => void;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [animationDone, setAnimationDone] = useState(false);
  const [showShine, setShowShine] = useState(false);
  const animFrameRef = useRef<number>(0);

  const runAnimation = useCallback(() => {
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
    const logoRadius = size / 2;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = logoSrc;

    img.onload = () => {
      const sampleCanvas = document.createElement("canvas");
      const sampleSize = size;
      sampleCanvas.width = sampleSize;
      sampleCanvas.height = sampleSize;
      const sCtx = sampleCanvas.getContext("2d");
      if (!sCtx) return;

      const padding = sampleSize * 0.1;
      const drawSize = sampleSize - padding * 2;
      sCtx.drawImage(img, padding, padding, drawSize, drawSize);
      const imageData = sCtx.getImageData(0, 0, sampleSize, sampleSize);

      const targetPositions: { x: number; y: number }[] = [];
      const step = 3;
      for (let y = 0; y < sampleSize; y += step) {
        for (let x = 0; x < sampleSize; x += step) {
          const i = (y * sampleSize + x) * 4;
          const a = imageData.data[i + 3];
          const r = imageData.data[i];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];
          if (a > 100 && (r + g + b) < 700) {
            targetPositions.push({
              x: cx - sampleSize / 2 + x,
              y: cy - sampleSize / 2 + y,
            });
          }
        }
      }

      const particleCount = Math.min(targetPositions.length, 280);
      const selectedTargets = [];
      const used = new Set<number>();
      for (let i = 0; i < particleCount; i++) {
        let idx: number;
        do { idx = Math.floor(Math.random() * targetPositions.length); } while (used.has(idx) && used.size < targetPositions.length);
        used.add(idx);
        selectedTargets.push(targetPositions[idx]);
      }

      const particles: Particle[] = selectedTargets.map((t) => {
        const angle = Math.random() * Math.PI * 2;
        const spread = canvasSize * 0.4 + Math.random() * canvasSize * 0.3;
        return {
          x: cx + Math.cos(angle) * spread,
          y: cy + Math.sin(angle) * spread,
          targetX: t.x,
          targetY: t.y,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          size: 1 + Math.random() * 2.5,
          alpha: 0,
          color: randomGold(),
          delay: Math.random() * 0.3,
        };
      });

      const geoShapes: GeoShape[] = Array.from({ length: 18 }, () => {
        const angle = Math.random() * Math.PI * 2;
        const spread = canvasSize * 0.3 + Math.random() * canvasSize * 0.3;
        const t = targetPositions[Math.floor(Math.random() * targetPositions.length)] || { x: cx, y: cy };
        return {
          x: cx + Math.cos(angle) * spread,
          y: cy + Math.sin(angle) * spread,
          targetX: t.x,
          targetY: t.y,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.08,
          size: 4 + Math.random() * 10,
          sides: [3, 4, 6][Math.floor(Math.random() * 3)],
          alpha: 0,
          delay: Math.random() * 0.4,
        };
      });

      const lines: Line[] = [];
      for (let i = 0; i < 40; i++) {
        const p1 = Math.floor(Math.random() * particleCount);
        let p2: number;
        do { p2 = Math.floor(Math.random() * particleCount); } while (p2 === p1);
        lines.push({ p1, p2, alpha: 0, maxAlpha: 0.15 + Math.random() * 0.25 });
      }

      const DURATION = 4500;
      const SCATTER_END = 0.1;
      const CONVERGE_END = 0.7;
      const SOLIDIFY_END = 0.88;
      let startTime = 0;

      function animate(timestamp: number) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / DURATION, 1);

        ctx.clearRect(0, 0, canvasSize, canvasSize);

        if (progress < CONVERGE_END) {
          for (const line of lines) {
            const pa = particles[line.p1];
            const pb = particles[line.p2];
            if (!pa || !pb) continue;
            const d = dist(pa.x, pa.y, pb.x, pb.y);
            const maxDist = progress < SCATTER_END ? canvasSize * 0.5 : canvasSize * 0.3 * (1 - progress / CONVERGE_END) + 30;
            if (d < maxDist && d > 5) {
              const fadeOut = progress > CONVERGE_END * 0.8 ? 1 - (progress - CONVERGE_END * 0.8) / (CONVERGE_END * 0.2) : 1;
              line.alpha = line.maxAlpha * Math.min(pa.alpha, pb.alpha) * (1 - d / maxDist) * fadeOut;
              ctx.beginPath();
              ctx.moveTo(pa.x, pa.y);
              const midX = (pa.x + pb.x) / 2 + (Math.random() - 0.5) * 8 * (1 - progress);
              const midY = (pa.y + pb.y) / 2 + (Math.random() - 0.5) * 8 * (1 - progress);
              ctx.quadraticCurveTo(midX, midY, pb.x, pb.y);
              ctx.strokeStyle = `rgba(201, 168, 76, ${line.alpha})`;
              ctx.lineWidth = 0.5 + Math.random() * 0.5;
              ctx.shadowColor = "rgba(201, 168, 76, 0.4)";
              ctx.shadowBlur = 4;
              ctx.stroke();
              ctx.shadowBlur = 0;
            }
          }
        }

        for (const shape of geoShapes) {
          const shapeProgress = Math.max(0, progress - shape.delay) / (1 - shape.delay);
          if (shapeProgress <= 0) continue;

          if (shapeProgress < SCATTER_END * 2) {
            shape.alpha = Math.min(shapeProgress / (SCATTER_END * 2), 0.6);
          } else if (shapeProgress < CONVERGE_END) {
            const t = easeInOutCubic((shapeProgress - SCATTER_END * 2) / (CONVERGE_END - SCATTER_END * 2));
            shape.x = lerp(shape.x, shape.targetX, t * 0.06);
            shape.y = lerp(shape.y, shape.targetY, t * 0.06);
            shape.size = lerp(shape.size, 1, t * 0.04);
            shape.alpha = 0.6 * (1 - t * 0.5);
          } else {
            shape.alpha *= 0.92;
          }

          shape.rotation += shape.rotationSpeed * (1 - shapeProgress * 0.5);

          if (shape.alpha > 0.01) {
            ctx.save();
            ctx.globalAlpha = shape.alpha;
            ctx.strokeStyle = "#C9A84C";
            ctx.lineWidth = 0.8;
            ctx.shadowColor = "rgba(201, 168, 76, 0.3)";
            ctx.shadowBlur = 3;
            drawPolygon(ctx, shape.x, shape.y, shape.size, shape.sides, shape.rotation);
            ctx.stroke();
            ctx.restore();
          }
        }

        for (const p of particles) {
          const pProgress = Math.max(0, progress - p.delay) / (1 - p.delay);
          if (pProgress <= 0) continue;

          if (pProgress < SCATTER_END) {
            p.alpha = Math.min(pProgress / SCATTER_END, 1);
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.99;
            p.vy *= 0.99;
          } else if (pProgress < CONVERGE_END) {
            const t = easeInOutCubic((pProgress - SCATTER_END) / (CONVERGE_END - SCATTER_END));
            p.x = lerp(p.x, p.targetX, t * 0.08);
            p.y = lerp(p.y, p.targetY, t * 0.08);
            p.alpha = 1;
          } else if (pProgress < SOLIDIFY_END) {
            const t = (pProgress - CONVERGE_END) / (SOLIDIFY_END - CONVERGE_END);
            p.x = lerp(p.x, p.targetX, 0.3);
            p.y = lerp(p.y, p.targetY, 0.3);
            p.alpha = 1 - t * 0.3;
          } else {
            p.alpha *= 0.93;
          }

          if (p.alpha > 0.01) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (1 - Math.max(0, pProgress - CONVERGE_END) * 0.5), 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 6;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
          }
        }

        if (progress > CONVERGE_END) {
          const imgAlpha = easeInOutCubic(Math.min((progress - CONVERGE_END) / (1 - CONVERGE_END), 1));
          ctx.save();
          ctx.globalAlpha = imgAlpha;
          const imgSize = size * 0.82;
          const imgOffset = (canvasSize - imgSize) / 2;

          ctx.beginPath();
          const borderRadius = imgSize * 0.12;
          const ix = imgOffset;
          const iy = imgOffset;
          ctx.moveTo(ix + borderRadius, iy);
          ctx.lineTo(ix + imgSize - borderRadius, iy);
          ctx.quadraticCurveTo(ix + imgSize, iy, ix + imgSize, iy + borderRadius);
          ctx.lineTo(ix + imgSize, iy + imgSize - borderRadius);
          ctx.quadraticCurveTo(ix + imgSize, iy + imgSize, ix + imgSize - borderRadius, iy + imgSize);
          ctx.lineTo(ix + borderRadius, iy + imgSize);
          ctx.quadraticCurveTo(ix, iy + imgSize, ix, iy + imgSize - borderRadius);
          ctx.lineTo(ix, iy + borderRadius);
          ctx.quadraticCurveTo(ix, iy, ix + borderRadius, iy);
          ctx.closePath();
          ctx.clip();

          ctx.drawImage(img, imgOffset, imgOffset, imgSize, imgSize);
          ctx.restore();
        }

        if (progress >= 1) {
          setShowShine(true);
          setTimeout(() => {
            setAnimationDone(true);
            onComplete?.();
          }, 600);
          return;
        }

        animFrameRef.current = requestAnimationFrame(animate);
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [logoSrc, size, onComplete]);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setAnimationDone(true);
      onComplete?.();
      return;
    }

    const cleanup = runAnimation();
    return () => {
      cleanup?.();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [runAnimation]);

  if (animationDone) {
    return (
      <div
        ref={containerRef}
        className="mx-auto mb-8 w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden animate-float"
        style={{ boxShadow: "0 0 60px rgba(201,168,76,0.3), 0 0 120px rgba(201,168,76,0.1)" }}
        data-testid="img-hero-logo"
      >
        <img src={logoSrc} alt="LIMJIBA" className="w-full h-full object-contain bg-white/10 p-2" />
      </div>
    );
  }

  return (
    <div className="mx-auto mb-8 flex items-center justify-center" style={{ width: `${size * 1.8}px`, height: `${size * 1.8}px` }}>
      <div className="relative" style={{ width: `${size * 1.8}px`, height: `${size * 1.8}px` }}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          data-testid="canvas-logo-animation"
        />
        {showShine && (
          <div
            className="absolute rounded-2xl overflow-hidden"
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: `${size * 0.82}px`,
              height: `${size * 0.82}px`,
            }}
          >
            <div
              className="logo-shine-sweep"
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.5) 50%, transparent 60%)",
                zIndex: 10,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
