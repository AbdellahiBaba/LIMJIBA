import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";

/* ─── Keyframe styles injected once ─────────────────────────────── */
function injectStyles() {
  if (document.getElementById("lmj-mkt-styles")) return;
  const el = document.createElement("style");
  el.id = "lmj-mkt-styles";
  el.textContent = `
    @keyframes lmj-fadein  { from{opacity:0} to{opacity:1} }
    @keyframes lmj-slideup { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
    @keyframes lmj-slideleft  { from{opacity:0;transform:translateX(30px)} to{opacity:1;transform:translateX(0)} }
    @keyframes lmj-slideright { from{opacity:0;transform:translateX(-30px)} to{opacity:1;transform:translateX(0)} }
    @keyframes lmj-scalein { from{opacity:0;transform:scale(0.6)} to{opacity:1;transform:scale(1)} }
    @keyframes lmj-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
    @keyframes lmj-pulse  { 0%,100%{box-shadow:0 0 0 0 rgba(201,168,76,0.6)} 50%{box-shadow:0 0 0 10px rgba(201,168,76,0)} }
    @keyframes lmj-glow   { 0%,100%{text-shadow:0 0 8px #C9A84C} 50%{text-shadow:0 0 20px #C9A84C,0 0 40px rgba(201,168,76,0.5)} }
    @keyframes lmj-spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    @keyframes lmj-shimmer {
      0%  { background-position:-200% center }
      100%{ background-position: 200% center }
    }
    @keyframes lmj-particle {
      0%  { transform:translateY(0) rotate(0deg); opacity:.9 }
      100%{ transform:translateY(60px) rotate(540deg); opacity:0 }
    }
    @keyframes lmj-flyarc {
      0%  { transform:translate(0,0) scale(1); opacity:1 }
      50% { transform:translate(70px,-50px) scale(.55); opacity:.8 }
      100%{ transform:translate(130px,20px) scale(.15); opacity:0 }
    }
    @keyframes lmj-cartbounce { 0%,100%{transform:scale(1)} 50%{transform:scale(1.3)} }
    @keyframes lmj-btnclick   { 0%,100%{transform:scale(1)} 40%{transform:scale(.9)} 70%{transform:scale(1.08)} }
    @keyframes lmj-checkdraw  { from{stroke-dashoffset:80} to{stroke-dashoffset:0} }
    @keyframes lmj-circledraw { from{stroke-dashoffset:160} to{stroke-dashoffset:0} }
    @keyframes lmj-confetti {
      0%  { transform:translateY(0) rotate(0deg) scale(1); opacity:1 }
      100%{ transform:translateY(90px) rotate(720deg) scale(0); opacity:0 }
    }
    @keyframes lmj-bike {
      0%  { transform:translateX(380px) }
      55% { transform:translateX(60px)  }
      75% { transform:translateX(40px)  }
      100%{ transform:translateX(-420px)}
    }
    @keyframes lmj-road { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
    @keyframes lmj-speedline {
      0%  { transform:scaleX(0); opacity:0 }
      35% { transform:scaleX(1); opacity:.7 }
      100%{ transform:scaleX(1.6); opacity:0 }
    }
    @keyframes lmj-star { 0%,100%{opacity:.2} 50%{opacity:.9} }
    @keyframes lmj-exhaust { 0%{transform:scaleX(0);opacity:.6} 100%{transform:scaleX(2.5);opacity:0} }
    @keyframes lmj-pkgbounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
    @keyframes lmj-countdown { 0%{width:100%} 100%{width:0%} }
    @keyframes lmj-ripple { 0%{transform:scale(0);opacity:.6} 100%{transform:scale(3);opacity:0} }
    @keyframes lmj-badge { 0%{transform:scale(0) rotate(-10deg)} 70%{transform:scale(1.1)} 100%{transform:scale(1) rotate(0)} }

    .lmj-shimmer {
      background: linear-gradient(90deg,#C9A84C 0%,#fff5cc 40%,#C9A84C 60%,#B8963F 100%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: lmj-shimmer 2.5s linear infinite;
    }
    .lmj-widget * { box-sizing: border-box; }
  `;
  document.head.appendChild(el);
}

/* ─── Mini particles ─────────────────────────────────────────────── */
function MiniParticles({ count = 10 }: { count?: number }) {
  const pts = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${5 + Math.random() * 90}%`,
    top:  `${5 + Math.random() * 80}%`,
    size: Math.random() * 4 + 2,
    delay: Math.random() * 2,
    dur:   Math.random() * 1.5 + 1,
    shape: i % 3,
  }));
  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden" }}>
      {pts.map(p => (
        <div key={p.id} style={{
          position:"absolute", left:p.left, top:p.top,
          width:p.size, height:p.size,
          background: p.shape===1 ? "#FAF6EE" : "#C9A84C",
          borderRadius: p.shape===2 ? "0" : "50%",
          transform: p.shape===2 ? "rotate(45deg)" : undefined,
          animation:`lmj-particle ${p.dur}s ${p.delay}s ease-in infinite`,
          opacity:0,
        }} />
      ))}
    </div>
  );
}

/* ─── SCENE 1: Brand reveal ─────────────────────────────────────── */
function Scene1() {
  return (
    <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
      <MiniParticles count={12} />
      <div style={{ animation:"lmj-scalein .5s cubic-bezier(.34,1.56,.64,1) both", marginBottom:10 }}>
        <div style={{
          width:52, height:52, borderRadius:"50%",
          background:"linear-gradient(135deg,#0A1628,#152338)",
          border:"2px solid #C9A84C",
          display:"flex", alignItems:"center", justifyContent:"center",
          animation:"lmj-pulse 2s ease-in-out infinite",
          boxShadow:"0 0 20px rgba(201,168,76,0.4)",
        }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <polygon points="14,2 26,24 2,24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinejoin="round"/>
            <circle cx="14" cy="18" r="3" fill="#C9A84C"/>
            <line x1="14" y1="9" x2="14" y2="14" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
      <div style={{ animation:"lmj-slideup .5s .3s both" }}>
        <h2 className="lmj-shimmer" style={{ fontSize:"1.6rem", fontWeight:900, letterSpacing:".15em", margin:0, lineHeight:1 }}>
          LIMJIBA
        </h2>
      </div>
      <div style={{ animation:"lmj-fadein .5s .6s both", textAlign:"center", marginTop:6 }}>
        <p style={{ color:"rgba(201,168,76,.65)", fontSize:".6rem", letterSpacing:".25em", margin:0, textTransform:"uppercase" }}>
          لمجيبة · Premium Imports
        </p>
      </div>
      <div style={{ animation:"lmj-fadein .5s .9s both", marginTop:14, display:"flex", gap:12 }}>
        {["🛍 500+ Products","⚡ Fast Delivery","🌟 Premium"].map((v,i) => (
          <span key={i} style={{ color:"rgba(201,168,76,.6)", fontSize:".55rem", whiteSpace:"nowrap" }}>{v}</span>
        ))}
      </div>
    </div>
  );
}

/* ─── SCENE 2: Add to cart ──────────────────────────────────────── */
function Scene2() {
  const [clicked, setClicked]     = useState(false);
  const [flying,  setFlying]      = useState(false);
  const [bounce,  setBounce]      = useState(false);
  const [count,   setCount]       = useState(0);

  useEffect(() => {
    const ts = [
      setTimeout(() => setClicked(true),  900),
      setTimeout(() => setFlying(true),   1050),
      setTimeout(() => { setBounce(true); setCount(1); }, 1400),
      setTimeout(() => { setFlying(false); setClicked(false); }, 1750),
      setTimeout(() => setBounce(false),  1850),
    ];
    return () => ts.forEach(clearTimeout);
  }, []);

  return (
    <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", gap:16, padding:"0 14px" }}>
      {/* Product card */}
      <div style={{ animation:"lmj-slideright .5s .2s cubic-bezier(.34,1.56,.64,1) both", position:"relative", flexShrink:0 }}>
        <div style={{
          background:"linear-gradient(135deg,#0d1e3a,#182d52)",
          border:"1.5px solid rgba(201,168,76,.35)",
          borderRadius:12, padding:"12px 12px 10px",
          width:118, boxShadow:"0 12px 40px rgba(0,0,0,.5)",
        }}>
          <div style={{
            height:58, background:"rgba(201,168,76,.1)", borderRadius:8, marginBottom:8,
            display:"flex", alignItems:"center", justifyContent:"center", position:"relative",
          }}>
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
              <rect x="5" y="8" width="24" height="18" rx="3" fill="rgba(201,168,76,.25)" stroke="#C9A84C" strokeWidth="1.2"/>
              <rect x="10" y="13" width="14" height="10" rx="1.5" fill="rgba(201,168,76,.1)" stroke="#C9A84C" strokeWidth=".8"/>
              <circle cx="17" cy="18" r="3" fill="#C9A84C" opacity=".7"/>
            </svg>
            <div style={{ position:"absolute", top:4, right:4, background:"#C9A84C", borderRadius:3, padding:"1px 5px" }}>
              <span style={{ color:"#0A1628", fontSize:".5rem", fontWeight:700 }}>NEW</span>
            </div>
          </div>
          <p style={{ color:"#FAF6EE", fontSize:".65rem", fontWeight:700, margin:"0 0 2px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>Premium Product</p>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:6 }}>
            <span style={{ color:"#C9A84C", fontWeight:800, fontSize:".72rem" }}>850 MRU</span>
            <button style={{
              background: clicked ? "linear-gradient(135deg,#C9A84C,#B8963F)" : "rgba(201,168,76,.15)",
              border:"1px solid #C9A84C", color: clicked ? "#0A1628" : "#C9A84C",
              borderRadius:6, padding:"3px 7px", fontSize:".55rem", fontWeight:700,
              animation: clicked ? "lmj-btnclick .35s ease" : "none",
              transition:"background .2s, color .2s", cursor:"pointer",
            }}>+ Cart</button>
          </div>
        </div>
        {/* Flying dot */}
        {flying && (
          <div style={{
            position:"absolute", top:"40%", right:"5%",
            width:12, height:12, borderRadius:"50%", background:"#C9A84C",
            animation:"lmj-flyarc .7s cubic-bezier(.25,.46,.45,.94) forwards", zIndex:10,
          }} />
        )}
      </div>

      {/* Cart */}
      <div style={{ animation:"lmj-slideleft .5s .35s cubic-bezier(.34,1.56,.64,1) both", flexShrink:0, textAlign:"center" }}>
        <div style={{
          width:58, height:58,
          background:"rgba(201,168,76,.1)", border:"2px solid rgba(201,168,76,.45)",
          borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center",
          position:"relative",
          animation: bounce ? "lmj-cartbounce .35s ease" : "none",
          boxShadow: bounce ? "0 0 18px rgba(201,168,76,.5)" : "none",
          transition:"box-shadow .3s",
        }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M2 2h4l4 14h12l3-10H8" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="11" cy="24" r="2" fill="#C9A84C"/>
            <circle cx="20" cy="24" r="2" fill="#C9A84C"/>
          </svg>
          {count > 0 && (
            <div style={{
              position:"absolute", top:-7, right:-7, width:16, height:16, borderRadius:"50%",
              background:"#C9A84C", color:"#0A1628", fontSize:".55rem", fontWeight:900,
              display:"flex", alignItems:"center", justifyContent:"center",
              animation:"lmj-scalein .3s cubic-bezier(.34,1.56,.64,1)",
            }}>{count}</div>
          )}
        </div>
        <p style={{ color:"rgba(201,168,76,.55)", fontSize:".55rem", margin:"5px 0 0", letterSpacing:".1em" }}>YOUR CART</p>
      </div>

      {/* Label */}
      <div style={{ position:"absolute", bottom:8, left:0, right:0, textAlign:"center", animation:"lmj-fadein .5s 1s both" }}>
        <p style={{ color:"#C9A84C", fontSize:".65rem", fontWeight:700, margin:0 }}>Shop Anything. Anytime.</p>
      </div>
    </div>
  );
}

/* ─── SCENE 3: Real checkout — wallet select → number → proof → confirmed ── */
function MiniConfetti() {
  const pcs = Array.from({ length: 18 }, (_,i) => ({
    id:i, left:`${15+Math.random()*70}%`,
    color:["#C9A84C","#FAF6EE","#B8963F","#ffe9a0","#0A1628"][i%5],
    size:Math.random()*7+4, delay:Math.random()*.4, dur:Math.random()*.8+.7,
  }));
  return (
    <div style={{ position:"absolute", top:"25%", left:0, right:0, height:"75%", pointerEvents:"none", overflow:"hidden" }}>
      {pcs.map(p => (
        <div key={p.id} style={{
          position:"absolute", left:p.left,
          width:p.size, height:p.size, background:p.color,
          borderRadius:p.id%3===0?"50%":"2px",
          animation:`lmj-confetti ${p.dur}s ${p.delay}s ease-in forwards`,
        }} />
      ))}
    </div>
  );
}

/* Brand-colored wallet icon badges */
function WalletIcon({ type, size = 28 }: { type: "bankily"|"masrivi"|"sedad"; size?: number }) {
  const cfg = {
    bankily: { bg:"#16a34a", label:"B",  text:"Bankily",  ar:"بنكيلي" },
    masrivi: { bg:"#2563eb", label:"M",  text:"Masrivi",  ar:"مصرفي"  },
    sedad:   { bg:"#ea580c", label:"S",  text:"Sedad",    ar:"سداد"   },
  }[type];
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%",
      background:cfg.bg, display:"flex", alignItems:"center", justifyContent:"center",
      flexShrink:0, boxShadow:`0 2px 8px ${cfg.bg}60`,
    }}>
      <span style={{ color:"#fff", fontWeight:900, fontSize:size*.38, lineHeight:1 }}>{cfg.label}</span>
    </div>
  );
}

const WALLETS = [
  { type:"bankily" as const, name:"Bankily", ar:"بنكيلي", number:"49399170", bg:"#16a34a" },
  { type:"masrivi" as const, name:"Masrivi", ar:"مصرفي",  number:"49399170", bg:"#2563eb" },
  { type:"sedad"   as const, name:"Sedad",   ar:"سداد",   number:"49399170", bg:"#ea580c" },
];

type CheckoutStep = "wallets" | "number" | "upload" | "done";

function Scene3() {
  const [step,        setStep]        = useState<CheckoutStep>("wallets");
  const [selected,    setSelected]    = useState<number | null>(null);
  const [uploadClick, setUploadClick] = useState(false);
  const [spinner,     setSpinner]     = useState(false);
  const [confetti,    setConfetti]    = useState(false);
  const [copied,      setCopied]      = useState(false);

  useEffect(() => {
    const ts = [
      /* select Bankily */
      setTimeout(() => setSelected(0),           650),
      /* show wallet number */
      setTimeout(() => setStep("number"),         1150),
      /* copy flash */
      setTimeout(() => setCopied(true),           1650),
      setTimeout(() => setCopied(false),          1950),
      /* move to upload */
      setTimeout(() => setStep("upload"),         2100),
      /* click upload button */
      setTimeout(() => setUploadClick(true),      2450),
      setTimeout(() => { setUploadClick(false); setSpinner(true); }, 2650),
      /* confirmed */
      setTimeout(() => { setSpinner(false); setStep("done"); }, 3250),
      setTimeout(() => setConfetti(true),         3350),
    ];
    return () => ts.forEach(clearTimeout);
  }, []);

  const selWallet = selected !== null ? WALLETS[selected] : null;

  return (
    <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", padding:"10px 12px 8px", overflow:"hidden" }}>
      {confetti && <MiniConfetti />}

      {/* Header */}
      <div style={{ animation:"lmj-slideup .4s both", marginBottom:8 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <p style={{ color:"rgba(201,168,76,.5)", fontSize:".5rem", letterSpacing:".15em", margin:0, textTransform:"uppercase" }}>Checkout · LIMJIBA #8942</p>
            <p style={{ color:"#C9A84C", fontWeight:800, fontSize:".7rem", margin:"1px 0 0" }}>
              {step === "wallets" ? "Choose Payment Method" :
               step === "number"  ? "Transfer to Wallet" :
               step === "upload"  ? "Upload Payment Proof" : "Order Confirmed!"}
            </p>
          </div>
          <div style={{ background:"rgba(201,168,76,.12)", border:"1px solid rgba(201,168,76,.3)", borderRadius:6, padding:"2px 8px" }}>
            <span style={{ color:"#C9A84C", fontWeight:900, fontSize:".65rem" }}>850 MRU</span>
          </div>
        </div>
      </div>

      {/* ── Step: wallet selection ── */}
      {step === "wallets" && (
        <div style={{ display:"flex", gap:6, animation:"lmj-slideup .4s .2s both" }}>
          {WALLETS.map((w, i) => (
            <button key={w.type} style={{
              flex:1, background: selected===i ? `${w.bg}22` : "rgba(255,255,255,.04)",
              border:`1.5px solid ${selected===i ? w.bg : "rgba(255,255,255,.08)"}`,
              borderRadius:10, padding:"8px 4px",
              display:"flex", flexDirection:"column", alignItems:"center", gap:4,
              cursor:"pointer",
              transform: selected===i ? "scale(1.04)" : "scale(1)",
              transition:"all .25s cubic-bezier(.34,1.56,.64,1)",
              boxShadow: selected===i ? `0 0 12px ${w.bg}40` : "none",
            }}>
              <WalletIcon type={w.type} size={26} />
              <span style={{ color: selected===i ? "#FAF6EE" : "rgba(250,246,238,.45)", fontSize:".55rem", fontWeight:700 }}>{w.name}</span>
              <span style={{ color: selected===i ? "rgba(201,168,76,.7)" : "rgba(250,246,238,.25)", fontSize:".48rem" }}>{w.ar}</span>
              {selected===i && (
                <svg width="10" height="10" viewBox="0 0 10 10" style={{ marginTop:1 }}>
                  <circle cx="5" cy="5" r="4.5" stroke="#C9A84C" strokeWidth="1" fill="none"/>
                  <circle cx="5" cy="5" r="2.5" fill="#C9A84C"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Step: wallet number (transfer to) ── */}
      {step === "number" && selWallet && (
        <div style={{ animation:"lmj-slideup .4s both", flex:1 }}>
          <div style={{ display:"flex", gap:6, marginBottom:8 }}>
            {WALLETS.map((w,i) => (
              <button key={w.type} style={{
                flex:1, background: i===0 ? `${w.bg}22` : "rgba(255,255,255,.04)",
                border:`1.5px solid ${i===0 ? w.bg : "rgba(255,255,255,.08)"}`,
                borderRadius:10, padding:"6px 4px",
                display:"flex", flexDirection:"column", alignItems:"center", gap:3,
                cursor:"pointer",
                boxShadow: i===0 ? `0 0 10px ${w.bg}40` : "none",
              }}>
                <WalletIcon type={w.type} size={22} />
                <span style={{ color: i===0 ? "#FAF6EE" : "rgba(250,246,238,.35)", fontSize:".52rem", fontWeight:700 }}>{w.name}</span>
              </button>
            ))}
          </div>
          <div style={{
            background:`${selWallet.bg}18`, border:`1px solid ${selWallet.bg}55`,
            borderRadius:10, padding:"10px 12px",
          }}>
            <p style={{ color:"rgba(250,246,238,.5)", fontSize:".5rem", margin:"0 0 4px", letterSpacing:".1em", textTransform:"uppercase" }}>Transfer to · {selWallet.name}</p>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ color:"#FAF6EE", fontFamily:"monospace", fontWeight:900, fontSize:"1rem", letterSpacing:".12em" }}>
                {selWallet.number}
              </span>
              <div style={{
                background: copied ? "#C9A84C" : "rgba(201,168,76,.15)",
                border:"1px solid rgba(201,168,76,.4)",
                borderRadius:6, padding:"3px 8px",
                display:"flex", alignItems:"center", gap:4,
                transition:"background .2s",
              }}>
                {copied ? (
                  <svg width="10" height="10" fill="none" stroke="#0A1628" strokeWidth="2"><path d="M1.5 5.5l2.5 2.5L9 2"/></svg>
                ) : (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="rgba(201,168,76,.8)" strokeWidth="1.2">
                    <rect x="3" y="3" width="6" height="6" rx="1"/><path d="M1 7V1h6"/>
                  </svg>
                )}
                <span style={{ color: copied ? "#0A1628" : "rgba(201,168,76,.8)", fontSize:".48rem", fontWeight:700 }}>
                  {copied ? "Copied!" : "Copy"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Step: upload proof ── */}
      {step === "upload" && (
        <div style={{ animation:"lmj-slideup .4s both", flex:1, display:"flex", flexDirection:"column", gap:8 }}>
          <div style={{
            background:"rgba(255,255,255,.04)", border:"1px dashed rgba(201,168,76,.3)",
            borderRadius:10, padding:"10px", textAlign:"center",
          }}>
            <p style={{ color:"rgba(250,246,238,.5)", fontSize:".52rem", margin:"0 0 6px" }}>Transfer to <strong style={{ color:"#16a34a" }}>Bankily</strong> · <span style={{ fontFamily:"monospace", color:"#FAF6EE" }}>49399170</span></p>
            <button style={{
              width:"100%",
              background: uploadClick ? "rgba(201,168,76,.3)" : "rgba(201,168,76,.1)",
              border:"1.5px solid rgba(201,168,76,.45)",
              borderRadius:8, padding:"9px",
              color:"#C9A84C", fontWeight:700, fontSize:".6rem",
              display:"flex", alignItems:"center", justifyContent:"center", gap:6,
              transform: uploadClick ? "scale(.96)" : "scale(1)",
              transition:"all .15s", cursor:"pointer",
            }}>
              {spinner ? (
                <svg width="12" height="12" viewBox="0 0 12 12" style={{ animation:"lmj-spin .6s linear infinite" }}>
                  <circle cx="6" cy="6" r="4.5" stroke="rgba(201,168,76,.3)" strokeWidth="1.5" fill="none"/>
                  <path d="M6 1.5 A4.5 4.5 0 0 1 10.5 6" stroke="#C9A84C" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                </svg>
              ) : (
                <>
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M2 9v2h9V9M6.5 2v6M4 4.5l2.5-2.5L9 4.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Upload Payment Proof
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Step: confirmed ── */}
      {step === "done" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", animation:"lmj-scalein .5s cubic-bezier(.34,1.56,.64,1)" }}>
          <svg width="46" height="46" viewBox="0 0 46 46">
            <circle cx="23" cy="23" r="20" stroke="#C9A84C" strokeWidth="2.5" fill="rgba(201,168,76,.08)"
              strokeDasharray="126" strokeDashoffset="0"
              style={{ animation:"lmj-circledraw .5s ease forwards" }}/>
            <polyline points="13,23 20,30 33,15" stroke="#C9A84C" strokeWidth="3.5" fill="none"
              strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="80" strokeDashoffset="0"
              style={{ animation:"lmj-checkdraw .4s .35s ease forwards" }}/>
          </svg>
          <p style={{ color:"#C9A84C", fontWeight:900, fontSize:".75rem", margin:"6px 0 2px" }}>Order Confirmed! ✨</p>
          <p style={{ color:"rgba(250,246,238,.45)", fontSize:".55rem", margin:0 }}>Payment verified · Preparing your order</p>
        </div>
      )}
    </div>
  );
}

/* ─── SCENE 4: Motorbike delivery ───────────────────────────────── */
function Scene4() {
  const [active, setActive] = useState(false);
  const stars = Array.from({ length:20 }, (_,i) => ({
    id:i, x:`${Math.random()*100}%`, y:`${5+Math.random()*45}%`,
    s:Math.random()*2.5+.8, delay:Math.random()*3, dur:Math.random()*2+1,
  }));

  useEffect(() => {
    const t = setTimeout(() => setActive(true), 250);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ position:"absolute", inset:0, overflow:"hidden" }}>
      {/* Night sky */}
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg,#020810 0%,#0A1628 55%,#0d1e3a 100%)" }}>
        {stars.map(s => (
          <div key={s.id} style={{
            position:"absolute", left:s.x, top:s.y,
            width:s.s, height:s.s, borderRadius:"50%", background:"#FAF6EE",
            animation:`lmj-star ${s.dur}s ${s.delay}s ease-in-out infinite`,
          }} />
        ))}
        <div style={{ position:"absolute", top:"6%", right:"10%", width:28, height:28 }}>
          <svg width="28" height="28"><circle cx="14" cy="14" r="12" fill="rgba(201,168,76,.12)" stroke="rgba(201,168,76,.35)" strokeWidth="1"/><circle cx="17" cy="11" r="8" fill="#020810"/></svg>
        </div>
      </div>

      {/* Road */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"35%", background:"linear-gradient(180deg,#0d1e3a,#060B14)", borderTop:"1.5px solid rgba(201,168,76,.25)" }}>
        <div style={{ position:"absolute", top:"48%", left:0, right:0, height:2, overflow:"hidden" }}>
          <div style={{ display:"flex", gap:24, animation:"lmj-road .9s linear infinite" }}>
            {Array.from({length:30},(_,i)=>(
              <div key={i} style={{ width:36, height:2, background:"rgba(201,168,76,.35)", flexShrink:0 }} />
            ))}
          </div>
        </div>
        {/* City skyline */}
        <svg style={{ position:"absolute", top:-50, left:0, width:"100%", height:50 }} viewBox="0 0 320 50" preserveAspectRatio="none">
          <path d="M0 50 L0 34 L12 34 L12 20 L18 20 L18 12 L22 12 L22 20 L30 20 L30 28 L38 28 L38 8 L42 8 L42 2 L46 2 L46 8 L50 8 L50 28 L60 28 L60 34 L72 34 L72 22 L76 22 L76 16 L80 16 L80 22 L88 22 L88 34 L100 34 L100 26 L106 26 L106 14 L110 14 L110 26 L118 26 L118 34 L130 34 L130 28 L140 28 L140 18 L144 18 L144 10 L148 10 L148 18 L156 18 L156 28 L168 28 L168 34 L180 34 L180 20 L186 20 L186 12 L190 12 L190 20 L200 20 L200 34 L214 34 L214 26 L220 26 L220 16 L224 16 L224 26 L234 26 L234 34 L248 34 L248 22 L254 22 L254 8 L258 8 L258 22 L268 22 L268 34 L282 34 L282 28 L290 28 L290 18 L294 18 L294 28 L304 28 L304 34 L320 34 L320 50 Z"
            fill="rgba(10,22,40,.85)" stroke="rgba(201,168,76,.12)" strokeWidth=".5"/>
        </svg>
      </div>

      {/* Header text */}
      <div style={{ position:"absolute", top:8, left:0, right:0, textAlign:"center", animation:"lmj-fadeIn .5s .3s both" }}>
        <p style={{ color:"#C9A84C", fontSize:".68rem", fontWeight:800, margin:0, letterSpacing:".08em" }}>⚡ Express Delivery ⚡</p>
        <p style={{ color:"rgba(250,246,238,.45)", fontSize:".52rem", margin:"2px 0 0" }}>Racing to your door</p>
      </div>

      {/* Bike */}
      {active && (
        <div style={{ position:"absolute", bottom:"29%", left:0, width:"100%", animation:"lmj-bike 3.6s cubic-bezier(.18,0,.82,1) forwards" }}>
          {/* Speed lines */}
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              position:"absolute", right:`calc(100% + ${8+i*12}px)`, top:`${22+i*14}%`,
              width:30+i*14, height:1.5,
              background:"linear-gradient(90deg,transparent,rgba(201,168,76,.75))",
              transformOrigin:"right center",
              animation:`lmj-speedline .4s ${i*.04}s ease-out infinite`,
            }} />
          ))}
          {/* Exhaust */}
          <div style={{
            position:"absolute", right:"calc(100% + 2px)", top:"42%",
            width:20, height:10, background:"rgba(250,246,238,.12)", borderRadius:"50%",
            animation:"lmj-exhaust .5s ease-out infinite", transformOrigin:"left center",
          }} />

          {/* Bike SVG */}
          <svg width="130" height="72" viewBox="0 0 130 72" fill="none" style={{ filter:"drop-shadow(0 6px 18px rgba(0,0,0,.7))" }}>
            {/* Rear wheel */}
            <circle cx="26" cy="54" r="16" stroke="#C9A84C" strokeWidth="2.5" fill="#060B14"/>
            <circle cx="26" cy="54" r="7"  stroke="rgba(201,168,76,.4)" strokeWidth="1.5" fill="none"/>
            <circle cx="26" cy="54" r="2.5" fill="#C9A84C"/>
            {[0,60,120,180,240,300].map(a=>(
              <line key={a}
                x1={26+7*Math.cos(a*Math.PI/180)} y1={54+7*Math.sin(a*Math.PI/180)}
                x2={26+14*Math.cos(a*Math.PI/180)} y2={54+14*Math.sin(a*Math.PI/180)}
                stroke="rgba(201,168,76,.55)" strokeWidth="1"/>
            ))}
            {/* Front wheel */}
            <circle cx="104" cy="54" r="16" stroke="#C9A84C" strokeWidth="2.5" fill="#060B14"/>
            <circle cx="104" cy="54" r="7"  stroke="rgba(201,168,76,.4)" strokeWidth="1.5" fill="none"/>
            <circle cx="104" cy="54" r="2.5" fill="#C9A84C"/>
            {[0,60,120,180,240,300].map(a=>(
              <line key={a}
                x1={104+7*Math.cos(a*Math.PI/180)} y1={54+7*Math.sin(a*Math.PI/180)}
                x2={104+14*Math.cos(a*Math.PI/180)} y2={54+14*Math.sin(a*Math.PI/180)}
                stroke="rgba(201,168,76,.55)" strokeWidth="1"/>
            ))}
            {/* Frame */}
            <path d="M26 38 L52 30 L90 30 L104 38 L104 54 L26 54 Z" fill="#0A1628" stroke="#C9A84C" strokeWidth="1.5"/>
            {/* Engine */}
            <rect x="50" y="34" width="34" height="16" rx="3" fill="#132240" stroke="rgba(201,168,76,.35)" strokeWidth="1"/>
            {/* Exhaust pipe */}
            <path d="M26 46 L12 46 L10 52" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/>
            {/* Front fork */}
            <path d="M96 38 L108 48 L104 54" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round"/>
            {/* Handlebar */}
            <path d="M90 30 L96 22 L104 23" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round"/>
            {/* Seat */}
            <path d="M52 30 L80 30 L78 24 L54 24 Z" fill="#C9A84C" opacity=".8"/>
            {/* Rider body */}
            <path d="M64 24 L72 10 L82 13 L76 24 Z" fill="#0A1628" stroke="#C9A84C" strokeWidth="1.2"/>
            {/* Rider arm */}
            <path d="M76 16 L96 22" stroke="#C9A84C" strokeWidth="1.8" strokeLinecap="round"/>
            {/* Helmet */}
            <circle cx="73" cy="8" r="8" fill="#C9A84C"/>
            <ellipse cx="73" cy="10" rx="6.5" ry="4.5" fill="#0A1628"/>
            {/* Headlight */}
            <ellipse cx="108" cy="40" rx="4" ry="2.5" fill="#C9A84C" opacity=".9"/>
            <path d="M112 37.5 L122 35 M112 40 L124 40 M112 42.5 L122 45" stroke="#C9A84C" strokeWidth="1" strokeLinecap="round" opacity=".5"/>
          </svg>

          {/* Package */}
          <div style={{ position:"absolute", right:44, bottom:18, animation:"lmj-pkgbounce .35s ease-in-out infinite" }}>
            <svg width="30" height="27" viewBox="0 0 30 27" fill="none">
              <rect x="1" y="6" width="28" height="20" rx="3" fill="#C9A84C"/>
              <rect x="1" y="6" width="28" height="7" rx="3" fill="#B8963F"/>
              <line x1="15" y1="6" x2="15" y2="26" stroke="#0A1628" strokeWidth="1.5"/>
              <line x1="1" y1="13" x2="29" y2="13" stroke="#0A1628" strokeWidth="1.5"/>
              <text x="15" y="23" textAnchor="middle" fill="#0A1628" fontSize="5" fontWeight="bold">LMJ</text>
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Scene config ──────────────────────────────────────────────── */
const SCENES: Array<{ id: number; label: string; dur: number; C: React.FC }> = [
  { id:0, label:"Brand",    dur:2800,  C:Scene1 },
  { id:1, label:"Cart",     dur:3000,  C:Scene2 },
  { id:2, label:"Checkout", dur:4200,  C:Scene3 },
  { id:3, label:"Delivery", dur:4000,  C:Scene4 },
];

/* ─── Main widget ───────────────────────────────────────────────── */
export function StoreMarketingIntro() {
  const [scene,      setScene]      = useState(0);
  const [fading,     setFading]     = useState(false);
  const [minimized,  setMinimized]  = useState(false);
  const [visible,    setVisible]    = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  /* Inject CSS once */
  useEffect(() => { injectStyles(); }, []);

  /* Fade in widget after short delay so page loads first */
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  /* Advance scenes, loop forever */
  const scheduleNext = useCallback((cur: number) => {
    const dur = SCENES[cur].dur;
    const fadeT = setTimeout(() => setFading(true), dur - 400);
    const nextT = setTimeout(() => {
      const next = (cur + 1) % SCENES.length;
      setScene(next);
      setFading(false);
      scheduleNext(next);
    }, dur);
    timers.current.push(fadeT, nextT);
  }, []);

  useEffect(() => {
    scheduleNext(0);
    return () => timers.current.forEach(clearTimeout);
  }, [scheduleNext]);

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  if (!visible) return null;

  const CurrentScene = SCENES[scene].C;
  /* Mobile: wide-short horizontal at bottom-center */
  /* Desktop/Tablet: narrow-tall vertical at top-right */
  const WIDGET_W = isMobile ? 292 : 218;
  const WIDGET_H = isMobile ? 186 : 310;

  const posStyle: CSSProperties = isMobile
    ? { bottom: 18, left: "50%", transform: "translateX(-50%)" }
    : { top: 24, right: 24 };

  return (
    <div
      className="lmj-widget"
      style={{
        position:"fixed",
        ...posStyle,
        width:WIDGET_W,
        zIndex:9000,
        fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        animation:"lmj-fadein .6s ease both",
        filter:"drop-shadow(0 8px 32px rgba(0,0,0,.65))",
        userSelect:"none",
      }}
    >
      {/* ── Header bar ── */}
      <div
        onClick={() => setMinimized(m => !m)}
        style={{
          background:"linear-gradient(135deg,#0A1628,#152338)",
          border:"1.5px solid rgba(201,168,76,.5)",
          borderBottom: minimized ? "1.5px solid rgba(201,168,76,.5)" : "none",
          borderRadius: minimized ? 12 : "12px 12px 0 0",
          padding:"7px 12px",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          cursor:"pointer",
          transition:"border-radius .25s",
        }}
      >
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {/* Pulsing dot */}
          <div style={{ width:8, height:8, borderRadius:"50%", background:"#C9A84C", animation:"lmj-pulse 1.5s ease-in-out infinite", flexShrink:0 }} />
          <span className="lmj-shimmer" style={{ fontSize:".72rem", fontWeight:900, letterSpacing:".12em" }}>LIMJIBA</span>
          <span style={{ color:"rgba(201,168,76,.55)", fontSize:".55rem", letterSpacing:".1em" }}>· STORE</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {/* Scene dots */}
          <div style={{ display:"flex", gap:4 }}>
            {SCENES.map((s,i) => (
              <div key={s.id} style={{
                width: i===scene ? 14 : 5,
                height:5, borderRadius:3,
                background: i===scene ? "#C9A84C" : "rgba(201,168,76,.25)",
                overflow:"hidden", transition:"width .3s ease",
                position:"relative",
              }}>
                {i===scene && (
                  <div style={{
                    position:"absolute", inset:0, background:"linear-gradient(90deg,#B8963F,#ffe9a0)",
                    animation:`lmj-countdown ${SCENES[scene].dur}ms linear forwards`,
                  }} />
                )}
              </div>
            ))}
          </div>
          {/* Minimize chevron */}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
            style={{ transform: minimized ? "rotate(0deg)" : "rotate(180deg)", transition:"transform .3s", opacity:.7 }}>
            <path d="M3 5l4 4 4-4" stroke="#C9A84C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* ── Scene body ── */}
      {!minimized && (
        <div style={{
          width:WIDGET_W, height:WIDGET_H,
          background:"linear-gradient(160deg,#060B14 0%,#0A1628 60%,#0d1e3a 100%)",
          border:"1.5px solid rgba(201,168,76,.4)",
          borderTop:"none",
          borderRadius:"0 0 12px 12px",
          position:"relative",
          overflow:"hidden",
          opacity: fading ? 0 : 1,
          transition:"opacity .35s ease",
        }}>
          {/* Grid overlay */}
          <div style={{
            position:"absolute", inset:0, pointerEvents:"none",
            backgroundImage:"linear-gradient(rgba(201,168,76,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,.025) 1px,transparent 1px)",
            backgroundSize:"20px 20px",
          }} />
          {/* Corner glows */}
          <div style={{ position:"absolute", top:0, left:0, width:80, height:80, background:"radial-gradient(circle at 0 0,rgba(201,168,76,.07),transparent 70%)", pointerEvents:"none" }} />
          <div style={{ position:"absolute", bottom:0, right:0, width:80, height:80, background:"radial-gradient(circle at 100% 100%,rgba(201,168,76,.07),transparent 70%)", pointerEvents:"none" }} />
          {/* Top gold line */}
          <div style={{ position:"absolute", top:0, left:0, right:0, height:1.5, background:"linear-gradient(90deg,transparent,rgba(201,168,76,.4),transparent)" }} />

          <CurrentScene />

          {/* Scene label */}
          <div style={{ position:"absolute", bottom:6, right:10 }}>
            <span style={{ color:"rgba(201,168,76,.3)", fontSize:".48rem", letterSpacing:".15em", textTransform:"uppercase" }}>
              {SCENES[scene].label}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Hook (always show, no localStorage) ───────────────────────── */
export function useMarketingIntro() {
  return { show: true, handleDone: () => {} };
}
