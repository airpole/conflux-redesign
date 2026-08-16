/**
 * `core/gauge.md`의 대조.
 *
 * 골든 `gauge.json`은 원본의 **2축**(`gaugeType` × `lockTarget`)으로 뽑혔고
 * 재설계는 단일 `gaugeMode` 6종이다. 매핑은 §1에 한 곳으로 모았다 — 관측 자료는
 * 관측 대상의 이름을 쓰고 매핑표가 한 곳에 모여야 개명 누락이 드러난다.
 *
 * state·score·accuracy·rank 산출은 §7이 골든 `result.json`으로 채점한다 —
 * 셋 다 `[보존]`이면서도 골든이 닿지 않아 주장 자체를 확인할 길이 없던 자리다
 * (D-2026-044). 남은 미커버는 GA-3·GA-4이며 §3·§4가 판정자다.
 */
import { describe, expect, it } from 'vitest';

import {
  GAUGE_MODES,
  GAUGE_MODE_TABLE,
  TIER_LADDER,
  applyGaugeChange,
  computeResult,
  evaluateState,
  resetGauge,
  scoreToRank,
  type GaugeMode,
  type GaugeState,
  type Tier,
} from './core-gauge.js';
import { buildJudgeNotes, type Judgment } from './core-judge.js';
import { buildTimeline } from './core-timing.js';
import { NORMAL_CLEAR_PCT } from './core-constants.js';
import { makeChart } from './core-chart-fixture.js';
import { loadGolden, realEquals } from '../../tests/support/golden.js';
import { expectDivergence } from '../../tests/support/divergences.js';

/** 판정 열을 순서대로 먹인다. 단위는 전부 1 — 골든이 그렇게 뽑혔다. */
function feed(state: GaugeState, sequence: readonly Judgment[]): void {
  for (const judgment of sequence) applyGaugeChange(state, judgment);
}

function play(mode: GaugeMode, totalUnits: number, sequence: readonly Judgment[]): GaugeState {
  const state = resetGauge(mode, totalUnits);
  feed(state, sequence);
  return state;
}

// ── §1. 골든 대조 ───────────────────────────────────────────

/** 원본 6종 kind → 재설계 판정 4종. TAIL 특례 폐기가 이 두 줄이다. */
const KIND_MAP: Readonly<Record<string, Judgment>> = {
  SYNC: 'SYNC',
  PERFECT: 'PERFECT',
  GOOD: 'GOOD',
  MISS: 'MISS',
  TAIL_OK: 'SYNC',
  TAIL_MISS: 'MISS',
};

const SEQUENCES: Readonly<Record<string, readonly string[]>> = {
  allSync: Array<string>(24).fill('SYNC'),
  allMiss: Array<string>(24).fill('MISS'),
  mixed: [
    'SYNC',
    'SYNC',
    'GOOD',
    'MISS',
    'SYNC',
    'PERFECT',
    'MISS',
    'MISS',
    'SYNC',
    'GOOD',
    'TAIL_OK',
    'TAIL_MISS',
  ],
  lateCollapse: [...Array<string>(12).fill('SYNC'), ...Array<string>(12).fill('MISS')],
  tailOnly: ['TAIL_OK', 'TAIL_MISS', 'TAIL_OK', 'TAIL_MISS'],
};

interface GaugeCase {
  readonly gaugeType: 'normal' | 'hard';
  readonly lockTarget: 'none' | 'fc' | 'ap' | 'as';
  readonly sequence: string;
  readonly expected: {
    readonly unitScale: number;
    readonly trace: readonly number[];
    readonly forceEndedAt: number | null;
    readonly lockTier: string;
    readonly evaluateEnd: boolean;
  };
}

/**
 * 원본 2축 → 재설계 단일 축. `lockTarget`이 걸려 있으면 그것이 모드고,
 * 없으면 게이지 종류가 모드다 — 원본 `settings.js gaugeToLock`의 역방향이다.
 */
function modeOf(kase: GaugeCase): GaugeMode {
  return kase.lockTarget === 'none' ? kase.gaugeType : kase.lockTarget;
}

/** 골든 표는 24노트 중 6개가 hold인 합성 chart로 뽑혔다 → 18 + 6×2 = 30단위. */
const GOLDEN_TOTAL_UNITS = 30;

/** 그 판을 재설계 구현으로 다시 돌린 궤적. */
function replay(kase: GaugeCase): {
  trace: number[];
  forceEndedAt: number | null;
  state: GaugeState;
} {
  const state = resetGauge(modeOf(kase), GOLDEN_TOTAL_UNITS);
  const trace: number[] = [];
  let forceEndedAt: number | null = null;

  (SEQUENCES[kase.sequence] ?? []).forEach((kind, index) => {
    applyGaugeChange(state, KIND_MAP[kind] as Judgment);
    trace.push(kase.gaugeType === 'hard' ? state.gauge.hardPct : state.gauge.normalPct);
    if (state.forceEnded && forceEndedAt === null) forceEndedAt = index;
  });

  return { trace, forceEndedAt, state };
}

/** GA-1이 어긋난다고 선언한 범위: `hard` 게이지 × TAIL을 포함한 열. */
function divergesByGa1(kase: GaugeCase): boolean {
  return (
    kase.gaugeType === 'hard' && (SEQUENCES[kase.sequence] ?? []).some((k) => k.startsWith('TAIL'))
  );
}

describe('gauge — 골든 대조', () => {
  const cases = loadGolden<GaugeCase>('gauge').cases;

  it('표를 읽어낸다 — 6모드 중 5모드가 여기서 대조된다', () => {
    // `as`는 추출기 축에 없어 GA-8이 미커버였다. 축에 한 칸 더해 덮었다(D-2026-044).
    expect(cases.length).toBe(40);
    expect(new Set(cases.map(modeOf))).toEqual(new Set(['normal', 'hard', 'fc', 'ap', 'as']));
  });

  it('`a` 스케일이 원본과 같다', () => {
    for (const kase of cases) {
      expect(resetGauge(modeOf(kase), GOLDEN_TOTAL_UNITS).unitScale).toBe(kase.expected.unitScale);
    }
  });

  it('게이지 궤적이 GA-1 범위 밖에서 전부 일치한다', () => {
    const compared = cases.filter((kase) => !divergesByGa1(kase));
    expect(compared.length).toBe(32);

    for (const kase of compared) {
      const { trace } = replay(kase);
      expect(trace.length).toBe(kase.expected.trace.length);
      trace.forEach((value, index) => {
        expect(
          realEquals(value, kase.expected.trace[index] as number),
          `${modeOf(kase)}/${kase.sequence}[${index}]: ${value} ≠ ${kase.expected.trace[index]}`,
        ).toBe(true);
      });
    }
  });

  it('종료 시점이 전부 일치한다 — TAIL 특례는 값만 바꾸고 종료를 바꾸지 않았다', () => {
    for (const kase of cases) {
      expect(replay(kase).forceEndedAt, `${modeOf(kase)}/${kase.sequence}`).toBe(
        kase.expected.forceEndedAt,
      );
    }
  });

  it('구 `lockTier`가 `tier` + `forceEnded`로 갈린다', () => {
    for (const kase of cases) {
      const { state } = replay(kase);
      const label = `${modeOf(kase)}/${kase.sequence}`;

      // 원본 `'broken'`은 **lock이 깨진 것**만 뜻한다 — hard 게이지 사망은
      // `lockTier`를 건드리지 않고 반환값으로만 종료시켰다. 재설계는 둘 다
      // `forceEnded` 하나로 모으므로 `'broken'`은 그 부분집합이다.
      if (kase.expected.lockTier === 'broken') {
        expect(state.forceEnded, label).toBe(true);
        expect(kase.lockTarget).not.toBe('none');
      }
      // 단일 모드의 tier는 시작값에 고정된다 — 탈락해도 얼어붙는다(§2).
      expect(state.tier, label).toBe(GAUGE_MODE_TABLE[modeOf(kase)].startTier);
    }
  });

  it('구 `evaluateEnd`(클리어 여부)가 같은 값을 낸다', () => {
    for (const kase of cases) {
      const { state } = replay(kase);
      const cleared =
        kase.gaugeType === 'normal'
          ? state.gauge.normalPct >= NORMAL_CLEAR_PCT
          : state.gauge.hardPct > 0;
      expect(cleared, `${modeOf(kase)}/${kase.sequence}`).toBe(kase.expected.evaluateEnd);
    }
  });
});

describe('gauge — 의도한 차이', () => {
  const cases = loadGolden<GaugeCase>('gauge').cases;

  it('GA-1: hard tail 특례를 뺀 자리에서만 궤적이 어긋난다', () => {
    expectDivergence('GA-1');

    const diverging = cases.filter(divergesByGa1);
    expect(diverging.length).toBe(8);

    for (const kase of diverging) {
      expect(replay(kase).trace).not.toEqual([...kase.expected.trace]);
    }
  });

  it('GA-1은 normal 게이지를 건드리지 않는다 — "실변경은 hard뿐"이 골든으로 확인된다', () => {
    const normalTail = cases.filter(
      (kase) =>
        kase.gaugeType === 'normal' &&
        (SEQUENCES[kase.sequence] ?? []).some((k) => k.startsWith('TAIL')),
    );
    expect(normalTail.length).toBe(8);

    for (const kase of normalTail) {
      replay(kase).trace.forEach((value, index) => {
        expect(realEquals(value, kase.expected.trace[index] as number)).toBe(true);
      });
    }
  });
});

// ── §2. tier 사다리와 모드 표 (gauge.md §2) ─────────────────

describe('tier 사다리와 gaugeMode (§2)', () => {
  it('사다리는 엄격 → 관대 한 줄이다', () => {
    expect(TIER_LADDER).toEqual(['as', 'ap', 'fc', 'hard', 'normal']);
  });

  it('모드가 정하는 것은 시작 tier와 탈락 시 동작 둘뿐이다', () => {
    expect(Object.keys(GAUGE_MODE_TABLE).sort()).toEqual([...GAUGE_MODES].sort());
    for (const mode of GAUGE_MODES) {
      expect(Object.keys(GAUGE_MODE_TABLE[mode]).sort()).toEqual(['onBreak', 'startTier']);
    }
    expect(GAUGE_MODE_TABLE.normal.onBreak).toBeNull();
    expect(GAUGE_MODE_TABLE.cascade).toEqual({ startTier: 'as', onBreak: 'demote' });
  });

  it('시작 tier가 모드 이름과 같다 — cascade만 `as`에서 시작한다', () => {
    for (const mode of ['normal', 'hard', 'fc', 'ap', 'as'] as const) {
      expect(GAUGE_MODE_TABLE[mode].startTier).toBe<Tier>(mode);
    }
    expect(GAUGE_MODE_TABLE.cascade.startTier).toBe('as');
  });

  const BREAKS: ReadonlyArray<readonly [Judgment, readonly GaugeMode[]]> = [
    ['SYNC', []],
    ['PERFECT', ['as']],
    ['GOOD', ['as', 'ap']],
    ['MISS', ['as', 'ap', 'fc']],
  ];

  it.each(BREAKS)('%s가 깨뜨리는 단일 모드가 표와 같다', (judgment, broken) => {
    for (const mode of ['as', 'ap', 'fc'] as const) {
      const state = play(mode, 30, [judgment]);
      expect(state.forceEnded, `${mode} × ${judgment}`).toBe(broken.includes(mode));
    }
  });

  it('`normal` 모드는 어떤 판정으로도 terminate되지 않는다', () => {
    const state = play('normal', 30, Array<Judgment>(60).fill('MISS'));
    expect(state.forceEnded).toBe(false);
    expect(state.tier).toBe('normal');
    expect(state.gauge.normalPct).toBe(0);
  });

  it('`hard` 모드는 hard 게이지가 0에 닿을 때 terminate된다 (MISS −5 → 20회)', () => {
    const state = resetGauge('hard', 30);
    for (let i = 0; i < 19; i += 1) applyGaugeChange(state, 'MISS');
    expect(state.forceEnded).toBe(false);
    expect(state.gauge.hardPct).toBeCloseTo(5, 10);

    applyGaugeChange(state, 'MISS');
    expect(state.forceEnded).toBe(true);
    expect(state.gauge.hardPct).toBe(0);
  });

  it('terminate 뒤에도 같은 프레임의 판정은 회계에 들어간다 `[보존]`', () => {
    // 판을 멈추는 것은 host의 몫이다. 원본도 `PS.playForceEnded`를 프레임
    // 끝에서 확인하므로 그 프레임의 남은 MISS는 게이지·score에 그대로 들어간다.
    const state = play('fc', 30, ['MISS']);
    expect(state.forceEnded).toBe(true);

    feed(state, ['MISS', 'MISS']);
    expect(state.counts.MISS).toBe(3);
  });

  it('terminate는 게이지 값을 밟지 않는다 (§1 `[번복]`)', () => {
    const state = play('fc', 30, ['SYNC', 'SYNC', 'MISS']);
    expect(state.forceEnded).toBe(true);
    expect(state.gauge.hardPct).toBeGreaterThan(0);
    expect(state.gauge.normalPct).toBeGreaterThan(0);
  });

  it('단일 모드의 `tier`는 탈락 직전 값으로 얼어붙는다', () => {
    const state = play('ap', 30, ['GOOD']);
    expect(state.forceEnded).toBe(true);
    expect(state.tier).toBe('ap');
  });
});

// ── §3. state 산출 (gauge.md §3) ───────────────────────────

describe('state 산출 — 성적이 정한다 (§3)', () => {
  it('어느 게이지로 쳐도 FC·AP·AS가 나온다', () => {
    for (const mode of ['normal', 'hard'] as const) {
      expect(evaluateState(play(mode, 30, Array<Judgment>(30).fill('SYNC')))).toBe('AS');
      expect(evaluateState(play(mode, 30, ['PERFECT', ...Array<Judgment>(29).fill('SYNC')]))).toBe(
        'AP',
      );
      expect(evaluateState(play(mode, 30, ['GOOD', ...Array<Judgment>(29).fill('SYNC')]))).toBe(
        'FC',
      );
    }
  });

  it('`tier`는 MISS가 난 뒤에만 갈림에 관여한다 — H와 C', () => {
    const hard = play('hard', 30, ['MISS', ...Array<Judgment>(29).fill('SYNC')]);
    expect(evaluateState(hard)).toBe('H');

    const normalCleared = play('normal', 30, [
      'MISS',
      ...Array<Judgment>(29).fill('SYNC'), // 29 × 5 = 145 → 상한 100
    ]);
    expect(normalCleared.gauge.normalPct).toBeGreaterThanOrEqual(NORMAL_CLEAR_PCT);
    expect(evaluateState(normalCleared)).toBe('C');
  });

  it('[GA-3] normal 게이지 미달은 `F`다 — 구 `P` 흡수', () => {
    // **완주한 판**으로 잰다. 단위가 남아 있으면 GA-9가 먼저 `F`를 내므로
    // 게이지 임계가 판별했다는 주장이 확인되지 않는다.
    const sequence: readonly Judgment[] = [
      ...Array<Judgment>(10).fill('SYNC'),
      ...Array<Judgment>(20).fill('MISS'),
    ];
    const state = play('normal', sequence.length, sequence);
    expect(state.forceEnded).toBe(false);
    expect(state.gauge.normalPct).toBeLessThan(NORMAL_CLEAR_PCT);
    expect(evaluateState(state)).toBe('F');
  });

  it('[GA-3] normal 게이지 75% 경계 (스팟체크 #1) — 완주·MISS 통과·클램프 미개입 상태에서 정확히 75%면 통과다 (`>=`)', () => {
    const state = resetGauge('normal', 15); // unitScale = 150/15 = 10
    for (let i = 0; i < 7; i += 1) applyGaugeChange(state, 'SYNC'); // +70
    for (let i = 0; i < 3; i += 1) applyGaugeChange(state, 'GOOD'); // +15 → 85
    for (let i = 0; i < 5; i += 1) applyGaugeChange(state, 'MISS'); // -10 → 75
    expect(state.gauge.normalPct).toBe(75);
    expect(evaluateState(state)).toBe('C');
  });

  it('terminate된 판은 성적과 무관하게 `F`다', () => {
    const state = play('as', 30, [...Array<Judgment>(20).fill('SYNC'), 'PERFECT']);
    expect(evaluateState(state)).toBe('F');
  });

  it('판정이 하나도 없으면 `AS`다 `[보존]`', () => {
    expect(evaluateState(resetGauge('normal', 0))).toBe('AS');
  });

  it('Hold head MISS의 2단위가 "MISS 0" 판별을 바꾸지 않는다', () => {
    const state = resetGauge('normal', 30);
    applyGaugeChange(state, 'MISS', 2);
    expect(state.counts.MISS).toBe(2);
    expect(evaluateState(state)).not.toBe('FC');
  });

  it('delta를 `units`배로 적용하는 것이 `units`번 반복과 같다', () => {
    const once = resetGauge('hard', 30);
    applyGaugeChange(once, 'MISS', 2);

    const twice = resetGauge('hard', 30);
    applyGaugeChange(twice, 'MISS');
    applyGaugeChange(twice, 'MISS');

    expect(once.gauge).toEqual(twice.gauge);
    expect(once.counts).toEqual(twice.counts);
  });
});

// ── §4. cascade 검증 시나리오 (gauge.md §4 · 대장 GA-4) ─────

describe('[GA-4] cascade 검증 시나리오 6종 (§4)', () => {
  /** hard 게이지를 0으로 떨구는 데 필요한 MISS 수 (−5.0 × 20 = 100). */
  const MISSES_TO_KILL_HARD = 20;

  it('1. 전 노트 SYNC → AS', () => {
    const state = play('cascade', 48, Array<Judgment>(48).fill('SYNC'));
    expect(state.tier).toBe('as');
    expect(evaluateState(state)).toBe('AS');
  });

  it('2. PERFECT 1개 → AP', () => {
    const state = play('cascade', 48, ['PERFECT', ...Array<Judgment>(47).fill('SYNC')]);
    expect(state.tier).toBe('ap');
    expect(evaluateState(state)).toBe('AP');
  });

  it('3. GOOD 1개, MISS 없음 → FC', () => {
    const state = play('cascade', 48, ['GOOD', ...Array<Judgment>(47).fill('SYNC')]);
    expect(state.tier).toBe('fc');
    expect(evaluateState(state)).toBe('FC');
  });

  it('4. MISS 1개, hard 생존 → H', () => {
    const state = play('cascade', 48, ['MISS', ...Array<Judgment>(47).fill('SYNC')]);
    expect(state.tier).toBe('hard');
    expect(state.gauge.hardPct).toBeGreaterThan(0);
    expect(evaluateState(state)).toBe('H');
  });

  it('5. hard 0 도달 후 회복, 곡 끝 normal ≥75% → C (래칫)', () => {
    const state = play('cascade', 48, [
      ...Array<Judgment>(MISSES_TO_KILL_HARD).fill('MISS'),
      ...Array<Judgment>(28).fill('SYNC'),
    ]);
    // 회복해도 hard로 돌아오지 않는다.
    expect(state.gauge.hardPct).toBeGreaterThan(0);
    expect(state.tier).toBe('normal');
    expect(state.gauge.normalPct).toBeGreaterThanOrEqual(NORMAL_CLEAR_PCT);
    expect(evaluateState(state)).toBe('C');
  });

  it('6. 5와 같되 곡 끝 normal <75% → F', () => {
    const state = play('cascade', 48, [
      ...Array<Judgment>(MISSES_TO_KILL_HARD).fill('MISS'),
      ...Array<Judgment>(10).fill('SYNC'),
    ]);
    expect(state.tier).toBe('normal');
    expect(state.gauge.normalPct).toBeLessThan(NORMAL_CLEAR_PCT);
    expect(evaluateState(state)).toBe('F');
  });

  it('cascade는 terminate되지 않는다 — 어떤 열에서도 끝까지 간다', () => {
    for (const sequence of Object.values(SEQUENCES)) {
      const state = play(
        'cascade',
        30,
        sequence.map((k) => KIND_MAP[k] as Judgment),
      );
      expect(state.forceEnded).toBe(false);
    }
  });

  it('cascade 결과가 같은 판을 각 단일 모드로 쳤을 때의 최고치와 같다', () => {
    const sequences: readonly (readonly Judgment[])[] = [
      Array<Judgment>(48).fill('SYNC'),
      ['PERFECT', ...Array<Judgment>(47).fill('SYNC')],
      ['GOOD', ...Array<Judgment>(47).fill('SYNC')],
      ['MISS', ...Array<Judgment>(47).fill('SYNC')],
    ];
    const PRIORITY = ['AS', 'AP', 'FC', 'H', 'C', 'F'] as const;

    for (const sequence of sequences) {
      const best = [...GAUGE_MODES]
        .filter((mode) => mode !== 'cascade')
        .map((mode) => evaluateState(play(mode, 48, sequence)))
        .sort((a, b) => PRIORITY.indexOf(a) - PRIORITY.indexOf(b))[0];

      expect(evaluateState(play('cascade', 48, sequence))).toBe(best);
    }
  });
});

// ── §5. score · accuracy · rank (constants.md §3) ──────────

describe('결과 산출 (§5)', () => {
  it('rank는 gauge와 독립이다 — 같은 판정 열이면 모드가 달라도 같은 rank', () => {
    const sequence: readonly Judgment[] = ['MISS', ...Array<Judgment>(29).fill('SYNC')];
    const results = GAUGE_MODES.map((mode) => computeResult(play(mode, 30, sequence), 0));

    // state는 모드마다 갈린다(terminate 여부). rank·score는 갈리지 않는다.
    expect(new Set(results.map((r) => r.rank)).size).toBe(1);
    expect(new Set(results.map((r) => r.score)).size).toBe(1);
    expect(new Set(results.map((r) => r.state)).size).toBeGreaterThan(1);
  });

  it('올-SYNC는 만점·U·정확도 100이다', () => {
    const result = computeResult(play('normal', 30, Array<Judgment>(30).fill('SYNC')), 0);
    expect(result.score).toBe(1_000_000);
    expect(result.accuracy).toBe(100);
    expect(result.rank).toBe('U');
  });

  it('가중치가 score와 accuracy에서 다르다 (PERFECT 1 / 0.7, GOOD 0.5 / 0.3)', () => {
    const perfect = computeResult(play('normal', 10, Array<Judgment>(10).fill('PERFECT')), 0);
    expect(perfect.score).toBe(1_000_000);
    expect(perfect.accuracy).toBeCloseTo(70, 10);

    const good = computeResult(play('normal', 10, Array<Judgment>(10).fill('GOOD')), 0);
    expect(good.score).toBe(500_000);
    expect(good.accuracy).toBeCloseTo(30, 10);
  });

  it('Hold head MISS의 2단위가 분자가 아니라 분모에서만 값을 갖는다', () => {
    // 4단위 chart: SYNC 2개 + Hold head MISS 1개(2단위).
    const state = resetGauge('normal', 4);
    feed(state, ['SYNC', 'SYNC']);
    applyGaugeChange(state, 'MISS', 2);

    const result = computeResult(state, 0);
    expect(result.counts.MISS).toBe(2);
    expect(result.score).toBe(500_000);
  });

  it('rank 임계는 처음 도달한 것이 답이다', () => {
    expect(scoreToRank(1_000_000)).toBe('U');
    expect(scoreToRank(999_999)).toBe('S+');
    expect(scoreToRank(995_000)).toBe('S+');
    expect(scoreToRank(994_999)).toBe('S');
    expect(scoreToRank(0)).toBe('F');
  });

  it('빈 chart는 0점이고 던지지 않는다', () => {
    const result = computeResult(resetGauge('normal', 0), 0);
    expect(result.score).toBe(0);
    expect(result.accuracy).toBe(0);
  });

  it('결과가 판정 상태를 그대로 물고 나온다', () => {
    const state = play('fc', 30, ['SYNC', 'MISS']);
    const result = computeResult(state, 7);
    expect(result.forceEnded).toBe(true);
    expect(result.state).toBe('F');
    expect(result.maxCombo).toBe(7);
    expect(result.counts).toEqual({ SYNC: 1, PERFECT: 0, GOOD: 0, MISS: 1 });
  });
});

// ── §6. 판정 단위 총수 (judge.md §8) ───────────────────────

describe('[GA-5] 판정 단위 총수는 judge가 센다', () => {
  it('Tap 1 · Hold 2로 세고 `a` 스케일의 분모가 된다', () => {
    const chart = makeChart({
      notes: [
        { startTick: 0, duration: 0, lane: 1, isWide: false },
        { startTick: 480, duration: 480, lane: 2, isWide: false },
        { startTick: 960, duration: 0, lane: 3, isWide: false },
      ],
    });
    const notes = buildJudgeNotes(chart, buildTimeline(chart));
    expect(notes.totalUnits).toBe(4);

    // a = 150 / 4 — 게이지가 chart를 다시 훑지 않고 이 값을 받는다.
    expect(resetGauge('normal', notes.totalUnits).unitScale).toBe(37.5);
  });

  it('누적 단위 합이 총 단위 수와 맞는다', () => {
    const state = resetGauge('normal', 4);
    feed(state, ['SYNC', 'GOOD']);
    applyGaugeChange(state, 'MISS', 2);

    const total = Object.values(state.counts).reduce((sum, n) => sum + n, 0);
    expect(total).toBe(state.totalUnits);
  });
});

// ── §7. 결과 산출 골든 대조 (원본 computeResult) ────────────

/**
 * `result.json`은 원본 `gauge.js computeResult`를 직접 불러 뜬 표다.
 *
 * 원본은 `PS.playHitMap`을 재순회해 세고 재설계는 판정 이벤트 누산기(`counts`)
 * 하나를 읽는다 — **세는 방법이 다르고 산식이 같다**는 주장을 여기서 확인한다.
 * 그 주장이 이전에는 스펙 테스트로만 서 있었다(D-2026-044).
 */
interface ResultCase {
  readonly gaugeType: 'normal' | 'hard';
  readonly shape: string;
  readonly forceEnded: boolean;
  readonly gaugeValue: number;
  readonly allowIncomplete: boolean;
  readonly expected: {
    readonly state: string;
    readonly score: number;
    readonly accuracy: number;
    readonly rank: string;
    readonly counts: { sync: number; perfect: number; good: number; miss: number };
    readonly cleared: boolean;
  };
}

/** 골든의 집계를 재설계 상태로 세운다. 게이지 값도 표에 적힌 것을 그대로 쓴다. */
function stateOf(kase: ResultCase): GaugeState {
  const { counts } = kase.expected;
  const totalUnits = counts.sync + counts.perfect + counts.good + counts.miss + missingUnits(kase);
  const state = resetGauge(kase.gaugeType, totalUnits);

  state.counts = {
    SYNC: counts.sync,
    PERFECT: counts.perfect,
    GOOD: counts.good,
    MISS: counts.miss,
  };
  state.gauge = { hardPct: kase.gaugeValue, normalPct: kase.gaugeValue };
  // hard 게이지가 0이면 원본에서도 그 자리에서 판이 끝났다 — 재설계는 그것을
  // `forceEnded` 하나로 든다.
  state.forceEnded = kase.forceEnded || (kase.gaugeType === 'hard' && kase.gaugeValue <= 0);
  return state;
}

/** 판정되지 않고 남은 단위. `incomplete` fixture만 0이 아니다. */
function missingUnits(kase: ResultCase): number {
  return kase.allowIncomplete ? 14 : 0;
}

describe('§7 결과 산출 골든 대조 — 원본 computeResult', () => {
  const cases = loadGolden<ResultCase>('result').cases;

  it('표를 읽어낸다', () => {
    expect(cases.length).toBe(40);
    expect(new Set(cases.map((kase) => kase.shape)).size).toBe(10);
  });

  it('score·accuracy·rank·counts가 전부 일치한다 `[보존]`', () => {
    for (const kase of cases) {
      const result = computeResult(stateOf(kase), 0);
      const label = `${kase.gaugeType}/${kase.shape}${kase.forceEnded ? '/forceEnded' : ''}`;

      expect(result.score, label).toBe(kase.expected.score);
      expect(realEquals(result.accuracy, kase.expected.accuracy), label).toBe(true);
      expect(result.rank, label).toBe(kase.expected.rank);
      expect(result.counts, label).toEqual({
        SYNC: kase.expected.counts.sync,
        PERFECT: kase.expected.counts.perfect,
        GOOD: kase.expected.counts.good,
        MISS: kase.expected.counts.miss,
      });
    }
  });

  it('state가 GA-3·GA-9 범위 밖에서 전부 일치한다', () => {
    const compared = cases.filter((kase) => kase.expected.state !== 'P' && !kase.allowIncomplete);
    expect(compared.length).toBe(33);

    for (const kase of compared) {
      expect(evaluateState(stateOf(kase)), `${kase.gaugeType}/${kase.shape}`).toBe(
        kase.expected.state,
      );
    }
  });

  it('[GA-3] 원본이 `P`를 낸 자리가 전부 `F`가 된다', () => {
    expectDivergence('GA-3');

    const diverging = cases.filter((kase) => kase.expected.state === 'P');
    expect(diverging.length).toBe(3);

    for (const kase of diverging) {
      expect(evaluateState(stateOf(kase)), `${kase.gaugeType}/${kase.shape}`).toBe('F');
    }
  });

  it('[GA-9] 끝까지 가지 않은 판은 미스가 없어도 `F`다', () => {
    expectDivergence('GA-9');

    const incomplete = cases.filter((kase) => kase.allowIncomplete && !kase.forceEnded);
    expect(incomplete.length).toBe(2);

    for (const kase of incomplete) {
      // 원본은 미스·GOOD·PERFECT 개수만 보므로 절반만 친 판을 `AS`로 냈다.
      expect(kase.expected.state).toBe('AS');
      expect(evaluateState(stateOf(kase)), `${kase.gaugeType}/${kase.shape}`).toBe('F');
    }
  });
});
