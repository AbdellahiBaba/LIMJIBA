import { useState, useEffect, useRef } from "react";

interface SvgLogoAnimationProps {
  size?: number;
  primaryColor?: string;
  accentColor?: string;
}

let idCounter = 0;

export function SvgLogoAnimation({
  size = 280,
  primaryColor = "#0A1628",
  accentColor = "#C9A84C",
}: SvgLogoAnimationProps) {
  const [visible, setVisible] = useState(false);
  const idRef = useRef<string>("");
  if (!idRef.current) {
    idRef.current = "svglogo" + (++idCounter);
  }

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return <div style={{ width: size, height: size }} />;

  const id = idRef.current;

  return (
    <div
      className="mx-auto flex items-center justify-center"
      style={{ width: size, height: size }}
      data-testid="svg-logo-animation-container"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 800 800"
        preserveAspectRatio="xMidYMid meet"
        width={size}
        height={size}
      >
        <defs>
          <filter id={`${id}-glowN`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="b"/>
            <feFlood floodColor="#1B3A5C" floodOpacity="0.5" result="c"/>
            <feComposite in="c" in2="b" operator="in" result="g"/>
            <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id={`${id}-glowG`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="b"/>
            <feFlood floodColor={accentColor} floodOpacity="0.6" result="c"/>
            <feComposite in="c" in2="b" operator="in" result="g"/>
            <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id={`${id}-organic`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="2" seed="3" result="n">
              <animate attributeName="seed" values="1;5;1" dur="8s" repeatCount="indefinite"/>
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="n" scale="1.5" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
          <linearGradient id={`${id}-goldG`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#B8963F"/>
            <stop offset="50%" stopColor="#D4B55A"/>
            <stop offset="100%" stopColor={accentColor}/>
          </linearGradient>
          <linearGradient id={`${id}-navyG`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1B3A5C"/>
            <stop offset="100%" stopColor={primaryColor}/>
          </linearGradient>
          <clipPath id={`${id}-mapC`}>
            <rect x="180" y="120" width="440" height="300" rx="10"/>
          </clipPath>
        </defs>

        <style>{`
          @keyframes ${id}-draw {
            from { stroke-dashoffset: var(--dl); }
            to   { stroke-dashoffset: 0; }
          }
          @keyframes ${id}-fadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @keyframes ${id}-fill {
            0%   { fill-opacity: 0; stroke-opacity: 1; }
            100% { fill-opacity: 1; stroke-opacity: 0.2; }
          }
          @keyframes ${id}-mapF {
            0%   { opacity: 0; transform: scale(0.95); }
            100% { opacity: 1; transform: scale(1); }
          }
          @keyframes ${id}-float {
            0%, 100% { transform: translateY(0); }
            50%      { transform: translateY(-3px); }
          }
          @keyframes ${id}-planeE {
            0%   { stroke-dashoffset: var(--dl); transform: translateX(-10px); }
            100% { stroke-dashoffset: 0; transform: translateX(0); }
          }
          @keyframes ${id}-shimmer {
            0%   { filter: brightness(1); }
            50%  { filter: brightness(1.15); }
            100% { filter: brightness(1); }
          }
          @keyframes ${id}-pulse {
            0%, 100% { opacity: 0.4; }
            50%      { opacity: 0.8; }
          }
          .${id}-wm {
            opacity: 0;
            animation: ${id}-mapF 2s ease-out 0.3s forwards;
          }
          .${id}-as {
            --dl: 1200;
            stroke-dasharray: var(--dl);
            stroke-dashoffset: var(--dl);
            fill-opacity: 0;
            animation: ${id}-draw 1.8s cubic-bezier(0.4,0,0.2,1) 0.8s forwards, ${id}-fill 1.2s ease 2.6s forwards;
          }
          .${id}-cb {
            --dl: 2000;
            stroke-dasharray: var(--dl);
            stroke-dashoffset: var(--dl);
            fill-opacity: 0;
            animation: ${id}-draw 2s cubic-bezier(0.4,0,0.2,1) 1.5s forwards, ${id}-fill 1.2s ease 3.5s forwards;
          }
          .${id}-ch {
            --dl: 800;
            stroke-dasharray: var(--dl);
            stroke-dashoffset: var(--dl);
            fill-opacity: 0;
            animation: ${id}-draw 1.2s cubic-bezier(0.4,0,0.2,1) 2s forwards, ${id}-fill 1.2s ease 3.5s forwards;
          }
          .${id}-ri {
            --dl: 600;
            stroke-dasharray: var(--dl);
            stroke-dashoffset: var(--dl);
            fill-opacity: 0;
            animation: ${id}-draw 1s cubic-bezier(0.4,0,0.2,1) 2.3s forwards, ${id}-fill 1.2s ease 3.5s forwards;
          }
          .${id}-ab {
            --dl: 1500;
            stroke-dasharray: var(--dl);
            stroke-dashoffset: var(--dl);
            fill-opacity: 0;
            animation: ${id}-planeE 1.5s cubic-bezier(0.4,0,0.2,1) 3s forwards, ${id}-fill 1s ease 4.5s forwards;
          }
          .${id}-aw {
            --dl: 800;
            stroke-dasharray: var(--dl);
            stroke-dashoffset: var(--dl);
            fill-opacity: 0;
            animation: ${id}-draw 1s cubic-bezier(0.4,0,0.2,1) 3.5s forwards, ${id}-fill 1s ease 4.5s forwards;
          }
          .${id}-gb {
            --dl: 600;
            stroke-dasharray: var(--dl);
            stroke-dashoffset: var(--dl);
            fill-opacity: 0;
            animation: ${id}-draw 1s cubic-bezier(0.4,0,0.2,1) 4.2s forwards, ${id}-fill 0.8s ease 5.2s forwards;
          }
          .${id}-at {
            --dl: 3000;
            stroke-dasharray: var(--dl);
            stroke-dashoffset: var(--dl);
            fill-opacity: 0;
            animation: ${id}-draw 2.5s cubic-bezier(0.4,0,0.2,1) 4.8s forwards, ${id}-fill 1.2s ease 7.3s forwards;
          }
          .${id}-it {
            --dl: 2000;
            stroke-dasharray: var(--dl);
            stroke-dashoffset: var(--dl);
            fill-opacity: 0;
            animation: ${id}-draw 2s cubic-bezier(0.4,0,0.2,1) 6.5s forwards, ${id}-fill 1s ease 8.5s forwards;
          }
          .${id}-itf {
            opacity: 0;
            animation: ${id}-fadeIn 1.5s ease 8.5s forwards, ${id}-shimmer 4s ease-in-out 10s infinite;
          }
          .${id}-fg {
            opacity: 0;
            animation: ${id}-fadeIn 2s ease 8s forwards, ${id}-pulse 4s ease-in-out 10s infinite;
          }
          .${id}-lg {
            animation: ${id}-float 6s ease-in-out 9s infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .${id}-wm, .${id}-as, .${id}-cb, .${id}-ch, .${id}-ri,
            .${id}-ab, .${id}-aw, .${id}-gb, .${id}-at, .${id}-it,
            .${id}-itf, .${id}-fg, .${id}-lg {
              animation: none !important;
              opacity: 1 !important;
              fill-opacity: 1 !important;
              stroke-dashoffset: 0 !important;
              transform: none !important;
            }
          }
        `}</style>

        <g className={`${id}-lg`} filter={`url(#${id}-organic)`}>

          {/* World Map Dots */}
          <g className={`${id}-wm`} clipPath={`url(#${id}-mapC)`} opacity="0.3">
            {/* North America */}
            <g fill={accentColor} opacity="0.4">
              {[[240,180],[248,178],[256,176],[235,190],[243,188],[251,186],[259,184],[230,200],[238,198],[246,196],[254,194],[262,196],[228,210],[236,208],[244,206],[252,208],[260,210],[232,220],[240,218],[248,216],[256,218],[236,230],[244,228],[252,230],[242,240],[250,242],[246,252],[254,254],[250,262],[258,264]].map(([cx,cy],i)=>(
                <circle key={`na${i}`} cx={cx} cy={cy} r={2.5}/>
              ))}
            </g>
            {/* South America */}
            <g fill={accentColor} opacity="0.35">
              {[[278,280],[286,282],[280,290],[288,292],[296,290],[282,300],[290,302],[298,300],[284,310],[292,312],[286,320],[294,322],[288,330],[296,332],[290,340],[298,338],[292,350],[290,360],[288,370]].map(([cx,cy],i)=>(
                <circle key={`sa${i}`} cx={cx} cy={cy} r={2.5}/>
              ))}
            </g>
            {/* Europe */}
            <g fill={accentColor} opacity="0.4">
              {[[370,160],[378,158],[386,160],[365,170],[373,168],[381,166],[389,168],[397,170],[360,180],[368,178],[376,176],[384,178],[392,180],[400,178],[365,190],[373,188],[381,190],[389,192],[397,190],[370,200],[378,198],[386,200],[394,202],[375,210],[383,212]].map(([cx,cy],i)=>(
                <circle key={`eu${i}`} cx={cx} cy={cy} r={2.5}/>
              ))}
            </g>
            {/* Africa */}
            <g fill={accentColor} opacity="0.45">
              {[[380,225],[388,223],[396,225],[404,223],[375,235],[383,233],[391,235],[399,237],[407,235],[378,245],[386,243],[394,245],[402,247],[410,245],[382,255],[390,253],[398,255],[406,257],[386,265],[394,263],[402,265],[390,275],[398,273],[392,285],[400,283],[394,295],[402,293],[396,305],[398,315],[396,325],[394,335]].map(([cx,cy],i)=>(
                <circle key={`af${i}`} cx={cx} cy={cy} r={2.5}/>
              ))}
            </g>
            {/* Asia */}
            <g fill={accentColor} opacity="0.4">
              {[[420,170],[428,168],[436,170],[444,168],[452,170],[460,172],[415,180],[423,178],[431,180],[439,178],[447,180],[455,182],[463,180],[471,182],[418,190],[426,188],[434,190],[442,188],[450,190],[458,192],[466,190],[474,192],[482,190],[420,200],[428,198],[436,200],[444,202],[452,200],[460,202],[468,200],[476,202],[484,200],[492,198],[425,210],[433,208],[441,210],[449,212],[457,210],[465,212],[473,210],[481,212],[489,210],[497,208],[505,210],[430,220],[438,218],[446,220],[454,222],[462,220],[470,222],[478,220],[486,222],[494,220],[502,218],[510,220],[518,222],[440,230],[448,228],[456,230],[464,232],[472,230],[480,232],[488,230],[496,228],[504,230],[512,228],[520,230],[528,232],[536,230],[455,240],[463,238],[471,240],[479,238],[487,240],[495,238],[503,240],[511,238],[519,240],[527,238],[535,240],[543,242],[475,250],[483,248],[491,250],[499,248],[507,250],[515,248],[523,250],[531,248],[539,250],[547,252],[495,260],[503,258],[511,260],[519,258],[527,260],[535,258],[543,260],[505,270],[513,268],[521,270],[529,268],[537,270]].map(([cx,cy],i)=>(
                <circle key={`as${i}`} cx={cx} cy={cy} r={2.5}/>
              ))}
            </g>
            {/* Australia */}
            <g fill={accentColor} opacity="0.3">
              {[[530,310],[538,308],[546,310],[554,312],[525,320],[533,318],[541,320],[549,318],[557,320],[528,330],[536,328],[544,330],[552,328],[532,340],[540,338],[548,340],[538,350],[546,348]].map(([cx,cy],i)=>(
                <circle key={`au${i}`} cx={cx} cy={cy} r={2.5}/>
              ))}
            </g>
          </g>

          {/* Angular Shape Behind Camel */}
          <path className={`${id}-as`}
            d="M 310 170 L 420 140 L 490 165 L 480 200 L 440 250 L 380 300 L 310 330 L 285 290 L 290 230 Z"
            fill={`url(#${id}-navyG)`} stroke="#1B3A5C" strokeWidth="2"
            filter={`url(#${id}-glowN)`}/>

          {/* Camel Body */}
          <path className={`${id}-cb`}
            d="M 330 380 C 325 370 320 355 322 340 L 325 320 C 326 310 330 300 340 295 L 355 285 C 360 282 365 280 370 278 L 380 275 C 385 273 390 272 395 275 L 405 280 C 412 284 418 290 422 298 L 430 315 C 435 325 438 338 436 350 L 434 365 C 432 375 428 382 420 388 L 415 392 C 418 405 420 418 418 425 L 415 440 C 414 445 412 448 408 450 L 402 452 L 398 440 L 396 425 L 392 410 C 388 405 382 402 378 405 L 372 410 L 368 425 L 365 440 L 362 452 L 356 450 C 354 448 352 445 352 440 L 350 425 L 348 410 C 345 400 340 395 335 392 L 332 395 L 330 410 L 328 425 L 326 440 L 324 452 L 318 450 C 316 448 315 445 315 440 L 316 425 L 318 410 L 322 395 L 325 385 Z"
            fill={primaryColor} stroke="#1B3A5C" strokeWidth="1.5"
            filter={`url(#${id}-glowN)`}/>

          {/* Camel Neck and Head */}
          <path className={`${id}-ch`}
            d="M 340 295 C 338 285 335 275 332 265 L 328 250 C 326 240 325 230 328 222 L 332 212 C 334 208 338 205 342 203 L 350 200 C 355 198 360 198 362 202 L 358 210 C 355 215 352 220 352 228 L 354 240 C 355 248 358 258 360 265 L 365 278"
            fill={primaryColor} stroke="#1B3A5C" strokeWidth="1.5"
            filter={`url(#${id}-glowN)`}/>

          {/* Camel Ear */}
          <path className={`${id}-ch`}
            d="M 342 203 L 338 192 C 337 188 339 185 342 186 L 346 190 L 350 200"
            fill={primaryColor} stroke="#1B3A5C" strokeWidth="1.2"/>

          {/* Rider on Camel */}
          <g filter={`url(#${id}-glowN)`}>
            <path className={`${id}-ri`}
              d="M 365 270 C 362 260 358 248 356 238 L 354 225 C 353 218 355 210 360 205 L 368 198 C 372 195 378 194 382 196 L 388 200 C 392 204 394 210 393 218 L 390 230 C 388 242 384 255 380 265 Z"
              fill={primaryColor} stroke="#1B3A5C" strokeWidth="1.2"/>
            <circle className={`${id}-ri`} cx={375} cy={188} r={12}
              fill={primaryColor} stroke="#1B3A5C" strokeWidth="1.2"/>
          </g>

          {/* Airplane Fuselage */}
          <path className={`${id}-ab`}
            d="M 310 340 L 340 330 L 380 320 L 420 312 L 460 308 L 500 306 L 530 305 L 550 304 C 558 304 565 306 568 310 L 570 314 C 570 318 567 322 560 324 L 540 326 L 510 328 L 470 330 L 430 334 L 390 340 L 350 348 L 310 358 Z"
            fill={primaryColor} stroke="#1B3A5C" strokeWidth="1.5"
            filter={`url(#${id}-glowN)`}/>

          {/* Airplane Nose */}
          <path className={`${id}-ab`}
            d="M 568 310 L 590 308 C 598 308 602 312 598 316 L 590 318 L 570 314"
            fill={primaryColor} stroke="#1B3A5C" strokeWidth="1"/>

          {/* Airplane Wings */}
          <path className={`${id}-aw`}
            d="M 440 314 L 445 290 L 455 275 L 465 268 L 470 270 L 462 285 L 455 305"
            fill={primaryColor} stroke="#1B3A5C" strokeWidth="1.2"/>
          <path className={`${id}-aw`}
            d="M 440 332 L 445 350 L 452 360 L 460 364 L 464 362 L 458 350 L 450 335"
            fill={primaryColor} stroke="#1B3A5C" strokeWidth="1.2"/>

          {/* Airplane Tail */}
          <path className={`${id}-aw`}
            d="M 320 335 L 310 318 L 305 310 L 308 308 L 318 318 L 325 332"
            fill={primaryColor} stroke="#1B3A5C" strokeWidth="1.2"/>

          {/* Engine Nacelles */}
          <ellipse className={`${id}-ab`} cx={470} cy={308} rx={8} ry={4}
            fill={primaryColor} stroke="#1B3A5C" strokeWidth="0.8"/>
          <ellipse className={`${id}-ab`} cx={470} cy={332} rx={8} ry={4}
            fill={primaryColor} stroke="#1B3A5C" strokeWidth="0.8"/>

          {/* Ground Base */}
          <path className={`${id}-gb`}
            d="M 270 458 Q 380 468 490 458"
            fill="none" stroke={primaryColor} strokeWidth="6" strokeLinecap="round"/>
          <path className={`${id}-gb`}
            d="M 290 462 Q 380 470 470 462"
            fill="none" stroke="#1B3A5C" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>

          {/* Arabic Text: لمجيبة */}
          <g transform="translate(400, 530)" filter={`url(#${id}-glowN)`}>
            <path className={`${id}-at`}
              d="M 115 0 L 115 -55 C 115 -62 112 -66 107 -66 L 100 -62 L 100 -10 C 100 -4 96 0 90 2"
              fill="none" stroke={primaryColor} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
            <path className={`${id}-at`}
              d="M 85 2 C 78 5 70 6 62 4 C 55 2 50 -4 50 -12 C 50 -20 55 -26 62 -28 C 68 -30 75 -28 80 -24 L 82 -18 C 82 -12 78 -8 72 -8 C 68 -8 64 -10 62 -14"
              fill="none" stroke={primaryColor} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
            <path className={`${id}-at`}
              d="M 45 -2 C 38 2 28 4 18 2 C 8 -2 2 -10 2 -20 C 2 -30 8 -38 18 -40 C 28 -40 35 -36 40 -30 L 42 -22 C 42 -14 38 -8 32 -6"
              fill="none" stroke={primaryColor} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
            <circle className={`${id}-at`} cx={22} cy={10} r={4} fill={primaryColor} stroke={primaryColor} strokeWidth="1"/>
            <path className={`${id}-at`}
              d="M -5 0 C -12 4 -22 6 -32 4 C -42 0 -48 -8 -48 -18 L -48 -30 C -48 -38 -44 -44 -38 -46 L -30 -44 L -28 -35 C -28 -28 -32 -22 -38 -20"
              fill="none" stroke={primaryColor} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
            <circle className={`${id}-at`} cx={-35} cy={14} r={3.5} fill={primaryColor} stroke={primaryColor} strokeWidth="1"/>
            <circle className={`${id}-at`} cx={-45} cy={14} r={3.5} fill={primaryColor} stroke={primaryColor} strokeWidth="1"/>
            <path className={`${id}-at`}
              d="M -55 -2 C -62 4 -72 6 -82 4 C -92 0 -98 -6 -100 -14 C -100 -22 -95 -28 -88 -30 L -78 -28 C -72 -24 -68 -18 -68 -10 L -70 -2"
              fill="none" stroke={primaryColor} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
            <circle className={`${id}-at`} cx={-82} cy={14} r={4} fill={primaryColor} stroke={primaryColor} strokeWidth="1"/>
            <path className={`${id}-at`}
              d="M -108 0 C -112 4 -120 6 -128 4 C -136 0 -140 -8 -140 -18 C -140 -28 -136 -36 -128 -38 C -120 -38 -114 -34 -110 -28 L -108 -18 C -108 -10 -112 -4 -118 -2"
              fill="none" stroke={primaryColor} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
            <circle className={`${id}-at`} cx={-120} cy={-46} r={3.5} fill={primaryColor} stroke={primaryColor} strokeWidth="1"/>
            <circle className={`${id}-at`} cx={-130} cy={-46} r={3.5} fill={primaryColor} stroke={primaryColor} strokeWidth="1"/>
            <path className={`${id}-at`}
              d="M 90 2 L -108 0"
              fill="none" stroke={primaryColor} strokeWidth="7" strokeLinecap="round"/>
          </g>

          {/* IMPORTING Text */}
          <g transform="translate(400, 590)">
            <text className={`${id}-it`}
              x="0" y="0" textAnchor="middle"
              fontFamily="'Montserrat', 'Segoe UI', Arial, sans-serif"
              fontSize="28" fontWeight="700" letterSpacing="12"
              fill={`url(#${id}-goldG)`} stroke={accentColor} strokeWidth="0.8"
              filter={`url(#${id}-glowG)`}>IMPORTING</text>
            <text className={`${id}-itf`}
              x="0" y="0" textAnchor="middle"
              fontFamily="'Montserrat', 'Segoe UI', Arial, sans-serif"
              fontSize="28" fontWeight="700" letterSpacing="12"
              fill={`url(#${id}-goldG)`}
              filter={`url(#${id}-glowG)`}>IMPORTING</text>
            <circle className={`${id}-itf`} cx={-115} cy={-4} r={3} fill={accentColor}/>
            <circle className={`${id}-itf`} cx={115} cy={-4} r={3} fill={accentColor}/>
          </g>

          {/* Ambient Glow */}
          <ellipse className={`${id}-fg`} cx={400} cy={400} rx={250} ry={200}
            fill="none" stroke={accentColor} strokeWidth="0.5" opacity="0.15"/>
        </g>
      </svg>
    </div>
  );
}
