/**
 * Cinematic, original SVG hero: ringed planet over unknown terrain, a route
 * trace with waypoints, and an expedition outpost that visibly gains modules
 * as the player unlocks them. Replaceable: swap this component for bespoke art.
 */
import { useEffect, useId, useState } from 'react';

function useNarrow() {
  const q = '(max-width: 640px)';
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(q);
    if (!mq) return;
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow;
}

export type SectorPalette = 'arrival' | 'ridge' | 'basin' | 'relay';

const PALETTES: Record<SectorPalette, { skyTop: string; skyBottom: string; glow: string; far: string; mid: string; near: string; accent: string; planet: [string, string] }> = {
  arrival: { skyTop: '#060b13', skyBottom: '#0d2433', glow: '#5CE1E6', far: '#10283a', mid: '#0c1d2b', near: '#08131d', accent: '#5CE1E6', planet: ['#2b4a63', '#0d1825'] },
  ridge: { skyTop: '#070a15', skyBottom: '#1a1f3d', glow: '#AB8BFF', far: '#1b2340', mid: '#121931', near: '#0a1020', accent: '#5CE1E6', planet: ['#3d3a6b', '#121428'] },
  basin: { skyTop: '#060b12', skyBottom: '#13283a', glow: '#AB8BFF', far: '#162c3c', mid: '#0f2130', near: '#08141e', accent: '#AB8BFF', planet: ['#2f4f66', '#0e1a27'] },
  relay: { skyTop: '#0a0a12', skyBottom: '#2a1c24', glow: '#FF7959', far: '#2a2030', mid: '#1b1622', near: '#0f0c15', accent: '#FF7959', planet: ['#5a3e48', '#1a1118'] },
};

/** Deterministic star field (no randomness per render). */
const STARS = Array.from({ length: 70 }, (_, i) => {
  const x = (i * 137.508) % 1200;
  const y = ((i * 71.3) % 190) + 6;
  const r = i % 7 === 0 ? 1.4 : i % 3 === 0 ? 0.9 : 0.6;
  return { x, y, r, o: 0.25 + ((i * 13) % 50) / 100 };
});

export function PlanetHero({ palette = 'arrival', outpostStage = 0, waypointsLit = 0, waypointsTotal = 5, className }: { palette?: SectorPalette; outpostStage?: number; waypointsLit?: number; waypointsTotal?: number; className?: string }) {
  const p = PALETTES[palette];
  const narrow = useNarrow();
  const uid = useId().replace(/:/g, '');
  const id = (s: string) => `${s}-${uid}`;
  // Route trace waypoints along the mid terrain, left to right toward the outpost.
  const wp = Array.from({ length: waypointsTotal }, (_, i) => {
    const t = i / Math.max(1, waypointsTotal - 1);
    return { x: 120 + t * 640, y: 352 - Math.sin(t * Math.PI * 1.1) * 26 - t * 18 };
  });
  const routeD = wp.map((w, i) => `${i ? 'L' : 'M'}${w.x.toFixed(1)} ${w.y.toFixed(1)}`).join(' ');
  const litD = wp.slice(0, Math.max(1, waypointsLit)).map((w, i) => `${i ? 'L' : 'M'}${w.x.toFixed(1)} ${w.y.toFixed(1)}`).join(' ');

  return (
    <svg className={className} viewBox="0 0 1200 420" preserveAspectRatio={narrow ? 'xMaxYMin slice' : 'xMidYMid slice'} role="img" aria-label={`Expedition view: outpost with ${outpostStage} of 5 modules restored, ${waypointsLit} of ${waypointsTotal} sector waypoints discovered.`}>
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.skyTop} />
          <stop offset="1" stopColor={p.skyBottom} />
        </linearGradient>
        <radialGradient id={id('planet')} cx="0.32" cy="0.3" r="0.85">
          <stop offset="0" stopColor={p.planet[0]} />
          <stop offset="0.7" stopColor={p.planet[1]} />
          <stop offset="1" stopColor="#05080d" />
        </radialGradient>
        <radialGradient id={id('horizon')} cx="0.5" cy="1" r="0.7">
          <stop offset="0" stopColor={p.glow} stopOpacity="0.35" />
          <stop offset="1" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('ring')} x1="0" x2="1">
          <stop offset="0" stopColor="#C7F36B" stopOpacity="0" />
          <stop offset="0.35" stopColor="#EDF4FA" stopOpacity="0.55" />
          <stop offset="0.7" stopColor={p.glow} stopOpacity="0.5" />
          <stop offset="1" stopColor={p.glow} stopOpacity="0" />
        </linearGradient>
        <clipPath id={id('front')}>
          <rect x="0" y="150" width="1200" height="200" />
        </clipPath>
        <linearGradient id={id('fade')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.6" stopColor="#080E17" stopOpacity="0" />
          <stop offset="1" stopColor="#080E17" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      <rect width="1200" height="420" fill={`url(#${id('sky')})`} />
      <g fill="#EDF4FA">
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} opacity={s.o} />
        ))}
      </g>

      {/* Distant moon */}
      <circle cx="430" cy="78" r="13" fill="#1d3042" />
      <path d="M424 66a13 13 0 1 0 14 22a11 11 0 0 1 -14 -22z" fill="#9CAEC0" opacity="0.35" />

      {/* Ringed planet: back ring, body, front ring */}
      <g transform="rotate(-14 900 150)">
        <ellipse cx="900" cy="150" rx="210" ry="38" fill="none" stroke={`url(#${id('ring')})`} strokeWidth="2" opacity="0.5" />
        <ellipse cx="900" cy="150" rx="178" ry="30" fill="none" stroke={`url(#${id('ring')})`} strokeWidth="7" opacity="0.28" />
      </g>
      <circle cx="900" cy="150" r="104" fill={`url(#${id('planet')})`} />
      <g fill="none" stroke="#EDF4FA" strokeOpacity="0.07">
        <path d="M806 120c60 -14 130 -10 190 8" />
        <path d="M798 152c70 -10 140 -4 204 12" />
        <path d="M812 186c56 -6 116 0 172 14" />
      </g>
      <g transform="rotate(-14 900 150)" clipPath={`url(#${id('front')})`}>
        <ellipse cx="900" cy="150" rx="210" ry="38" fill="none" stroke={`url(#${id('ring')})`} strokeWidth="2" />
        <ellipse cx="900" cy="150" rx="178" ry="30" fill="none" stroke={`url(#${id('ring')})`} strokeWidth="7" opacity="0.55" />
      </g>

      {/* Horizon glow + terrain layers */}
      <rect y="200" width="1200" height="220" fill={`url(#${id('horizon')})`} />
      <path d="M0 268 L90 240 L170 256 L260 214 L340 246 L430 226 L520 252 L640 208 L720 238 L820 222 L930 250 L1040 218 L1120 240 L1200 228 V420 H0Z" fill={p.far} />
      <path d="M0 300 L120 276 L230 292 L330 262 L470 296 L590 270 L700 288 L840 258 L960 284 L1080 266 L1200 280 V420 H0Z" fill={p.mid} />
      <path d="M0 268 L90 240 L170 256 L260 214 L340 246 L430 226 L520 252 L640 208 L720 238 L820 222 L930 250 L1040 218 L1120 240 L1200 228" fill="none" stroke={p.glow} strokeOpacity="0.35" strokeWidth="1" />
      <path d="M0 340 Q 180 310 360 330 T 720 318 T 1200 326 V420 H0Z" fill={p.near} />
      {/* Topographic contours on the near ground */}
      <g fill="none" stroke={p.accent} strokeOpacity="0.12" strokeWidth="1">
        <path d="M0 360 Q 200 336 400 352 T 800 342 T 1200 350" />
        <path d="M0 382 Q 220 360 440 374 T 860 366 T 1200 372" />
        <path d="M0 404 Q 240 386 480 398 T 900 390 T 1200 396" />
        <ellipse cx="300" cy="392" rx="90" ry="12" />
        <ellipse cx="300" cy="392" rx="50" ry="6" />
      </g>

      {/* Route trace */}
      <path d={routeD} fill="none" stroke="#9CAEC0" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="4 7" />
      {waypointsLit > 0 && <path className="hero-route-lit" d={litD} fill="none" stroke={p.accent} strokeWidth="2.2" strokeLinecap="round" />}
      {wp.map((w, i) => {
        const lit = i < waypointsLit;
        const current = i === waypointsLit - 1;
        return (
          <g key={i} transform={`translate(${w.x} ${w.y})`}>
            {current && <circle className="hero-pulse" r="9" fill="none" stroke={p.accent} strokeWidth="1.5" />}
            <circle r={lit ? 5 : 4} fill={lit ? p.accent : '#0b1520'} stroke={lit ? p.accent : '#5d7389'} strokeWidth="1.5" />
            {!lit && <circle r="1.4" fill="#5d7389" />}
          </g>
        );
      })}

      {/* Outpost — modules appear as they are unlocked */}
      <g transform="translate(880 318)">
        <ellipse cx="0" cy="22" rx="120" ry="10" fill="#000" opacity="0.35" />
        {/* base platform (always present: the landing craft) */}
        <path d="M-60 20 L-48 6 H48 L60 20Z" fill="#1a2a3b" stroke="#3a516a" />
        <path d="M-26 6 L-18 -12 H18 L26 6Z" fill="#203347" stroke="#3a516a" />
        <rect x="-6" y="-8" width="12" height="5" fill={p.accent} opacity="0.85" />
        {outpostStage >= 1 && (
          <g className="hero-module">
            <path d="M-110 20 A 34 30 0 0 1 -42 20Z" fill="#203347" stroke="#3a516a" />
            <rect x="-86" y="4" width="8" height="5" rx="1" fill="#C7F36B" opacity="0.9" />
            <rect x="-72" y="4" width="8" height="5" rx="1" fill="#C7F36B" opacity="0.6" />
          </g>
        )}
        {outpostStage >= 2 && (
          <g className="hero-module" stroke="#9CAEC0" strokeWidth="1.5" fill="none">
            <path d="M30 6 L36 -54" />
            <path d="M22 -40 A 18 10 -20 0 0 52 -50" stroke={p.accent} />
            <circle cx="36" cy="-56" r="2.5" fill={p.accent} stroke="none" />
          </g>
        )}
        {outpostStage >= 3 && (
          <g className="hero-module">
            <path d="M64 20 L70 8" stroke="#3a516a" strokeWidth="2" />
            <path d="M54 8 L98 2 L104 12 L60 18Z" fill="#14324a" stroke="#5CE1E6" strokeOpacity="0.6" />
            <path d="M68 6 L74 16 M82 4 L88 14" stroke="#5CE1E6" strokeOpacity="0.35" />
          </g>
        )}
        {outpostStage >= 4 && (
          <path className="hero-module" d="M60 20 Q 120 10 170 -6 T 260 -40" fill="none" stroke="#FF7959" strokeOpacity="0.7" strokeWidth="1.5" strokeDasharray="1 5" strokeLinecap="round" />
        )}
        {outpostStage >= 5 && (
          <g className="hero-module" transform="translate(262 -44)">
            <path d="M-8 4 L0 -26 L8 4Z" fill="#203347" stroke="#FF7959" />
            <circle className="hero-pulse" cy="-28" r="7" fill="none" stroke="#FF7959" />
            <circle cy="-28" r="2.5" fill="#FF7959" />
          </g>
        )}
        {/* Human figure for scale */}
        <g transform="translate(-130 8)" fill="#c8d6e3">
          <circle cx="0" cy="-12" r="2.4" />
          <path d="M-2.2 -9 h4.4 l1 9 h-2 l-1.2 6 h-1 l-0.8 -6 h-0.4 l-0.8 6 h-1 l-1.2 -6 h-2z" />
        </g>
      </g>

      <rect width="1200" height="420" fill={`url(#${id('fade')})`} />
    </svg>
  );
}
