import { useEffect } from 'react';
import { useStore } from './state/store';
import { navigate, useRoute } from './state/router';
import { Shell } from './features/shell/Shell';
import { Onboarding } from './features/onboarding/Onboarding';
import { MissionControl } from './features/mission-control/MissionControl';
import { Missions } from './features/missions/Missions';
import { ExpeditionMap } from './features/expedition/ExpeditionMap';
import { StartActivity } from './features/activity/StartActivity';
import { QuickLog } from './features/activity/QuickLog';
import { ActiveSession } from './features/activity/ActiveSession';
import { SessionReview } from './features/activity/SessionReview';
import { Completion } from './features/activity/Completion';
import { ActivityLog } from './features/log/ActivityLog';
import { SessionDetail } from './features/log/SessionDetail';
import { ProgressArchive } from './features/progress/ProgressArchive';
import { Settings } from './features/settings/Settings';

function useAppliedSettings() {
  const { data } = useStore();
  const s = data.profile?.settings;
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.motion = s?.motion ?? 'system';
    root.dataset.contrast = s?.highContrast ? 'high' : 'normal';
    root.style.setProperty('--font-scale', String(s?.fontScale ?? 1));
  }, [s?.motion, s?.highContrast, s?.fontScale]);
}

export function App() {
  const { data } = useStore();
  const route = useRoute();
  useAppliedSettings();

  const [section, param, extra] = route;

  useEffect(() => {
    document.title = section ? `${TITLES[section] ?? 'FRONTIER'} · FRONTIER` : 'Mission Control · FRONTIER';
  }, [section]);

  if (!data.profile) return <Onboarding />;

  // Focused, full-screen flows (no nav chrome during an active session)
  if (section === 'session') return <ActiveSession />;
  if (section === 'review') return <SessionReview preset={param} />;

  let page: React.ReactNode;
  switch (section) {
    case undefined:
    case 'home':
      page = <MissionControl />;
      break;
    case 'missions':
      page = <Missions />;
      break;
    case 'expedition':
      page = <ExpeditionMap focusNodeId={param} />;
      break;
    case 'start':
      page = <StartActivity modality={param} missionId={extra} />;
      break;
    case 'quick-log':
      page = <QuickLog key={`${param}-${extra}`} initialModality={param} missionId={extra} />;
      break;
    case 'complete':
      page = <Completion sessionId={param} />;
      break;
    case 'log':
      page = param ? <SessionDetail id={param} /> : <ActivityLog />;
      break;
    case 'progress':
      page = <ProgressArchive />;
      break;
    case 'settings':
      page = <Settings />;
      break;
    default:
      page = <NotFound />;
  }
  return <Shell section={section ?? 'home'}>{page}</Shell>;
}

const TITLES: Record<string, string> = {
  home: 'Mission Control',
  missions: 'Missions',
  expedition: 'Expedition Map',
  start: 'Start activity',
  'quick-log': 'Quick log',
  session: 'Active session',
  review: 'Session review',
  complete: 'Field log updated',
  log: 'Activity log',
  progress: 'Progress',
  settings: 'Settings',
};

function NotFound() {
  return (
    <div className="page">
      <div className="panel">
        <h1>Signal lost</h1>
        <p className="muted" style={{ margin: '8px 0 16px' }}>That route isn’t on the map.</p>
        <button className="btn primary" onClick={() => navigate('home')}>
          Return to Mission Control
        </button>
      </div>
    </div>
  );
}
