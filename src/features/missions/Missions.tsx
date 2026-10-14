import { useStore } from '../../state/store';
import { PageHead } from '../../components/ui';
import { MissionCard } from './MissionCard';
import { weekKey, fromDayKey, startOfWeek } from '../../domain/time';
import type { QuestProgress } from '../../domain/types';

export function Missions() {
  const store = useStore();
  const { data, progress, today } = store;
  const wk = weekKey(new Date());
  const byId = new Map(progress.quests.map((q) => [q.instance.instanceId, q]));
  const todays = (data.missionBoards[today]?.missions ?? []).map((m) => byId.get(m.instanceId)).filter(Boolean) as QuestProgress[];
  const quick = todays.filter((q) => q.instance.category === 'quick');
  const daily = todays.filter((q) => q.instance.category !== 'quick');
  const weekly = (data.weeklyBoards[wk] ?? []).map((m) => byId.get(m.instanceId)).filter(Boolean) as QuestProgress[];
  const ws = startOfWeek(new Date()).getTime();
  const earlier = Object.values(data.missionBoards)
    .filter((b) => b.date !== today && fromDayKey(b.date).getTime() >= ws)
    .flatMap((b) => b.missions.map((m) => byId.get(m.instanceId)))
    .filter((q): q is QuestProgress => !!q && q.complete);
  const expedition = [...progress.expeditionObjectives].sort((a, b) => Number(a.complete) - Number(b.complete) || b.current / b.target - a.current / a.target);

  return (
    <div className="page">
      <PageHead eyebrow="Mission board" title="Missions">
        Every mission is optional. Each session can earn up to +10 bonus XP from missions, no matter how many it completes.
      </PageHead>

      <Section title="Quick Ops" hint="Very short, low-friction starts.">
        {quick.map((q) => (
          <MissionCard key={q.instance.instanceId} qp={q} onSwap={() => store.swapMission('quick')} />
        ))}
      </Section>

      <Section title="Daily Missions" hint="Built from your schedule, preferences and recent sessions. They expire at midnight — with no penalty.">
        {daily.map((q) => (
          <MissionCard key={q.instance.instanceId} qp={q} onSwap={q.instance.slot ? () => store.swapMission(q.instance.slot!) : undefined} />
        ))}
      </Section>

      <Section title="Weekly Directives" hint="From your own weekly contract. Change targets in Settings.">
        {weekly.map((q) => (
          <MissionCard key={q.instance.instanceId} qp={q} />
        ))}
      </Section>

      <Section title="Expedition Objectives" hint="Long-range goals that build across many sessions.">
        {expedition.map((q) => (
          <MissionCard key={q.instance.instanceId} qp={q} />
        ))}
      </Section>

      {earlier.length > 0 && (
        <Section title="Completed earlier this week" hint="">
          {earlier.map((q) => (
            <MissionCard key={q.instance.instanceId} qp={q} />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : [children];
  return (
    <section aria-label={title}>
      <div className="section-head">
        <h2>{title}</h2>
        {hint && <span className="muted small">{hint}</span>}
      </div>
      {items.length ? <div className="mission-grid">{children}</div> : <div className="panel tight muted small">Nothing here right now.</div>}
    </section>
  );
}
