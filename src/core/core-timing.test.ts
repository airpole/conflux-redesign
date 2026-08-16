/**
 * timing을 골든 표와 대조하고, 골든이 닿지 않는 자리를 스펙으로 채운다.
 *
 * 골든 198건은 원본 이름(`t2ms`·`ms2t`·`getBPMAt`·`getTimeSig`·`tickToMeasure`·
 * `getMinTick`)을 쓴다. 명칭 매핑은 테스트가 갖는다 — 구현은 재설계 이름을 쓴다.
 *
 * `getBPMAt`·`getTimeSig` 60건은 대응 **함수**가 없다(`timing.md` §2가 unused
 * `bpmAt`을 만들지 않는다). 대신 세그먼트 조회로 채점한다 — 값이 나오는 자리가
 * 이미 있으므로 공개 API를 늘리지 않고도 검증이 유지된다(D-2026-037).
 */
import { describe, expect, it } from 'vitest';
import { loadGolden, realEquals } from '../../tests/support/golden.js';
import { expectDivergence } from '../../tests/support/divergences.js';
import { makeChart } from './core-chart-fixture.js';
import {
  GRID_DIVISORS,
  GRID_DIVISOR_DEFAULT,
  SCROLL_VIEW_MS,
  SONG_END_TAIL_MS,
  TICKS_PER_BEAT as TPB,
} from './core-constants.js';
import {
  buildTimeline,
  cellTickOf,
  gridLines,
  measureSegmentAt,
  measureToTick,
  minTick,
  msToTick,
  scrollProgressAt,
  songEndOf,
  tempoSegmentAt,
  tickToMeasure,
  tickToMs,
  type Timeline,
} from './core-timing.js';

interface TimingCase {
  readonly fixture: string;
  readonly fn: string;
  readonly args: readonly number[];
  readonly expected: unknown;
}

const cases = loadGolden<TimingCase>('timing').cases;

// ── 골든 fixture → 재설계 chart ──────────────────────────────
// 골든은 원본 필드명(`tick`)으로 뜬 관측 자료다. 여기서 재설계 필드명
// (`startTick`)으로 옮긴다 — 값은 그대로다.

const T = TPB;

const TEMPOS: Record<string, ReadonlyArray<{ startTick: number; bpm: number }>> = {
  plain: [{ startTick: 0, bpm: 120 }],
  multiBpm: [
    { startTick: 0, bpm: 120 },
    { startTick: T * 4, bpm: 180 },
    { startTick: T * 8, bpm: 60 },
  ],
  multiTimeSig: [{ startTick: 0, bpm: 120 }],
  negativeTick: [{ startTick: 0, bpm: 120 }],
  holdOverlap: [{ startTick: 0, bpm: 120 }],
  sixKeySaturation: [{ startTick: 0, bpm: 120 }],
};

const FOUR_FOUR = [{ startTick: 0, numerator: 4, denominator: 4 }];

const TIME_SIGNATURES: Record<
  string,
  ReadonlyArray<{ startTick: number; numerator: number; denominator: number }>
> = {
  plain: FOUR_FOUR,
  multiBpm: FOUR_FOUR,
  multiTimeSig: [
    { startTick: 0, numerator: 4, denominator: 4 },
    { startTick: T * 4, numerator: 3, denominator: 4 },
    { startTick: T * 7, numerator: 7, denominator: 8 },
  ],
  negativeTick: FOUR_FOUR,
  holdOverlap: FOUR_FOUR,
  sixKeySaturation: FOUR_FOUR,
};

const timelines = new Map<string, Timeline>(
  Object.keys(TEMPOS).map((name) => [
    name,
    buildTimeline(makeChart({ tempos: TEMPOS[name]!, timeSignatures: TIME_SIGNATURES[name]! })),
  ]),
);

function timelineOf(fixture: string): Timeline {
  const timeline = timelines.get(fixture);
  if (!timeline) throw new Error(`골든에 있는 fixture를 테스트가 모른다: ${fixture}`);
  return timeline;
}

/** 골든 한 건을 재설계 호출로 옮긴다. */
function actualOf(testCase: TimingCase): unknown {
  const timeline = timelineOf(testCase.fixture);
  const [first] = testCase.args;

  switch (testCase.fn) {
    case 't2ms':
      return tickToMs(timeline, first!);
    case 'ms2t':
      return msToTick(timeline, first!);
    case 'getBPMAt':
      return tempoSegmentAt(timeline, first!).bpm;
    case 'getTimeSig': {
      const segment = measureSegmentAt(timeline, first!);
      return {
        tick: segment.startTick,
        numerator: segment.numerator,
        denominator: segment.denominator,
      };
    }
    case 'tickToMeasure':
      return tickToMeasure(timeline, first!);
    case 'getMinTick':
      return minTick(timeline);
    default:
      throw new Error(`골든에 알 수 없는 함수가 있다: ${testCase.fn}`);
  }
}

describe('timing — 골든 대조', () => {
  it('골든 198건을 한 건도 빠뜨리지 않는다', () => {
    expect(cases).toHaveLength(198);
    expect(new Set(cases.map((c) => c.fixture))).toEqual(new Set(Object.keys(TEMPOS)));
  });

  it.each(cases)('$fixture $fn($args)', (testCase) => {
    const actual = actualOf(testCase);

    if (typeof testCase.expected === 'number') {
      expect(typeof actual).toBe('number');
      expect(realEquals(actual as number, testCase.expected)).toBe(true);
      return;
    }
    expect(actual).toEqual(testCase.expected);
  });
});

describe('timing — round trip', () => {
  it.each([...timelines.keys()])('%s에서 tick→ms→tick이 제자리로 온다', (name) => {
    const timeline = timelineOf(name);
    for (const tick of [-T, -1, 0, 1, T, T * 4 - 1, T * 4, T * 8, T * 12]) {
      expect(realEquals(msToTick(timeline, tickToMs(timeline, tick)), tick)).toBe(true);
    }
  });

  it('measure 표기와 파싱이 왕복한다', () => {
    const timeline = timelineOf('multiTimeSig');
    for (const tick of [0, T, T * 4, T * 5, T * 7, T * 7 + 960, T * 20]) {
      const label = tickToMeasure(timeline, tick);
      expect(measureToTick(timeline, label)).toBe(tick);
    }
  });

  it('labelOffset은 표시값만 옮기고 왕복을 깨지 않는다', () => {
    const timeline = timelineOf('plain');
    expect(tickToMeasure(timeline, 0, { labelOffset: 4 })).toBe('5');
    expect(measureToTick(timeline, '5', { labelOffset: 4 })).toBe(0);
  });
});

// ── 스펙 테스트 — 골든이 닿지 않는 자리 ─────────────────────

describe('[TM-1][TM-2][TM-3][TM-4] 곡 종료 4값', () => {
  const timeline = buildTimeline(makeChart());

  it('네 값이 §9 정의대로 나온다', () => {
    const chart = makeChart({
      metadata: { ...makeChart().metadata, offset: 200 },
      notes: [{ startTick: T * 2, duration: T, lane: 1, isWide: false }],
    });
    const end = songEndOf(timeline, chart, 10000);

    expect(end.chartEndMs).toBeCloseTo(1500, 9); // tick 5760 @120bpm
    expect(end.musicEndMs).toBe(9800); // TM-2: offset 보정
    expect(end.contentEndMs).toBe(9800);
    expect(end.songEndMs).toBe(9800 + SONG_END_TAIL_MS); // TM-1: 단일 tail
  });

  it('TM-3 — laneEvent도 chartEndMs에 든다', () => {
    const chart = makeChart({
      laneEvents: [{ startTick: T * 4, duration: 0, lineNum: 1, targetPos: 0.5, easing: null }],
    });
    expect(songEndOf(timeline, chart, null).chartEndMs).toBeCloseTo(2000, 9);
  });

  it('event도 음악도 없으면 tail만 남는다', () => {
    const end = songEndOf(timeline, makeChart(), null);
    expect(end.chartEndMs).toBe(0);
    expect(end.musicEndMs).toBe(0);
    expect(end.songEndMs).toBe(SONG_END_TAIL_MS); // TM-4: 5000ms 하한 없음
  });

  it('진행 분모와 종료 조건이 다른 값이다', () => {
    const end = songEndOf(timeline, makeChart(), 10000);
    expect(end.contentEndMs).toBeLessThan(end.songEndMs);
  });
});

describe('[TM-7] sub 분할 = gridDivisor', () => {
  const timeline = timelineOf('plain');

  it('원본의 박당 고정 16분할이 아니라 gridDivisor 격자를 쓴다', () => {
    // tick 480은 1마디 1박에서 16분음표 한 칸 지난 자리다.
    // 원본이라면 480/(1920/16) = 4 → "1.1.4". 재설계는 격자 칸 수를 센다.
    expect(tickToMeasure(timeline, 480, { gridDivisor: 16 })).toBe('1.1.1'); // 칸 480
    expect(tickToMeasure(timeline, 480, { gridDivisor: 32 })).toBe('1.1.2'); // 칸 240
    expect(tickToMeasure(timeline, 960, { gridDivisor: 16 })).toBe('1.1.2');
  });

  it('cellTick이 온음표를 V등분한다', () => {
    expect(cellTickOf(8)).toBe(960);
    expect(cellTickOf(256)).toBe(30);
  });

  it('격자 밖 tick은 근사하지 않고 t 표기로 떨어진다 (D-2026-045)', () => {
    // 481은 어느 격자에도 안 떨어진다. 480도 8분 격자(칸 960)의 절반이다.
    // 근사 표기는 왕복을 깨뜨리므로 폐기했다 — 표기 형태와 무관하게 왕복이 성립한다.
    expect(tickToMeasure(timeline, 481, { gridDivisor: 16 })).toBe('t481');
    expect(measureToTick(timeline, 't481', { gridDivisor: 16 })).toBe(481);
    expect(tickToMeasure(timeline, 480, { gridDivisor: 8 })).toBe('t480');
    expect(measureToTick(timeline, 't480', { gridDivisor: 8 })).toBe(480);
  });

  it('sub 없는 자리는 표기가 짧아진다', () => {
    expect(tickToMeasure(timeline, 0)).toBe('1');
    expect(tickToMeasure(timeline, T)).toBe('1.2');
  });

  it('cell 미정렬 TS 전환점 재현 케이스가 t 폴백으로 왕복한다 (D-2026-045)', () => {
    // TS [{0,3,8},{2880,4,1}], gd 4 — tick 238080은 마디 상대 나머지가
    // cell로 나눠떨어지지 않는다. 근사 표기(과거: "11.3.3" → 239040, +960
    // drift)를 폐기하고 t 폴백으로 왕복을 유지한다.
    const tl = buildTimeline(
      makeChart({
        tempos: [{ startTick: 0, bpm: 120 }],
        timeSignatures: [
          { startTick: 0, numerator: 3, denominator: 8 },
          { startTick: 2880, numerator: 4, denominator: 1 },
        ],
      }),
    );
    const label = tickToMeasure(tl, 238080, { gridDivisor: 4 });
    expect(label).toBe('t238080');
    expect(measureToTick(tl, label, { gridDivisor: 4 })).toBe(238080);
  });
});

describe('[TM-11] 첫 박자표 앞 구간 외삽 표기 (D-2026-045)', () => {
  it('첫 TS의 startTick이 0이 아니면 뒤로 외삽해 수치 표기하고 왕복한다', () => {
    expectDivergence('TM-11');

    // TS [{startTick:1920,num:4,den:4}], gridDivisor 8. 값은 §1 폴백과
    // 무간섭 확인(실측): 0.4.1 / 0.4 / 960 — 사전 참고값과 일치한다.
    const tl = buildTimeline(
      makeChart({
        tempos: [],
        timeSignatures: [{ startTick: 1920, numerator: 4, denominator: 4 }],
      }),
    );
    expect(tickToMeasure(tl, 960, { gridDivisor: 8 })).toBe('0.4.1');
    expect(tickToMeasure(tl, 0, { gridDivisor: 8 })).toBe('0.4');
    expect(measureToTick(tl, '0.4.1', { gridDivisor: 8 })).toBe(960);
  });
});

describe('[TM-8] gridDivisor 목록과 기본값', () => {
  it('원본 GDIVS의 상단을 늘리고 기본을 8로 올렸다', () => {
    expectDivergence('TM-8');

    expect(GRID_DIVISORS).toEqual([1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256]);
    expect(GRID_DIVISOR_DEFAULT).toBe(8);
    expect(GRID_DIVISORS).toContain(GRID_DIVISOR_DEFAULT);
  });

  it('모든 divisor가 정수 tick으로 떨어진다', () => {
    for (const divisor of GRID_DIVISORS) {
      expect(Number.isInteger(cellTickOf(divisor))).toBe(true);
    }
  });

  it('gridDivisor는 박자와 독립이다', () => {
    // 7/8 구간에서도 격자 칸 크기는 denominator를 타지 않는다.
    const timeline = timelineOf('multiTimeSig');
    // 7/8 구간의 첫 마디(3)에서 한 칸. denominator가 8이어도 칸은 480 그대로다.
    expect(tickToMeasure(timeline, T * 7 + 480, { gridDivisor: 16 })).toBe('3.1.1');
  });
});

describe('[TM-6] laneGridDivisor와 공유하지 않는다', () => {
  it('시간축 격자에 lane 공간 격자가 섞이지 않는다', () => {
    // 시간축 API는 gridDivisor 하나만 받는다 — 공간 축 인자가 없다.
    expect(tickToMeasure(timelineOf('plain'), 480, { gridDivisor: 16 })).toBe('1.1.1');
  });
});

describe('[TM-9] grid line 기술자', () => {
  const timeline = timelineOf('plain');

  it('px를 모르고 표시값과 위치를 분리해 담는다', () => {
    const lines = gridLines(timeline, 0, T * 4);
    expect(lines).toHaveLength(5);
    expect(lines[0]).toEqual({
      tick: 0,
      isMeasure: true,
      measureNum: 1,
      beatInMeasure: 1,
      isPreRoll: false,
    });
    expect(lines[4]).toMatchObject({ tick: T * 4, isMeasure: true, measureNum: 2 });
    for (const line of lines) expect(line).not.toHaveProperty('x');
  });

  it('간격은 박 단위다 — gridDivisor를 받지 않는다', () => {
    const ticks = gridLines(timeline, 0, T * 2).map((line) => line.tick);
    expect(ticks).toEqual([0, T, T * 2]);
  });

  it('isPreRoll이 표시값이 아니라 위치를 말한다', () => {
    const lines = gridLines(timeline, -T * 4, 0, { labelOffset: 10 });
    expect(lines.every((line) => line.isPreRoll)).toBe(true);
    // labelOffset이 붙어 measureNum은 양수지만 위치는 여전히 pre-roll이다.
    expect(lines[0]?.measureNum).toBe(10);
    expect(lines[0]?.tick).toBe(-T * 4);
  });

  it('박자가 바뀌는 구간에서 마디 번호가 이어진다', () => {
    const shifting = timelineOf('multiTimeSig');
    const lines = gridLines(shifting, T * 4, T * 8);

    // 3/4 구간이 tick 7680에서 시작하며 마디 2다. 마디는 3박마다 넘어간다.
    expect(lines[0]).toMatchObject({ tick: T * 4, isMeasure: true, measureNum: 2 });
    expect(lines[1]).toMatchObject({ tick: T * 5, isMeasure: false, beatInMeasure: 2 });
    // 7/8 구간(tick 13440)에서 마디 3이 이어지고 박 길이가 960으로 줄어든다.
    expect(lines.find((line) => line.tick === T * 7)).toMatchObject({
      isMeasure: true,
      measureNum: 3,
    });
    expect(lines.find((line) => line.tick === T * 7 + 960)).toMatchObject({
      isMeasure: false,
      beatInMeasure: 2,
    });
  });
});

describe('scrollProgressAt', () => {
  const timeline = timelineOf('plain');

  it('판정선이 0이고 미래가 양수다', () => {
    expect(scrollProgressAt(timeline, 0, 0, 1)).toBe(0);
    expect(scrollProgressAt(timeline, T * 8, 0, 1)).toBeGreaterThan(0);
    expect(scrollProgressAt(timeline, 0, 500, 1)).toBeLessThan(0);
  });

  it('scrollSpeed는 밀도만 바꾼다', () => {
    const base = scrollProgressAt(timeline, T * 4, 0, 1);
    expect(scrollProgressAt(timeline, T * 4, 0, 2)).toBeCloseTo(base * 2, 9);
  });

  it('한 화면이 SCROLL_VIEW_MS를 담는다', () => {
    expect(scrollProgressAt(timeline, msToTick(timeline, SCROLL_VIEW_MS), 0, 1)).toBeCloseTo(1, 9);
  });
});

describe('timeline은 입력을 mutate하지 않는다', () => {
  it('빈 tempos·timeSignatures가 폴백으로 채워져도 chart는 그대로다', () => {
    const chart = makeChart({ tempos: [], timeSignatures: [] });
    const timeline = buildTimeline(chart);

    expect(chart.tempos).toEqual([]);
    expect(chart.timeSignatures).toEqual([]);
    expect(timeline.tempos[0]?.bpm).toBe(120);
    expect(timeline.measures[0]).toMatchObject({ numerator: 4, denominator: 4 });
  });

  it('정렬되지 않은 입력을 정렬해서 읽는다', () => {
    const timeline = buildTimeline(
      makeChart({
        tempos: [
          { startTick: T * 4, bpm: 240 },
          { startTick: 0, bpm: 120 },
        ],
      }),
    );
    expect(timeline.tempos.map((segment) => segment.bpm)).toEqual([120, 240]);
    expect(tickToMs(timeline, T * 4)).toBeCloseTo(2000, 9);
  });
});

describe('measureToTick 실패 처리', () => {
  const timeline = timelineOf('plain');

  it('파싱할 수 없으면 null이다', () => {
    expect(measureToTick(timeline, 'abc')).toBeNull();
    expect(measureToTick(timeline, '1.x')).toBeNull();
  });

  it('t 접두사는 원시 tick이다', () => {
    expect(measureToTick(timeline, 't5760')).toBe(5760);
    expect(measureToTick(timeline, 'tzz')).toBeNull();
  });

  it('[TM-10] 마디 0이 왕복한다', () => {
    // 원본은 `parts[0] || 1`이라 "0"이 마디 1(tick 0)로 떨어졌다.
    expect(tickToMeasure(timeline, -T * 4)).toBe('0');
    expect(measureToTick(timeline, '0')).toBe(-T * 4);
    expect(measureToTick(timeline, '-1')).toBe(-T * 8);
  });
});

// ── WO-1 §3-2 ~ §3-4 ─────────────────────────────────────────

describe('[TM-9] gridLines 실값', () => {
  it('세그먼트 경계 tick이 중복되지 않는다', () => {
    // 4/4 한 마디(7680) 뒤 3/4 — 경계 7680에 박이 정확히 떨어진다.
    const tl = buildTimeline(
      makeChart({
        tempos: [{ startTick: 0, bpm: 120 }],
        timeSignatures: [
          { startTick: 0, numerator: 4, denominator: 4 },
          { startTick: 7680, numerator: 3, denominator: 4 },
        ],
      }),
    );
    const ticks = gridLines(tl, 0, 11520).map((line) => line.tick);
    expect(ticks).toEqual([0, 1920, 3840, 5760, 7680, 9600, 11520]);
  });

  it('기본 4/4에서 pre-roll을 포함한 네 줄이 정확히 나온다', () => {
    const timeline = timelineOf('plain');
    const lines = gridLines(timeline, -T, T * 2);
    expect(lines).toEqual([
      { tick: -T, isMeasure: false, measureNum: 0, beatInMeasure: 4, isPreRoll: true },
      { tick: 0, isMeasure: true, measureNum: 1, beatInMeasure: 1, isPreRoll: false },
      { tick: T, isMeasure: false, measureNum: 1, beatInMeasure: 2, isPreRoll: false },
      { tick: T * 2, isMeasure: false, measureNum: 1, beatInMeasure: 3, isPreRoll: false },
    ]);
  });

  it('박자표 전환 지점에서 마디·박이 이어진다', () => {
    const timeline = buildTimeline(
      makeChart({
        timeSignatures: [
          { startTick: 0, numerator: 4, denominator: 4 },
          { startTick: T * 4, numerator: 3, denominator: 4 },
        ],
      }),
    );
    const lines = gridLines(timeline, T * 4, T * 6);
    expect(lines).toEqual([
      { tick: T * 4, isMeasure: true, measureNum: 2, beatInMeasure: 1, isPreRoll: false },
      { tick: T * 5, isMeasure: false, measureNum: 2, beatInMeasure: 2, isPreRoll: false },
      { tick: T * 6, isMeasure: false, measureNum: 2, beatInMeasure: 3, isPreRoll: false },
    ]);
  });

  it('labelOffset은 measureNum만 옮기고 isPreRoll은 바꾸지 않는다', () => {
    const timeline = timelineOf('plain');
    const lines = gridLines(timeline, -T, T * 2, { labelOffset: 10 });
    expect(lines.map((line) => line.measureNum)).toEqual([10, 11, 11, 11]);
    expect(lines.map((line) => line.isPreRoll)).toEqual([true, false, false, false]);
  });
});

describe('[TM-7] measureToTick 3부 입력', () => {
  const timeline = timelineOf('plain');

  it('gridDivisor 16(cell 480)에서 파싱이 정확하다', () => {
    expect(measureToTick(timeline, '1.1.1', { gridDivisor: 16 })).toBe(480);
    expect(measureToTick(timeline, '1.2.3', { gridDivisor: 16 })).toBe(3360); // 1920 + 3*480
  });

  it('왕복한다', () => {
    expect(tickToMeasure(timeline, 3360, { gridDivisor: 16 })).toBe('1.2.3');
  });
});

describe('[TM-3] lastEventTick은 가장 늦게 끝나는 event를 고른다', () => {
  it('나중에 적힌 event가 아니라 가장 늦게 끝나는 event가 기준이다', () => {
    const timeline = buildTimeline(makeChart());
    const chart = makeChart({
      notes: [
        { startTick: 0, duration: T * 5, lane: 1, isWide: false },
        { startTick: T, duration: 0, lane: 2, isWide: false },
      ],
    });
    expect(songEndOf(timeline, chart, null).chartEndMs).toBe(tickToMs(timeline, T * 5));
  });
});
