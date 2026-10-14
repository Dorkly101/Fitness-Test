/** Small reusable original SVG motifs: signal rings, contour fields, emblems, node glyphs. */

export function SignalRings({ tone = 'var(--signal-cyan)', animate = false, size = '100%' }: { tone?: string; animate?: boolean; size?: number | string }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true">
      <g fill="none" stroke={tone}>
        <circle cx="100" cy="100" r="90" strokeOpacity="0.12" />
        <circle cx="100" cy="100" r="66" strokeOpacity="0.2" strokeDasharray="2 6" />
        <circle cx="100" cy="100" r="42" strokeOpacity="0.32" />
        <circle cx="100" cy="100" r="18" strokeOpacity="0.55" />
        <path d="M100 4 V22 M100 178 V196 M4 100 H22 M178 100 H196" strokeOpacity="0.35" />
      </g>
      {animate && (
        <g className="sweep" style={{ transformOrigin: '100px 100px' }}>
          <path d="M100 100 L100 10 A90 90 0 0 1 163.6 36.4 Z" fill={tone} opacity="0.08" />
          <path d="M100 100 L100 10" stroke={tone} strokeOpacity="0.6" />
        </g>
      )}
      <circle cx="100" cy="100" r="4" fill={tone} />
    </svg>
  );
}

export function ContourField({ tone = 'var(--signal-cyan)' }: { tone?: string }) {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true">
      <g fill="none" stroke={tone} strokeWidth="1">
        <path d="M30 120 C 30 60, 90 30, 130 50 S 180 120, 140 150 S 30 170, 30 120Z" strokeOpacity="0.16" />
        <path d="M52 118 C 52 76, 96 54, 126 68 S 160 118, 132 136 S 52 152, 52 118Z" strokeOpacity="0.26" />
        <path d="M74 116 C 74 92, 100 78, 120 86 S 140 114, 124 124 S 74 134, 74 116Z" strokeOpacity="0.4" />
        <path d="M94 112 C 94 102, 104 96, 112 100 S 120 112, 112 116 S 94 120, 94 112Z" strokeOpacity="0.65" />
      </g>
      <g stroke={tone} strokeOpacity="0.5">
        <path d="M104 40 v10 M99 45 h10" />
        <path d="M160 160 v8 M156 164 h8" />
      </g>
    </svg>
  );
}

/** Hexagonal level emblem. */
export function LevelEmblem({ level, size = 44 }: { level: number; size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} role="img" aria-label={`Level ${level}`}>
      <path d="M24 2 L43 13 V35 L24 46 L5 35 V13Z" fill="#101923" stroke="var(--ion-lime)" strokeWidth="1.5" />
      <path d="M24 7 L39 15.5 V32.5 L24 41 L9 32.5 V15.5Z" fill="none" stroke="var(--ion-lime)" strokeOpacity="0.25" />
      <text x="24" y="29.5" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize={level > 99 ? 12 : 15} fill="var(--text-primary)">
        {level}
      </text>
    </svg>
  );
}

export type NodeKind = 'waypoint' | 'outpost' | 'anomaly';

/** Map node shapes differ by kind AND state, so meaning never relies on colour alone. */
export function NodeGlyph({ kind, status, size = 44 }: { kind: NodeKind; status: 'discovered' | 'next' | 'locked'; size?: number }) {
  const tone = status === 'locked' ? '#5d7389' : kind === 'anomaly' ? 'var(--anomaly-violet)' : kind === 'outpost' ? 'var(--reactor-orange)' : 'var(--signal-cyan)';
  const fill = status === 'discovered' ? tone : '#0b1520';
  const inner = status === 'discovered' ? '#080E17' : tone;
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      {status === 'next' && <circle className="node-pulse" cx="24" cy="24" r="20" fill="none" stroke={tone} strokeWidth="1.5" />}
      {kind === 'waypoint' && <path d="M24 6 L42 24 L24 42 L6 24Z" fill={fill} stroke={tone} strokeWidth="2" strokeDasharray={status === 'locked' ? '3 3' : undefined} />}
      {kind === 'outpost' && <path d="M24 5 L40.5 14.5 V33.5 L24 43 L7.5 33.5 V14.5Z" fill={fill} stroke={tone} strokeWidth="2" strokeDasharray={status === 'locked' ? '3 3' : undefined} />}
      {kind === 'anomaly' && (
        <path d="M24 4 L28 18 L42 14 L31 24 L42 34 L28 30 L24 44 L20 30 L6 34 L17 24 L6 14 L20 18Z" fill={fill} stroke={tone} strokeWidth="1.8" strokeLinejoin="round" strokeDasharray={status === 'locked' ? '3 3' : undefined} />
      )}
      {status === 'discovered' && <path d="M17 24.5 L22 29.5 L31 19.5" fill="none" stroke={inner} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
      {status === 'next' && <circle cx="24" cy="24" r="4" fill={inner} />}
      {status === 'locked' && <path d="M20 23 V21 a4 4 0 0 1 8 0 V23 M18.5 23 h11 v8 h-11z" fill="none" stroke={inner} strokeWidth="1.6" />}
    </svg>
  );
}

/** Brand mark: ringed planet. */
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <circle cx="16" cy="17" r="7.5" fill="#162332" stroke="var(--signal-cyan)" strokeWidth="1.6" />
      <ellipse cx="16" cy="17" rx="14" ry="4" fill="none" stroke="var(--ion-lime)" strokeWidth="1.6" transform="rotate(-16 16 17)" />
      <path d="M8.6 14.5 a7.5 7.5 0 0 1 14.8 0" fill="#162332" />
      <circle cx="16" cy="17" r="7.5" fill="none" stroke="var(--signal-cyan)" strokeWidth="1.6" strokeDasharray="23.5 50" strokeDashoffset="-11.8" />
    </svg>
  );
}
