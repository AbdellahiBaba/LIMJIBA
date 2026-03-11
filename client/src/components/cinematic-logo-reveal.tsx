import { useRef, useEffect, useState, useCallback } from "react";

import logoSrc from "@assets/WhatsApp_Image_2026-03-09_at_20.11.18-removebg-preview_1773192470477.png";

interface CinematicLogoRevealProps {
  width?: number;
  height?: number;
  onComplete?: () => void;
}

const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E8D48B";
const GOLD_BRIGHT = "#F5E6A3";
const NAVY = "#0A1628";
const BLACK = "#020408";
const DURATION = 14000;
const MAX_PARTICLES = 500;

function ease(t: number) { return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }
function easeOut(t: number) { return 1 - Math.pow(1-t,4); }
function easeIn(t: number) { return t*t*t; }
function easeOutExpo(t: number) { return t===1?1:1-Math.pow(2,-10*t); }
function lerp(a: number, b: number, t: number) { return a+(b-a)*Math.max(0,Math.min(1,t)); }
function clamp(v: number) { return Math.max(0,Math.min(1,v)); }

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image(); i.crossOrigin="anonymous"; i.onload=()=>res(i); i.onerror=rej; i.src=src;
  });
}

function sampleLogo(img: HTMLImageElement, w: number, h: number, cx: number, cy: number) {
  const c = document.createElement("canvas"); c.width=w; c.height=h;
  const x = c.getContext("2d")!; x.drawImage(img,0,0,w,h);
  const d = x.getImageData(0,0,w,h).data;
  const pts: {x:number;y:number;r:number;g:number;b:number}[] = [];
  const ox = cx-w/2, oy = cy-h/2;
  const step = Math.max(2, Math.round(Math.sqrt(w*h)/45));
  for (let y=0;y<h;y+=step) for (let xx=0;xx<w;xx+=step) {
    const i=(y*w+xx)*4;
    if (d[i+3]>80) pts.push({x:xx+ox,y:y+oy,r:d[i],g:d[i+1],b:d[i+2]});
  }
  if (pts.length>MAX_PARTICLES) {
    const s=pts.length/MAX_PARTICLES; const out:typeof pts=[];
    for (let i=0;i<MAX_PARTICLES;i++) out.push(pts[Math.floor(i*s)]);
    return out;
  }
  return pts;
}

interface LP {
  sx:number;sy:number;tx:number;ty:number;x:number;y:number;
  r:number;g:number;b:number;size:number;delay:number;trail:{x:number;y:number}[];
}

interface Spark {
  x:number;y:number;vx:number;vy:number;life:number;maxLife:number;size:number;bright:number;
}

export function CinematicLogoReveal({ width=500, height=500, onComplete }: CinematicLogoRevealProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [done, setDone] = useState(false);
  const imgRef = useRef<HTMLImageElement|null>(null);
  const stateRef = useRef<{
    particles: LP[];
    sparks: Spark[];
    startTime: number;
    logoW: number;
    logoH: number;
  }|null>(null);
  const [reduced] = useState(() =>
    typeof window!=="undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    let c=false;
    loadImg(logoSrc).then(img => { if(!c){imgRef.current=img;setLoading(false);} })
      .catch(() => { if(!c){setError(true);setLoading(false);} });
    return ()=>{c=true};
  }, []);

  useEffect(() => {
    if (loading||!imgRef.current||done) return;
    const canvas = canvasRef.current; if(!canvas) return;
    const ctx = canvas.getContext("2d",{alpha:false}); if(!ctx) return;
    const dpr = window.devicePixelRatio||1;
    canvas.width=width*dpr; canvas.height=height*dpr;
    ctx.setTransform(1,0,0,1,0,0); ctx.scale(dpr,dpr);
    const img = imgRef.current;
    const cx=width/2, cy=height/2-height*0.04;

    if (reduced) {
      ctx.fillStyle=BLACK; ctx.fillRect(0,0,width,height);
      const lw=width*.6, lh=(img.height/img.width)*lw;
      ctx.drawImage(img,(width-lw)/2,(height-lh)/2-10,lw,lh);
      ctx.fillStyle=NAVY; ctx.font=`bold ${Math.round(width*.09)}px 'Amiri',serif`;
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText("لمجيبة",cx,cy+height*.32);
      ctx.fillStyle=GOLD; ctx.font=`700 ${Math.round(width*.04)}px 'Montserrat',sans-serif`;
      ctx.fillText("IMPORTING",cx,cy+height*.39);
      setDone(true); onComplete?.(); return;
    }

    const logoW = width*.58;
    const logoH = (img.height/img.width)*logoW;
    const pts = sampleLogo(img,logoW,logoH,cx,cy);

    const particles: LP[] = pts.map(p => {
      const ang = Math.random()*Math.PI*2;
      const dist = width*.8+Math.random()*width*.6;
      return {
        sx: cx+Math.cos(ang)*dist, sy: cy+Math.sin(ang)*dist,
        tx: p.x, ty: p.y, x: cx+Math.cos(ang)*dist, y: cy+Math.sin(ang)*dist,
        r:p.r, g:p.g, b:p.b, size: 1.5+Math.random()*2,
        delay: Math.random()*.4, trail: [],
      };
    });

    stateRef.current = { particles, sparks:[], startTime:performance.now(), logoW, logoH };

    const render = (now: number) => {
      const st = stateRef.current!;
      const elapsed = now-st.startTime;
      const t = Math.min(elapsed/DURATION,1);
      drawFrame(ctx,t,elapsed,img,cx,cy,st);
      if (t<1) animRef.current=requestAnimationFrame(render);
      else { setDone(true); onComplete?.(); }
    };
    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [loading,done,width,height,onComplete,reduced]);

  const drawFrame = useCallback((
    ctx: CanvasRenderingContext2D, t: number, ms: number,
    img: HTMLImageElement, cx: number, cy: number,
    st: NonNullable<typeof stateRef.current>
  ) => {
    ctx.fillStyle = BLACK;
    ctx.fillRect(0,0,width,height);

    phaseBlackout(ctx,t,ms,cx,cy);
    phaseEnergyBuild(ctx,t,ms,cx,cy);
    phaseParticleConverge(ctx,t,ms,cx,cy,st);
    phaseExplosion(ctx,t,ms,cx,cy,st);
    phaseLogoReveal(ctx,t,ms,img,cx,cy,st);
    phaseMetalSheen(ctx,t,ms,cx,cy,st);
    phaseTextReveal(ctx,t,ms,cx,cy);
    phaseFinalGlow(ctx,t,ms,cx,cy);
    drawSparks(ctx,t,ms,st);
  }, [width,height]);

  const phaseBlackout = (ctx: CanvasRenderingContext2D, t: number, ms: number, cx: number, cy: number) => {
    if (t>0.15) return;
    const p = clamp(t/0.08);
    const e = easeOutExpo(p);

    ctx.save();
    ctx.globalAlpha = e * 0.7;
    const g = ctx.createRadialGradient(cx,cy,0,cx,cy,width*0.03*e);
    g.addColorStop(0,GOLD_BRIGHT);
    g.addColorStop(.5,GOLD);
    g.addColorStop(1,"transparent");
    ctx.fillStyle=g;
    ctx.beginPath(); ctx.arc(cx,cy,width*0.06*e,0,Math.PI*2); ctx.fill();

    if (p>0.3) {
      const lp = clamp((p-0.3)/0.7);
      const le = easeOutExpo(lp);
      const hw = width*0.45*le;
      ctx.globalAlpha = (1-lp*0.5)*0.8;
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2-lp*1.5;
      ctx.shadowColor = GOLD_BRIGHT;
      ctx.shadowBlur = 20*(1-lp);
      ctx.beginPath(); ctx.moveTo(cx-hw,cy); ctx.lineTo(cx+hw,cy); ctx.stroke();
      ctx.shadowBlur=0;

      ctx.globalAlpha = le*0.15*(1-lp*0.5);
      const lg = ctx.createLinearGradient(cx-hw,cy-30,cx+hw,cy+30);
      lg.addColorStop(0,"transparent");
      lg.addColorStop(0.5,GOLD);
      lg.addColorStop(1,"transparent");
      ctx.fillStyle=lg;
      ctx.fillRect(cx-hw,cy-30,hw*2,60);
    }
    ctx.restore();
  };

  const phaseEnergyBuild = (ctx: CanvasRenderingContext2D, t: number, ms: number, cx: number, cy: number) => {
    if (t<0.06||t>0.4) return;
    const p = clamp((t-0.06)/0.34);

    ctx.save();
    const numRings = 3;
    for (let i=0;i<numRings;i++) {
      const rp = clamp((p-i*0.08)/(1-i*0.08));
      if (rp<=0) continue;
      const re = easeOut(rp);
      const radius = width*0.04 + width*0.25*re;
      const alpha = (1-re*0.8)*0.2;

      ctx.globalAlpha = alpha;
      ctx.strokeStyle = i===0?GOLD:GOLD_LIGHT;
      ctx.lineWidth = (3-i)*(1-re*0.7);
      ctx.beginPath(); ctx.arc(cx,cy,radius,0,Math.PI*2); ctx.stroke();
    }

    if (p>0.2 && p<0.9) {
      const rayP = clamp((p-0.2)/0.7);
      const nRays = 16;
      for (let i=0;i<nRays;i++) {
        const a = (i/nRays)*Math.PI*2 + ms*0.0004;
        const rLen = width*0.15*rayP + Math.sin(ms*0.003+i*2)*width*0.02;
        const rw = 0.02+Math.sin(ms*0.002+i)*0.01;
        const innerR = width*0.05;

        ctx.globalAlpha = (1-rayP*0.5)*0.08*(0.5+Math.sin(ms*0.004+i*1.5)*0.5);
        ctx.beginPath();
        ctx.moveTo(cx+Math.cos(a-rw)*innerR, cy+Math.sin(a-rw)*innerR);
        ctx.lineTo(cx+Math.cos(a)*(innerR+rLen), cy+Math.sin(a)*(innerR+rLen));
        ctx.lineTo(cx+Math.cos(a+rw)*innerR, cy+Math.sin(a+rw)*innerR);
        ctx.closePath();
        ctx.fillStyle=GOLD;
        ctx.fill();
      }
    }

    const orbCount = 6;
    for (let i=0;i<orbCount;i++) {
      const op = clamp((p-0.1-i*0.05)/(0.9-i*0.05));
      if (op<=0) continue;
      const oe = easeOut(op);
      const orbR = width*0.08+width*0.2*oe;
      const a = (i/orbCount)*Math.PI*2 + ms*0.001*(i%2===0?1:-1);

      const ox = cx+Math.cos(a)*orbR;
      const oy = cy+Math.sin(a)*orbR;

      ctx.globalAlpha = (1-oe)*0.4;
      const og = ctx.createRadialGradient(ox,oy,0,ox,oy,4+oe*2);
      og.addColorStop(0,"#fff");
      og.addColorStop(0.3,GOLD_BRIGHT);
      og.addColorStop(1,"transparent");
      ctx.fillStyle=og;
      ctx.beginPath(); ctx.arc(ox,oy,4+oe*2,0,Math.PI*2); ctx.fill();

      if (oe<0.7) {
        ctx.globalAlpha = (1-oe)*0.15;
        ctx.strokeStyle=GOLD;
        ctx.lineWidth=0.5;
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(ox,oy); ctx.stroke();
      }
    }
    ctx.restore();
  };

  const phaseParticleConverge = (
    ctx: CanvasRenderingContext2D, t: number, ms: number, cx: number, cy: number,
    st: NonNullable<typeof stateRef.current>
  ) => {
    const startT = 0.12;
    const endT = 0.42;
    if (t<startT||t>endT+0.05) return;

    const p = clamp((t-startT)/(endT-startT));
    const pts = st.particles;

    ctx.save();
    pts.forEach(pt => {
      const dp = clamp((p-pt.delay)/(1-pt.delay));
      if (dp<=0) return;

      const cubicEase = 1-Math.pow(1-dp,5);
      pt.x = lerp(pt.sx,pt.tx,cubicEase);
      pt.y = lerp(pt.sy,pt.ty,cubicEase);

      if (dp>0.1 && dp<0.95) {
        pt.trail.push({x:pt.x,y:pt.y});
        if (pt.trail.length>8) pt.trail.shift();
      }

      const alpha = dp<0.05?dp*20:dp>0.9?(1-dp)*10:1;
      const bright = dp>0.85?1+(1-dp)*5:1;

      if (pt.trail.length>1 && dp<0.9) {
        ctx.globalAlpha = alpha*0.15;
        ctx.strokeStyle = `rgba(${Math.min(255,pt.r*bright)},${Math.min(255,pt.g*bright)},${Math.min(255,pt.b*bright)},0.4)`;
        ctx.lineWidth = pt.size*0.5;
        ctx.beginPath();
        ctx.moveTo(pt.trail[0].x,pt.trail[0].y);
        for (let j=1;j<pt.trail.length;j++) ctx.lineTo(pt.trail[j].x,pt.trail[j].y);
        ctx.stroke();
      }

      ctx.globalAlpha = alpha*0.8;
      const sz = pt.size*(dp>0.9?1+(1-dp)*3:1);
      const cr = Math.min(255,pt.r*bright);
      const cg = Math.min(255,pt.g*bright);
      const cb = Math.min(255,pt.b*bright);

      ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      ctx.beginPath(); ctx.arc(pt.x,pt.y,sz*0.6,0,Math.PI*2); ctx.fill();

      ctx.globalAlpha = alpha*0.25;
      ctx.shadowColor = `rgb(${cr},${cg},${cb})`;
      ctx.shadowBlur = sz*3;
      ctx.beginPath(); ctx.arc(pt.x,pt.y,sz,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
    });
    ctx.restore();
  };

  const phaseExplosion = (
    ctx: CanvasRenderingContext2D, t: number, ms: number, cx: number, cy: number,
    st: NonNullable<typeof stateRef.current>
  ) => {
    const boomT = 0.42;
    const boomEnd = 0.55;
    if (t<boomT||t>boomEnd) return;

    const p = clamp((t-boomT)/(boomEnd-boomT));
    const e = easeOut(p);

    ctx.save();

    ctx.globalAlpha = (1-p)*0.7;
    const flash = ctx.createRadialGradient(cx,cy,0,cx,cy,width*0.15);
    flash.addColorStop(0,"rgba(255,255,255,0.9)");
    flash.addColorStop(0.2,GOLD_BRIGHT);
    flash.addColorStop(0.5,`rgba(201,168,76,0.3)`);
    flash.addColorStop(1,"transparent");
    ctx.fillStyle=flash;
    ctx.beginPath(); ctx.arc(cx,cy,width*0.15,0,Math.PI*2); ctx.fill();

    const waveR = width*0.5*e;
    ctx.globalAlpha = (1-e)*0.5;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 3*(1-e);
    ctx.beginPath(); ctx.arc(cx,cy,waveR,0,Math.PI*2); ctx.stroke();

    ctx.globalAlpha = (1-e)*0.2;
    ctx.lineWidth = 8*(1-e);
    ctx.strokeStyle = GOLD_LIGHT;
    ctx.beginPath(); ctx.arc(cx,cy,waveR*0.92,0,Math.PI*2); ctx.stroke();

    if (p<0.5 && st.sparks.length<60) {
      for (let i=0;i<8;i++) {
        const a=Math.random()*Math.PI*2;
        const spd=2+Math.random()*6;
        st.sparks.push({
          x:cx,y:cy,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,
          life:0,maxLife:30+Math.random()*40,size:1+Math.random()*2,bright:0.5+Math.random()*0.5
        });
      }
    }

    ctx.restore();
  };

  const phaseLogoReveal = (
    ctx: CanvasRenderingContext2D, t: number, ms: number,
    img: HTMLImageElement, cx: number, cy: number,
    st: NonNullable<typeof stateRef.current>
  ) => {
    const revealStart = 0.40;
    if (t<revealStart) return;

    const p = clamp((t-revealStart)/0.15);
    const e = easeOut(p);

    const {logoW,logoH} = st;
    const lx = cx-logoW/2;
    const ly = cy-logoH/2;

    ctx.save();

    const scale = lerp(1.08,1,easeOut(clamp((t-revealStart)/0.2)));
    ctx.translate(cx,cy);
    ctx.scale(scale,scale);
    ctx.translate(-cx,-cy);

    ctx.globalAlpha = e;

    if (p<0.5) {
      ctx.shadowColor = GOLD_BRIGHT;
      ctx.shadowBlur = 40*(1-p*2);
    }

    ctx.drawImage(img,lx,ly,logoW,logoH);
    ctx.shadowBlur=0;

    if (t>0.55 && t<0.95) {
      const glowP = 0.5+Math.sin(ms*0.002)*0.3+Math.sin(ms*0.005)*0.2;
      ctx.globalAlpha = 0.04*glowP;
      const aura = ctx.createRadialGradient(cx,cy,logoW*0.2,cx,cy,logoW*0.6);
      aura.addColorStop(0,GOLD);
      aura.addColorStop(0.5,`rgba(201,168,76,0.1)`);
      aura.addColorStop(1,"transparent");
      ctx.fillStyle=aura;
      ctx.fillRect(0,0,width,height);
    }

    ctx.restore();
  };

  const phaseMetalSheen = (
    ctx: CanvasRenderingContext2D, t: number, ms: number, cx: number, cy: number,
    st: NonNullable<typeof stateRef.current>
  ) => {
    const s1Start=0.50, s1End=0.62;
    const s2Start=0.63, s2End=0.72;
    const s3Start=0.73, s3End=0.78;

    const {logoW,logoH}=st;
    const lx=cx-logoW/2, ly=cy-logoH/2;

    const doSheen = (start:number,end:number,intensity:number,sw:number) => {
      if (t<start||t>end) return;
      const p = clamp((t-start)/(end-start));
      const e = ease(p);
      const sweepX = lx-sw + (logoW+sw*2)*e;
      const fadeA = p<0.08?p/0.08:p>0.9?(1-p)/0.1:1;

      ctx.save();
      ctx.beginPath(); ctx.rect(lx,ly,logoW,logoH); ctx.clip();
      ctx.globalAlpha = intensity*fadeA;

      const g = ctx.createLinearGradient(sweepX-sw,ly,sweepX+sw,ly+logoH);
      g.addColorStop(0,"transparent");
      g.addColorStop(0.2,"rgba(255,255,255,0.05)");
      g.addColorStop(0.45,"rgba(255,255,255,0.4)");
      g.addColorStop(0.5,"rgba(255,255,255,0.7)");
      g.addColorStop(0.55,"rgba(255,255,255,0.4)");
      g.addColorStop(0.8,"rgba(255,255,255,0.05)");
      g.addColorStop(1,"transparent");
      ctx.fillStyle=g;
      ctx.fillRect(lx,ly,logoW,logoH);
      ctx.restore();
    };

    doSheen(s1Start,s1End,0.5,60);
    doSheen(s2Start,s2End,0.3,40);
    doSheen(s3Start,s3End,0.15,30);
  };

  const phaseTextReveal = (ctx: CanvasRenderingContext2D, t: number, ms: number, cx: number, cy: number) => {
    const arStart=0.62, arEnd=0.78;
    if (t>=arStart) {
      const p = clamp((t-arStart)/(arEnd-arStart));
      const e = easeOut(p);

      ctx.save();
      const fSize = Math.round(width*0.095);
      ctx.font = `bold ${fSize}px 'Amiri','Traditional Arabic',serif`;
      ctx.textAlign="center"; ctx.textBaseline="middle";
      const textY = cy+height*0.31;

      const slideX = lerp(cx+50*1,cx,e);

      ctx.globalAlpha = e*0.3;
      ctx.fillStyle = GOLD_LIGHT;
      ctx.fillText("لمجيبة",slideX+1,textY+2);

      ctx.globalAlpha = e;
      ctx.fillStyle = NAVY;
      ctx.fillText("لمجيبة",slideX,textY);

      if (p>0.5 && p<1) {
        const shimP = (p-0.5)/0.5;
        const shimE = ease(shimP);
        const shimX = slideX-width*0.12+width*0.24*shimE;
        ctx.globalAlpha = Math.sin(shimP*Math.PI)*0.2;
        const sg = ctx.createLinearGradient(shimX-15,textY-fSize/2,shimX+15,textY+fSize/2);
        sg.addColorStop(0,"transparent"); sg.addColorStop(0.5,GOLD_BRIGHT); sg.addColorStop(1,"transparent");
        ctx.fillStyle=sg;
        ctx.fillText("لمجيبة",slideX,textY);
      }
      ctx.restore();
    }

    const impStart=0.74, impEnd=0.88;
    if (t>=impStart) {
      const p = clamp((t-impStart)/(impEnd-impStart));
      const text="IMPORTING";
      const fSize=Math.round(width*0.04);
      const textY=cy+height*0.39;

      ctx.save();
      ctx.font=`700 ${fSize}px 'Montserrat','Segoe UI',sans-serif`;
      ctx.textAlign="left"; ctx.textBaseline="middle";

      const totalW = ctx.measureText(text).width;
      const spacing = width*0.006;
      const totalSpacing = spacing*(text.length-1);
      let sx = cx-(totalW+totalSpacing)/2;

      for (let i=0;i<text.length;i++) {
        const charP = clamp((p*text.length*1.3-i)/1.3);
        if (charP<=0) { sx+=ctx.measureText(text[i]).width+spacing; continue; }
        const ce = easeOut(charP);
        const cw = ctx.measureText(text[i]).width;

        ctx.save();
        ctx.globalAlpha = ce;
        const dropY = lerp(textY-8,textY,easeOut(Math.min(charP*2,1)));
        const scale = lerp(1.4,1,easeOut(Math.min(charP*2,1)));

        ctx.translate(sx+cw/2,dropY);
        ctx.scale(scale,scale);

        const cg = ctx.createLinearGradient(-cw/2,-fSize/2,cw/2,fSize/2);
        cg.addColorStop(0,"#B8963F");
        cg.addColorStop(0.3,GOLD_BRIGHT);
        cg.addColorStop(0.5,GOLD);
        cg.addColorStop(0.7,GOLD_BRIGHT);
        cg.addColorStop(1,"#B8963F");
        ctx.fillStyle=cg;
        ctx.fillText(text[i],-cw/2,0);

        if (charP<0.3) {
          ctx.globalAlpha = (1-charP/0.3)*0.5;
          ctx.shadowColor=GOLD_BRIGHT;
          ctx.shadowBlur=12;
          ctx.fillText(text[i],-cw/2,0);
          ctx.shadowBlur=0;
        }

        ctx.restore();
        sx+=cw+spacing;
      }

      if (p>0.8) {
        const sheenP = (p-0.8)/0.2;
        const sheenE = ease(sheenP);
        ctx.textAlign="center"; ctx.textBaseline="middle";
        const sw = totalW+totalSpacing;
        const sheenX = cx-sw/2+sw*sheenE;
        ctx.globalAlpha = Math.sin(sheenP*Math.PI)*0.2;
        const sg=ctx.createLinearGradient(sheenX-20,textY-fSize,sheenX+20,textY+fSize);
        sg.addColorStop(0,"transparent"); sg.addColorStop(0.5,"rgba(255,255,255,0.5)"); sg.addColorStop(1,"transparent");
        ctx.fillStyle=sg;
        ctx.fillRect(sheenX-20,textY-fSize,40,fSize*2);
      }

      ctx.restore();
    }
  };

  const phaseFinalGlow = (ctx: CanvasRenderingContext2D, t: number, ms: number, cx: number, cy: number) => {
    if (t<0.85) return;
    const p = clamp((t-0.85)/0.15);
    const e = easeOut(p);

    ctx.save();

    const breathe = 0.5+Math.sin(ms*0.0015)*0.3+Math.sin(ms*0.004)*0.2;
    ctx.globalAlpha = e*0.06*(0.5+breathe*0.5);
    const aura = ctx.createRadialGradient(cx,cy,width*0.05,cx,cy,width*0.5);
    aura.addColorStop(0,GOLD);
    aura.addColorStop(0.4,`rgba(201,168,76,0.15)`);
    aura.addColorStop(1,"transparent");
    ctx.fillStyle=aura;
    ctx.fillRect(0,0,width,height);

    const numRays=8;
    for (let i=0;i<numRays;i++) {
      const a = (i/numRays)*Math.PI*2+ms*0.0002;
      const rLen = width*0.4;
      const rw = 0.03;
      const pulse = 0.3+Math.sin(ms*0.002+i*1.5)*0.7;
      ctx.globalAlpha = e*0.015*pulse;
      ctx.beginPath();
      ctx.moveTo(cx,cy);
      ctx.lineTo(cx+Math.cos(a-rw)*rLen,cy+Math.sin(a-rw)*rLen);
      ctx.lineTo(cx+Math.cos(a+rw)*rLen,cy+Math.sin(a+rw)*rLen);
      ctx.closePath();
      const rg=ctx.createRadialGradient(cx,cy,5,cx,cy,rLen);
      rg.addColorStop(0,GOLD); rg.addColorStop(0.5,`rgba(201,168,76,0.05)`); rg.addColorStop(1,"transparent");
      ctx.fillStyle=rg;
      ctx.fill();
    }

    if (t>0.9) {
      const vp = clamp((t-0.9)/0.1);
      ctx.globalAlpha = vp*0.25;
      const vg = ctx.createRadialGradient(cx,cy,width*0.2,cx,cy,width*0.55);
      vg.addColorStop(0,"transparent");
      vg.addColorStop(0.6,"transparent");
      vg.addColorStop(1,"rgba(0,0,0,0.3)");
      ctx.fillStyle=vg;
      ctx.fillRect(0,0,width,height);
    }

    ctx.restore();
  };

  const drawSparks = (ctx: CanvasRenderingContext2D, t: number, ms: number, st: NonNullable<typeof stateRef.current>) => {
    const sparks = st.sparks;
    if (sparks.length===0) return;

    ctx.save();
    for (let i=sparks.length-1;i>=0;i--) {
      const s = sparks[i];
      s.x+=s.vx; s.y+=s.vy;
      s.vx*=0.96; s.vy*=0.96;
      s.vy+=0.05;
      s.life++;

      if (s.life>=s.maxLife) { sparks.splice(i,1); continue; }

      const lp = s.life/s.maxLife;
      const alpha = lp<0.1?lp*10:lp>0.6?(1-lp)/0.4:1;

      ctx.globalAlpha = alpha*s.bright;
      ctx.fillStyle = GOLD_BRIGHT;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.size*(1-lp*0.5),0,Math.PI*2); ctx.fill();

      ctx.globalAlpha = alpha*s.bright*0.3;
      ctx.fillStyle = GOLD;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.size*2*(1-lp*0.5),0,Math.PI*2); ctx.fill();

      if (s.life>1) {
        ctx.globalAlpha = alpha*0.2;
        ctx.strokeStyle=GOLD_LIGHT;
        ctx.lineWidth=s.size*0.5;
        ctx.beginPath();
        ctx.moveTo(s.x,s.y);
        ctx.lineTo(s.x-s.vx*4,s.y-s.vy*4);
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{width,height}} data-testid="cinematic-logo-loading">
        <div className="rounded-full animate-pulse"
          style={{width:width*0.12,height:width*0.12,background:`radial-gradient(circle,${GOLD}50,transparent)`}}/>
      </div>
    );
  }
  if (error) {
    return (
      <div className="mx-auto flex items-center justify-center" style={{width,height}} data-testid="cinematic-logo-fallback">
        <img src={logoSrc} alt="LIMJIBA" style={{maxWidth:width*0.7,maxHeight:height*0.7,objectFit:"contain"}}/>
      </div>
    );
  }
  return (
    <div className="mx-auto flex items-center justify-center" style={{width,height}} data-testid="cinematic-logo-reveal-container">
      <canvas ref={canvasRef} style={{width,height,willChange:"transform",borderRadius:8}} data-testid="cinematic-logo-canvas"/>
    </div>
  );
}
