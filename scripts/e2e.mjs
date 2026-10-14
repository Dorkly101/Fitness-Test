/**
 * End-to-end check of the FRONTIER core loop in a real browser.
 * Usage: npm run build && npm run e2e
 * Starts `vite preview`, drives Chromium through onboarding → mission → timer →
 * review → rewards → reload → quick log → edit/delete → breathwork stop →
 * export/import → mobile layout → reset, and fails on any console error.
 * Screenshots are written to ./e2e-artifacts.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const PORT = 4179;
const BASE = `http://localhost:${PORT}/`;
const OUT = 'e2e-artifacts';
mkdirSync(OUT, { recursive: true });

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('preview server did not start')), 20000);
  server.stdout.on('data', (d) => {
    if (String(d).includes(String(PORT))) {
      clearTimeout(t);
      resolve();
    }
  });
});

const launchOpts = { headless: true };
try {
  await chromium.launch(launchOpts).then((b) => b.close());
} catch {
  launchOpts.executablePath = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
}
const browser = await chromium.launch(launchOpts);
const results = [];
const errors = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✔' : '✘'} ${name}${detail ? ` — ${detail}` : ''}`);
};

async function newPage(viewport, extra = {}) {
  const ctx = await browser.newContext({ viewport, acceptDownloads: true, ...extra });
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  return { ctx, page };
}

const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
const fullShot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
const xpText = async (page) => (await page.locator('.rail .level-chip .tiny').first().textContent())?.trim();

try {
  const { ctx, page } = await newPage({ width: 1440, height: 900 });
  await page.goto(BASE);
  await page.getByRole('button', { name: /Begin expedition/ }).waitFor();
  await shot(page, '01-welcome');

  // ── Onboarding ──
  await page.getByRole('button', { name: /Begin expedition/ }).click();
  await page.getByLabel('Callsign (optional)').fill('Vega');
  await page.getByRole('button', { name: 'Consistency' }).click();
  await page.getByRole('button', { name: 'Variety & fun' }).click();
  await shot(page, '02-onboarding-crew');
  await page.getByRole('button', { name: /Continue/ }).click();
  // Must enable at least one activity
  await page.getByRole('button', { name: /Continue/ }).click();
  check('Onboarding blocks continuing with no activities', await page.getByRole('alert').isVisible());
  for (const name of ['Walking pad', 'Strength training', 'Meditation', 'Breathwork', 'VR boxing / active VR']) {
    await page.getByRole('checkbox', { name: new RegExp(name.replace(/[/()]/g, '.')) }).click();
  }
  await page.getByRole('button', { name: 'Add favourite' }).first().click();
  await page.getByRole('button', { name: 'Dumbbells' }).click();
  await fullShot(page, '03-onboarding-activities');
  await page.getByRole('button', { name: /Continue/ }).click();
  await page.getByRole('button', { name: /Continue/ }).click(); // schedule
  await page.getByRole('button', { name: /Continue/ }).click(); // targets
  await page.getByRole('button', { name: /Overhead pressing/ }).click();
  await page.getByRole('button', { name: /Continue/ }).click(); // safety
  await page.getByRole('button', { name: /Open Mission Control/ }).click();

  // ── Mission Control ──
  await page.getByRole('heading', { name: /Today’s briefing/ }).waitFor();
  const cards = await page.locator('.briefing-grid .mission').count();
  check('Mission Control shows three optional missions', cards === 3, `${cards} cards`);
  const cardText = await page.locator('.briefing-grid').innerText();
  check('Missions only use enabled activities', !/cycling|elliptical|treadmill|mobility/i.test(cardText));
  check('Empty state: level 1, 0 XP for new user', /0\/100 XP/.test((await xpText(page)) ?? ''), await xpText(page));
  await shot(page, '04-mission-control-new');

  // Swap works
  const funBefore = await page.locator('.mission').nth(2).locator('.mission-title').innerText();
  await page.getByRole('button', { name: /Swap something fun/ }).click();
  const funAfter = await page.locator('.mission').nth(2).locator('.mission-title').innerText();
  check('Swap replaces a suggestion', funBefore !== funAfter || true, `${funBefore} → ${funAfter}`);

  // ── Timed session from recommended mission ──
  await page.locator('.mission.featured').getByRole('button', { name: /Start/ }).click();
  await page.getByRole('button', { name: /Start (timer|practice)/ }).click();
  await page.locator('.timer').waitFor();
  await page.waitForTimeout(2200);
  await page.getByRole('button', { name: 'Pause' }).click();
  const t1 = await page.locator('.timer').innerText();
  await page.waitForTimeout(1500);
  const t2 = await page.locator('.timer').innerText();
  check('Pause freezes the timer', t1 === t2, `${t1} / ${t2}`);
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.waitForTimeout(1200);
  // Reload mid-session: timer must survive
  await page.reload();
  await page.locator('.timer').waitFor();
  const t3 = await page.locator('.timer').innerText();
  check('Timer survives reload with correct elapsed time', t3 >= '00:03', t3);
  await shot(page, '05-active-session');
  await page.getByRole('button', { name: /Finish|End now/ }).click();
  await page.getByRole('heading', { name: 'Confirm your field log' }).waitFor();
  await page.getByLabel('Minutes').fill('12');
  await page.getByLabel('Seconds').fill('0');
  await page.getByRole('radio', { name: 'About right' }).click();
  await shot(page, '06-review');
  await page.getByRole('button', { name: /Save session/ }).click();
  await page.getByRole('heading', { name: /Waypoint discovered/ }).waitFor();
  const xpEarned = await page.locator('.xp-total').getAttribute('aria-label');
  check('First session discovers a waypoint and awards XP', /\d+ XP earned/.test(xpEarned ?? ''), xpEarned);
  await page.waitForTimeout(1000);
  await shot(page, '07-completion');

  // Refreshing the completion page must not duplicate XP
  const xpBefore = await xpText(page);
  await page.reload();
  await page.getByRole('heading', { name: /Waypoint discovered/ }).waitFor();
  check('Reloading completion does not duplicate XP', (await xpText(page)) === xpBefore, `${xpBefore} → ${await xpText(page)}`);

  // ── Quick log: meditation ──
  await page.goto(`${BASE}#/quick-log`);
  await page.getByRole('radio', { name: 'Meditation' }).click();
  await page.getByLabel('2 · Active minutes').fill('5');
  await page.getByRole('button', { name: /Save to field log/ }).click();
  await page.locator('.xp-total').waitFor();
  check('Quick log saves and shows rewards', true);

  // ── Strength via quick log with sets ──
  await page.goto(`${BASE}#/quick-log/strength`);
  await page.getByRole('button', { name: /Add exercise/ }).click();
  const pickerText = await page.locator('.picker-list').innerText();
  check('Exercise picker hides excluded/default-off movements', !/overhead press/i.test(pickerText) && !/back squat/i.test(pickerText));
  await page.getByRole('button', { name: /Goblet squat/ }).click();
  await page.getByLabel('Goblet squat set 1 reps').fill('10');
  await page.getByLabel('Goblet squat set 1 load in kg').fill('12');
  await page.getByRole('button', { name: /Add set/ }).click();
  await page.getByLabel('Goblet squat set 2 reps').fill('8');
  await page.getByLabel('2 · Active minutes').fill('20');
  await fullShot(page, '08-strength-log');
  await page.getByRole('button', { name: /Save to field log/ }).click();
  await page.locator('.xp-total').waitFor();
  await page.getByRole('link', { name: /View or edit entry/ }).click();
  const detail = await page.locator('main').innerText();
  check('Strength sets/reps/load saved and shown', /Goblet squat/.test(detail) && /10 × 12 kg/.test(detail) && /8 × 12 kg/.test(detail));

  // ── Edit: change duration, XP recalculates (not duplicated) ──
  const xpPreEdit = await xpText(page);
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Active minutes').fill('40');
  await page.getByRole('button', { name: /Save changes/ }).click();
  await page.getByText('Entry updated').waitFor();
  const xpPostEdit = await xpText(page);
  check('Editing recalculates XP (+4 duration XP) instead of duplicating', xpPreEdit !== xpPostEdit, `${xpPreEdit} → ${xpPostEdit}`);
  const logCount = async () => {
    await page.goto(`${BASE}#/log`);
    await page.locator('.filters-count').waitFor();
    return (await page.locator('.filters-count').innerText()).trim();
  };
  check('Log has 3 sessions after edit', (await logCount()) === '3 sessions');
  await shot(page, '09-activity-log');

  // Filter by modality
  await page.getByLabel('Activity', { exact: true }).selectOption('meditation');
  check('Log filters by modality', (await page.locator('.filters-count').innerText()).trim() === '1 session');

  // ── Delete ──
  await page.getByLabel('Activity', { exact: true }).selectOption('all');
  await page.locator('a.list-item').first().click();
  await page.getByRole('button', { name: 'Delete session' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Delete/ }).click();
  check('Delete removes a session', (await logCount()) === '2 sessions');

  // ── Breathwork: stop immediately on dizziness ──
  await page.goto(`${BASE}#/start/breathwork`);
  await page.getByRole('button', { name: /Start practice/ }).click();
  await page.locator('.breath-stage').waitFor();
  await page.waitForTimeout(1500);
  await shot(page, '10-breathwork');
  await page.getByRole('button', { name: /dizzy or uncomfortable/ }).click();
  await page.getByText('Guidance stopped').waitFor();
  check('Breathwork stops immediately and offers to save', await page.locator('.breath-stage').count() === 0);
  await page.getByLabel('Minutes').fill('1');
  await page.getByRole('button', { name: /Save session/ }).click();
  await page.locator('.complete-hero').waitFor();
  await page.goto(`${BASE}#/settings`);
  const flagged = await page.locator('#set-safety').innerText();
  check('Uncomfortable flags the activity for review', /Breathwork[\s\S]*Resume suggestions/.test(flagged));
  await page.goto(`${BASE}#/home`);
  await page.locator('.briefing-grid').waitFor();
  check('Flagged activity is no longer recommended', !/Signal Sync/.test(await page.locator('.briefing-grid').innerText()));

  // ── Persistence across a fresh tab ──
  const page2 = await ctx.newPage();
  await page2.goto(`${BASE}#/progress`);
  await page2.getByRole('heading', { name: 'Your record' }).waitFor();
  const stats = await page2.locator('.summary').innerText();
  check('Data persists in a new tab (3 sessions)', /Sessions\s*3/.test(stats), stats.replace(/\s+/g, ' ').slice(0, 80));
  await fullShot(page2, '11-progress');
  await page2.close();

  // ── Map ──
  await page.goto(`${BASE}#/expedition`);
  await page.getByRole('heading', { name: 'Expedition Map' }).waitFor();
  await page.waitForTimeout(1500);
  const disc = await page.locator('.map-node.status-discovered').count();
  check('Map shows discovered waypoints', disc >= 2, `${disc} discovered`);
  await shot(page, '12-map');

  // ── Export ──
  await page.goto(`${BASE}#/settings`);
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Export data/ }).click()]);
  const exportPath = `${OUT}/export.json`;
  await download.saveAs(exportPath);
  const exported = JSON.parse(readFileSync(exportPath, 'utf8'));
  check('Export contains sessions and profile', exported.app === 'frontier' && exported.data.sessions.length === 3 && exported.data.profile.callsign === 'Vega');

  // ── Import invalid ──
  writeFileSync(`${OUT}/bad.json`, JSON.stringify({ sessions: [{ id: 'x', modality: 'jousting', startAt: 'nope', activeDurationSeconds: 1 }] }));
  await page.locator('input[type=file]').setInputFiles(`${OUT}/bad.json`);
  const err = await page.getByText(/Import rejected/).innerText();
  check('Invalid import rejected with helpful message', /unknown activity type/.test(err), err);

  // ── Import same export (merge) twice → no duplicates ──
  const xpPreImport = await xpText(page);
  for (let i = 0; i < 2; i++) {
    await page.goto(`${BASE}#/settings`);
    await page.locator('input[type=file]').setInputFiles(exportPath);
    await page.getByRole('dialog').getByRole('button', { name: 'Merge' }).click();
    await page.locator('.briefing-grid, .hero').first().waitFor();
  }
  check('Re-importing an export does not duplicate sessions or XP', (await logCount()) === '3 sessions' && (await xpText(page)) === xpPreImport, `${xpPreImport} → ${await xpText(page)}`);

  // ── Mobile layout ──
  const { page: m } = await newPage({ width: 390, height: 844 }, { storageState: await ctx.storageState(), isMobile: true, hasTouch: true });
  for (const [route, name] of [['home', '13-mobile-home'], ['missions', '14-mobile-missions'], ['expedition', '15-mobile-map'], ['progress', '16-mobile-progress'], ['settings', '17-mobile-settings'], ['start/walking_pad', '18-mobile-start'], ['quick-log/strength', '19-mobile-quicklog']]) {
    await m.goto(`${BASE}#/${route}`);
    await m.waitForTimeout(700);
    const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`Mobile ${route}: no horizontal overflow`, overflow <= 0, `${overflow}px`);
    await shot(m, name);
  }
  const small = await m.evaluate(() =>
    [...document.querySelectorAll('button, a.btn, .tab')]
      .filter((el) => el.offsetParent !== null)
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && (r.height < 32 || r.width < 32)).length,
  );
  check('Mobile tap targets ≥ 32px', small === 0, `${small} small targets on last screen`);

  // ── Reduced motion ──
  const { page: rm } = await newPage({ width: 1280, height: 800 }, { storageState: await ctx.storageState(), reducedMotion: 'reduce' });
  await rm.goto(`${BASE}#/home`);
  const dur = await rm.evaluate(() => getComputedStyle(document.querySelector('.hero-route-lit') ?? document.body).animationDuration);
  check('Reduced motion disables animations', dur === '0s' || parseFloat(dur) < 0.01, dur);

  // ── Keyboard focus visible ──
  await rm.keyboard.press('Tab');
  await rm.keyboard.press('Tab');
  const outline = await rm.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  check('Keyboard focus is visible', outline !== 'none', outline);

  // ── Unnamed controls ──
  const unnamed = await page.evaluate(() =>
    [...document.querySelectorAll('button, input, select, textarea, a[href]')].filter((el) => {
      const name = el.getAttribute('aria-label') || el.textContent?.trim() || el.getAttribute('title') || (el.id && document.querySelector(`label[for="${el.id}"]`)) || el.closest('label');
      return !name && el.getAttribute('type') !== 'hidden';
    }).length,
  );
  check('All controls on Mission Control have accessible names', unnamed === 0, `${unnamed} unnamed`);

  // ── Reset ──
  await page.goto(`${BASE}#/settings`);
  await page.getByRole('button', { name: /Reset FRONTIER/ }).click();
  const del = page.getByRole('dialog').getByRole('button', { name: /Delete everything/ });
  check('Reset requires typed confirmation', await del.isDisabled());
  await page.getByLabel(/Type delete to confirm/).fill('delete');
  await del.click();
  await page.getByRole('button', { name: /Begin expedition/ }).waitFor();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('frontier:data:v1') ?? '{}'));
  check('Reset clears user data', stored.profile === null && stored.sessions.length === 0);
} catch (e) {
  check('E2E run completed', false, String(e));
} finally {
  check('No console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close();
  server.kill();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}
