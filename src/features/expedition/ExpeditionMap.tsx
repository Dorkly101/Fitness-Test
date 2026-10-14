import { useEffect, useMemo, useState } from 'react';
import { Lock, ScrollText } from 'lucide-react';
import { useStore } from '../../state/store';
import { PageHead, ProgressBar } from '../../components/ui';
import { NodeGlyph } from '../../components/art/Glyphs';
import { SECTORS, METRIC_LABEL, type Sector } from '../../content/expedition';
import { ARCHIVE_BY_ID } from '../../content/rewards';
import { conditionProgress, type NodeState } from '../../domain/progression';

/** Node layout inside a 400×380 sector band (zig-zag route). */
const POS = [
  { x: 210, y: 78 },
  { x: 300, y: 196 },
  { x: 120, y: 300 },
];
const ENTRY = { x: 200, y: 0 };
const EXIT = { x: 200, y: 380 };

function seg(a: { x: number; y: number }, b: { x: number; y: number }) {
  const my = (a.y + b.y) / 2;
  return `M${a.x} ${a.y} C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`;
}

const STATUS_TEXT = { discovered: 'Discovered', next: 'In range', locked: 'Locked' } as const;

export function ExpeditionMap({ focusNodeId }: { focusNodeId?: string }) {
  const { progress, data, markSeen } = useStore();
  const defaultNode = focusNodeId ?? progress.nodes.find((n) => n.status === 'next')?.node.id ?? progress.nodes[progress.nodes.length - 1].node.id;
  const [selected, setSelected] = useState(defaultNode);
  const unseen = useMemo(() => new Set(progress.nodes.filter((n) => n.status === 'discovered' && !data.seenRewards.includes(`node:${n.node.id}`)).map((n) => n.node.id)), [progress.nodes, data.seenRewards]);

  // Mark discoveries as seen after the reveal has had a moment to play.
  useEffect(() => {
    if (!unseen.size) return;
    const t = window.setTimeout(() => markSeen([...unseen].map((id) => `node:${id}`)), 2500);
    return () => window.clearTimeout(t);
  }, [unseen, markSeen]);

  const discovered = progress.nodes.filter((n) => n.status === 'discovered').length;
  const sel = progress.nodes.find((n) => n.node.id === selected)!;

  return (
    <div className="page">
      <PageHead eyebrow={`${discovered} of ${progress.nodes.length} waypoints discovered`} title="Expedition Map">
        Every waypoint unlocks from activity you’ve actually logged. Several have alternate routes, so no single activity type is required.
      </PageHead>
      <div className="map-layout">
        <div className="map-col">
          {SECTORS.map((sector) => {
            const nodes = progress.nodes.filter((n) => n.node.sectorId === sector.id);
            const hasSelected = nodes.some((n) => n.node.id === selected);
            return (
              <div key={sector.id}>
                <SectorBand sector={sector} nodes={nodes} selected={selected} onSelect={setSelected} unseen={unseen} />
                {hasSelected && (
                  <div className="map-inline-detail">
                    <NodeDetail ns={sel} />
                  </div>
                )}
              </div>
            );
          })}
          <div className="map-beyond panel tight">
            <span className="eyebrow">Beyond the relay</span>
            <p className="small muted">The relay’s answer came from somewhere further out. More sectors will appear in future updates.</p>
          </div>
        </div>
        <aside className="map-aside" aria-label="Waypoint details">
          <NodeDetail ns={sel} />
        </aside>
      </div>
    </div>
  );
}

function SectorBand({ sector, nodes, selected, onSelect, unseen }: { sector: Sector; nodes: NodeState[]; selected: string; onSelect: (id: string) => void; unseen: Set<string> }) {
  const anyKnown = nodes.some((n) => n.status !== 'locked');
  const done = nodes.every((n) => n.status === 'discovered');
  const points = [ENTRY, ...POS, EXIT];
  // Lit route: up to the last discovered node in this band (+ exit if all discovered).
  const litCount = nodes.filter((n) => n.status === 'discovered').length;
  const litTo = done ? points.length - 1 : litCount; // index into points
  const segments = points.slice(0, -1).map((p, i) => ({ d: seg(p, points[i + 1]), lit: i < litTo && (i > 0 || litCount > 0) }));

  return (
    <section className={`sector sector-${sector.palette} ${anyKnown ? '' : 'fogged'}`} aria-label={`Sector ${sector.index}: ${sector.name}`}>
      <header className="sector-head">
        <div>
          <span className="eyebrow">Sector {String(sector.index).padStart(2, '0')}</span>
          <h2>{sector.name}</h2>
          <p className="small muted">{sector.tagline}</p>
        </div>
        <span className={`badge ${done ? 'lime' : anyKnown ? 'cyan' : ''}`}>{done ? 'Charted' : anyKnown ? 'Surveying' : 'Undiscovered'}</span>
      </header>
      <div className="sector-canvas">
        <svg viewBox="0 0 400 380" className="sector-svg" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
          <SectorTerrain palette={sector.palette} />
          {segments.map((s, i) => (
            <path key={i} d={s.d} fill="none" stroke={s.lit ? 'var(--signal-cyan)' : '#3a516a'} strokeWidth={s.lit ? 2.5 : 1.5} strokeDasharray={s.lit ? undefined : '3 7'} strokeLinecap="round" className={s.lit ? 'route-lit' : ''} />
          ))}
        </svg>
        {nodes.map((n, i) => {
          const p = POS[i];
          const right = p.x < 200;
          return (
            <button
              key={n.node.id}
              type="button"
              className={`map-node ${right ? 'label-right' : 'label-left'} ${n.node.id === selected ? 'selected' : ''} ${unseen.has(n.node.id) ? 'reveal' : ''} status-${n.status}`}
              style={{ left: `${(p.x / 400) * 100}%`, top: `${(p.y / 380) * 100}%` }}
              onClick={() => onSelect(n.node.id)}
              aria-pressed={n.node.id === selected}
              aria-label={`${n.node.title}: ${STATUS_TEXT[n.status]}${n.node.kind === 'anomaly' ? ', anomaly' : n.node.kind === 'outpost' ? ', outpost' : ''}`}
            >
              <span className="map-node-glyph">
                <NodeGlyph kind={n.node.kind} status={n.status} size={46} />
              </span>
              <span className="map-node-label">
                <span className="map-node-title">{n.status === 'locked' && !anyKnown ? 'Unknown signal' : n.node.title}</span>
                <span className="map-node-status">{STATUS_TEXT[n.status]}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SectorTerrain({ palette }: { palette: Sector['palette'] }) {
  const tone = palette === 'relay' ? 'var(--reactor-orange)' : palette === 'basin' || palette === 'ridge' ? 'var(--anomaly-violet)' : 'var(--signal-cyan)';
  return (
    <g>
      <g fill="none" stroke={tone} strokeOpacity="0.1">
        <ellipse cx="320" cy="90" rx="70" ry="34" />
        <ellipse cx="320" cy="90" rx="44" ry="20" />
        <ellipse cx="320" cy="90" rx="18" ry="8" />
        <ellipse cx="80" cy="200" rx="64" ry="40" />
        <ellipse cx="80" cy="200" rx="36" ry="22" />
        <path d="M0 250 Q 100 230 200 250 T 400 240" />
        <path d="M0 270 Q 110 252 220 268 T 400 262" />
        <path d="M0 130 Q 90 116 180 132 T 400 120" />
      </g>
      {palette === 'ridge' && <path d="M0 150 L60 112 L110 134 L170 86 L230 128 L300 98 L360 124 L400 108" fill="none" stroke={tone} strokeOpacity="0.25" />}
      {palette === 'basin' && <ellipse cx="290" cy="300" rx="80" ry="26" fill="var(--anomaly-violet)" fillOpacity="0.06" stroke={tone} strokeOpacity="0.25" />}
      {palette === 'relay' && (
        <g stroke={tone} strokeOpacity="0.3" fill="none">
          <path d="M330 340 L345 250 L360 340 M335 310 H355 M339 285 H351" />
          <circle cx="345" cy="244" r="5" />
        </g>
      )}
      {palette === 'arrival' && (
        <g stroke={tone} strokeOpacity="0.3" fill="none">
          <path d="M40 340 l14 -10 h26 l14 10z" />
          <path d="M60 330 l4 -10 h6 l4 10" />
        </g>
      )}
      <g fill="#9CAEC0" fillOpacity="0.35" fontFamily="ui-monospace, monospace" fontSize="9">
        <text x="392" y="372" textAnchor="end">{palette === 'arrival' ? '00°N 12°E' : palette === 'ridge' ? '04°N 18°E' : palette === 'basin' ? '09°S 21°E' : '14°S 30°E'}</text>
      </g>
    </g>
  );
}

function NodeDetail({ ns }: { ns: NodeState }) {
  const { progress } = useStore();
  const n = ns.node;
  const kindLabel = n.kind === 'anomaly' ? 'Anomaly' : n.kind === 'outpost' ? 'Outpost' : 'Waypoint';
  return (
    <div className={`panel marked node-detail kind-${n.kind}`} aria-live="polite">
      <div className="row between" style={{ marginBottom: 12 }}>
        <span className={`badge ${n.kind === 'anomaly' ? 'violet' : n.kind === 'outpost' ? 'orange' : 'cyan'}`}>{kindLabel}</span>
        <span className={`badge ${ns.status === 'discovered' ? 'lime' : ''}`}>{STATUS_TEXT[ns.status]}</span>
      </div>
      <div className="row" style={{ gap: 14, alignItems: 'center' }}>
        <NodeGlyph kind={n.kind} status={ns.status} size={52} />
        <h2>{n.title}</h2>
      </div>
      <p className="muted" style={{ marginTop: 12 }}>
        {n.description}
      </p>

      <h3 className="detail-sub">Unlock {n.unlockRule.length > 1 ? 'routes (any one)' : 'condition'}</h3>
      <ul className="list">
        {n.unlockRule.map((c, i) => {
          const pct = ns.status === 'discovered' ? 1 : conditionProgress(progress.stats, c);
          const current = Math.min(c.value, progress.stats[c.metric]);
          return (
            <li key={i} className="unlock-row">
              <div className="row between small">
                <span>{METRIC_LABEL[c.metric](c.value)}</span>
                <span className="num muted">{ns.status === 'discovered' ? 'Done' : `${current}/${c.value}`}</span>
              </div>
              <ProgressBar value={pct * 100} max={100} label={METRIC_LABEL[c.metric](c.value)} lime={pct >= 1} thin />
            </li>
          );
        })}
      </ul>
      {ns.status === 'locked' && <p className="tiny muted" style={{ marginTop: 8 }}>Waypoints are reached in order. Progress you log now still counts toward this one.</p>}

      <h3 className="detail-sub">Story fragment</h3>
      {ns.status === 'discovered' ? (
        <blockquote className="story">
          <ScrollText size={16} aria-hidden="true" />
          <p>{n.story}</p>
        </blockquote>
      ) : (
        <p className="small muted row" style={{ gap: 6 }}>
          <Lock size={14} aria-hidden="true" /> Revealed on discovery.
        </p>
      )}

      <h3 className="detail-sub">Rewards</h3>
      <ul className="reward-list">
        {n.rewardIds.map((r) => {
          const item = ARCHIVE_BY_ID[r];
          return (
            <li key={r} className={ns.status === 'discovered' ? 'earned' : ''}>
              <span className="badge">{item.kind === 'outpost' ? 'Outpost module' : item.kind === 'title' ? 'Title' : 'Log entry'}</span>
              <span>{item.name}</span>
            </li>
          );
        })}
      </ul>
      {ns.discoveredAt && <p className="tiny muted" style={{ marginTop: 12 }}>Discovered {new Date(ns.discoveredAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
    </div>
  );
}
