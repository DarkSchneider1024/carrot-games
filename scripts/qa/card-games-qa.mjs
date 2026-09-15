/**
 * Carrot Games — Card Games Playwright QA (大老二 / 麻將 / 德州撲克)
 *
 * Plays a full round of each game through the real UI (clicks only; the dev-only
 * window.__carrotQA hook is used to READ engine state and pick moves) and audits
 * every card / tile at checkpoints for:
 *   - viewport clipping (x / top) and "needs page scroll"
 *   - clipping by an overflow ancestor (partially cut / hidden)
 *   - occlusion by other UI (elementFromPoint sampling)
 *   - content overflowing the card box
 *
 * Usage (dev server must be running):
 *   QA_BASE=http://localhost:5199/ QA_OUT=docs/qa/run node scripts/qa/card-games-qa.mjs
 * Optional: QA_GAMES=big-two,mahjong,poker  QA_VIEWPORTS=laptop-1366x768  QA_HEADED=1
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.QA_BASE || 'http://localhost:5199/';
const OUT = path.resolve(process.env.QA_OUT || './qa-out');
const GAMES = (process.env.QA_GAMES || 'big-two,mahjong,poker').split(',');
const VP_FILTER = process.env.QA_VIEWPORTS ? process.env.QA_VIEWPORTS.split(',') : null;
const HEADED = !!process.env.QA_HEADED;

const VIEWPORTS = [
  { name: 'desktop-1920x1080', fullPlay: false, ctx: { viewport: { width: 1920, height: 1080 } } },
  { name: 'laptop-1366x768', fullPlay: true, ctx: { viewport: { width: 1366, height: 768 } } },
  { name: 'tablet-1024x768', fullPlay: false, ctx: { viewport: { width: 1024, height: 768 }, hasTouch: true } },
  { name: 'phone-landscape-844x390', fullPlay: true, ctx: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true } },
  { name: 'phone-portrait-390x844', fullPlay: false, ctx: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
];

const GAME_CFG = {
  'big-two': {
    route: '#/big-two/ai', root: '.bigtwo-page',
    cards: '.bigtwo-page .poker-card',
    controls: '#btn-bt-play, #btn-bt-pass',
    notice: '#btn-close-bt-notice',
  },
  mahjong: {
    route: '#/mahjong/ai', root: '.mahjong-page',
    cards: '.mahjong-page .mj-tile',
    controls: '#mj-actions-bar button, #mj-claim-panel button',
    notice: '#btn-close-mj-notice',
  },
  poker: {
    route: '#/poker/ai', root: '.poker-page',
    cards: '.poker-page .poker-card, .poker-page .card-slot',
    controls: '.poker-action-buttons button',
    notice: null,
  },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

/* ───────────────────────── In-page layout audit ───────────────────────── */
function pageAudit({ cardSel, controlSel, userOverlaySel }) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tol = 1;
  const out = [];
  const marks = [];
  const desc = (el) => {
    if (!el || el.nodeType !== 1) return String(el);
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    const cls = [...el.classList].filter((c) => !['selected', 'red', 'black'].includes(c)).slice(0, 3);
    if (cls.length) s += '.' + cls.join('.');
    return s;
  };
  const visible = (el) => el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  const overlaySel = '[class*="toast"], .speech-bubble, .action-bubble, .game-overlay, .orientation-rotate-notice, .orientation-rotate-notice-bt' + (userOverlaySel ? ', ' + userOverlaySel : '');
  const isTransient = (el) => !!el.closest(overlaySel);
  const add = (kind, severity, el, detail) => {
    out.push({ kind, severity, el: desc(el), parent: desc(el.parentElement), detail });
    marks.push(el);
  };

  const checkBox = (el, isCard) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;

    if (r.left < -tol || r.right > vw + tol) {
      add('viewport-clip-x', 'high', el, `x ${Math.round(r.left)}..${Math.round(r.right)} of vw ${vw}`);
    }
    const docTop = r.top + window.scrollY;
    if (docTop < -tol) add('viewport-clip-top', 'high', el, `doc top ${Math.round(docTop)}`);
    else if (r.bottom > vh + tol) add('needs-page-scroll', 'medium', el, `y ${Math.round(r.top)}..${Math.round(r.bottom)} of vh ${vh}`);

    // Clipping by overflow ancestors (report innermost offender)
    let clipped = false;
    for (let a = el.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
      const ar = a.getBoundingClientRect();
      const L = ar.left + a.clientLeft, T = ar.top + a.clientTop;
      const R = L + a.clientWidth, B = T + a.clientHeight;
      const cutX = cs.overflowX !== 'visible' && (r.left < L - tol || r.right > R + tol);
      const cutY = cs.overflowY !== 'visible' && (r.top < T - tol || r.bottom > B + tol);
      if (!cutX && !cutY) continue;
      const ix = Math.max(0, Math.min(r.right, R) - Math.max(r.left, L));
      const iy = Math.max(0, Math.min(r.bottom, B) - Math.max(r.top, T));
      const visFrac = (ix * iy) / (r.width * r.height);
      const scrollable = /(auto|scroll)/.test(cs.overflowX + ' ' + cs.overflowY);
      const axis = (cutX ? 'x' : '') + (cutY ? 'y' : '');
      if (visFrac <= 0.001) {
        add(scrollable ? 'hidden-in-scroll' : 'hidden-by-overflow', scrollable ? 'medium' : 'high', el, `by ${desc(a)} axis ${axis}`);
      } else if (scrollable && axis === 'x') {
        add('scroll-edge-cut', 'medium', el, `${Math.round((1 - visFrac) * 100)}% cut by ${desc(a)} axis x`);
      } else {
        add('partially-clipped', 'high', el, `${Math.round((1 - visFrac) * 100)}% cut by ${desc(a)} axis ${axis}`);
      }
      clipped = true;
      break;
    }
    if (clipped) return;

    // Occlusion sampling
    const pts = [[0.5, 0.5], [0.22, 0.22], [0.78, 0.22], [0.22, 0.78], [0.78, 0.78]];
    let tested = 0, blocked = 0, overlapCard = 0, blocker = null;
    for (const [fx, fy] of pts) {
      const x = r.left + r.width * fx, y = r.top + r.height * fy;
      if (x < 0 || y < 0 || x >= vw || y >= vh) continue;
      tested++;
      const top = document.elementFromPoint(x, y);
      if (!top || top === el || el.contains(top) || isTransient(top)) continue;
      if (isCard && top.closest(cardSel)) { overlapCard++; continue; }
      blocked++;
      blocker = blocker || top;
    }
    if (blocked > 0) {
      add('occluded', blocked >= 2 ? 'high' : 'medium', el, `${blocked}/${tested} pts covered by ${desc(blocker)} < ${desc(blocker.parentElement)}`);
    } else if (overlapCard >= 3 && !el.matches('.back, .card-back')) { // face-down fans overlap by design
      add('overlaps-other-card', 'low', el, `${overlapCard}/${tested} pts under another card`);
    }

    if (isCard && (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2)) {
      add('content-overflow', 'medium', el, `content ${el.scrollWidth}x${el.scrollHeight} > box ${el.clientWidth}x${el.clientHeight}`);
    }
  };

  const cards = [...document.querySelectorAll(cardSel)].filter(visible);
  cards.forEach((el) => checkBox(el, true));
  const controls = controlSel ? [...document.querySelectorAll(controlSel)].filter(visible) : [];
  controls.forEach((el) => checkBox(el, false));

  const docW = document.documentElement.scrollWidth;
  if (docW > vw + 1) out.push({ kind: 'page-horizontal-overflow', severity: 'medium', el: 'html', parent: '', detail: `scrollWidth ${docW} > vw ${vw}` });

  document.querySelectorAll('[data-qa-issue]').forEach((e) => e.removeAttribute('data-qa-issue'));
  marks.forEach((m) => m.setAttribute('data-qa-issue', ''));
  return { cardCount: cards.length, controlCount: controls.length, issues: out, docH: document.documentElement.scrollHeight };
}

/* ───────────────────────── Helpers ───────────────────────── */
async function isVisible(page, sel) {
  return page.locator(sel).first().isVisible().catch(() => false);
}

async function checkpoint(run, label, { settle = 350, userOverlay = null } = {}) {
  const { page, cfg } = run;
  await page.mouse.move(2, 2).catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(settle);
  const res = await page.evaluate(pageAudit, { cardSel: cfg.cards, controlSel: cfg.controls, userOverlaySel: userOverlay });
  const idx = String(run.checkpoints.length + 1).padStart(2, '0');
  const file = `${idx}-${label}.jpg`;
  await page.screenshot({ path: path.join(run.dir, file), type: 'jpeg', quality: 72 });
  run.checkpoints.push({
    label,
    file: path.relative(OUT, path.join(run.dir, file)).replace(/\\/g, '/'),
    cardCount: res.cardCount,
    docH: res.docH,
    issues: res.issues,
  });
  const hi = res.issues.filter((i) => i.severity === 'high').length;
  log(`  [${run.game}/${run.vp.name}] ${label}: cards=${res.cardCount} issues=${res.issues.length} (high ${hi})`);
  return res;
}

/** Click that survives an occluding chatbox: records it, collapses the chatbox and retries. */
async function safeClick(run, selector) {
  const { page } = run;
  const loc = page.locator(selector).first();
  try {
    await loc.click({ timeout: 4000 });
    return true;
  } catch (e) {
    const msg = String(e.message || e);
    const m = msg.match(/<[^>]+> (?:from <[^>]+> subtree )?intercepts pointer events/);
    run.play.notes.push(`click blocked on ${selector}: ${m ? m[0].slice(0, 160) : msg.split('\n')[0].slice(0, 160)}`);
    if (await isVisible(run.page, '#godgame-chatbox:not(.collapsed) #btn-toggle-chatbox')) {
      await page.click('#btn-toggle-chatbox').catch(() => {});
      await sleep(400);
      try { await loc.click({ timeout: 3000 }); return true; } catch {}
    }
    await loc.dispatchEvent('click').catch(() => {});
    return false;
  }
}

function makeStallWatch(ms) {
  let sig = '', since = Date.now();
  return (next) => {
    if (next !== sig) { sig = next; since = Date.now(); return false; }
    return Date.now() - since > ms;
  };
}

/* ───────────────────────── 大老二 bot ───────────────────────── */
async function btState(page) {
  return page.evaluate(() => {
    const e = window.__carrotQA?.engine();
    if (!e) return null;
    return {
      phase: e.gamePhase, turn: e.currentTurn, hand: e.players[0].hand.length,
      counts: e.players.map((p) => p.hand.length).join(','),
      last: e.lastCombo ? e.lastCombo.cards.map((c) => c.id).join(' ') : '',
      finished: e.players[0].isFinished,
    };
  });
}

async function playBigTwo(run, { full }) {
  const { page, play } = run;
  const t0 = Date.now();
  const limit = full ? 6 * 60e3 : 30e3;
  const stalled = makeStallWatch(15000);
  let humanTurns = 0, aiComboAudited = false, fiveAudited = false;

  while (Date.now() - t0 < limit) {
    if (await isVisible(page, '#bt-settlement-modal')) {
      await checkpoint(run, 'settlement-modal', { settle: 700 });
      play.completed = true;
      play.results.push((await page.locator('#settle-winner-name').innerText().catch(() => '')).trim());
      return;
    }
    const s = await btState(page);
    if (!s) { play.errors.push('QA hook missing'); return; }
    if (stalled(JSON.stringify(s))) {
      play.stalls.push(`state frozen 15s: ${JSON.stringify(s)}`);
      await checkpoint(run, 'stall');
      return;
    }
    if (s.phase !== 'PLAY' || s.turn !== 0 || s.finished) {
      if (full && !aiComboAudited && s.last && s.turn !== 0) {
        aiComboAudited = true;
        await checkpoint(run, 'ai-combo-on-table');
      }
      await sleep(250);
      continue;
    }

    const move = await page.evaluate(() => {
      const e = window.__carrotQA.engine();
      const hand = e.players[0].hand;
      if (!e.lastCombo) {
        const low = hand[0];
        for (const len of [5, 3, 2]) {
          const c = e._getPossibleCombos(hand, len).find((cs) => cs.some((x) => x.id === low.id) && e.canBeat(e.evaluateHandCombo(cs)));
          if (c) return c.map((x) => x.id);
        }
        return [low.id];
      }
      const need = e.lastCombo.cards.length;
      const c = e._getPossibleCombos(hand, need).find((cs) => e.canBeat(e.evaluateHandCombo(cs)));
      return c ? c.map((x) => x.id) : null;
    });

    humanTurns++;
    if (move) {
      for (const id of move) await safeClick(run, `#p1-hand-cards [data-card-id="${id}"]`);
      const want = humanTurns === 1 || (full && humanTurns % 4 === 0) || (move.length === 5 && !fiveAudited);
      if (move.length === 5) fiveAudited = true;
      if (want) await checkpoint(run, `human-selected-${move.length}-t${humanTurns}`);
      await safeClick(run, '#btn-bt-play');
    } else {
      await safeClick(run, '#btn-bt-pass');
    }
    await sleep(500);

    const s2 = await btState(page);
    if (s2 && s2.phase === 'PLAY' && s2.turn === 0 && s2.hand === s.hand && s2.last === s.last) {
      play.errors.push(`human action rejected: ${move ? move.join(' ') : 'PASS'} (last=${s.last || 'free'})`);
      for (let i = 0; i < 13 && (await page.locator('#p1-hand-cards .poker-card.selected').count()); i++) {
        await page.locator('#p1-hand-cards .poker-card.selected').first().click().catch(() => {});
      }
      if (move) { await safeClick(run, '#btn-bt-pass'); await sleep(500); }
      const s3 = await btState(page);
      if (s3 && s3.turn === 0 && s3.hand === s.hand && s3.last === s.last) {
        play.stalls.push('human cannot act (play and pass both rejected)');
        await checkpoint(run, 'human-stuck');
        return;
      }
    }
    if (!full && humanTurns >= 2) { play.completed = 'smoke'; return; }
  }
  play.stalls.push('time limit reached');
}

/* ───────────────────────── 麻將 bot ───────────────────────── */
async function mjState(page) {
  return page.evaluate(() => {
    const e = window.__carrotQA?.engine();
    if (!e) return null;
    return {
      phase: e.phase, turn: e.currentTurn, wall: e.wall.length, hand: e.players[0].hand.length,
      discards: e.discards.reduce((a, d) => a + d.length, 0),
      mine: (e.pendingClaims || []).filter((c) => c.playerIdx === 0).map((c) => c.type),
      result: e.winningResult ? `${e.winningResult.isDraw ? '流局' : e.winningResult.winnerName} ${e.winningResult.totalTai ?? ''}台` : null,
    };
  });
}

async function playMahjong(run, { full }) {
  const { page, play } = run;
  const t0 = Date.now();
  const limit = full ? 9 * 60e3 : 30e3;
  const stalled = makeStallWatch(15000);
  let humanTurns = 0, claimAudited = false, tingAudited = false, gameOverAt = 0, staleSince = 0, staleNoted = false;

  while (Date.now() - t0 < limit) {
    if (await isVisible(page, '#mj-settlement-modal')) {
      await checkpoint(run, 'settlement-modal', { settle: 700 });
      play.completed = true;
      const s = await mjState(page);
      play.results.push(s?.result || '');
      return;
    }
    const s = await mjState(page);
    if (!s) { play.errors.push('QA hook missing'); return; }
    if (stalled(JSON.stringify(s)) && s.phase !== 'GAME_OVER') {
      play.stalls.push(`state frozen 15s: ${JSON.stringify(s)}`);
      await checkpoint(run, 'stall');
      return;
    }

    if (s.phase === 'GAME_OVER') {
      gameOverAt = gameOverAt || Date.now();
      if (Date.now() - gameOverAt > 6000) {
        play.errors.push(`engine GAME_OVER (${s.result}) but no settlement UI shown`);
        play.results.push(s.result || '');
        play.completed = 'engine-only';
        await checkpoint(run, 'game-over-no-result-ui');
        return;
      }
      await sleep(300);
      continue;
    }

    const myClaim = s.phase === 'CLAIM' && s.mine.length > 0;
    const myDiscard = s.phase === 'PLAY' && s.turn === 0 && s.hand % 3 === 2;
    if (myClaim || myDiscard) {
      // Is the UI actually showing what the engine expects?
      const uiOk = myClaim
        ? await isVisible(page, '#mj-claim-panel')
        : (await page.locator('#p1-hand-tiles .mj-tile').count()) === s.hand;
      if (!uiOk) {
        staleSince = staleSince || Date.now();
        if (Date.now() - staleSince > 4000) {
          if (!staleNoted) play.errors.push(`UI not refreshed: engine awaits human ${myClaim ? 'claim' : 'discard'} but DOM is stale`);
          staleNoted = true;
          await page.locator('#p1-hand-tiles .mj-tile').first().click().catch(() => {}); // user taps a tile → forces re-render
          staleSince = 0;
        }
        await sleep(300);
        continue;
      }
      staleSince = 0;
    }

    if (myClaim) {
      if (full && !claimAudited) { claimAudited = true; await checkpoint(run, `claim-panel-${s.mine.join('-').toLowerCase()}`); }
      const take = s.mine.includes('WIN') || s.mine.includes('PONG');
      await safeClick(run, take ? '#btn-mj-do-claim' : '#btn-mj-pass-claim');
      await sleep(500);
      continue;
    }

    if (myDiscard) {
      if (await isVisible(page, '#btn-mj-hu')) {
        await checkpoint(run, 'self-draw-hu-button');
        await safeClick(run, '#btn-mj-hu');
        await sleep(700);
        continue;
      }
      const tile = await page.evaluate(() => {
        const e = window.__carrotQA.engine();
        if (typeof e.suggestDiscard === 'function') return e.suggestDiscard(0);
        const h = e.players[0].hand;
        return h.find((t) => t.length === 1 && h.filter((x) => x === t).length === 1) || h[h.length - 1];
      });
      humanTurns++;
      if (!(await page.locator(`#p1-hand-tiles .mj-tile.selected[data-tile="${tile}"]`).count())) {
        await safeClick(run, `#p1-hand-tiles .mj-tile[data-tile="${tile}"]`);
      }
      if (humanTurns === 1 || (full && humanTurns % 6 === 0)) await checkpoint(run, `human-selected-tile-t${humanTurns}`);
      if (full && !tingAudited && humanTurns === 3) {
        tingAudited = true;
        await safeClick(run, '#btn-mj-ting');
        await checkpoint(run, 'ting-hint-popover', { userOverlay: '.game-popover' });
        await safeClick(run, '#btn-mj-ting');
        if (!(await page.locator('#p1-hand-tiles .mj-tile.selected').count())) {
          await safeClick(run, `#p1-hand-tiles .mj-tile[data-tile="${tile}"]`);
        }
      }
      await safeClick(run, '#btn-mj-discard');
      await sleep(450);
      if (!full && humanTurns >= 2) { play.completed = 'smoke'; return; }
      continue;
    }
    await sleep(250);
  }
  play.stalls.push('time limit reached');
}

/* ───────────────────────── 德州撲克 bot ───────────────────────── */
async function pkState(page) {
  return page.evaluate(() => {
    const e = window.__carrotQA?.engine();
    if (!e) return null;
    const me = e.players[0];
    return {
      over: e.gameOver, turn: e.currentTurnIdx, stage: e.roundStage, pot: e.pot,
      toCall: e.currentBet - me.bet, chips: me.chips, folded: me.folded, allin: me.isAllIn,
      board: e.communityCards.length, msg: e.winnerMsg,
      seats: e.players.map((p) => `${p.chips}/${p.bet}${p.folded ? 'F' : ''}${p.isAllIn ? 'A' : ''}`).join(' '),
    };
  });
}

async function switchStakes(run, label) {
  const { page } = run;
  const btn = `.stakes-btn[data-label="${label}"]`;
  if (!(await isVisible(page, btn)) && (await isVisible(page, '#mtab-poker-setup'))) {
    await safeClick(run, '#mtab-poker-setup');
    await sleep(300);
    await safeClick(run, btn);
    await sleep(300);
    await safeClick(run, '#mtab-poker-game');
  } else {
    await safeClick(run, btn);
  }
  await sleep(400);
}

async function playPoker(run, { full }) {
  const { page, play } = run;
  const t0 = Date.now();
  const limit = full ? 6 * 60e3 : 40e3;
  const stalled = makeStallWatch(12000);
  let hands = 0, target = full ? 4 : 1, highStakes = false, decisions = 0, handAudited = false;
  const stageAudited = new Set();

  while (Date.now() - t0 < limit) {
    const s = await pkState(page);
    if (!s) { play.errors.push('QA hook missing'); return; }
    if (stalled(JSON.stringify(s)) && !s.over) {
      play.stalls.push(`state frozen 12s: ${JSON.stringify(s)}`);
      await checkpoint(run, 'stall');
      return;
    }

    if (s.over) {
      if (!handAudited) {
        handAudited = true;
        await sleep(300);
        const uiShowsResult = await isVisible(page, '#winner-banner');
        if (!uiShowsResult) play.errors.push(`hand over (${s.msg}) but winner banner not shown`);
        await checkpoint(run, `hand${hands + 1}-result`, { settle: 500 });
        play.results.push(`hand ${hands + 1}: ${s.msg}`);
      }
      hands++;
      if (hands >= target) {
        if (full && !highStakes) {
          highStakes = true;
          target++;
          await switchStakes(run, '豪客場');
          play.notes.push('switched to 豪客場 $100/$200 to exercise all-in paths');
        } else {
          play.completed = true;
          return;
        }
      }
      if (!(await isVisible(page, '#pbtn-next'))) {
        play.errors.push('NEXT HAND button not visible after hand end');
        await sleep(1500);
      }
      await safeClick(run, '#pbtn-next');
      handAudited = false;
      stageAudited.clear();
      await sleep(600);
      continue;
    }

    if (s.turn === 0 && !s.folded && !s.allin) {
      decisions++;
      if (decisions === 1 || (full && !stageAudited.has(s.stage))) {
        stageAudited.add(s.stage);
        await checkpoint(run, `my-turn-${s.stage.toLowerCase()}-h${hands + 1}`);
      }
      let btn;
      if (s.toCall <= 0) btn = '#pbtn-check';
      else if (s.toCall <= Math.max(s.chips * 0.35, 40)) btn = '#pbtn-call';
      else btn = '#pbtn-fold';
      const loc = page.locator(btn);
      if (!(await loc.isVisible()) || (await loc.isDisabled())) {
        play.errors.push(`expected ${btn} usable on my turn (toCall=${s.toCall}) but it is hidden/disabled`);
        btn = '#pbtn-fold';
      }
      await safeClick(run, btn);
      await sleep(450);
      continue;
    }
    await sleep(250);
  }
  play.stalls.push('time limit reached');
}

const PLAYERS = { 'big-two': playBigTwo, mahjong: playMahjong, poker: playPoker };

/* ───────────────────────── Reporting ───────────────────────── */
const SEV = { high: 0, medium: 1, low: 2 };
function aggregate(checkpoints) {
  const map = new Map();
  for (const cp of checkpoints) {
    for (const i of cp.issues) {
      const key = `${i.severity}|${i.kind}|${i.el}|${i.detail.replace(/-?\d+(\.\d+)?/g, '#')}`;
      const g = map.get(key) || { severity: i.severity, kind: i.kind, el: i.el, parent: i.parent, sample: i.detail, occurrences: 0, checkpoints: new Set() };
      g.occurrences++;
      g.checkpoints.add(cp.label);
      map.set(key, g);
    }
  }
  return [...map.values()]
    .map((g) => ({ ...g, checkpoints: [...g.checkpoints] }))
    .sort((a, b) => SEV[a.severity] - SEV[b.severity] || b.occurrences - a.occurrences);
}

function writeSummary(summary) {
  const L = [];
  L.push(`# Card Games QA — ${summary.label}`, '');
  L.push(`- Base: ${summary.base}`, `- Started: ${summary.startedAt}`, `- Finished: ${summary.finishedAt}`, '');
  L.push('| Game | Viewport | Play | Duration | High | Medium | Low | Page errors | Stalls | Flow errors |');
  L.push('|---|---|---|---|---|---|---|---|---|---|');
  for (const r of summary.runs) {
    const c = (sev) => r.issueGroups.filter((g) => g.severity === sev).reduce((a, g) => a + g.occurrences, 0);
    L.push(`| ${r.game} | ${r.viewport} | ${r.play.completed === true ? '✅ full round' : r.play.completed === 'smoke' ? '🔹 smoke' : r.play.completed ? `⚠️ ${r.play.completed}` : '❌ not finished'} | ${Math.round(r.play.durationMs / 1000)}s | ${c('high')} | ${c('medium')} | ${c('low')} | ${r.pageErrors.length} | ${r.play.stalls.length} | ${r.play.errors.length} |`);
  }
  L.push('');
  for (const r of summary.runs) {
    L.push(`## ${r.game} @ ${r.viewport}`, '');
    if (r.play.results.length) L.push('**Results:** ' + r.play.results.map((x) => `\`${x}\``).join(' · '), '');
    for (const [title, arr] of [['Stalls', r.play.stalls], ['Flow errors', r.play.errors], ['Notes', r.play.notes], ['Page errors', r.pageErrors], ['Console errors', r.console.slice(0, 8)]]) {
      if (arr.length) { L.push(`**${title}:**`, ...arr.map((x) => `- \`${String(x).replace(/`/g, "'").replace(/\n/g, ' ⏎ ')}\``), ''); }
    }
    if (r.issueGroups.length) {
      L.push('| Sev | Kind | Element | Sample | Hits | Checkpoints |', '|---|---|---|---|---|---|');
      for (const g of r.issueGroups.slice(0, 20)) {
        L.push(`| ${g.severity} | ${g.kind} | \`${g.el}\` in \`${g.parent}\` | ${g.sample} | ${g.occurrences} | ${g.checkpoints.slice(0, 4).join(', ')}${g.checkpoints.length > 4 ? '…' : ''} |`);
      }
      L.push('');
    } else {
      L.push('No layout issues detected.', '');
    }
    L.push('Screenshots: ' + r.checkpoints.map((cp) => `[${cp.label}](${cp.file})${cp.issueCount ? ` (${cp.issueCount}⚠)` : ''}`).join(' · '), '');
  }
  fs.writeFileSync(path.join(OUT, 'summary.md'), L.join('\n'));
}

/* ───────────────────────── Main ───────────────────────── */
const browser = await chromium.launch({ headless: !HEADED });
const summary = { label: process.env.QA_LABEL || path.basename(OUT), base: BASE, startedAt: new Date().toISOString(), runs: [] };
fs.mkdirSync(OUT, { recursive: true });

for (const game of GAMES) {
  const cfg = GAME_CFG[game];
  for (const vp of VIEWPORTS.filter((v) => !VP_FILTER || VP_FILTER.includes(v.name))) {
    const dir = path.join(OUT, game, vp.name);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const context = await browser.newContext({ ...vp.ctx, serviceWorkers: 'block', locale: 'zh-TW' });
    const page = await context.newPage();
    const run = { game, vp, cfg, page, dir, checkpoints: [], console: [], pageErrors: [], play: { completed: false, stalls: [], errors: [], notes: [], results: [] } };
    page.on('console', (m) => { if (m.type() === 'error') run.console.push(m.text().slice(0, 300)); });
    page.on('pageerror', (e) => run.pageErrors.push(String(e.stack || e).split('\n').slice(0, 3).join(' | ').slice(0, 500)));
    log(`▶ ${game} @ ${vp.name}`);
    const t0 = Date.now();
    try {
      await page.goto(BASE + cfg.route, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector(cfg.root, { timeout: 20000 });
      await page.waitForFunction(() => !!window.__carrotQA, null, { timeout: 10000 });
      await page.addStyleTag({ content: '[data-qa-issue]{outline:3px dashed #ff0040!important;outline-offset:-2px!important}' });
      await sleep(1200);
      if (cfg.notice && (await isVisible(page, cfg.notice))) {
        await checkpoint(run, 'rotate-notice');
        await page.click(cfg.notice);
      }
      await checkpoint(run, 'initial-deal');
      if (vp.fullPlay && (await isVisible(page, '#btn-chat-open'))) {
        await page.click('#btn-chat-open');
        await checkpoint(run, 'chatbox-opened', { userOverlay: '#godgame-chatbox' });
        await page.click('#btn-toggle-chatbox');
        await sleep(300);
      } else if (vp.fullPlay && (await isVisible(page, '#btn-toggle-chatbox'))) {
        await page.click('#btn-toggle-chatbox');
        await checkpoint(run, 'chatbox-toggled');
        await page.click('#btn-toggle-chatbox');
        await sleep(300);
      }
      await PLAYERS[game](run, { full: vp.fullPlay });
    } catch (e) {
      run.play.errors.push('EXCEPTION ' + String(e.message || e).split('\n')[0]);
      await checkpoint(run, 'exception').catch(() => {});
    }
    run.play.durationMs = Date.now() - t0;
    summary.runs.push({
      game, viewport: vp.name, fullPlay: vp.fullPlay, play: run.play,
      pageErrors: [...new Set(run.pageErrors)], console: [...new Set(run.console)],
      issueGroups: aggregate(run.checkpoints),
      checkpoints: run.checkpoints.map(({ issues, ...cp }) => ({ ...cp, issueCount: issues.length })),
    });
    log(`■ ${game} @ ${vp.name}: completed=${run.play.completed} stalls=${run.play.stalls.length} errors=${run.play.errors.length} pageErrors=${run.pageErrors.length}`);
    await context.close();
    summary.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(summary, null, 2));
    writeSummary(summary);
  }
}
await browser.close();
log('done →', OUT);
