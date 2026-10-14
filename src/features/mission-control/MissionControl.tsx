import { useMemo } from 'react';
import { Award, ClipboardPlus, Moon, Play, TrendingUp } from 'lucide-react';
import { useStore } from '../../state/store';
import { href, navigate } from '../../state/router';
import { PlanetHero } from '../../components/art/PlanetHero';
import { LevelEmblem } from '../../components/art/Glyphs';
import { ModalityIcon, ProgressBar } from '../../components/ui';
import { MissionCard } from '../missions/MissionCard';
import { SECTORS, NODES, METRIC_LABEL } from '../../content/expedition';
import { ARCHIVE_BY_ID } from '../../content/rewards';
import { BRIEFING_LINES } from '../../content/missions';
import { adjustmentOffers, GAP_DAYS, isRestDay, recommendable } from '../../domain/generator';
import { dayKey, daysBetween, WEEKDAY_SHORT } from '../../domain/time';
import { summariseWeek } from '../../domain/debrief';
import { modalityLabel } from '../../domain/modalities';
import { lastValidSession } from '../../domain/progression';
import { useToast } from '../../components/toast';

export function MissionControl() {
  const store = useStore();
  const { data, progress, today } = store;
  const toast = useToast();
  const profile = data.profile!;
  const board = data.missionBoards[today];
  const now = new Date();

  const nodesBySector = (sid: string) => NODES.filter((n) => n.sectorId === sid);
  const nextIdx = progress.nodes.findIndex((n) => n.status === 'next');
  const focusNode = progress.nodes[nextIdx >= 0 ? nextIdx : progress.nodes.length - 1];
  const sector = SECTORS.find((s) => s.id === focusNode.node.sectorId)!;
  const sectorNodes = nodesBySector(sector.id);
  const litInSector = progress.nodes.filter((n) => n.node.sectorId === sector.id && n.status === 'discovered').length;
  const outpostStage = progress.archiveItemIds.map((id) => ARCHIVE_BY_ID[id]?.outpostStage ?? 0).reduce((a, b) => Math.max(a, b), 0);

  const last = lastValidSession(data.sessions);
  const todayCount = data.sessions.filter((s) => s.status === 'completed' && dayKey(s.startAt) === today).length;
  const gap = last ? daysBetween(last.startAt, now) : undefined;
  const rest = isRestDay(profile, now);
  const briefing = !last
    ? BRIEFING_LINES.firstRun
    : todayCount > 0
      ? BRIEFING_LINES.doneToday
      : rest
        ? BRIEFING_LINES.restDay
        : gap !== undefined && gap >= GAP_DAYS
          ? BRIEFING_LINES.comeback
          : board && board.missions.length
            ? `Uplink stable. ${board.missions.length === 3 ? 'Three' : board.missions.length} missions are available.`
            : BRIEFING_LINES.default;

  const questFor = (id: string) => progress.quests.find((q) => q.instance.instanceId === id);
  const missions = (board?.missions ?? []).map((m) => questFor(m.instanceId)).filter(Boolean) as NonNullable<ReturnType<typeof questFor>>[];
  const offers = useMemo(() => adjustmentOffers(profile, data.sessions, data.dismissedOffers, now), [profile, data.sessions, data.dismissedOffers]);
  const week = useMemo(() => summariseWeek(data.sessions, now), [data.sessions, today]);
  const target = profile.weeklyTargets.sessions;
  const recentAch = [...progress.achievements].filter((a) => a.unlocked).sort((a, b) => (b.unlockedAt ?? '').localeCompare(a.unlockedAt ?? ''))[0];
  const shortcuts = recommendable(profile).slice(0, 4);
  const todayIdx = (now.getDay() + 6) % 7;
  const name = profile.callsign || 'Operative';

  return (
    <div className="page">
      <section className="hero panel" aria-labelledby="hero-title">
        <PlanetHero className="hero-art" palette={sector.palette} outpostStage={outpostStage} waypointsLit={litInSector} waypointsTotal={sectorNodes.length + 2} />
        <div className="hero-scrim" aria-hidden="true" />
        <div className="hero-content">
          <div className="eyebrow hero-eyebrow">
            Sector {String(sector.index).padStart(2, '0')} · {sector.name}
          </div>
          <h1 id="hero-title" className="hero-title">
            {focusNode.status === 'discovered' ? 'All waypoints discovered' : <>Next waypoint: {focusNode.node.title}</>}
          </h1>
          <p className="hero-brief">
            <span className="hero-callsign">{name}.</span> {briefing}
          </p>
          {focusNode.status === 'next' && (
            <div className="hero-progress">
              <ProgressBar value={Math.round(focusNode.progress * 100)} max={100} label={`Progress to ${focusNode.node.title}`} />
              <div className="row between tiny">
                <span className="muted">Route: {METRIC_LABEL[focusNode.bestCondition.metric](focusNode.bestCondition.value)}</span>
                <a href={href(`expedition/${focusNode.node.id}`)} className="tiny">
                  View map
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      {offers.map((o) => (
        <div key={o.key} className="notice info" role="status">
          <TrendingUp size={18} color="var(--signal-cyan)" aria-hidden="true" />
          <div style={{ flex: 1 }}>
            <strong>Optional step up.</strong> Your last three {modalityLabel(o.modality, profile).toLowerCase()} sessions felt good. Want suggestions of {o.to} min instead of {o.from}? Nothing changes unless you accept.
          </div>
          <div className="row">
            <button
              className="btn small"
              onClick={() => {
                store.acceptOffer(o.key, o.modality, o.to);
                toast(`${modalityLabel(o.modality, profile)} target set to ${o.to} min.`);
              }}
            >
              Accept
            </button>
            <button className="btn ghost small" onClick={() => store.dismissOffer(o.key)}>
              Keep {o.from} min
            </button>
          </div>
        </div>
      ))}

      <section aria-labelledby="briefing-title">
        <div className="section-head">
          <h2 id="briefing-title">Today’s briefing</h2>
          <span className="muted small">Options, not orders. Pick one, swap one, or do your own thing.</span>
        </div>
        {rest && (
          <div className="notice" style={{ marginBottom: 16 }}>
            <Moon size={18} aria-hidden="true" />
            <span>
              {WEEKDAY_SHORT[todayIdx]} is a planned rest day. Rest counts as part of the plan — nothing is lost by taking it.
            </span>
          </div>
        )}
        {missions.length ? (
          <div className="briefing-grid">
            {missions.map((qp) => (
              <MissionCard key={qp.instance.instanceId} qp={qp} featured={qp.instance.slot === 'recommended'} onSwap={() => store.swapMission(qp.instance.slot!)} />
            ))}
          </div>
        ) : (
          <div className="panel muted">{rest ? 'No gentle activities are enabled for rest days. Enjoy the day off.' : 'No missions available — enable an activity in Settings.'}</div>
        )}
      </section>

      <div className="mc-lower">
        <section className="panel" aria-labelledby="qs-title">
          <div className="panel-head">
            <h2 id="qs-title">Quick start</h2>
            <a className="btn ghost small" href={href('start')}>
              All activities
            </a>
          </div>
          <div className="shortcut-grid">
            {shortcuts.map((m) => (
              <button key={m} className="shortcut" onClick={() => navigate(`start/${m}`)}>
                <ModalityIcon modality={m} boxed />
                <span>{modalityLabel(m, profile)}</span>
                <Play size={14} className="shortcut-go" aria-hidden="true" />
              </button>
            ))}
            <button className="shortcut" onClick={() => navigate('quick-log')}>
              <span className="domain-dot" aria-hidden="true">
                <ClipboardPlus size={16} />
              </span>
              <span>Log a finished session</span>
            </button>
          </div>
        </section>

        <section className="panel" aria-labelledby="status-title">
          <div className="panel-head">
            <h2 id="status-title">Field status</h2>
            <span className={`badge ${todayCount ? 'lime' : ''}`}>{todayCount ? `${todayCount} logged today` : 'Nothing logged today'}</span>
          </div>
          <div className="status-level">
            <LevelEmblem level={progress.level.level} size={52} />
            <div style={{ flex: 1 }}>
              <div className="row between small">
                <strong>Level {progress.level.level}</strong>
                <span className="muted num">
                  {progress.level.intoLevel} / {progress.level.span} XP
                </span>
              </div>
              <ProgressBar value={progress.level.intoLevel} max={progress.level.span} label="Progress to next level" lime />
            </div>
          </div>
          <div className="week-strip" aria-label={`This week: ${week.sessions} of ${target} sessions, active on ${week.activeDays} days`}>
            {week.dayActivity.map((on, i) => (
              <div key={i} className={`week-day ${on ? 'on' : ''} ${i === todayIdx ? 'today' : ''} ${profile.weeklyAvailability.length && !profile.weeklyAvailability.includes(i as 0) ? 'rest' : ''}`}>
                <span className="week-cell" aria-hidden="true">
                  {on ? '●' : ''}
                </span>
                <span className="tiny">{WEEKDAY_SHORT[i][0]}</span>
                <span className="sr-only">
                  {WEEKDAY_SHORT[i]}: {on ? 'active' : 'no session'}
                </span>
              </div>
            ))}
          </div>
          <p className="small muted" style={{ marginTop: 10 }}>
            {week.sessions === 0
              ? `Weekly contract: ${target} session${target === 1 ? '' : 's'}. Any activity counts.`
              : week.sessions >= target
                ? `Weekly contract met — ${week.sessions} sessions this week. Your field log is building a pattern.`
                : `You showed up ${week.sessions} time${week.sessions === 1 ? '' : 's'} this week · ${target - week.sessions} to your weekly contract.`}
          </p>
          {recentAch && (
            <a className="recent-ach" href={href('progress')}>
              <Award size={18} color="var(--reactor-orange)" aria-hidden="true" />
              <span>
                <span className="tiny muted">Latest achievement</span>
                <br />
                <strong>{recentAch.def.name}</strong>
              </span>
            </a>
          )}
          {!last && (
            <button className="btn primary block" style={{ marginTop: 16 }} onClick={() => missions[0] && navigate(`start/${missions[0].instance.suggestedModality}/${encodeURIComponent(missions[0].instance.instanceId)}`)}>
              <Play size={16} aria-hidden="true" /> Log your first session
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
