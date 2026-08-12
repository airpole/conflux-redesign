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
import { ledgerEntry } from '../../tests/support/divergences.js';
import { makeChart } from './core-chart-fixture.js';
import {
  WINDOW_GOOD_MS,
  WINDOW_PERFECT_MS,
  WINDOW_SYNC_MS,
  WINDOW_WIDE_SYNC_MS,
  TICKS_PER_BEAT as TPB,
} from './core-constants.js';
import type { LaneKeyId } from './core-settings.js';
import type { Lane, Note } from './core-chart.js';
import { buildTimeline, tickToMs } from './core-timing.js';
import {
  advanceJudgmentStateTo,
  buildJudgeNotes,
  commitJudgment,
  createJudgeState,
  judgeKeyDown,
  judgeLaneOf,
  judgmentOf,
  laneMapOf,
  laneOfKey,
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

describe('후보 순서 (§1) — 골든 미커버, 스펙이 유일한 판정자', () => {
  it('대장에 미커버로 등재돼 있다', () => {
    expect(ledgerEntry('JD-1').relation).toBe('미커버');
  });

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
    expect(s.state.status.filter((v) => v === 'hit')).toHaveLength(1);
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
    expect(keys.map(laneOfKey)).toEqual([1, 2, 3, 2, 3, 4]);
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
    const events = judged(commitJudgment(s.state, entry, nowMs));

    expect(events).toHaveLength(1);
    expect(events[0]!.judgment).toBe('GOOD');
    expect(events[0]!.diff).toBeCloseTo(60, 9);
    expect(events[0]!.noteIndex).toBe(entry.index);
    expect(s.state.status[entry.index]).toBe('hit');
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
    expect(s.state.hits).toBe(2);
  });

  it('Hold head는 holdOpened를 낼 뿐 활성 등록을 하지 않는다 — 소비자는 M1-5', () => {
    const s = scene([{ startTick: 0, duration: T, lane: 2 }]);
    const events = judgeKeyDown(s.state, s.context, 'key2', s.msOf(0), 0);
    const opened = events.filter((e) => e.kind === 'holdOpened');

    expect(opened).toHaveLength(1);
    expect(judged(events)[0]!.units).toBe(1);
  });

  it('게이지도 이펙트도 이벤트 밖으로 새지 않는다 (JD-3·JD-4)', () => {
    expect(ledgerEntry('JD-3').relation).toBe('없음');
    expect(ledgerEntry('JD-4').relation).toBe('없음');

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
    expect(fastEvents.find((e) => e.kind === 'fastSlow')).toMatchObject({
      side: 'FAST',
    });
    expect(fast.state.fastCount).toBe(1);

    const slow = scene([{ startTick: 0, lane: 2 }]);
    judgeKeyDown(slow.state, slow.context, 'key2', slow.msOf(0) + 60, 0);
    expect(slow.state.slowCount).toBe(1);

    const sync = scene([{ startTick: 0, lane: 2 }]);
    judgeKeyDown(sync.state, sync.context, 'key2', sync.msOf(0) + 10, 0);
    expect(sync.state.fastCount + sync.state.slowCount).toBe(0);

    const wide = scene([{ startTick: 0, lane: 1, isWide: true }]);
    judgeKeyDown(wide.state, wide.context, 'key1', wide.msOf(0) + 60, 0);
    expect(wide.state.fastCount + wide.state.slowCount).toBe(0);
  });
});

// ── §9 만료 (M1-4 범위 = Tap만) ─────────────────────────────

describe('Tap 만료 MISS (§2·§9)', () => {
  it('deadline을 지나야 만료된다 — 경계 위에서는 아직 유효하다', () => {
    const s = scene([{ startTick: 0, lane: 2 }]);
    const at = s.msOf(0);

    expect(advanceJudgmentStateTo(s.state, s.context, at + WINDOW_GOOD_MS)).toEqual([]);
    expect(s.state.status[0]).toBe('pending');

    const events = advanceJudgmentStateTo(s.state, s.context, at + WINDOW_GOOD_MS + 1);
    expect(judged(events)[0]!.judgment).toBe('MISS');
    expect(s.state.status[0]).toBe('missed');
    expect(s.state.misses).toBe(1);
  });

  it('만료된 노트는 후보에 다시 나타나지 않는다', () => {
    const s = scene([{ startTick: 0, lane: 2 }]);
    const at = s.msOf(0);

    advanceJudgmentStateTo(s.state, s.context, at + 500);
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

    const events = advanceJudgmentStateTo(s.state, s.context, s.msOf(T) + 500);
    expect(events.filter((e) => e.kind === 'comboReset')).toHaveLength(1);
    expect(s.state.combo).toBe(0);
    expect(s.state.maxCombo).toBe(1);
  });

  it('Hold head는 M1-4에서 만료시키지 않는다 — 2단위 회계는 M1-5', () => {
    const s = scene([{ startTick: 0, duration: T, lane: 2 }]);

    expect(advanceJudgmentStateTo(s.state, s.context, s.msOf(0) + 5000)).toEqual([]);
    expect(s.state.status[0]).toBe('pending');
  });
});

// ── JD-8 visualOffset ───────────────────────────────────────

describe('visualOffset (§1, JD-8) — 골든 미커버', () => {
  it('대장에 미커버로 등재돼 있다', () => {
    expect(ledgerEntry('JD-8').relation).toBe('미커버');
  });

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
    expect(s.state.status[0]).toBe('hit');
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

    expect(s.state.status).toEqual(['hit', 'hit']);
  });
});
