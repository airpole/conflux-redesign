/**
 * judge를 골든 표와 대조하고, 골든이 닿지 않는 자리를 스펙으로 채운다.
 *
 * 골든 2,700건은 원본 이름(`getPlayJudgment`·`channel`·`PS.lineMap`)을 쓴다.
 * 명칭 매핑은 테스트가 갖는다 — 구현은 재설계 이름을 쓴다.
 *
 * **JD-1은 골든이 목격하지 못한다.** D-2026-024가 후보 순서를 통째로 `[번복]`했지만,
 * 그 변화의 유일한 실체("같은 창 안에서 더 이른 wide가 더 늦은 normal을 이긴다")를
 * 담은 케이스가 여섯 fixture 어디에도 없다 — wide는 `holdOverlap` tick 1920 하나뿐이고
 * 그것이 그 fixture의 가장 늦은 노트다. 같은 tick에서는 구·신 규칙이 둘 다 normal을
 * 고르므로 2,700건이 전부 그대로 통과한다. 그래서 §5의 규칙은 아래 스펙 테스트가
 * 유일한 판정자다(D-2026-038 J-7, 대장 JD-1 = 미커버).
 */
import { describe, expect, it } from 'vitest';
import { loadGolden } from '../../tests/support/golden.js';
import { makeChart } from './core-chart-fixture.js';
import {
  HOLD_RELEASE_GRACE_MS,
  HOLD_RELEASE_WINDOW_MS,
  WINDOW_GOOD_MS,
  WINDOW_PERFECT_MS,
  WINDOW_SYNC_MS,
  WINDOW_WIDE_SYNC_MS,
  TICKS_PER_BEAT as TPB,
} from './core-constants.js';
import { laneOf, type LaneKeyId } from './core-settings.js';
import type { Lane, Note } from './core-chart.js';
import { buildTimeline, tickToMs } from './core-timing.js';
import {
  buildJudgeNotes,
  commitJudgment,
  createJudgeState,
  heldCapacityViolations,
  heldCount,
  judgeAdvance,
  judgeKeyDown,
  judgeKeyUp,
  judgeLaneOf,
  judgmentOf,
  laneMapOf,
  normalDemand,
  reconcileHeldCapacity,
  registerKeyDown,
  registerKeyUp,
  seedPlayStateAt,
  selectCandidate,
  toJudgeMs,
  type CandidateContext,
  type JudgmentEvent,
} from './core-judge.js';

const T = TPB;

// ── 헬퍼 ────────────────────────────────────────────────────

interface NoteSpec {
  readonly startTick: number;
  readonly duration?: number;
  readonly lane: Lane;
  readonly isWide?: boolean;
}

function notesOf(specs: readonly NoteSpec[]): Note[] {
  return specs.map((s) => ({
    startTick: s.startTick,
    duration: s.duration ?? 0,
    lane: s.lane,
    isWide: s.isWide ?? false,
  }));
}

interface Scene {
  readonly context: CandidateContext;
  readonly state: ReturnType<typeof createJudgeState>;
  readonly msOf: (tick: number) => number;
}

function scene(
  specs: readonly NoteSpec[],
  options: {
    readonly mirror?: boolean;
    readonly tempos?: ReadonlyArray<{ startTick: number; bpm: number }>;
    readonly timeSignatures?: ReadonlyArray<{
      startTick: number;
      numerator: number;
      denominator: number;
    }>;
  } = {},
): Scene {
  const chart = makeChart({
    notes: notesOf(specs),
    ...(options.tempos ? { tempos: options.tempos } : {}),
    ...(options.timeSignatures ? { timeSignatures: options.timeSignatures } : {}),
  });
  const timeline = buildTimeline(chart);
  const notes = buildJudgeNotes(chart, timeline);

  return {
    context: { notes, laneMap: laneMapOf(options.mirror ?? false) },
    state: createJudgeState(notes),
    msOf: (tick) => tickToMs(timeline, tick),
  };
}

function judged(events: readonly JudgmentEvent[]): Extract<JudgmentEvent, { kind: 'judged' }>[] {
  return events.filter((e): e is Extract<JudgmentEvent, { kind: 'judged' }> => e.kind === 'judged');
}

// ── 골든 대조 ───────────────────────────────────────────────

interface JudgeCase {
  readonly fixture: string;
  readonly mirror: boolean;
  /** `1~6`. `LaneKeyId`로 옮긴다. */
  readonly key: number;
  readonly targetTick: number;
  readonly offsetMs: number;
  readonly expected: {
    readonly noteStartTick: number;
    /** 원본 명칭. 재설계에서는 `lane`이다. */
    readonly noteChannel: number;
    readonly noteIsWide: boolean;
    readonly diff: number;
  } | null;
}

/** 골든 fixture를 재설계 필드명으로 옮긴 것. 값은 `tools/golden/fixtures.mjs` 그대로다. */
const FIXTURES: Record<
  string,
  {
    tempos: ReadonlyArray<{ startTick: number; bpm: number }>;
    timeSignatures: ReadonlyArray<{
      startTick: number;
      numerator: number;
      denominator: number;
    }>;
    notes: readonly NoteSpec[];
  }
> = {
  plain: {
    tempos: [{ startTick: 0, bpm: 120 }],
    timeSignatures: [{ startTick: 0, numerator: 4, denominator: 4 }],
    notes: [
      { startTick: 0, lane: 1 },
      { startTick: T, lane: 2 },
      { startTick: T * 2, lane: 3 },
      { startTick: T * 3, lane: 4 },
    ],
  },
  multiBpm: {
    tempos: [
      { startTick: 0, bpm: 120 },
      { startTick: T * 4, bpm: 180 },
      { startTick: T * 8, bpm: 60 },
    ],
    timeSignatures: [{ startTick: 0, numerator: 4, denominator: 4 }],
    notes: [
      { startTick: T * 4 - 1, lane: 1 },
      { startTick: T * 4, lane: 2 },
      { startTick: T * 4 + 1, lane: 3 },
      { startTick: T * 8, lane: 4 },
    ],
  },
  multiTimeSig: {
    tempos: [{ startTick: 0, bpm: 120 }],
    timeSignatures: [
      { startTick: 0, numerator: 4, denominator: 4 },
      { startTick: T * 4, numerator: 3, denominator: 4 },
      { startTick: T * 7, numerator: 7, denominator: 8 },
    ],
    notes: [
      { startTick: 0, lane: 1 },
      { startTick: T * 4, lane: 2 },
      { startTick: T * 7, lane: 3 },
    ],
  },
  negativeTick: {
    tempos: [{ startTick: 0, bpm: 120 }],
    timeSignatures: [{ startTick: 0, numerator: 4, denominator: 4 }],
    notes: [
      { startTick: -T, lane: 1 },
      { startTick: -1, lane: 2 },
      { startTick: 0, lane: 3 },
    ],
  },
  holdOverlap: {
    tempos: [{ startTick: 0, bpm: 120 }],
    timeSignatures: [{ startTick: 0, numerator: 4, denominator: 4 }],
    notes: [
      { startTick: 0, duration: T, lane: 2 },
      { startTick: T / 2, duration: T, lane: 3 },
      { startTick: T, duration: T / 2, lane: 2 },
      { startTick: T, duration: T, lane: 1, isWide: true },
      { startTick: T, lane: 4 },
    ],
  },
  sixKeySaturation: {
    tempos: [{ startTick: 0, bpm: 120 }],
    timeSignatures: [{ startTick: 0, numerator: 4, denominator: 4 }],
    notes: [
      { startTick: T, lane: 1 },
      { startTick: T, lane: 2 },
      { startTick: T, lane: 3 },
      { startTick: T, lane: 4 },
      { startTick: T, lane: 2 },
      { startTick: T, lane: 3 },
    ],
  },
};

describe('골든 대조 — 후보 선택', () => {
  const cases = loadGolden<JudgeCase>('judge').cases;

  it('2,700건이 전부 원본과 같은 노트를 고른다', () => {
    const mismatches: string[] = [];

    for (const c of cases) {
      const fixture = FIXTURES[c.fixture]!;
      const s = scene(fixture.notes, {
        mirror: c.mirror,
        tempos: fixture.tempos,
        timeSignatures: fixture.timeSignatures,
      });
      const nowMs = s.msOf(c.targetTick) + c.offsetMs;
      const got = selectCandidate(s.state, s.context, `key${c.key}` as LaneKeyId, nowMs);

      const label = `${c.fixture}/mirror=${c.mirror}/key${c.key}/tick${c.targetTick}/${c.offsetMs}ms`;

      if (c.expected === null) {
        if (got !== null) mismatches.push(`${label}: 후보가 없어야 하는데 골랐다`);
        continue;
      }
      if (got === null) {
        mismatches.push(`${label}: 후보를 골라야 하는데 null이다`);
        continue;
      }
      if (
        got.note.startTick !== c.expected.noteStartTick ||
        got.note.lane !== c.expected.noteChannel ||
        got.note.isWide !== c.expected.noteIsWide
      ) {
        mismatches.push(`${label}: 다른 노트를 골랐다`);
        continue;
      }
      if (Math.abs(nowMs - got.startMs - c.expected.diff) > 1e-9) {
        mismatches.push(`${label}: diff가 어긋난다`);
      }
    }

    expect(mismatches.slice(0, 10)).toEqual([]);
    expect(mismatches).toHaveLength(0);
  });

  it('골든이 실제로 2,700건이다 — 표가 조용히 줄면 드러난다', () => {
    expect(cases).toHaveLength(2700);
  });
});

// ── JD-1 — 골든이 닿지 않는 후보 순서 ───────────────────────

describe('[JD-1] 후보 순서 (§1) — 골든 미커버, 스펙이 유일한 판정자', () => {
  it('더 이른 wide가 더 늦은 normal을 이긴다 — 분리 풀 폐기의 실체', () => {
    // 두 노트가 같은 창(±100ms) 안에 있고, wide가 20ms 이르다.
    // 구 규칙(bestNormal ?? bestWide)은 normal을, 새 규칙(earliest tick)은 wide를 고른다.
    const s = scene([
      { startTick: 0, lane: 1, isWide: true },
      { startTick: 96, lane: 2 }, // 96 tick = 25ms @120bpm
    ]);
    const picked = selectCandidate(s.state, s.context, 'key2', s.msOf(96));

    expect(picked?.note.isWide).toBe(true);
    expect(picked?.note.startTick).toBe(0);
  });

  it('같은 startTick이면 normal이 wide보다 우선', () => {
    const s = scene([
      { startTick: 0, lane: 1, isWide: true },
      { startTick: 0, lane: 2 },
    ]);
    const picked = selectCandidate(s.state, s.context, 'key2', s.msOf(0));

    expect(picked?.note.isWide).toBe(false);
    expect(picked?.note.lane).toBe(2);
  });

  it('같은 tick·같은 풀이면 hold가 tap보다 우선', () => {
    const s = scene([
      { startTick: 0, lane: 2 },
      { startTick: 0, duration: T, lane: 2 },
    ]);
    const picked = selectCandidate(s.state, s.context, 'key2', s.msOf(0));

    expect(picked?.note.duration).toBe(T);
  });

  it('같은 tick의 hold끼리는 tail이 이른 쪽 우선', () => {
    const s = scene([
      { startTick: 0, duration: T * 2, lane: 2 },
      { startTick: 0, duration: T, lane: 2 },
    ]);
    const picked = selectCandidate(s.state, s.context, 'key2', s.msOf(0));

    expect(picked?.note.duration).toBe(T);
  });

  it('한 번의 keydown은 head를 최대 하나만 확정한다', () => {
    const s = scene([
      { startTick: 0, lane: 2 },
      { startTick: 0, lane: 2 },
    ]);
    const events = judgeKeyDown(s.state, s.context, 'key2', s.msOf(0), 0);

    expect(judged(events)).toHaveLength(1);
    expect(s.state.hits.filter((v) => v === 'hit')).toHaveLength(1);
  });

  it('같은 tick의 normal + wide는 서로 다른 두 번의 keydown을 요구한다', () => {
    const s = scene([
      { startTick: 0, lane: 2 },
      { startTick: 0, lane: 1, isWide: true },
    ]);
    const at = s.msOf(0);

    expect(judgeKeyDown(s.state, s.context, 'key2', at, 0).length).toBeGreaterThan(0);
    const second = judged(judgeKeyDown(s.state, s.context, 'key4', at, 0));

    expect(second).toHaveLength(1);
    expect(second[0]!.note.isWide).toBe(true);
  });
});

// ── §2 판정창 ───────────────────────────────────────────────

describe('판정창 (§2)', () => {
  it('normal은 abs 임계로 4단이고 경계는 포함이다', () => {
    expect(judgmentOf(WINDOW_SYNC_MS, false)).toBe('SYNC');
    expect(judgmentOf(-WINDOW_SYNC_MS, false)).toBe('SYNC');
    expect(judgmentOf(WINDOW_SYNC_MS + 1, false)).toBe('PERFECT');
    expect(judgmentOf(WINDOW_PERFECT_MS, false)).toBe('PERFECT');
    expect(judgmentOf(WINDOW_PERFECT_MS + 1, false)).toBe('GOOD');
    expect(judgmentOf(WINDOW_GOOD_MS, false)).toBe('GOOD');
    expect(judgmentOf(WINDOW_GOOD_MS + 1, false)).toBe('MISS');
  });

  it('wide는 창 안이면 항상 SYNC다', () => {
    for (const diff of [0, 26, 51, WINDOW_WIDE_SYNC_MS, -WINDOW_WIDE_SYNC_MS]) {
      expect(judgmentOf(diff, true)).toBe('SYNC');
    }
    expect(judgmentOf(WINDOW_WIDE_SYNC_MS + 1, true)).toBe('MISS');
  });

  it('창 경계(abs == 100)는 유효 후보다', () => {
    const s = scene([{ startTick: 0, lane: 2 }]);
    const at = s.msOf(0);

    expect(selectCandidate(s.state, s.context, 'key2', at + WINDOW_GOOD_MS)).not.toBeNull();
    expect(selectCandidate(s.state, s.context, 'key2', at + WINDOW_GOOD_MS + 1)).toBeNull();
  });
});

// ── §3 lane 매칭·mirror ─────────────────────────────────────

describe('lane 매칭·mirror (§3)', () => {
  it('6키가 settings 표의 lane으로 간다', () => {
    const keys = ['key1', 'key2', 'key3', 'key4', 'key5', 'key6'] as const;
    expect(keys.map(laneOf)).toEqual([1, 2, 3, 2, 3, 4]);
  });

  it('mirror가 노트 lane을 1↔4, 2↔3으로 바꾼다', () => {
    const map = laneMapOf(true);
    const normal = (lane: Lane): Note => ({
      startTick: 0,
      duration: 0,
      lane,
      isWide: false,
    });

    expect([1, 2, 3, 4].map((l) => judgeLaneOf(normal(l as Lane), map))).toEqual([4, 3, 2, 1]);
  });

  it('wide는 mirror를 무시하고 아무 키로나 맞는다', () => {
    const wide: Note = { startTick: 0, duration: 0, lane: 1, isWide: true };

    expect(judgeLaneOf(wide, laneMapOf(true))).toBeNull();
    expect(judgeLaneOf(wide, laneMapOf(false))).toBeNull();

    for (const key of ['key1', 'key2', 'key3', 'key4', 'key5', 'key6'] as const) {
      const s = scene([{ startTick: 0, lane: 1, isWide: true }], {
        mirror: true,
      });
      expect(selectCandidate(s.state, s.context, key, s.msOf(0))).not.toBeNull();
    }
  });

  it('mirror ON에서 lane 1 노트는 lane 4 키로 맞는다', () => {
    const s = scene([{ startTick: 0, lane: 1 }], { mirror: true });

    expect(selectCandidate(s.state, s.context, 'key1', s.msOf(0))).toBeNull();
    expect(selectCandidate(s.state, s.context, 'key6', s.msOf(0))).not.toBeNull();
  });

  it('이미 확정된 노트는 후보에 다시 나타나지 않는다', () => {
    const s = scene([{ startTick: 0, lane: 2 }]);
    const at = s.msOf(0);

    judgeKeyDown(s.state, s.context, 'key2', at, 0);
    expect(selectCandidate(s.state, s.context, 'key2', at)).toBeNull();
  });
});

// ── §4 확정 ─────────────────────────────────────────────────

describe('commitJudgment (§4)', () => {
  it('후보 하나를 받아 판정을 확정한다 — 선택과 확정이 분리돼 있다', () => {
    const s = scene([{ startTick: 0, lane: 2 }]);
    const nowMs = s.msOf(0) + 60;
    const entry = selectCandidate(s.state, s.context, 'key2', nowMs)!;
    const events = judged(commitJudgment(s.state, s.context, entry, nowMs));

    expect(events).toHaveLength(1);
    expect(events[0]!.judgment).toBe('GOOD');
    expect(events[0]!.diff).toBeCloseTo(60, 9);
    expect(events[0]!.noteIndex).toBe(entry.index);
    expect(s.state.hits[entry.index]).toBe('hit');
  });

  it('combo·maxCombo를 올리고 judged 이벤트를 낸다', () => {
    const s = scene([
      { startTick: 0, lane: 2 },
      { startTick: T, lane: 3 },
    ]);
    judgeKeyDown(s.state, s.context, 'key2', s.msOf(0), 0);
    judgeKeyDown(s.state, s.context, 'key3', s.msOf(T), 0);

    expect(s.state.combo).toBe(2);
    expect(s.state.maxCombo).toBe(2);
    expect(s.state.hits).toEqual(['hit', 'hit']);
  });

  it('Hold head는 holdOpened를 내고 활성 Hold로 등록된다 (§5)', () => {
    const s = scene([{ startTick: 0, duration: T, lane: 2 }]);
    const events = judgeKeyDown(s.state, s.context, 'key2', s.msOf(0), 0);
    const opened = events.filter((e) => e.kind === 'holdOpened');

    expect(opened).toHaveLength(1);
    expect(judged(events)[0]!.units).toBe(1);
    expect(judged(events)[0]!.part).toBe('head');
    expect(s.state.activeNormalHolds[2]).toEqual([0]);
  });

  it('Tap과 Hold head를 part로 구분해 싣는다 — 표시 규칙은 render가 정한다', () => {
    const tap = scene([{ startTick: 0, lane: 2 }]);
    expect(judged(judgeKeyDown(tap.state, tap.context, 'key2', tap.msOf(0), 0))[0]!.part).toBe(
      'tap',
    );
  });

  it('[JD-3][JD-4] 게이지도 이펙트도 이벤트 밖으로 새지 않는다', () => {
    const s = scene([{ startTick: 0, lane: 2 }]);
    const kinds = new Set(
      judgeKeyDown(s.state, s.context, 'key2', s.msOf(0), 0).map((e) => e.kind),
    );

    // above/below·gaugeDelta 같은 이름이 이벤트 종류에 없다.
    expect(
      [...kinds].every((k) => ['judged', 'comboReset', 'holdOpened', 'fastSlow'].includes(k)),
    ).toBe(true);
  });

  it('Fast/Slow는 normal head만, SYNC·wide를 제외한다', () => {
    const fast = scene([{ startTick: 0, lane: 2 }]);
    const fastEvents = judgeKeyDown(fast.state, fast.context, 'key2', fast.msOf(0) - 60, 0);
    expect(fastEvents.filter((e) => e.kind === 'fastSlow')).toEqual([
      { kind: 'fastSlow', side: 'FAST', diff: -60 },
    ]);

    const slow = scene([{ startTick: 0, lane: 2 }]);
    expect(
      judgeKeyDown(slow.state, slow.context, 'key2', slow.msOf(0) + 60, 0).filter(
        (e) => e.kind === 'fastSlow',
      ),
    ).toHaveLength(1);

    const sync = scene([{ startTick: 0, lane: 2 }]);
    expect(
      judgeKeyDown(sync.state, sync.context, 'key2', sync.msOf(0) + 10, 0).filter(
        (e) => e.kind === 'fastSlow',
      ),
    ).toHaveLength(0);

    const wide = scene([{ startTick: 0, lane: 1, isWide: true }]);
    expect(
      judgeKeyDown(wide.state, wide.context, 'key1', wide.msOf(0) + 60, 0).filter(
        (e) => e.kind === 'fastSlow',
      ),
    ).toHaveLength(0);
  });
});

// ── §9 만료 (M1-4 범위 = Tap만) ─────────────────────────────

describe('Tap 만료 MISS (§2·§9)', () => {
  it('deadline을 지나야 만료된다 — 경계 위에서는 아직 유효하다', () => {
    const s = scene([{ startTick: 0, lane: 2 }]);
    const at = s.msOf(0);

    expect(judgeAdvance(s.state, s.context, at + WINDOW_GOOD_MS, 0)).toEqual([]);
    expect(s.state.hits[0]).toBe('pending');

    const events = judgeAdvance(s.state, s.context, at + WINDOW_GOOD_MS + 1, 0);
    expect(judged(events)[0]!.judgment).toBe('MISS');
    expect(judged(events)[0]!.units).toBe(1);
    expect(s.state.hits[0]).toBe('missed');
  });

  it('만료된 노트는 후보에 다시 나타나지 않는다', () => {
    const s = scene([{ startTick: 0, lane: 2 }]);
    const at = s.msOf(0);

    judgeAdvance(s.state, s.context, at + 500, 0);
    expect(selectCandidate(s.state, s.context, 'key2', at)).toBeNull();
  });

  it('combo를 한 번만 리셋한다', () => {
    const s = scene([
      { startTick: 0, lane: 2 },
      { startTick: T, lane: 2 },
      { startTick: T, lane: 3 },
    ]);
    judgeKeyDown(s.state, s.context, 'key2', s.msOf(0), 0);
    expect(s.state.combo).toBe(1);

    const events = judgeAdvance(s.state, s.context, s.msOf(T) + 500, 0);
    expect(events.filter((e) => e.kind === 'comboReset')).toHaveLength(1);
    expect(s.state.combo).toBe(0);
    expect(s.state.maxCombo).toBe(1);
  });

  it('Hold head 만료는 2단위다 — §8은 아래 절이 전담한다', () => {
    const s = scene([{ startTick: 0, duration: T, lane: 2 }]);
    const events = judged(judgeAdvance(s.state, s.context, s.msOf(0) + 5000, 0));

    expect(events).toHaveLength(1);
    expect(events[0]!.units).toBe(2);
    expect(s.state.hits[0]).toBe('missed');
  });
});

// ── JD-8 visualOffset ───────────────────────────────────────

describe('[JD-8] visualOffset (§1) — 골든 미커버', () => {
  it('진입 경계에서 한 번만 걸린다', () => {
    expect(toJudgeMs(1000, 30)).toBe(970);
    expect(toJudgeMs(1000, -30)).toBe(1030);
  });

  it('보정된 시각이 창의 중심이 된다', () => {
    const s = scene([{ startTick: 0, lane: 2 }]);
    const at = s.msOf(0);
    const events = judged(judgeKeyDown(s.state, s.context, 'key2', at + 30, 30));

    expect(events[0]!.judgment).toBe('SYNC');
    expect(events[0]!.diff).toBe(0);
  });

  it('keydown과 만료가 같은 보정 시계를 쓴다 — keydown만 보정하면 어긋난다', () => {
    // visualOffset 30ms. raw 시각 at+130 → 보정 후 at+100 = 창 경계, 아직 유효하다.
    const s = scene([{ startTick: 0, lane: 2 }]);
    const at = s.msOf(0);
    const events = judged(judgeKeyDown(s.state, s.context, 'key2', at + 130, 30));

    expect(events).toHaveLength(1);
    expect(events[0]!.judgment).toBe('GOOD');
    // 만료가 보정을 빠뜨렸다면 이 노트는 이미 missed였을 것이다.
    expect(s.state.hits[0]).toBe('hit');
  });
});

// ── 파생 표 ─────────────────────────────────────────────────

describe('파생 노트 표 (§1, J-3)', () => {
  it('표는 chart·timeline만으로 나오고 진행 상태를 담지 않는다', () => {
    const chart = makeChart({
      notes: notesOf([{ startTick: 0, duration: T, lane: 2 }]),
    });
    const notes = buildJudgeNotes(chart, buildTimeline(chart));

    expect(Object.keys(notes.ordered[0]!).sort()).toEqual(
      ['deadlineMs', 'index', 'note', 'startMs', 'tailMs'].sort(),
    );
  });

  it('index가 원본 notes 배열 순서를 가리킨다 — 정렬해도 정체성은 인덱스다', () => {
    const chart = makeChart({
      notes: notesOf([
        { startTick: T, lane: 2 },
        { startTick: 0, lane: 3 },
      ]),
    });
    const notes = buildJudgeNotes(chart, buildTimeline(chart));

    expect(notes.ordered[0]!.index).toBe(1);
    expect(notes.ordered[0]!.note.startTick).toBe(0);
  });

  it('tap의 tailMs는 startMs와 같고 hold는 duration만큼 뒤다', () => {
    const chart = makeChart({
      notes: notesOf([
        { startTick: 0, lane: 2 },
        { startTick: 0, duration: T, lane: 3 },
      ]),
    });
    const timeline = buildTimeline(chart);
    const notes = buildJudgeNotes(chart, timeline);
    const [hold, tap] = [notes.ordered[0]!, notes.ordered[1]!];

    expect(tap.tailMs).toBe(tap.startMs);
    expect(hold.tailMs).toBeCloseTo(tickToMs(timeline, T), 9);
  });

  it('같은 판정 신호를 가진 중복 노트는 서로 교환 가능하다', () => {
    const s = scene([
      { startTick: 0, lane: 2 },
      { startTick: 0, lane: 2 },
    ]);
    const at = s.msOf(0);

    judgeKeyDown(s.state, s.context, 'key2', at, 0);
    judgeKeyDown(s.state, s.context, 'key4', at, 0);

    expect(s.state.hits).toEqual(['hit', 'hit']);
  });
});

// ── §5·§6 Hold 소유 (M1-5) ──────────────────────────────────

/** 시나리오 끝마다 §6 불변식을 확인한다 — 복사 대신 assertion으로 지킨다. */
function expectInvariants(s: Scene): void {
  expect(heldCapacityViolations(s.state, s.context)).toEqual([]);
}

/** lane 2의 두 물리 키. lane 1·4는 키가 하나뿐이라 수요가 0 또는 1이다. */
const LANE2 = ['key2', 'key4'] as const;

describe('[JD-2] Normal Hold — lane 익명 수요 (§5)', () => {
  it('hold + tap: 어느 손가락이 tap이어도 hold가 유지된다', () => {
    const s = scene([{ startTick: 0, duration: T, lane: 2 }]);

    judgeKeyDown(s.state, s.context, LANE2[0], s.msOf(0), 0);
    expect(normalDemand(s.state, 2)).toBe(1);

    // 두 번째 손가락이 내려왔다 판정 없이 올라간다 — 수요는 그대로 충족된다.
    judgeKeyDown(s.state, s.context, LANE2[1], s.msOf(0) + 50, 0);
    const events = judgeKeyUp(s.state, s.context, LANE2[1], s.msOf(0) + 100, 0);

    expect(judged(events)).toEqual([]);
    expect(normalDemand(s.state, 2)).toBe(1);
    expectInvariants(s);
  });

  it('hold를 잡은 손가락을 놓아도 다른 손가락이 lane을 누르고 있으면 살아남는다', () => {
    const s = scene([{ startTick: 0, duration: T, lane: 2 }]);

    judgeKeyDown(s.state, s.context, 'key2', s.msOf(0), 0);
    judgeKeyDown(s.state, s.context, 'key4', s.msOf(0) + 50, 0);
    const events = judgeKeyUp(s.state, s.context, 'key2', s.msOf(0) + 100, 0);

    expect(judged(events)).toEqual([]); // 구 모델은 여기서 mid-release MISS였다
    expect(heldCount(s.state, 2)).toBe(1);
    expect(normalDemand(s.state, 2)).toBe(1);

    const tail = judged(judgeAdvance(s.state, s.context, s.msOf(T), 0));
    expect(tail).toEqual([expect.objectContaining({ judgment: 'SYNC', part: 'tail' })]);
    expectInvariants(s);
  });

  it('길이가 다른 같은 lane hold 둘 — 어느 손가락을 놓아도 짧은 쪽이 먼저 끝난다', () => {
    const s = scene([
      { startTick: 0, duration: T, lane: 2 },
      { startTick: 0, duration: T * 2, lane: 2 },
    ]);
    const at = s.msOf(0);

    judgeKeyDown(s.state, s.context, 'key2', at, 0);
    judgeKeyDown(s.state, s.context, 'key4', at, 0);
    expect(normalDemand(s.state, 2)).toBe(2);

    // 긴 쪽을 잡았던 손가락을 놓아도 해소되는 것은 tail이 이른 쪽이다.
    const events = judged(judgeKeyUp(s.state, s.context, 'key4', s.msOf(T) - 20, 0));

    expect(events).toHaveLength(1);
    expect(events[0]!.judgment).toBe('SYNC');
    expect(events[0]!.noteIndex).toBe(0); // duration T 쪽
    expect(normalDemand(s.state, 2)).toBe(1);
    expectInvariants(s);
  });

  it('lane 1은 키가 하나뿐이라 수요가 0 또는 1이다', () => {
    const s = scene([{ startTick: 0, duration: T, lane: 1 }]);

    judgeKeyDown(s.state, s.context, 'key1', s.msOf(0), 0);
    expect(normalDemand(s.state, 1)).toBe(1);
    expect(heldCount(s.state, 1)).toBe(1);
    expectInvariants(s);
  });

  it('mirror ON에서는 매핑된 lane의 키가 수요를 지탱한다', () => {
    const s = scene([{ startTick: 0, duration: T, lane: 3 }], { mirror: true });

    judgeKeyDown(s.state, s.context, 'key2', s.msOf(0), 0); // lane 3 → lane 2
    expect(normalDemand(s.state, 2)).toBe(1);
    expect(normalDemand(s.state, 3)).toBe(0);
    expectInvariants(s);
  });
});

describe('WideHold — 단일 소유·원자적 이양 (§5·§6)', () => {
  it('소유 키 하나를 갖는다', () => {
    const s = scene([{ startTick: 0, duration: T, lane: 1, isWide: true }]);

    judgeKeyDown(s.state, s.context, 'key1', s.msOf(0), 0);
    expect(s.state.activeWideHold).toBe(0);
    expect(s.state.wideOwnerKey).toBe('key1');
    expectInvariants(s);
  });

  it('키를 더 눌러도 소유가 복사되거나 자동으로 바뀌지 않는다', () => {
    const s = scene([{ startTick: 0, duration: T, lane: 1, isWide: true }]);

    judgeKeyDown(s.state, s.context, 'key1', s.msOf(0), 0);
    judgeKeyDown(s.state, s.context, 'key6', s.msOf(0) + 50, 0);

    expect(s.state.wideOwnerKey).toBe('key1');
    expectInvariants(s);
  });

  it('owner를 놓으면 자격 있는 키 중 가장 최근에 누른 키로 원자적으로 이양된다', () => {
    const s = scene([{ startTick: 0, duration: T * 2, lane: 1, isWide: true }]);
    const at = s.msOf(0);

    judgeKeyDown(s.state, s.context, 'key1', at, 0);
    judgeKeyDown(s.state, s.context, 'key3', at + 20, 0);
    judgeKeyDown(s.state, s.context, 'key6', at + 40, 0);

    const events = judgeKeyUp(s.state, s.context, 'key1', at + 60, 0);

    expect(judged(events)).toEqual([]); // 이양이지 해소가 아니다
    expect(s.state.activeWideHold).toBe(0);
    expect(s.state.wideOwnerKey).toBe('key6'); // press serial이 가장 큰 키
    expectInvariants(s);
  });

  it('Normal 수요가 Wide 소유보다 우선한다 — 잠식하지 않는다', () => {
    const s = scene([
      { startTick: 0, duration: T * 2, lane: 2 },
      { startTick: 0, duration: T * 2, lane: 1, isWide: true },
    ]);
    const at = s.msOf(0);

    judgeKeyDown(s.state, s.context, 'key2', at, 0); // Normal hold head
    judgeKeyDown(s.state, s.context, 'key4', at, 0); // Wide hold head

    expect(normalDemand(s.state, 2)).toBe(1);
    expect(s.state.wideOwnerKey).toBe('key4');

    // lane 2에 손가락이 하나만 남으면 그 손가락은 Normal 수요에 쓰이고 Wide는 해소된다.
    const events = judged(judgeKeyUp(s.state, s.context, 'key4', at + 100, 0));

    expect(events).toHaveLength(1);
    expect(events[0]!.noteIndex).toBe(1); // wide 쪽 tail
    expect(events[0]!.judgment).toBe('MISS');
    expect(normalDemand(s.state, 2)).toBe(1); // Normal은 살아 있다
    expect(s.state.activeWideHold).toBeNull();
    expectInvariants(s);
  });

  it('자격 있는 키가 하나도 없으면 tail이 해소된다', () => {
    const s = scene([{ startTick: 0, duration: T * 2, lane: 1, isWide: true }]);
    const at = s.msOf(0);

    judgeKeyDown(s.state, s.context, 'key1', at, 0);
    const events = judged(judgeKeyUp(s.state, s.context, 'key1', at + 50, 0));

    expect(events).toHaveLength(1);
    expect(events[0]!.judgment).toBe('MISS');
    expect(s.state.wideOwnerKey).toBeNull();
    expectInvariants(s);
  });

  it('Normal shortage를 먼저 해소하고 나서 Wide 배정을 정한다', () => {
    const s = scene([
      { startTick: 0, duration: T * 2, lane: 2 },
      { startTick: 0, duration: T * 2, lane: 1, isWide: true },
    ]);
    const at = s.msOf(0);

    judgeKeyDown(s.state, s.context, 'key2', at, 0); // Normal hold head
    judgeKeyDown(s.state, s.context, 'key4', at, 0); // Wide hold head — lane 2에 손가락 둘
    judgeKeyDown(s.state, s.context, 'key1', at + 10, 0); // 판정 없는 세 번째 손가락
    expect(s.state.wideOwnerKey).toBe('key4'); // 나중에 눌렀다고 소유가 옮겨가지는 않는다

    // lane 2에서 한 손가락이 빠지면 남은 키는 Normal 수요가 가져가고,
    // Wide 소유는 자격을 잃어 lane 1의 key1으로 이양된다.
    const events = judged(judgeKeyUp(s.state, s.context, 'key2', at + 50, 0));

    expect(events).toEqual([]); // 어느 Hold도 해소되지 않았다
    expect(normalDemand(s.state, 2)).toBe(1);
    expect(s.state.wideOwnerKey).toBe('key1');
    expectInvariants(s);
  });
});

describe('reconcileHeldCapacity 불변식 (§6)', () => {
  it('불변식 위반을 문장으로 잡아낸다 — 검사 자체가 낡지 않았다', () => {
    const s = scene([{ startTick: 0, duration: T, lane: 2 }]);
    judgeKeyDown(s.state, s.context, 'key2', s.msOf(0), 0);
    expectInvariants(s);

    // 재조정을 건너뛰고 키만 빼면 수요가 손 상태를 넘어선다.
    s.state.keysHeld.delete('key2');
    expect(heldCapacityViolations(s.state, s.context).length).toBeGreaterThan(0);

    // 재조정이 불변식을 되살린다.
    reconcileHeldCapacity(s.state, s.context, s.msOf(0) + 10);
    expectInvariants(s);
  });
});

// ── §7 tail·release grace ───────────────────────────────────

describe('[JD-6] Hold tail 처리·release grace (§7)', () => {
  it('임계 폭은 GOOD 창 + grace이며 원본과 같다 (D-2026-039)', () => {
    // 원본 `play-input.js`: curMs < tailMs - JUDGE_GOOD - LN_RELEASE_GRACE_MS → mid-release.
    expect(HOLD_RELEASE_WINDOW_MS).toBe(WINDOW_GOOD_MS + HOLD_RELEASE_GRACE_MS);
    expect(HOLD_RELEASE_WINDOW_MS).toBe(150);
  });

  it('임계 안에서 놓으면 tail SYNC, 그보다 이르면 tail MISS다', () => {
    const inGrace = scene([{ startTick: 0, duration: T * 2, lane: 2 }]);
    judgeKeyDown(inGrace.state, inGrace.context, 'key2', inGrace.msOf(0), 0);
    const ok = judged(
      judgeKeyUp(
        inGrace.state,
        inGrace.context,
        'key2',
        inGrace.msOf(T * 2) - HOLD_RELEASE_WINDOW_MS,
        0,
      ),
    );
    expect(ok).toEqual([expect.objectContaining({ judgment: 'SYNC', part: 'tail', units: 1 })]);

    const early = scene([{ startTick: 0, duration: T * 2, lane: 2 }]);
    judgeKeyDown(early.state, early.context, 'key2', early.msOf(0), 0);
    const miss = judged(
      judgeKeyUp(
        early.state,
        early.context,
        'key2',
        early.msOf(T * 2) - HOLD_RELEASE_WINDOW_MS - 1,
        0,
      ),
    );
    expect(miss).toEqual([expect.objectContaining({ judgment: 'MISS', part: 'tail', units: 1 })]);
  });

  it('계속 누르고 있으면 tailMs에 자동으로 SYNC 확정된다 — 사건 시각은 tailMs다', () => {
    const s = scene([{ startTick: 0, duration: T, lane: 2 }]);
    judgeKeyDown(s.state, s.context, 'key2', s.msOf(0), 0);

    // 프레임이 늦게 돌아도 판정 시각은 흔들리지 않는다.
    const events = judged(judgeAdvance(s.state, s.context, s.msOf(T) + 37, 0));

    expect(events).toHaveLength(1);
    expect(events[0]!.judgment).toBe('SYNC');
    expect(events[0]!.diff).toBe(0);
    expect(normalDemand(s.state, 2)).toBe(0);
    expect(s.state.keysHeld.has('key2')).toBe(true); // 물리 키는 keyup 전까지 남는다
    expectInvariants(s);
  });

  it('tail 성공은 combo를 올린다 — Hold는 head + tail 2단위다', () => {
    const s = scene([{ startTick: 0, duration: T, lane: 2 }]);

    judgeKeyDown(s.state, s.context, 'key2', s.msOf(0), 0);
    expect(s.state.combo).toBe(1);

    judgeAdvance(s.state, s.context, s.msOf(T), 0);
    expect(s.state.combo).toBe(2);
    expect(s.state.maxCombo).toBe(2);
  });

  it('tail MISS는 combo를 끊는다', () => {
    const s = scene([{ startTick: 0, duration: T * 2, lane: 2 }]);

    judgeKeyDown(s.state, s.context, 'key2', s.msOf(0), 0);
    const events = judgeKeyUp(s.state, s.context, 'key2', s.msOf(0) + 10, 0);

    expect(events.filter((e) => e.kind === 'comboReset')).toHaveLength(1);
    expect(s.state.combo).toBe(0);
  });

  it('tail 완료가 같은 tick의 head에 대한 keydown을 만들어내지 않는다', () => {
    // 같은 키의 tail + head가 같은 tick에 겹치면 떼었다 다시 눌러야 한다(§7).
    const s = scene([
      { startTick: 0, duration: T, lane: 2 },
      { startTick: T, lane: 2 },
    ]);
    judgeKeyDown(s.state, s.context, 'key2', s.msOf(0), 0);

    const events = judged(judgeAdvance(s.state, s.context, s.msOf(T), 0));
    expect(events).toEqual([expect.objectContaining({ part: 'tail' })]);
    expect(s.state.hits[1]).toBe('pending'); // tap은 여전히 미확정

    // 계속 누르고 있으면 tap은 만료된다.
    const later = judged(judgeAdvance(s.state, s.context, s.msOf(T) + WINDOW_GOOD_MS + 1, 0));
    expect(later).toEqual([expect.objectContaining({ judgment: 'MISS', part: 'tap' })]);
  });

  it('확정된 tail은 다시 판정되지 않는다', () => {
    const s = scene([{ startTick: 0, duration: T, lane: 2 }]);
    judgeKeyDown(s.state, s.context, 'key2', s.msOf(0), 0);
    judgeAdvance(s.state, s.context, s.msOf(T), 0);

    expect(judgeKeyUp(s.state, s.context, 'key2', s.msOf(T) + 200, 0)).toEqual([]);
    expect(judgeAdvance(s.state, s.context, s.msOf(T) + 5000, 0)).toEqual([]);
  });
});

// ── §8 head MISS 2단위 ──────────────────────────────────────

describe('[GA-2][GA-5] Hold head MISS — 2단위 회계 (§8)', () => {
  it('head 만료가 2단위를 즉시 확정하고 그 Hold를 종결한다', () => {
    const s = scene([{ startTick: 0, duration: T * 2, lane: 2 }]);
    const events = judged(judgeAdvance(s.state, s.context, s.msOf(0) + WINDOW_GOOD_MS + 1, 0));

    expect(events).toHaveLength(1); // 화면 피드백은 head-MISS 이벤트 1개
    expect(events[0]!.judgment).toBe('MISS');
    expect(events[0]!.part).toBe('head');
    expect(events[0]!.units).toBe(2); // 회계는 2단위
    expect(normalDemand(s.state, 2)).toBe(0); // 활성 Hold에 넣지 않는다

    // 원래 tail 시각에 중복 delta가 붙지 않는다.
    expect(judgeAdvance(s.state, s.context, s.msOf(T * 2) + 100, 0)).toEqual([]);
  });

  it('combo는 한 번만 리셋한다 — 0을 두 번 만들어도 페널티가 늘지 않는다', () => {
    const s = scene([
      { startTick: 0, lane: 1 },
      { startTick: T, duration: T, lane: 2 },
    ]);
    judgeKeyDown(s.state, s.context, 'key1', s.msOf(0), 0);
    expect(s.state.combo).toBe(1);

    const events = judgeAdvance(s.state, s.context, s.msOf(T) + WINDOW_GOOD_MS + 1, 0);

    expect(events.filter((e) => e.kind === 'comboReset')).toHaveLength(1);
    expect(judged(events)[0]!.units).toBe(2);
  });

  it('단위 표: Tap MISS 1 / Hold head MISS 2 / tail MISS 1 / tail SYNC 0', () => {
    const tap = scene([{ startTick: 0, lane: 2 }]);
    expect(judged(judgeAdvance(tap.state, tap.context, tap.msOf(0) + 200, 0))[0]!.units).toBe(1);

    const headMiss = scene([{ startTick: 0, duration: T, lane: 2 }]);
    expect(
      judged(judgeAdvance(headMiss.state, headMiss.context, headMiss.msOf(0) + 200, 0))[0]!.units,
    ).toBe(2);

    const tailMiss = scene([{ startTick: 0, duration: T * 2, lane: 2 }]);
    judgeKeyDown(tailMiss.state, tailMiss.context, 'key2', tailMiss.msOf(0), 0);
    const released = judged(
      judgeKeyUp(tailMiss.state, tailMiss.context, 'key2', tailMiss.msOf(0) + 10, 0),
    );
    expect(released.map((e) => [e.judgment, e.units])).toEqual([['MISS', 1]]);

    const tailOk = scene([{ startTick: 0, duration: T, lane: 2 }]);
    judgeKeyDown(tailOk.state, tailOk.context, 'key2', tailOk.msOf(0), 0);
    const done = judged(judgeAdvance(tailOk.state, tailOk.context, tailOk.msOf(T), 0));
    expect(done.filter((e) => e.judgment === 'MISS')).toEqual([]);
  });
});

// ── §9 입력 경로 ────────────────────────────────────────────

describe('이벤트 처리 (§9)', () => {
  it('이미 눌린 키의 반복 keydown은 무시된다', () => {
    const s = scene([
      { startTick: 0, lane: 2 },
      { startTick: 0, lane: 2 },
    ]);
    const at = s.msOf(0);

    expect(judged(judgeKeyDown(s.state, s.context, 'key2', at, 0))).toHaveLength(1);
    expect(judgeKeyDown(s.state, s.context, 'key2', at + 10, 0)).toEqual([]);
    expect(s.state.hits.filter((v: string) => v === 'hit')).toHaveLength(1);
  });

  it('누른 적 없는 키의 keyup은 아무 일도 하지 않는다 — blur 합성 release가 같은 경로다', () => {
    const s = scene([{ startTick: 0, duration: T, lane: 2 }]);
    judgeKeyDown(s.state, s.context, 'key2', s.msOf(0), 0);

    expect(judgeKeyUp(s.state, s.context, 'key5', s.msOf(0) + 10, 0)).toEqual([]);
    expect(normalDemand(s.state, 2)).toBe(1);
    expectInvariants(s);
  });

  it('세 진입점이 모두 visualOffset 보정을 지난다 — 한쪽만 걸릴 배선이 없다', () => {
    const s = scene([{ startTick: 0, duration: T, lane: 2 }]);

    judgeKeyDown(s.state, s.context, 'key2', s.msOf(0) + 30, 30);

    // raw는 tail을 지났지만 보정하면 30ms 이르다 — 보정을 빠뜨린 진행은 여기서 자동완료해버린다.
    expect(judgeAdvance(s.state, s.context, s.msOf(T), 30)).toEqual([]);

    const events = judged(judgeAdvance(s.state, s.context, s.msOf(T) + 31, 30));
    expect(events).toEqual([expect.objectContaining({ part: 'tail', judgment: 'SYNC' })]);
  });

  it('keyup은 keysHeld·press serial·wide 소유를 함께 비운다', () => {
    const s = scene([{ startTick: 0, duration: T * 2, lane: 1, isWide: true }]);
    judgeKeyDown(s.state, s.context, 'key1', s.msOf(0), 0);
    judgeKeyUp(s.state, s.context, 'key1', s.msOf(0) + 20, 0);

    expect(s.state.keysHeld.size).toBe(0);
    expect(s.state.keyPressSerial.size).toBe(0);
    expect(s.state.wideOwnerKey).toBeNull();
  });
});

// ── §12 무효 chart 폴백 ─────────────────────────────────────

describe('무효 chart 런타임 폴백 (§12)', () => {
  it('중복 WideHold도 중복 소유를 만들지 않고 미해소분이 MISS된다', () => {
    const s = scene([
      { startTick: 0, duration: T * 2, lane: 1, isWide: true },
      { startTick: 0, duration: T, lane: 1, isWide: true },
    ]);
    const at = s.msOf(0);

    judgeKeyDown(s.state, s.context, 'key1', at, 0); // tail이 이른 쪽(index 1)을 고른다
    const second = judged(judgeKeyDown(s.state, s.context, 'key6', at, 0));

    expect(second.filter((e) => e.part === 'tail')).toHaveLength(1);
    expect(second.find((e) => e.part === 'tail')!.judgment).toBe('MISS');
    expect(s.state.activeWideHold).toBe(1); // tail이 이른 쪽이 남는다
    expectInvariants(s);
  });

  it('로컬 capacity를 넘는 Normal Hold는 이른 tail부터 해소된다', () => {
    const s = scene([
      { startTick: 0, duration: T, lane: 2 },
      { startTick: 0, duration: T * 2, lane: 2 },
      { startTick: 0, duration: T * 3, lane: 2 },
    ]);
    const at = s.msOf(0);

    judgeKeyDown(s.state, s.context, 'key2', at, 0);
    judgeKeyDown(s.state, s.context, 'key4', at, 0);
    expect(normalDemand(s.state, 2)).toBe(2); // 세 번째는 애초에 칠 키가 없다

    const events = judged(judgeAdvance(s.state, s.context, at + WINDOW_GOOD_MS + 1, 0));
    expect(events).toEqual([expect.objectContaining({ judgment: 'MISS', units: 2 })]);
    expectInvariants(s);
  });
});

// ── §9 카운트다운 등록 ──────────────────────────────────────

describe('카운트다운 등록 진입점 (§9)', () => {
  it('시각을 받지 않고 키 상태만 갱신한다 — 판정도 재조정도 없다', () => {
    const s = scene([{ startTick: 0, lane: 2 }]);

    registerKeyDown(s.state, 'key2');

    expect(s.state.keysHeld.has('key2')).toBe(true);
    expect(s.state.keyPressSerial.get('key2')).toBe(0);
    expect(s.state.hits).toEqual(['pending']);
    // 시간이 흐르지 않았다 — 진행 시각이 그대로다.
    expect(s.state.nowMs).toBe(Number.NEGATIVE_INFINITY);
  });

  it('카운트다운 중 keyup이 tail을 자동 완료시키지 않는다 — 시각이 없으니 시간이 흐를 수 없다', () => {
    const s = scene([{ startTick: 0, duration: T, lane: 2 }]);
    judgeKeyDown(s.state, s.context, 'key2', s.msOf(0), 0);
    expect(normalDemand(s.state, 2)).toBe(1);

    // pause 상태. tail(500ms)을 한참 지난 실시간이 흘러도 이 경로는 시각을 모른다.
    registerKeyUp(s.state, 'key2');
    registerKeyDown(s.state, 'key4');

    expect(s.state.hits).toEqual(['hit']);
    expect(normalDemand(s.state, 2)).toBe(1);
    expect(s.state.keysHeld).toEqual(new Set(['key4']));
  });

  it('반복 keydown은 press serial을 새로 매기지 않는다', () => {
    const s = scene([{ startTick: 0, lane: 2 }]);

    registerKeyDown(s.state, 'key2');
    registerKeyDown(s.state, 'key4');
    registerKeyDown(s.state, 'key2');

    expect(s.state.keyPressSerial.get('key2')).toBe(0);
    expect(s.state.keyPressSerial.get('key4')).toBe(1);
    expect(s.state.nextPressSerial).toBe(2);
  });

  it('등록 keyup이 wide 소유 참조를 비운다', () => {
    const s = scene([{ startTick: 0, duration: T * 4, lane: 1, isWide: true }]);
    judgeKeyDown(s.state, s.context, 'key1', s.msOf(0), 0);
    expect(s.state.wideOwnerKey).toBe('key1');

    registerKeyUp(s.state, 'key1');

    expect(s.state.wideOwnerKey).toBeNull();
    // 활성 WideHold 자체는 남는다 — 해소는 anchor의 재조정 몫이다(§10).
    expect(s.state.activeWideHold).toBe(0);
  });

  it('판정 경로가 같은 등록을 쓴다 — press serial이 한 열로 이어진다', () => {
    const s = scene([{ startTick: 0, lane: 2 }]);

    registerKeyDown(s.state, 'key1');
    judgeKeyDown(s.state, s.context, 'key2', s.msOf(0), 0);

    expect(s.state.keyPressSerial.get('key1')).toBe(0);
    expect(s.state.keyPressSerial.get('key2')).toBe(1);
  });
});

// ── §10 중간 시작 ───────────────────────────────────────────

describe('[JD-7] 중간 시작 시드 (§10)', () => {
  it('anchor 이전 노트를 SYNC로 시드하고 combo를 쌓는다 — AP/FC 유효성이 보존된다', () => {
    const s = scene([
      { startTick: 0, lane: 1 },
      { startTick: T, lane: 2 },
      { startTick: T * 4, lane: 3 },
    ]);

    const events = judged(seedPlayStateAt(s.state, s.context, s.msOf(T * 2)));

    expect(events).toEqual([
      expect.objectContaining({ judgment: 'SYNC', part: 'tap', noteIndex: 0, diff: 0, units: 1 }),
      expect.objectContaining({ judgment: 'SYNC', part: 'tap', noteIndex: 1, diff: 0, units: 1 }),
    ]);
    expect(s.state.hits).toEqual(['hit', 'hit', 'pending']);
    expect(s.state.combo).toBe(2);
  });

  it('시드는 FAST/SLOW를 만들지 않는다 — diff가 0이다', () => {
    const s = scene([{ startTick: 0, lane: 2 }]);

    const events = seedPlayStateAt(s.state, s.context, s.msOf(T));

    expect(events.filter((e) => e.kind === 'fastSlow')).toEqual([]);
  });

  it('anchor에서 시작하는 노트는 시드되지 않고 새 keydown이 필요하다', () => {
    const s = scene([{ startTick: T, lane: 2 }]);
    const anchor = s.msOf(T);

    seedPlayStateAt(s.state, s.context, anchor);
    expect(s.state.hits).toEqual(['pending']);

    // 이미 눌려 있던 키로도 맞지 않는다 — 판정은 keydown에서만 일어난다.
    expect(judged(judgeAdvance(s.state, s.context, anchor, 0))).toEqual([]);
    expect(judged(judgeKeyDown(s.state, s.context, 'key2', anchor, 0))).toEqual([
      expect.objectContaining({ judgment: 'SYNC', noteIndex: 0 }),
    ]);
  });

  it('anchor에서 끝나는 Hold는 두 단위 모두 과거로 시드된다', () => {
    const s = scene([{ startTick: 0, duration: T, lane: 2 }]);

    const events = judged(seedPlayStateAt(s.state, s.context, s.msOf(T)));

    expect(events.map((e) => e.part)).toEqual(['head', 'tail']);
    expect(events.every((e) => e.judgment === 'SYNC')).toBe(true);
    expect(normalDemand(s.state, 2)).toBe(0);
    expect(s.state.combo).toBe(2);
  });

  it('crossing Hold는 head만 시드되고 잡고 있는 키로 활성 수요에 남는다', () => {
    const s = scene([{ startTick: 0, duration: T * 4, lane: 2 }]);
    const anchor = s.msOf(T);

    registerKeyDown(s.state, 'key2');
    const events = judged(seedPlayStateAt(s.state, s.context, anchor));

    expect(events).toEqual([expect.objectContaining({ part: 'head', judgment: 'SYNC' })]);
    expect(normalDemand(s.state, 2)).toBe(1);
    expectInvariants(s);

    // 남은 tail은 평소대로 자동 완료된다.
    expect(judged(judgeAdvance(s.state, s.context, s.msOf(T * 4), 0))).toEqual([
      expect.objectContaining({ part: 'tail', judgment: 'SYNC' }),
    ]);
  });

  it('crossing Normal이 Wide보다 먼저 배정된다 — 시드 전용 배정 규칙이 없다(§6)', () => {
    const s = scene([
      { startTick: 0, duration: T * 4, lane: 2 },
      { startTick: 0, duration: T * 4, lane: 1, isWide: true },
    ]);

    registerKeyDown(s.state, 'key2');
    registerKeyDown(s.state, 'key1');
    seedPlayStateAt(s.state, s.context, s.msOf(T));

    expect(normalDemand(s.state, 2)).toBe(1);
    expect(s.state.activeWideHold).toBe(1);
    // key2는 Normal 수요에 묶여 있으므로 Wide는 key1이 가져간다.
    expect(s.state.wideOwnerKey).toBe('key1');
    expectInvariants(s);
  });

  it('유지할 키가 없는 crossing Hold의 tail은 §7 임계로 분류된다 — 멀면 MISS', () => {
    const s = scene([{ startTick: 0, duration: T, lane: 2 }]);
    const anchor = s.msOf(T) - HOLD_RELEASE_WINDOW_MS - 1;

    const events = judged(seedPlayStateAt(s.state, s.context, anchor));

    expect(events).toEqual([
      expect.objectContaining({ part: 'head', judgment: 'SYNC' }),
      expect.objectContaining({ part: 'tail', judgment: 'MISS' }),
    ]);
    expect(s.state.combo).toBe(0);
  });

  it('같은 임계 안쪽이면 잡고 있지 않아도 tail SYNC다 — tail 분류 규칙은 §7 하나뿐이다', () => {
    const s = scene([{ startTick: 0, duration: T, lane: 2 }]);
    const anchor = s.msOf(T) - HOLD_RELEASE_WINDOW_MS;

    const events = judged(seedPlayStateAt(s.state, s.context, anchor));

    expect(events).toEqual([
      expect.objectContaining({ part: 'head', judgment: 'SYNC' }),
      expect.objectContaining({ part: 'tail', judgment: 'SYNC' }),
    ]);
  });

  it('시드가 판정 회계를 그대로 탄다 — 단위 합이 노트 단위와 같다', () => {
    const s = scene([
      { startTick: 0, lane: 1 },
      { startTick: 0, duration: T, lane: 2 },
    ]);

    const events = judged(seedPlayStateAt(s.state, s.context, s.msOf(T * 2)));

    // tap 1 + head 1 + tail 1 = 3단위.
    expect(events.reduce((sum, e) => sum + e.units, 0)).toBe(3);
  });

  it('시드 뒤 진행 시각이 anchor다 — 이후 판정이 anchor에서 이어진다', () => {
    const s = scene([{ startTick: T * 4, lane: 2 }]);
    const anchor = s.msOf(T);

    seedPlayStateAt(s.state, s.context, anchor);

    expect(s.state.nowMs).toBe(anchor);
  });

  it('판정이 진행된 state로 부르면 던진다 — Resume 오배선이 조용히 통과하지 않는다', () => {
    const s = scene([{ startTick: 0, lane: 2 }]);
    judgeKeyDown(s.state, s.context, 'key2', s.msOf(0), 0);

    expect(() => seedPlayStateAt(s.state, s.context, s.msOf(T))).toThrow(/판정이 이미 진행된/);
  });

  it('카운트다운 등록만 있는 state는 시드할 수 있다 — keysHeld는 사전조건이 아니다', () => {
    const s = scene([{ startTick: 0, lane: 2 }]);
    registerKeyDown(s.state, 'key2');

    expect(() => seedPlayStateAt(s.state, s.context, s.msOf(T))).not.toThrow();
  });
});

// ── §10 pause Resume ────────────────────────────────────────

describe('pause Resume — 비-재시드 재조정 (§10, JD-7)', () => {
  it('보존된 판정과 활성 Hold를 그대로 두고 anchor에서 재조정만 한다', () => {
    const s = scene([
      { startTick: 0, lane: 1 },
      { startTick: 0, duration: T * 4, lane: 2 },
    ]);
    judgeKeyDown(s.state, s.context, 'key1', s.msOf(0), 0);
    judgeKeyDown(s.state, s.context, 'key2', s.msOf(0), 0);

    const anchor = s.msOf(T);
    judgeAdvance(s.state, s.context, anchor, 0);
    const before = [...s.state.hits];
    const comboBefore = s.state.combo;

    // Resume 카운트다운 — 키를 바꿔 잡는다. 시간은 흐르지 않는다.
    registerKeyUp(s.state, 'key2');
    registerKeyDown(s.state, 'key4');

    const events = reconcileHeldCapacity(s.state, s.context, anchor);

    expect(events).toEqual([]);
    expect(s.state.hits).toEqual(before);
    expect(s.state.combo).toBe(comboBefore);
    expect(normalDemand(s.state, 2)).toBe(1);
    expectInvariants(s);
  });

  it('Resume에서 놓아버린 Hold는 anchor에서 §7 임계로 해소된다', () => {
    const s = scene([{ startTick: 0, duration: T * 4, lane: 2 }]);
    judgeKeyDown(s.state, s.context, 'key2', s.msOf(0), 0);

    const anchor = s.msOf(T);
    judgeAdvance(s.state, s.context, anchor, 0);
    registerKeyUp(s.state, 'key2');

    const events = judged(reconcileHeldCapacity(s.state, s.context, anchor));

    expect(events).toEqual([expect.objectContaining({ part: 'tail', judgment: 'MISS' })]);
    expect(s.state.hits).toEqual(['hit']);
  });

  it('Resume이 과거 노트를 다시 시드하지 않는다 — 미스는 미스로 남는다', () => {
    const s = scene([
      { startTick: 0, lane: 1 },
      { startTick: T * 4, lane: 2 },
    ]);

    const anchor = s.msOf(T);
    judgeAdvance(s.state, s.context, anchor, 0);
    expect(s.state.hits).toEqual(['missed', 'pending']);

    reconcileHeldCapacity(s.state, s.context, anchor);

    expect(s.state.hits).toEqual(['missed', 'pending']);
    expect(s.state.combo).toBe(0);
  });
});

// ── WO-1 §3-5 ~ §3-9 ─────────────────────────────────────────

describe('[JD-1] 같은 tick hold가 tap보다 우선한다 (배열 순서 무관, 스팟체크 #4)', () => {
  it('케이스 A: notes = [hold, tap] — keydown이 hold의 head를 잡고 holdOpened를 동반한다', () => {
    const s = scene([
      { startTick: 0, duration: T, lane: 2 }, // index 0: hold
      { startTick: 0, lane: 2 }, // index 1: tap
    ]);
    expect(s.context.notes.ordered[0]!.note.duration).toBe(T);

    const events = judgeKeyDown(s.state, s.context, 'key2', s.msOf(0), 0);
    const parts = events
      .filter((e) => e.kind === 'judged' || e.kind === 'holdOpened')
      .map((e) => (e.kind === 'judged' ? e.part : e.kind));

    expect(parts).toEqual(['head', 'holdOpened']);
  });

  it('케이스 B: notes = [tap, hold] — 배열 순서를 뒤집어도 결과는 같다', () => {
    const s = scene([
      { startTick: 0, lane: 2 }, // index 0: tap
      { startTick: 0, duration: T, lane: 2 }, // index 1: hold
    ]);
    expect(s.context.notes.ordered[0]!.note.duration).toBe(T);

    const events = judgeKeyDown(s.state, s.context, 'key2', s.msOf(0), 0);
    const parts = events
      .filter((e) => e.kind === 'judged' || e.kind === 'holdOpened')
      .map((e) => (e.kind === 'judged' ? e.part : e.kind));

    expect(parts).toEqual(['head', 'holdOpened']);
  });
});

describe('[JD-7 경계] 시드의 tail == anchor 경계 (이벤트 순서, 스팟체크 #5)', () => {
  it('tailMs가 정확히 anchor면 head→holdOpened→tail→tap 순으로 시드된다', () => {
    const s = scene([
      { startTick: 0, duration: T, lane: 1 }, // index 0: hold [0, 1920)
      { startTick: 960, lane: 3 }, // index 1: tap @960
    ]);
    const anchor = s.msOf(T); // tail이 anchor와 정확히 같다

    const events = seedPlayStateAt(s.state, s.context, anchor);
    const sequence = events
      .filter((e) => e.kind === 'judged' || e.kind === 'holdOpened')
      .map((e) => [e.kind === 'judged' ? e.part : e.kind, e.noteIndex] as const);

    expect(sequence).toEqual([
      ['head', 0],
      ['holdOpened', 0],
      ['tail', 0],
      ['tap', 1],
    ]);
    for (const lane of [1, 2, 3, 4] as const) {
      expect(s.state.activeNormalHolds[lane]).toEqual([]);
    }
  });
});

describe('무효 chart 중복 WideHold의 tail 동률 (judge §12)', () => {
  it('MISS로 닫히는 쪽은 새로 판정된 노트다 — 동률이면 기존 소유가 남는다(`<=`)', () => {
    const s = scene([
      { startTick: 0, duration: T, lane: 1, isWide: true }, // index 0
      { startTick: 0, duration: T, lane: 4, isWide: true }, // index 1 — 다른 키, 같은 tick·duration
    ]);
    const at = s.msOf(0);

    judgeKeyDown(s.state, s.context, 'key1', at, 0); // index 0을 head 확정
    const second = judged(judgeKeyDown(s.state, s.context, 'key6', at, 0)); // index 1

    const tailMiss = second.filter((e) => e.part === 'tail');
    expect(tailMiss).toHaveLength(1);
    expect(tailMiss[0]!.noteIndex).toBe(1); // 새로 판정된 노트가 닫힌다
    expect(tailMiss[0]!.judgment).toBe('MISS');
    expect(s.state.activeWideHold).toBe(0); // 기존 소유(index 0)가 남는다
  });
});

describe('heldCapacityViolations 자기 검증 (judge §6)', () => {
  it('tail 순이 아닌 활성 목록을 잡아낸다', () => {
    const s = scene([
      { startTick: 0, duration: T, lane: 2 }, // index 0 — a, tailMs 500
      { startTick: 0, duration: T * 2, lane: 2 }, // index 1 — b, tailMs 1000
    ]);
    s.state.hits[0] = 'hit';
    s.state.hits[1] = 'hit';
    s.state.keysHeld.add('key2');
    s.state.keysHeld.add('key4');
    // 일부러 tail 역순으로 합성한다: b(늦음) 먼저, a(이름) 나중.
    s.state.activeNormalHolds[2] = [1, 0];

    const violations = heldCapacityViolations(s.state, s.context);
    expect(violations).toContain('lane 2: 활성 목록이 tail 순이 아니다');
  });

  it('활성 목록의 수요가 눌린 키보다 많으면 잡아낸다', () => {
    const s = scene([{ startTick: 0, duration: T, lane: 2 }]);
    s.state.hits[0] = 'hit';
    s.state.activeNormalHolds[2] = [0];
    // keysHeld를 일부러 비운다 — 수요 1인데 눌린 키가 0이다.

    const violations = heldCapacityViolations(s.state, s.context);
    expect(violations).toContain('lane 2: Normal 수요가 눌린 키보다 많다');
  });

  it('정상 상태는 빈 배열이다', () => {
    const s = scene([{ startTick: 0, duration: T, lane: 2 }]);
    judgeKeyDown(s.state, s.context, 'key2', s.msOf(0), 0);

    expect(heldCapacityViolations(s.state, s.context)).toEqual([]);
  });

  it('tap이 활성 목록에 있으면 잡아낸다', () => {
    const s = scene([{ startTick: 0, duration: 0, lane: 2 }]); // tap
    s.state.hits[0] = 'hit';
    s.state.keysHeld.add('key2');
    s.state.activeNormalHolds[2] = [0];

    const violations = heldCapacityViolations(s.state, s.context);
    expect(violations).toContain('note 0: Hold가 아닌데 활성 목록에 있다');
  });

  it('tail이 같은 둘은 순서 위반이 아니다', () => {
    const s = scene([
      { startTick: 0, duration: T, lane: 2 },
      { startTick: 0, duration: T, lane: 2 }, // tail 동률
    ]);
    s.state.hits[0] = 'hit';
    s.state.hits[1] = 'hit';
    s.state.keysHeld.add('key2');
    s.state.keysHeld.add('key4');
    s.state.activeNormalHolds[2] = [0, 1];

    const violations = heldCapacityViolations(s.state, s.context);
    expect(violations).not.toContain('lane 2: 활성 목록이 tail 순이 아니다');
  });
});

describe('자동완료 동률 tail의 결정론 순서', () => {
  it('tail 이벤트가 noteIndex 오름차순으로 나온다', () => {
    const s = scene([
      { startTick: 0, duration: T, lane: 2 }, // index 0
      { startTick: 0, duration: T, lane: 2 }, // index 1 — 같은 구간, 무효 chart
    ]);
    const at = s.msOf(0);

    judgeKeyDown(s.state, s.context, 'key2', at, 0); // index 0을 head 확정
    judgeKeyDown(s.state, s.context, 'key4', at, 0); // index 1을 head 확정

    const events = judged(judgeAdvance(s.state, s.context, s.msOf(T), 0));
    const tailEvents = events.filter((e) => e.part === 'tail');

    expect(tailEvents.map((e) => e.noteIndex)).toEqual([0, 1]);
  });
});
