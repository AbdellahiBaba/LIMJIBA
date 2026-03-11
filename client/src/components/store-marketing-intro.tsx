import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "limjiba_intro_seen_v2";
const TOTAL_DURATION = 11500;

function injectStyles() {
  if (document.getElementById("limjiba-intro-styles")) return;
  const el = document.createElement("style");
  el.id = "limjiba-intro-styles";
  el.textContent = `
    @keyframes li-fadein { from { opacity:0 } to { opacity:1 } }
    @keyframes li-fadeout { from { opacity:1 } to { opacity:0 } }
    @keyframes li-slideup { from { opacity:0; transform:translateY(40px) } to { opacity:1; transform:translateY(0) } }
    @keyframes li-slidedown { from { opacity:0; transform:translateY(-40px) } to { opacity:1; transform:translateY(0) } }
    @keyframes li-slideleft { from { opacity:0; transform:translateX(80px) } to { opacity:1; transform:translateX(0) } }
    @keyframes li-slideright { from { opacity:0; transform:translateX(-80px) } to { opacity:1; transform:translateX(0) } }
    @keyframes li-scalein { from { opacity:0; transform:scale(0.5) } to { opacity:1; transform:scale(1) } }
    @keyframes li-pulse { 0%,100% { box-shadow:0 0 0 0 rgba(201,168,76,0.7) } 50% { box-shadow:0 0 0 18px rgba(201,168,76,0) } }
    @keyframes li-glow { 0%,100% { text-shadow:0 0 20px #C9A84C,0 0 40px #C9A84C } 50% { text-shadow:0 0 60px #C9A84C,0 0 100px #C9A84C80 } }
    @keyframes li-float { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-12px) } }
    @keyframes li-particle { 0% { transform:translateY(0) rotate(0deg); opacity:1 } 100% { transform:translateY(120px) rotate(720deg); opacity:0 } }
    @keyframes li-btnclick { 0%,100% { transform:scale(1) } 40% { transform:scale(0.92) } 60% { transform:scale(1.06) } }
    @keyframes li-flyarc {
      0% { transform:translate(0,0) scale(1); opacity:1 }
      50% { transform:translate(120px,-80px) scale(0.6); opacity:0.8 }
      100% { transform:translate(220px,40px) scale(0.2); opacity:0 }
    }
    @keyframes li-cartbounce { 0%,100% { transform:scale(1) } 50% { transform:scale(1.25) } }
    @keyframes li-checkdraw { 0% { stroke-dashoffset:100 } 100% { stroke-dashoffset:0 } }
    @keyframes li-circledraw { 0% { stroke-dashoffset:283 } 100% { stroke-dashoffset:0 } }
    @keyframes li-confetti { 0% { transform:translateY(0) rotate(0deg) scale(1); opacity:1 } 100% { transform:translateY(160px) rotate(1080deg) scale(0); opacity:0 } }
    @keyframes li-road { 0% { transform:translateX(0) } 100% { transform:translateX(-50%) } }
    @keyframes li-bikespeed { 0% { transform:translateX(110vw) } 60% { transform:translateX(30vw) } 80% { transform:translateX(20vw) } 100% { transform:translateX(-120vw) } }
    @keyframes li-speedline { 0% { transform:scaleX(0); opacity:0 } 30% { transform:scaleX(1); opacity:0.7 } 100% { transform:scaleX(1.5); opacity:0 } }
    @keyframes li-star { 0%,100% { opacity:0.3 } 50% { opacity:1 } }
    @keyframes li-exhaust { 0% { transform:scaleX(0); opacity:0.8 } 100% { transform:scaleX(3); opacity:0 } }
    @keyframes li-shake { 0%,100% { transform:translateY(0) } 25% { transform:translateY(-3px) } 75% { transform:translateY(3px) } }
    @keyframes li-spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
    @keyframes li-wheelroll { from { transform:rotate(0deg) } to { transform:rotate(-1440deg) } }
    @keyframes li-packagebounce { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-5px) } }
    @keyframes li-countdown { 0% { width:100% } 100% { width:0% } }
    @keyframes li-shimmer { 0% { background-position:-200% center } 100% { background-position:200% center } }
    .li-shimmer-text {
      background: linear-gradient(90deg, #C9A84C 0%, #ffe9a0 40%, #C9A84C 60%, #B8963F 100%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: li-shimmer 2s linear infinite;
    }
  `;
  document.head.appendChild(el);
}

function Particles() {
  const particles = Array.from({ length: 22 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 60}%`,
    size: Math.random() * 6 + 3,
    delay: Math.random() * 2,
    dur: Math.random() * 2 + 1.5,
    shape: i % 3,
  }));
  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden" }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position:"absolute",
          left:p.left,
          top:p.top,
          width:p.size,
          height:p.size,
          background: p.shape === 0 ? "#C9A84C" : p.shape === 1 ? "#FAF6EE" : "rgba(201,168,76,0.5)",
          borderRadius: p.shape === 1 ? "0" : "50%",
          transform: p.shape === 1 ? "rotate(45deg)" : "none",
          animation:`li-particle ${p.dur}s ${p.delay}s ease-in infinite`,
          opacity:0.8,
        }} />
      ))}
    </div>
  );
}

function Scene1Brand() {
  return (
    <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", zIndex:1 }}>
      <Particles />
      <div style={{ animation:"li-scalein 0.7s cubic-bezier(0.34,1.56,0.64,1) both", marginBottom:24 }}>
        <div style={{
          width:100, height:100, borderRadius:"50%",
          background:"linear-gradient(135deg,#0A1628,#132240)",
          border:"3px solid #C9A84C",
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:"0 0 40px rgba(201,168,76,0.5), 0 0 80px rgba(201,168,76,0.2)",
          animation:"li-pulse 2s ease-in-out infinite",
        }}>
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <polygon points="28,4 52,48 4,48" fill="none" stroke="#C9A84C" strokeWidth="3" strokeLinejoin="round" />
            <circle cx="28" cy="34" r="6" fill="#C9A84C" />
            <line x1="28" y1="18" x2="28" y2="28" stroke="#C9A84C" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      <div style={{ animation:"li-slideup 0.8s 0.4s both" }}>
        <h1 className="li-shimmer-text" style={{ fontSize:"clamp(2.5rem,7vw,4.5rem)", fontWeight:900, letterSpacing:"0.15em", margin:0, lineHeight:1 }}>
          LIMJIBA
        </h1>
      </div>
      <div style={{ animation:"li-slideup 0.6s 0.9s both", marginTop:8 }}>
        <p style={{ color:"rgba(201,168,76,0.7)", fontSize:"clamp(0.75rem,2vw,1rem)", letterSpacing:"0.35em", textTransform:"uppercase", margin:0 }}>
          لمجيبة &nbsp;•&nbsp; Premium Imports &nbsp;•&nbsp; Mauritania
        </p>
      </div>
      <div style={{ animation:"li-slideup 0.6s 1.4s both", marginTop:32, display:"flex", gap:32 }}>
        {["Free Delivery","Premium Quality","Trusted Store"].map((v,i) => (
          <div key={i} style={{ textAlign:"center" }}>
            <div style={{ width:36, height:36, borderRadius:"50%", background:"rgba(201,168,76,0.15)", border:"1px solid rgba(201,168,76,0.4)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 6px" }}>
              {i===0 && <svg width="18" height="18" fill="none" stroke="#C9A84C" strokeWidth="2"><path d="M3 8.5L8 14l7-9"/></svg>}
              {i===1 && <svg width="18" height="18" fill="none" stroke="#C9A84C" strokeWidth="2"><polygon points="9,2 11,7 17,7 12,11 14,16 9,13 4,16 6,11 1,7 7,7"/></svg>}
              {i===2 && <svg width="18" height="18" fill="none" stroke="#C9A84C" strokeWidth="2"><path d="M9 2l1.5 4h4l-3.5 2.5 1.5 4L9 10l-3.5 2.5 1.5-4L3.5 6h4z"/></svg>}
            </div>
            <span style={{ color:"rgba(250,246,238,0.7)", fontSize:"0.65rem", letterSpacing:"0.1em" }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Scene2Cart() {
  const [clicked, setClicked] = useState(false);
  const [flying, setFlying] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => { setClicked(true); }, 800);
    const t2 = setTimeout(() => { setFlying(true); }, 1000);
    const t3 = setTimeout(() => { setCartBounce(true); setCount(1); }, 1400);
    const t4 = setTimeout(() => { setFlying(false); setClicked(false); }, 1800);
    const t5 = setTimeout(() => { setCartBounce(false); }, 1900);
    return () => { [t1,t2,t3,t4,t5].forEach(clearTimeout); };
  }, []);

  return (
    <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", zIndex:1 }}>
      <div style={{ display:"flex", gap:"clamp(24px,5vw,60px)", alignItems:"center", padding:"0 24px", width:"100%", maxWidth:640, justifyContent:"center" }}>
        {/* Product Card */}
        <div style={{ animation:"li-slideright 0.6s 0.2s cubic-bezier(0.34,1.56,0.64,1) both", position:"relative" }}>
          <div style={{
            background:"linear-gradient(135deg,#0f2040,#1a3a6e)",
            border:"1.5px solid rgba(201,168,76,0.4)",
            borderRadius:16,
            padding:"20px 20px 16px",
            width:"clamp(150px,35vw,200px)",
            boxShadow:"0 20px 60px rgba(0,0,0,0.5)",
          }}>
            <div style={{
              height:"clamp(90px,18vw,110px)",
              background:"linear-gradient(135deg,rgba(201,168,76,0.1),rgba(201,168,76,0.2))",
              borderRadius:10, marginBottom:12,
              display:"flex", alignItems:"center", justifyContent:"center",
              position:"relative", overflow:"hidden",
            }}>
              <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                <rect x="10" y="15" width="40" height="32" rx="4" fill="rgba(201,168,76,0.3)" stroke="#C9A84C" strokeWidth="1.5"/>
                <rect x="18" y="22" width="24" height="18" rx="2" fill="rgba(201,168,76,0.15)" stroke="#C9A84C" strokeWidth="1"/>
                <circle cx="30" cy="31" r="5" fill="#C9A84C" opacity="0.7"/>
                <line x1="10" y1="47" x2="50" y2="47" stroke="#C9A84C" strokeWidth="1" opacity="0.4"/>
              </svg>
              <div style={{ position:"absolute", top:6, right:6, background:"#C9A84C", borderRadius:4, padding:"2px 6px" }}>
                <span style={{ color:"#0A1628", fontSize:"0.6rem", fontWeight:700 }}>NEW</span>
              </div>
            </div>
            <div style={{ marginBottom:4 }}>
              <p style={{ color:"#FAF6EE", fontSize:"clamp(0.7rem,2vw,0.85rem)", fontWeight:700, margin:0, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>Premium Product</p>
              <p style={{ color:"rgba(250,246,238,0.5)", fontSize:"0.65rem", margin:"2px 0 0" }}>LIMJIBA Store</p>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
              <span style={{ color:"#C9A84C", fontWeight:800, fontSize:"clamp(0.85rem,2.5vw,1.1rem)" }}>850 MRU</span>
              <button
                style={{
                  background: clicked ? "linear-gradient(135deg,#C9A84C,#B8963F)" : "rgba(201,168,76,0.15)",
                  border:"1px solid #C9A84C",
                  color: clicked ? "#0A1628" : "#C9A84C",
                  borderRadius:8, padding:"5px 10px",
                  fontSize:"0.65rem", fontWeight:700, cursor:"pointer",
                  animation: clicked ? "li-btnclick 0.4s ease" : "none",
                  transition:"background 0.2s, color 0.2s",
                  position:"relative", zIndex:2,
                }}
              >
                + Cart
              </button>
            </div>
          </div>

          {/* Flying item */}
          {flying && (
            <div style={{
              position:"absolute", top:"40%", right:"10%",
              width:20, height:20,
              background:"linear-gradient(135deg,#C9A84C,#B8963F)",
              borderRadius:"50%",
              animation:"li-flyarc 0.8s cubic-bezier(0.25,0.46,0.45,0.94) forwards",
              zIndex:10,
            }} />
          )}
        </div>

        {/* Cart */}
        <div style={{ animation:"li-slideleft 0.6s 0.4s cubic-bezier(0.34,1.56,0.64,1) both", textAlign:"center" }}>
          <div style={{
            width:"clamp(80px,18vw,110px)", height:"clamp(80px,18vw,110px)",
            background:"linear-gradient(135deg,rgba(201,168,76,0.15),rgba(201,168,76,0.05))",
            border:"2px solid rgba(201,168,76,0.5)",
            borderRadius:20,
            display:"flex", alignItems:"center", justifyContent:"center",
            position:"relative",
            animation: cartBounce ? "li-cartbounce 0.4s ease" : "none",
            boxShadow: cartBounce ? "0 0 30px rgba(201,168,76,0.5)" : "0 0 0 rgba(0,0,0,0)",
            transition:"box-shadow 0.3s",
          }}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <path d="M4 4h5l6 20h18l4-14H12" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="18" cy="38" r="3" fill="#C9A84C"/>
              <circle cx="32" cy="38" r="3" fill="#C9A84C"/>
            </svg>
            {count > 0 && (
              <div style={{
                position:"absolute", top:-8, right:-8,
                width:22, height:22, borderRadius:"50%",
                background:"#C9A84C", color:"#0A1628",
                fontSize:"0.7rem", fontWeight:900,
                display:"flex", alignItems:"center", justifyContent:"center",
                animation:"li-scalein 0.3s cubic-bezier(0.34,1.56,0.64,1)",
              }}>{count}</div>
            )}
          </div>
          <p style={{ color:"rgba(250,246,238,0.6)", fontSize:"0.7rem", marginTop:8, letterSpacing:"0.1em" }}>YOUR CART</p>
        </div>
      </div>
      <div style={{ position:"absolute", bottom:"12%", left:"50%", transform:"translateX(-50%)", animation:"li-slideup 0.6s 1.2s both", textAlign:"center" }}>
        <p style={{ color:"#C9A84C", fontSize:"clamp(1.1rem,3vw,1.6rem)", fontWeight:800, margin:0 }}>Shop Anything. Anytime.</p>
        <p style={{ color:"rgba(250,246,238,0.5)", fontSize:"clamp(0.7rem,1.8vw,0.85rem)", margin:"6px 0 0" }}>Thousands of premium products at your fingertips</p>
      </div>
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    left: `${20 + Math.random() * 60}%`,
    color: ["#C9A84C","#FAF6EE","#0A1628","#B8963F","#ffe9a0"][i % 5],
    size: Math.random() * 8 + 5,
    delay: Math.random() * 0.5,
    dur: Math.random() * 1 + 0.8,
    rotation: Math.random() * 360,
  }));
  return (
    <div style={{ position:"absolute", top:"30%", left:0, right:0, height:"70%", pointerEvents:"none", overflow:"hidden" }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position:"absolute", left:p.left,
          width:p.size, height:p.size,
          background:p.color,
          borderRadius: p.id % 3 === 0 ? "50%" : p.id % 3 === 1 ? "2px" : "0",
          transform:`rotate(${p.rotation}deg)`,
          animation:`li-confetti ${p.dur}s ${p.delay}s ease-in forwards`,
        }} />
      ))}
    </div>
  );
}

function Scene3Checkout() {
  const [showCheck, setShowCheck] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [btnPressed, setBtnPressed] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => { setBtnPressed(true); }, 700);
    const t2 = setTimeout(() => { setShowSpinner(true); setBtnPressed(false); }, 900);
    const t3 = setTimeout(() => { setShowSpinner(false); setShowCheck(true); }, 1700);
    const t4 = setTimeout(() => { setShowConfetti(true); }, 1800);
    return () => { [t1,t2,t3,t4].forEach(clearTimeout); };
  }, []);

  return (
    <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", zIndex:1 }}>
      {showConfetti && <Confetti />}
      <div style={{ animation:"li-slideup 0.5s cubic-bezier(0.34,1.56,0.64,1) both", width:"90%", maxWidth:360 }}>
        <div style={{
          background:"linear-gradient(135deg,#0f2040,#1a3a6e)",
          border:"1.5px solid rgba(201,168,76,0.4)",
          borderRadius:20,
          padding:"24px 24px 20px",
          boxShadow:"0 30px 80px rgba(0,0,0,0.6)",
        }}>
          {/* Order summary header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, paddingBottom:12, borderBottom:"1px solid rgba(201,168,76,0.2)" }}>
            <div>
              <p style={{ color:"rgba(250,246,238,0.5)", fontSize:"0.65rem", letterSpacing:"0.15em", margin:0 }}>ORDER SUMMARY</p>
              <p style={{ color:"#FAF6EE", fontWeight:800, fontSize:"1rem", margin:"2px 0 0" }}>LIMJIBA #8942</p>
            </div>
            <div style={{ background:"rgba(201,168,76,0.15)", border:"1px solid rgba(201,168,76,0.3)", borderRadius:8, padding:"4px 10px" }}>
              <span style={{ color:"#C9A84C", fontSize:"0.65rem", fontWeight:700 }}>1 ITEM</span>
            </div>
          </div>
          {/* Item */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <div style={{ width:36, height:36, borderRadius:8, background:"rgba(201,168,76,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="18" height="18" fill="none" stroke="#C9A84C" strokeWidth="1.5"><rect x="2" y="4" width="14" height="11" rx="2"/><path d="M6 4V3a2 2 0 014 0v1"/></svg>
              </div>
              <div>
                <p style={{ color:"#FAF6EE", fontSize:"0.75rem", fontWeight:600, margin:0 }}>Premium Product</p>
                <p style={{ color:"rgba(250,246,238,0.4)", fontSize:"0.65rem", margin:0 }}>Qty: 1</p>
              </div>
            </div>
            <span style={{ color:"#C9A84C", fontWeight:700, fontSize:"0.85rem" }}>850 MRU</span>
          </div>
          {/* Total */}
          <div style={{ background:"rgba(201,168,76,0.08)", borderRadius:10, padding:"10px 14px", margin:"12px 0", display:"flex", justifyContent:"space-between" }}>
            <span style={{ color:"rgba(250,246,238,0.7)", fontSize:"0.8rem" }}>Total</span>
            <span style={{ color:"#C9A84C", fontWeight:900, fontSize:"1.1rem" }}>850 MRU</span>
          </div>
          {/* Confirm Button or Checkmark */}
          {!showCheck ? (
            <button style={{
              width:"100%",
              background: btnPressed ? "linear-gradient(135deg,#B8963F,#9a7d35)" : "linear-gradient(135deg,#C9A84C,#B8963F)",
              border:"none", borderRadius:12, padding:"13px",
              color:"#0A1628", fontWeight:800, fontSize:"0.9rem",
              cursor:"pointer", letterSpacing:"0.08em",
              transform: btnPressed ? "scale(0.97)" : "scale(1)",
              transition:"all 0.15s",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            }}>
              {showSpinner ? (
                <svg width="20" height="20" viewBox="0 0 20 20" style={{ animation:"li-spin 0.8s linear infinite" }}>
                  <circle cx="10" cy="10" r="8" stroke="rgba(10,22,40,0.3)" strokeWidth="2" fill="none"/>
                  <path d="M10 2 A8 8 0 0 1 18 10" stroke="#0A1628" strokeWidth="2" fill="none" strokeLinecap="round"/>
                </svg>
              ) : (
                <>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 8l4 4 8-8"/></svg>
                  CONFIRM ORDER
                </>
              )}
            </button>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", animation:"li-scalein 0.5s cubic-bezier(0.34,1.56,0.64,1)" }}>
              <div style={{ width:60, height:60, position:"relative", marginBottom:8 }}>
                <svg width="60" height="60" viewBox="0 0 60 60">
                  <circle cx="30" cy="30" r="27" stroke="#C9A84C" strokeWidth="3" fill="none"
                    strokeDasharray="283" strokeDashoffset="0"
                    style={{ animation:"li-circledraw 0.5s ease forwards" }}/>
                  <polyline points="17,30 26,39 44,21" stroke="#C9A84C" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"
                    strokeDasharray="100" strokeDashoffset="0"
                    style={{ animation:"li-checkdraw 0.4s 0.3s ease forwards" }}/>
                </svg>
              </div>
              <p style={{ color:"#C9A84C", fontWeight:800, fontSize:"1rem", margin:0 }}>Order Confirmed!</p>
              <p style={{ color:"rgba(250,246,238,0.5)", fontSize:"0.7rem", margin:"4px 0 0" }}>Get ready for lightning delivery ⚡</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DeliveryBike({ active }: { active: boolean }) {
  return (
    <div style={{
      position:"absolute", bottom:"28%", left:0, width:"100%",
      animation: active ? "li-bikespeed 3.8s cubic-bezier(0.2,0,0.8,1) forwards" : "none",
      pointerEvents:"none",
    }}>
      {/* Speed lines */}
      {active && Array.from({length: 6}, (_,i) => (
        <div key={i} style={{
          position:"absolute",
          right:`calc(100% + ${10 + i*15}px)`,
          top:`${20 + i*12}%`,
          width:`${60 + i*20}px`,
          height:2,
          background:"linear-gradient(90deg,transparent,rgba(201,168,76,0.8))",
          borderRadius:2,
          transformOrigin:"right center",
          animation:`li-speedline 0.4s ${i*0.05}s ease-out infinite`,
        }} />
      ))}

      {/* Exhaust puff */}
      {active && (
        <div style={{
          position:"absolute", right:"calc(100% + 5px)", top:"40%",
          width:30, height:14,
          background:"rgba(250,246,238,0.15)",
          borderRadius:"50%",
          animation:"li-exhaust 0.5s ease-out infinite",
          transformOrigin:"left center",
        }} />
      )}

      {/* Motorbike SVG */}
      <svg width="200" height="110" viewBox="0 0 200 110" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ filter:"drop-shadow(0 10px 30px rgba(0,0,0,0.7))", display:"block" }}>
        {/* Rear wheel */}
        <circle cx="42" cy="80" r="26" stroke="#C9A84C" strokeWidth="4" fill="#060B14"/>
        <circle cx="42" cy="80" r="12" stroke="rgba(201,168,76,0.5)" strokeWidth="2" fill="none"/>
        <circle cx="42" cy="80" r="3" fill="#C9A84C"/>
        {/* Spokes */}
        {[0,45,90,135].map(a => (
          <line key={a}
            x1={42 + 12*Math.cos(a*Math.PI/180)} y1={80 + 12*Math.sin(a*Math.PI/180)}
            x2={42 + 23*Math.cos(a*Math.PI/180)} y2={80 + 23*Math.sin(a*Math.PI/180)}
            stroke="rgba(201,168,76,0.6)" strokeWidth="1.5"
            style={{ animation:"li-wheelroll 0.6s linear infinite" }}
          />
        ))}
        {/* Rear wheel */}
        <circle cx="158" cy="80" r="26" stroke="#C9A84C" strokeWidth="4" fill="#060B14"/>
        <circle cx="158" cy="80" r="12" stroke="rgba(201,168,76,0.5)" strokeWidth="2" fill="none"/>
        <circle cx="158" cy="80" r="3" fill="#C9A84C"/>
        {[0,45,90,135].map(a => (
          <line key={a}
            x1={158 + 12*Math.cos(a*Math.PI/180)} y1={80 + 12*Math.sin(a*Math.PI/180)}
            x2={158 + 23*Math.cos(a*Math.PI/180)} y2={80 + 23*Math.sin(a*Math.PI/180)}
            stroke="rgba(201,168,76,0.6)" strokeWidth="1.5"
            style={{ animation:"li-wheelroll 0.6s linear infinite" }}
          />
        ))}
        {/* Frame body */}
        <path d="M42 56 L80 44 L140 44 L158 56 L158 80 L42 80 Z" fill="#0A1628" stroke="#C9A84C" strokeWidth="2"/>
        {/* Engine block */}
        <rect x="75" y="52" width="50" height="24" rx="4" fill="#132240" stroke="rgba(201,168,76,0.4)" strokeWidth="1"/>
        {/* Exhaust pipe */}
        <path d="M42 70 L20 70 L16 78" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round"/>
        {/* Front fork */}
        <path d="M150 56 L165 68 L158 80" stroke="#C9A84C" strokeWidth="3" strokeLinecap="round"/>
        {/* Handlebar */}
        <path d="M140 44 L148 32 L158 34" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round"/>
        {/* Seat */}
        <path d="M80 44 L120 44 L118 36 L82 36 Z" fill="#C9A84C" opacity="0.8"/>
        {/* Rider body */}
        <path d="M100 36 L110 16 L125 20 L118 36 Z" fill="#0A1628" stroke="#C9A84C" strokeWidth="1.5"/>
        {/* Rider helmet */}
        <circle cx="113" cy="13" r="12" fill="#C9A84C"/>
        <ellipse cx="113" cy="16" rx="10" ry="7" fill="#0A1628"/>
        <path d="M105 12 Q113 6 121 12" stroke="#C9A84C" strokeWidth="1" fill="none"/>
        {/* Rider arm */}
        <path d="M118 24 L148 32" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round"/>
        {/* Headlight */}
        <ellipse cx="164" cy="58" rx="6" ry="4" fill="#C9A84C" opacity="0.9"/>
        <path d="M170 54 L186 50 M170 58 L190 58 M170 62 L186 66" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      </svg>

      {/* Package on back */}
      <div style={{
        position:"absolute", right:68, bottom:30,
        animation:"li-packagebounce 0.3s ease-in-out infinite",
      }}>
        <svg width="44" height="40" viewBox="0 0 44 40" fill="none">
          <rect x="2" y="8" width="40" height="30" rx="4" fill="#C9A84C"/>
          <rect x="2" y="8" width="40" height="10" rx="4" fill="#B8963F"/>
          <line x1="22" y1="8" x2="22" y2="38" stroke="#0A1628" strokeWidth="2"/>
          <line x1="2" y1="20" x2="42" y2="20" stroke="#0A1628" strokeWidth="2"/>
          <text x="22" y="34" textAnchor="middle" fill="#0A1628" fontSize="8" fontWeight="bold">LMJ</text>
        </svg>
      </div>
    </div>
  );
}

function Scene4Delivery() {
  const [bikeActive, setBikeActive] = useState(false);
  const stars = Array.from({length:30}, (_,i) => ({
    id:i, x:`${Math.random()*100}%`, y:`${Math.random()*50}%`,
    size: Math.random()*3+1,
    delay: Math.random()*3, dur: Math.random()*2+1,
  }));

  useEffect(() => {
    const t = setTimeout(() => setBikeActive(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ position:"absolute", inset:0, overflow:"hidden", zIndex:1 }}>
      {/* Night sky */}
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg,#02060e 0%,#0A1628 60%,#0d1e3a 100%)" }}>
        {stars.map(s => (
          <div key={s.id} style={{
            position:"absolute", left:s.x, top:s.y,
            width:s.size, height:s.size, borderRadius:"50%",
            background:"#FAF6EE",
            animation:`li-star ${s.dur}s ${s.delay}s ease-in-out infinite`,
          }} />
        ))}
        {/* Moon */}
        <div style={{ position:"absolute", top:"8%", right:"12%", width:44, height:44 }}>
          <svg width="44" height="44"><circle cx="22" cy="22" r="20" fill="rgba(201,168,76,0.15)" stroke="rgba(201,168,76,0.4)" strokeWidth="1.5"/><circle cx="28" cy="18" r="14" fill="#02060e"/></svg>
        </div>
      </div>

      {/* Road */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"32%", background:"linear-gradient(180deg,#0d1e3a,#060B14)", borderTop:"2px solid rgba(201,168,76,0.3)" }}>
        {/* Road markings */}
        <div style={{ position:"absolute", top:"50%", left:0, right:0, height:3, overflow:"hidden" }}>
          <div style={{ display:"flex", gap:40, animation:"li-road 1s linear infinite", whiteSpace:"nowrap" }}>
            {Array.from({length:20}, (_,i) => (
              <div key={i} style={{ width:60, height:3, background:"rgba(201,168,76,0.4)", flexShrink:0 }} />
            ))}
          </div>
        </div>
        {/* City silhouette */}
        <div style={{ position:"absolute", top:-60, left:0, right:0, height:60, overflow:"hidden" }}>
          <svg width="100%" height="60" viewBox="0 0 800 60" preserveAspectRatio="none">
            <path d="M0 60 L0 40 L30 40 L30 20 L50 20 L50 10 L60 10 L60 20 L80 20 L80 30 L100 30 L100 10 L110 10 L110 0 L120 0 L120 10 L130 10 L130 30 L160 30 L160 40 L180 40 L180 20 L190 20 L190 15 L200 15 L200 20 L220 20 L220 40 L250 40 L250 25 L260 25 L260 5 L270 5 L270 25 L280 25 L280 40 L310 40 L310 30 L330 30 L330 20 L350 20 L350 15 L360 15 L360 20 L380 20 L380 30 L400 30 L400 40 L430 40 L430 20 L440 20 L440 10 L450 10 L450 20 L470 20 L470 35 L500 35 L500 25 L520 25 L520 15 L530 15 L530 25 L550 25 L550 40 L580 40 L580 30 L600 30 L600 20 L610 20 L610 10 L620 10 L620 20 L640 20 L640 30 L660 30 L660 40 L700 40 L700 20 L720 20 L720 5 L730 5 L730 20 L750 20 L750 40 L800 40 L800 60 Z"
              fill="rgba(10,22,40,0.8)" stroke="rgba(201,168,76,0.15)" strokeWidth="0.5"/>
            {/* Windows */}
            {[55,115,195,265,345,445,525,615,725].map((x,i) => (
              <rect key={i} x={x} y={i%2===0?15:5} width="5" height="5" fill="rgba(201,168,76,0.4)"/>
            ))}
          </svg>
        </div>
      </div>

      <DeliveryBike active={bikeActive} />

      {/* Text overlay */}
      <div style={{ position:"absolute", top:"8%", left:"50%", transform:"translateX(-50%)", textAlign:"center", animation:"li-slidedown 0.6s 0.3s both", whiteSpace:"nowrap" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:4 }}>
          <span style={{ fontSize:"1.5rem" }}>⚡</span>
          <h2 style={{ color:"#C9A84C", fontSize:"clamp(1.2rem,3.5vw,2rem)", fontWeight:900, margin:0, letterSpacing:"0.05em" }}>Express Delivery</h2>
          <span style={{ fontSize:"1.5rem" }}>⚡</span>
        </div>
        <p style={{ color:"rgba(250,246,238,0.6)", fontSize:"clamp(0.7rem,1.8vw,0.9rem)", margin:0 }}>Your order races to your door at lightning speed</p>
      </div>

      {/* Speed indicator */}
      {bikeActive && (
        <div style={{ position:"absolute", bottom:"36%", left:"50%", transform:"translateX(-50%)", animation:"li-fadein 0.4s 1.5s both" }}>
          <div style={{ display:"flex", gap:6 }}>
            {["🏁","🚀","⚡"].map((e,i) => (
              <span key={i} style={{ fontSize:"1.4rem", animation:`li-float ${0.8 + i*0.2}s ${i*0.1}s ease-in-out infinite` }}>{e}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Scene5Welcome() {
  return (
    <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", zIndex:1 }}>
      <Particles />
      <div style={{ animation:"li-scalein 0.6s cubic-bezier(0.34,1.56,0.64,1) both", textAlign:"center" }}>
        <div style={{ marginBottom:16 }}>
          <span style={{ color:"rgba(201,168,76,0.6)", fontSize:"clamp(0.7rem,1.5vw,0.85rem)", letterSpacing:"0.3em", textTransform:"uppercase" }}>Welcome to</span>
        </div>
        <h1 className="li-shimmer-text" style={{ fontSize:"clamp(3rem,9vw,6rem)", fontWeight:900, letterSpacing:"0.15em", margin:0, lineHeight:1 }}>
          LIMJIBA
        </h1>
        <p style={{ color:"rgba(250,246,238,0.6)", fontSize:"clamp(0.75rem,1.8vw,1rem)", letterSpacing:"0.2em", margin:"10px 0 0" }}>
          لمجيبة &nbsp;·&nbsp; Mauritania's Premium Store
        </p>
      </div>
      <div style={{ animation:"li-slideup 0.5s 0.4s both", marginTop:36 }}>
        <div style={{
          background:"linear-gradient(135deg,#C9A84C,#B8963F)",
          borderRadius:14, padding:"14px 48px",
          color:"#0A1628", fontWeight:900, fontSize:"clamp(0.9rem,2.5vw,1.1rem)",
          letterSpacing:"0.12em", textTransform:"uppercase",
          boxShadow:"0 0 40px rgba(201,168,76,0.5)",
          animation:"li-pulse 1.5s ease-in-out infinite",
        }}>
          Discover Now →
        </div>
      </div>
      <div style={{ animation:"li-fadein 0.5s 0.8s both", marginTop:24, display:"flex", gap:20, flexWrap:"wrap", justifyContent:"center" }}>
        {["🛍️ 500+ Products","⚡ Fast Delivery","🌟 Premium Quality","🔒 Secure Payment"].map((v,i) => (
          <span key={i} style={{ color:"rgba(201,168,76,0.7)", fontSize:"clamp(0.65rem,1.5vw,0.78rem)" }}>{v}</span>
        ))}
      </div>
    </div>
  );
}

const SCENES: Array<{ id:number; label:string; duration:number; Component: React.FC }> = [
  { id:0, label:"Brand",    duration:2400,  Component:Scene1Brand    },
  { id:1, label:"Cart",     duration:3000,  Component:Scene2Cart     },
  { id:2, label:"Checkout", duration:2600,  Component:Scene3Checkout },
  { id:3, label:"Delivery", duration:4200,  Component:Scene4Delivery },
  { id:4, label:"Welcome",  duration:2000,  Component:Scene5Welcome  },
];

export function StoreMarketingIntro({ onDone }: { onDone: () => void }) {
  const [scene, setScene] = useState(0);
  const [fading, setFading] = useState(false);
  const [closing, setClosing] = useState(false);
  const timeouts = useRef<NodeJS.Timeout[]>([]);

  const dismiss = () => {
    setClosing(true);
    localStorage.setItem(STORAGE_KEY, "1");
    setTimeout(onDone, 600);
  };

  useEffect(() => {
    injectStyles();
    let accumulated = 0;
    SCENES.forEach((s, i) => {
      if (i === SCENES.length - 1) {
        const t = setTimeout(() => { dismiss(); }, accumulated + s.duration);
        timeouts.current.push(t);
      } else {
        const fadeAt = accumulated + s.duration - 350;
        const nextAt = accumulated + s.duration;
        const t1 = setTimeout(() => setFading(true), fadeAt);
        const t2 = setTimeout(() => { setScene(i + 1); setFading(false); }, nextAt);
        timeouts.current.push(t1, t2);
        accumulated += s.duration;
      }
    });
    return () => timeouts.current.forEach(clearTimeout);
  }, []);

  const CurrentScene = SCENES[scene].Component;
  const totalScene = SCENES.reduce((a, s) => a + s.duration, 0);
  const elapsed = SCENES.slice(0, scene).reduce((a, s) => a + s.duration, 0);
  const progress = (elapsed / totalScene) * 100;

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:99999,
      background:"#02060e",
      display:"flex", flexDirection:"column",
      overflow:"hidden",
      opacity: closing ? 0 : 1,
      transition: closing ? "opacity 0.6s ease" : "none",
    }}>
      {/* Animated grid overlay */}
      <div style={{
        position:"absolute", inset:0, pointerEvents:"none",
        backgroundImage:"linear-gradient(rgba(201,168,76,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.03) 1px,transparent 1px)",
        backgroundSize:"40px 40px",
      }} />

      {/* Gold vignette corners */}
      <div style={{ position:"absolute", top:0, left:0, width:200, height:200, background:"radial-gradient(circle at 0 0,rgba(201,168,76,0.08),transparent 70%)", pointerEvents:"none" }} />
      <div style={{ position:"absolute", bottom:0, right:0, width:200, height:200, background:"radial-gradient(circle at 100% 100%,rgba(201,168,76,0.08),transparent 70%)", pointerEvents:"none" }} />

      {/* Scene with fade transition */}
      <div style={{
        flex:1, position:"relative",
        opacity: fading ? 0 : 1,
        transition:"opacity 0.35s ease",
      }}>
        <CurrentScene />
      </div>

      {/* Bottom bar: scene dots + progress + skip */}
      <div style={{ padding:"12px 20px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, zIndex:2 }}>
        {/* Scene indicators */}
        <div style={{ display:"flex", gap:6 }}>
          {SCENES.map((s, i) => (
            <div key={s.id} style={{
              height:3,
              width: i === scene ? 24 : 8,
              borderRadius:2,
              background: i <= scene ? "#C9A84C" : "rgba(201,168,76,0.25)",
              transition:"width 0.3s ease, background 0.3s ease",
              position:"relative", overflow:"hidden",
            }}>
              {i === scene && (
                <div style={{
                  position:"absolute", inset:0,
                  background:"linear-gradient(90deg,#C9A84C,#FAF6EE)",
                  animation:`li-countdown ${SCENES[scene].duration}ms linear forwards`,
                }} />
              )}
            </div>
          ))}
        </div>

        {/* Label */}
        <span style={{ color:"rgba(201,168,76,0.5)", fontSize:"0.65rem", letterSpacing:"0.15em", flex:1, textAlign:"center" }}>
          {SCENES[scene].label.toUpperCase()}
        </span>

        {/* Skip */}
        <button
          onClick={dismiss}
          style={{
            background:"rgba(201,168,76,0.1)",
            border:"1px solid rgba(201,168,76,0.3)",
            color:"rgba(201,168,76,0.8)",
            borderRadius:8, padding:"6px 14px",
            fontSize:"0.72rem", cursor:"pointer", letterSpacing:"0.08em",
            transition:"background 0.2s, color 0.2s",
          }}
          onMouseEnter={e => { (e.target as HTMLElement).style.background="rgba(201,168,76,0.2)"; (e.target as HTMLElement).style.color="#C9A84C"; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.background="rgba(201,168,76,0.1)"; (e.target as HTMLElement).style.color="rgba(201,168,76,0.8)"; }}
        >
          SKIP →
        </button>
      </div>

      {/* Top border glow */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,transparent,#C9A84C,transparent)", pointerEvents:"none" }} />
    </div>
  );
}

export function useMarketingIntro() {
  const [show, setShow] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setShow(true);
    } else {
      setDone(true);
    }
  }, []);

  const handleDone = () => {
    setShow(false);
    setDone(true);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  return { show, done, handleDone };
}
