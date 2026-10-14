import type { ReactNode } from 'react';
import { Archive, History, Map, Play, Rocket, Settings as SettingsIcon, Target, TriangleAlert } from 'lucide-react';
import { useStore } from '../../state/store';
import { href, navigate } from '../../state/router';
import { BrandMark, LevelEmblem } from '../../components/art/Glyphs';
import { ProgressBar } from '../../components/ui';
import { SECTORS } from '../../content/expedition';
import { ARCHIVE_BY_ID } from '../../content/rewards';

const NAV = [
  { id: 'home', label: 'Mission Control', short: 'Home', icon: Rocket },
  { id: 'missions', label: 'Missions', short: 'Missions', icon: Target },
  { id: 'expedition', label: 'Expedition Map', short: 'Expedition', icon: Map },
  { id: 'log', label: 'Activity Log', short: 'Log', icon: History },
  { id: 'progress', label: 'Progress & Archive', short: 'Progress', icon: Archive },
  { id: 'settings', label: 'Settings', short: 'Settings', icon: SettingsIcon },
];

export function Shell({ section, children }: { section: string; children: ReactNode }) {
  const { data, progress, storageError } = useStore();
  const level = progress.level;
  const current = progress.nodes[Math.max(0, progress.currentNodeIndex)];
  const sector = SECTORS.find((s) => s.id === (progress.currentNodeIndex >= 0 ? current.node.sectorId : 'arrival'))!;
  const title = data.profile?.activeTitleId ? ARCHIVE_BY_ID[data.profile.activeTitleId]?.name : undefined;
  const isActive = (id: string) => section === id;

  const mobileTabs = [NAV[0], NAV[1], null, NAV[2], NAV[4]];

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="rail" aria-label="Primary">
        <a className="brand" href={href('home')}>
          <BrandMark />
          <span className="brand-word">FRONTIER</span>
        </a>
        <nav className="rail-nav" aria-label="Main navigation">
          {NAV.map((n) => (
            <a key={n.id} className="rail-link" href={href(n.id)} aria-current={isActive(n.id) ? 'page' : undefined}>
              <n.icon size={18} strokeWidth={1.75} aria-hidden="true" />
              {n.label}
            </a>
          ))}
        </nav>
        <a className="btn primary block" href={href('start')}>
          <Play size={16} aria-hidden="true" /> Start activity
        </a>
        <div className="rail-status">
          <div className="level-chip">
            <LevelEmblem level={level.level} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="small" style={{ fontWeight: 600 }}>
                {data.profile?.callsign || 'Operative'}
              </div>
              <div className="tiny muted" style={{ marginBottom: 6 }}>
                {title ? `${title} · ` : ''}
                <span className="num">{level.intoLevel}</span>/<span className="num">{level.span}</span> XP
              </div>
              <ProgressBar value={level.intoLevel} max={level.span} label={`Level ${level.level} progress`} lime thin />
            </div>
          </div>
          <div className="rail-sector">
            <span className="eyebrow">Sector {String(sector.index).padStart(2, '0')}</span>
            <span className="small">{sector.name}</span>
          </div>
        </div>
      </aside>

      <main className="main" id="main" tabIndex={-1}>
        <div className="mobile-top">
          <a className="brand" href={href('home')}>
            <BrandMark size={24} />
            <span className="brand-word">FRONTIER</span>
          </a>
          <div className="row" style={{ gap: 4 }}>
            <a className="btn ghost icon" href={href('log')} aria-label="Activity log">
              <History size={20} />
            </a>
            <a className="btn ghost icon" href={href('settings')} aria-label="Settings">
              <SettingsIcon size={20} />
            </a>
            <LevelEmblem level={level.level} size={34} />
          </div>
        </div>
        {storageError && (
          <div className="notice warn" role="alert" style={{ marginBottom: 16, maxWidth: 'var(--content-max)', marginInline: 'auto' }}>
            <TriangleAlert size={18} aria-hidden="true" />
            <span>{storageError}</span>
          </div>
        )}
        {data.activeTimer && (
          <div className="resume-banner" role="status">
            <span className="resume-dot" aria-hidden="true" />
            <span>
              <strong>{data.activeTimer.title}</strong> {data.activeTimer.reviewing ? 'is waiting for review.' : 'is in progress.'}
            </span>
            <button className="btn small primary" onClick={() => navigate(data.activeTimer?.reviewing ? 'review' : 'session')}>
              {data.activeTimer.reviewing ? 'Review & save' : 'Return to session'}
            </button>
          </div>
        )}
        {children}
      </main>

      <nav className="tabbar" aria-label="Main navigation">
        {mobileTabs.map((n, i) =>
          n ? (
            <a key={n.id} className="tab" href={href(n.id)} aria-current={isActive(n.id) ? 'page' : undefined}>
              <n.icon size={21} strokeWidth={1.75} aria-hidden="true" />
              {n.short}
            </a>
          ) : (
            <a key={`start-${i}`} className="tab tab-start" href={href('start')} aria-label="Start or log an activity">
              <span className="tab-start-btn">
                <Play size={22} aria-hidden="true" />
              </span>
              Start
            </a>
          ),
        )}
      </nav>
    </div>
  );
}
