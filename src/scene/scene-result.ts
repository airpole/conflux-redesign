/**
 * result 화면 DOM — 플랫 ES 모듈 + `data-action` 패턴(`ui-design.md` §8,
 * 원본은 React 프로토타입이라 그대로 이관하지 않는다).
 *
 * 카운트업·스탬프 등장 연출(§5)은 이 구현에 없다 — 데이터 바인딩과 키 계약이
 * 이번 범위의 핵심이고, 연출은 순수 시각 효과라 별도로 남긴다(Deferred).
 */

import type { Chart } from '../core/core-chart.js';
import type { ResultData } from '../game/game-session.js';
import {
  computeDelta,
  deltaColorVar,
  fastSlowColorVar,
  formatAccuracy,
  formatPlayedAt,
  formatScore,
  gaugeColorVar,
  gaugeLabel,
  histogramBuckets,
  judgmentColorVar,
  rankColorVar,
  stateColorVar,
  stateLabel,
  tierChipColors,
  timingStats,
} from './scene-result-format.js';

export interface ResultView {
  readonly chart: Pick<Chart, 'metadata' | 'difficulty' | 'subtitle'>;
  readonly result: ResultData;
  /** `null`이면 기록 없음 — 0 기준선(D-2026-054 §6.1). */
  readonly prevBest: { readonly score: number; readonly accuracy: number } | null;
  /** 활성 mod 이름 목록(예: "Mirror"). host가 조립한다. */
  readonly mods: readonly string[];
}

export interface ResultHandlers {
  readonly onRetry: () => void;
  readonly onBack: () => void;
}

export interface ResultSceneHandle {
  update(view: ResultView): void;
  destroy(): void;
}

/** 진입 후 이 시간 동안 키 입력을 완전히 막는다(§4 구현 조건). */
const INPUT_LOCKOUT_MS = 400;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  return node;
}

export function mountResultScene(
  target: HTMLElement,
  view: ResultView,
  handlers: ResultHandlers,
): ResultSceneHandle {
  target.classList.add('result-scene');

  // ── 정적 골격 ────────────────────────────────────────────
  const body = el('div', 'result-body');
  const songCol = el('div', 'song-col');
  const resultCol = el('div', 'result-col');
  body.append(songCol, resultCol);

  const jacket = el('div', 'jacket');
  const title = el('div', 'title');
  const musicBy = el('div', 'music-by');
  const spacer = el('div', 'spacer');
  const tierRow = el('div', 'tier-row');
  const tierChip = el('span', 'tier-chip');
  const subtitle = el('span', 'subtitle');
  tierRow.append(tierChip, subtitle);
  const optionsList = el('div', 'options-list');
  const gaugeOptLine = el('div');
  const modsOptLine = el('div');
  const playedOptLine = el('div');
  optionsList.append(gaugeOptLine, modsOptLine, playedOptLine);
  songCol.append(jacket, title, musicBy, spacer, tierRow, optionsList);

  const scoreRow = el('div', 'score-row');
  const scoreEl = el('span', 'num accent-score');
  const rankEl = el('span', 'num');
  const stateEl = el('span');
  scoreRow.append(scoreEl, rankEl, stateEl);
  const accuracyRow = el('div', 'num accuracy-row');

  const rule1 = el('hr', 'section-rule');
  const recordsGrid = el('div', 'records-grid');
  const rule2 = el('hr', 'section-rule');
  const judgingRow = el('div', 'judging-row');

  resultCol.append(scoreRow, accuracyRow, rule1, recordsGrid, rule2, judgingRow);

  // records grid rows: Best score / Best acc / Max combo
  function recordRow(label: string): { value: HTMLSpanElement; delta: HTMLSpanElement } {
    const labelEl = el('div', 'label micro-label');
    labelEl.textContent = label;
    const value = el('span', 'num value');
    const delta = el('span', 'num delta');
    recordsGrid.append(labelEl, value, delta);
    return { value, delta };
  }
  const bestScoreRow = recordRow('Best score');
  const bestAccRow = recordRow('Best acc');
  const maxComboRow = recordRow('Max combo');

  // [3] 판정 열
  const judgmentCol = el('div', 'judgment-col');
  const judgmentHeader = el('div', 'micro-label');
  judgmentHeader.textContent = 'Judgment';
  const judgmentList = el('div', 'judgment-list');
  const judgmentRows: Record<'SYNC' | 'PERFECT' | 'GOOD' | 'MISS', HTMLSpanElement> = {
    SYNC: el('span', 'num value'),
    PERFECT: el('span', 'num value'),
    GOOD: el('span', 'num value'),
    MISS: el('span', 'num value'),
  };
  for (const key of ['SYNC', 'PERFECT', 'GOOD', 'MISS'] as const) {
    const labelEl = el('span');
    labelEl.textContent = key;
    judgmentList.append(labelEl, judgmentRows[key]);
  }
  const judgmentTotal = el('div', 'judgment-total');
  const judgmentTotalLabel = el('span', 'micro-label');
  judgmentTotalLabel.textContent = 'Total notes';
  const judgmentTotalValue = el('span', 'num');
  judgmentTotal.append(judgmentTotalLabel, judgmentTotalValue);

  const gaugeGraph = el('div', 'gauge-graph');
  const gaugeLabelEl = el('div', 'micro-label');
  gaugeLabelEl.textContent = 'Gauge';
  const gaugeGraphRow = el('div', 'row');
  const gaugeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  gaugeSvg.setAttribute('viewBox', '0 0 100 100');
  gaugeSvg.setAttribute('preserveAspectRatio', 'none');
  const gaugePath = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  gaugePath.setAttribute('fill', 'none');
  gaugePath.setAttribute('stroke-width', '2');
  gaugeSvg.append(gaugePath);
  const gaugeRemaining = el('span', 'num remaining');
  gaugeGraphRow.append(gaugeSvg, gaugeRemaining);
  gaugeGraph.append(gaugeLabelEl, gaugeGraphRow);

  judgmentCol.append(judgmentHeader, judgmentList, judgmentTotal, gaugeGraph);

  // 타이밍 열
  const timingCol = el('div', 'timing-col');
  const timingHeader = el('div', 'micro-label');
  timingHeader.textContent = 'Timing';
  const timingHistogram = el('div', 'timing-histogram');
  const timingAxis = el('div', 'timing-axis');
  const axisLeft = el('span');
  axisLeft.textContent = '−50';
  const axisMid = el('span');
  axisMid.textContent = '0';
  const axisRight = el('span');
  axisRight.textContent = '+50';
  timingAxis.append(axisLeft, axisMid, axisRight);
  const timingStatsRow = el('div', 'timing-stats');
  const averageStat = el('span');
  const spreadStat = el('span');
  timingStatsRow.append(averageStat, spreadStat);

  const balanceBar = el('div', 'balance-bar');
  const balanceRow = el('div', 'row');
  const fastLabel = el('span', 'num');
  const balanceTrack = el('div', 'track');
  const fastFill = el('div', 'fill');
  const slowFill = el('div', 'fill');
  balanceTrack.append(fastFill, slowFill);
  const slowLabel = el('span', 'num');
  balanceRow.append(fastLabel, balanceTrack, slowLabel);
  balanceBar.append(balanceRow);

  timingCol.append(timingHeader, timingHistogram, timingAxis, timingStatsRow, balanceBar);

  judgingRow.append(judgmentCol, timingCol);

  // footer
  const footer = el('div', 'result-footer');
  const backBtn = el('button');
  backBtn.type = 'button';
  backBtn.tabIndex = -1;
  backBtn.dataset.action = 'back';
  backBtn.textContent = 'BACKSPACE — Back';
  const retryBtn = el('button');
  retryBtn.type = 'button';
  retryBtn.tabIndex = -1;
  retryBtn.dataset.action = 'retry';
  retryBtn.textContent = 'ENTER — Retry';
  footer.append(backBtn, retryBtn);

  const live = el('div');
  live.setAttribute('aria-live', 'polite');
  live.className = 'sr-only';
  live.style.position = 'absolute';
  live.style.width = '1px';
  live.style.height = '1px';
  live.style.overflow = 'hidden';

  target.append(body, footer, live);

  // ── 키 계약(§4) ──────────────────────────────────────────
  const mountedAt = Date.now();
  let introSkipped = false;

  function attempt(action: 'retry' | 'back'): void {
    if (Date.now() - mountedAt < INPUT_LOCKOUT_MS) return; // 완전 락아웃.
    if (!introSkipped) {
      introSkipped = true; // 첫 입력은 연출 스킵으로 소비.
      return;
    }
    if (action === 'retry') handlers.onRetry();
    else handlers.onBack();
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      attempt('retry');
    } else if (event.key === 'Backspace') {
      event.preventDefault();
      attempt('back');
    }
  }
  document.addEventListener('keydown', onKeyDown);

  backBtn.addEventListener('click', () => attempt('back'));
  retryBtn.addEventListener('click', () => attempt('retry'));

  // ── 렌더 ────────────────────────────────────────────────
  function render(v: ResultView): void {
    const { result, chart, prevBest, mods } = v;

    title.textContent = chart.metadata.title;
    musicBy.textContent = `Music by ${chart.metadata.musicBy}`;

    const chip = tierChipColors(chart.difficulty);
    if (chip === null) {
      tierChip.hidden = true;
    } else {
      tierChip.hidden = false;
      tierChip.textContent = chart.difficulty.toUpperCase();
      tierChip.style.background = chip.bg;
      tierChip.style.color = chip.ink;
    }
    subtitle.textContent = chart.subtitle !== '' ? `[${chart.subtitle}]` : '';
    subtitle.hidden = chart.subtitle === '';

    gaugeOptLine.textContent = `Gauge: ${gaugeLabel(result.tier)}`;
    gaugeOptLine.style.color = gaugeColorVar(result.tier);
    modsOptLine.textContent = mods.length > 0 ? `Mods: ${mods.join(', ')}` : 'Mods: —';
    playedOptLine.textContent = `Played: ${formatPlayedAt(result.playedAt)}`;

    scoreEl.textContent = formatScore(result.score);
    rankEl.textContent = result.rank;
    rankEl.style.color = rankColorVar(result.rank);
    stateEl.textContent = stateLabel(result.state);
    stateEl.style.color = stateColorVar(result.state);
    accuracyRow.textContent = formatAccuracy(result.accuracy);

    const bestScore = prevBest?.score ?? 0;
    const bestAcc = prevBest?.accuracy ?? 0;
    bestScoreRow.value.textContent = formatScore(bestScore);
    const scoreDelta = computeDelta(result.score, bestScore, 0);
    bestScoreRow.delta.textContent = scoreDelta.text;
    bestScoreRow.delta.style.color = deltaColorVar(scoreDelta.sign);

    bestAccRow.value.textContent = formatAccuracy(bestAcc);
    const accDelta = computeDelta(result.accuracy, bestAcc, 2);
    bestAccRow.delta.textContent = `${accDelta.text}%`;
    bestAccRow.delta.style.color = deltaColorVar(accDelta.sign);

    maxComboRow.value.textContent = String(result.maxCombo);
    maxComboRow.delta.textContent = '';

    for (const key of ['SYNC', 'PERFECT', 'GOOD', 'MISS'] as const) {
      judgmentRows[key].textContent = String(result.counts[key]);
    }
    const totalNotes =
      result.counts.SYNC + result.counts.PERFECT + result.counts.GOOD + result.counts.MISS;
    judgmentTotalValue.textContent = String(totalNotes);

    // 게이지 궤적 — SVG polyline, y는 100(0%) 위가 0(100%).
    const trace = result.gaugeTrace;
    const points =
      trace.length <= 1
        ? ''
        : trace
            .map((value, i) => {
              const x = (i / (trace.length - 1)) * 100;
              const y = 100 - value;
              return `${x},${y}`;
            })
            .join(' ');
    gaugePath.setAttribute('points', points);
    gaugePath.setAttribute('stroke', gaugeColorVar(result.tier));
    const remaining = trace.length > 0 ? trace[trace.length - 1]! : 0;
    gaugeRemaining.textContent = `${remaining.toFixed(0)}%`;

    // 타이밍 히스토그램
    timingHistogram.replaceChildren();
    const buckets = histogramBuckets(result.timingErrors);
    const maxCount = Math.max(1, ...buckets.map((b) => b.count));
    for (const bucket of buckets) {
      const bar = el('div', 'bar');
      bar.style.height = `${(bucket.count / maxCount) * 100}%`;
      bar.style.background = judgmentColorVar(Math.abs(bucket.centerMs));
      timingHistogram.append(bar);
    }
    const stats = timingStats(result.timingErrors);
    averageStat.textContent = stats.count > 0 ? `Average ${stats.mean.toFixed(1)}ms` : 'Average —';
    spreadStat.textContent = stats.count > 0 ? `Spread ${stats.sigma.toFixed(1)}ms` : 'Spread —';

    // FAST/SLOW 균형 바 — 중앙 기준 좌우로 채운다. msToPct는 여기 쓰지 않는다
    // (그건 히스토그램 x축 사영이고, 균형 바는 개수 비율이다).
    const fastSlowTotal = result.fastCount + result.slowCount;
    const fastPct = fastSlowTotal > 0 ? (result.fastCount / fastSlowTotal) * 50 : 0;
    const slowPct = fastSlowTotal > 0 ? (result.slowCount / fastSlowTotal) * 50 : 0;
    fastFill.style.left = `${50 - fastPct}%`;
    fastFill.style.width = `${fastPct}%`;
    fastFill.style.background = fastSlowColorVar(result.fastCount, 'FAST');
    slowFill.style.left = '50%';
    slowFill.style.width = `${slowPct}%`;
    slowFill.style.background = fastSlowColorVar(result.slowCount, 'SLOW');
    fastLabel.textContent = `FAST ${result.fastCount}`;
    fastLabel.style.color = fastSlowColorVar(result.fastCount, 'FAST');
    slowLabel.textContent = `SLOW ${result.slowCount}`;
    slowLabel.style.color = fastSlowColorVar(result.slowCount, 'SLOW');

    live.textContent =
      `${chart.metadata.title} 결과: ${stateLabel(result.state)}, ` +
      `랭크 ${result.rank}, 점수 ${formatScore(result.score)}, ` +
      `정확도 ${formatAccuracy(result.accuracy)}.`;
  }

  render(view);

  return {
    update: render,
    destroy(): void {
      document.removeEventListener('keydown', onKeyDown);
      target.replaceChildren();
      target.classList.remove('result-scene');
    },
  };
}
