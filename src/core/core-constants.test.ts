/**
 * constants 값을 골든과 대조한다.
 *
 * 이 값들이 timing·judge·gauge 골든을 만든 **입력**이다. 값이 틀리면 그 표들이
 * 통째로 무의미해지므로, M1-3 이후의 간접 검증에 맡기지 않고 여기서 직접 본다.
 *
 * 명칭 매핑은 테스트가 갖는다 — 골든은 원본 이름을 쓰고 구현은 재설계 이름을 쓴다.
 */
import { describe, expect, it } from 'vitest';
import { loadGolden } from '../../tests/support/golden.js';
import { expectDivergence } from '../../tests/support/divergences.js';
import * as C from './core-constants.js';
import { DEFAULT_SETTINGS, LANE_KEYS, DEFAULT_ACTION_KEYS } from './core-settings.js';

interface ConstantCase {
  readonly name: string;
  readonly module: string;
  readonly expected: unknown;
}

const table = loadGolden<ConstantCase>('constants').cases;

function original(name: string): unknown {
  const found = table.find((c) => c.name === name);
  if (!found) throw new Error(`골든 constants 표에 없는 이름: ${name}`);
  return found.expected;
}

/** 재설계 이름 → 원본 이름. 값이 그대로 보존된 것만 여기 온다. */
const PRESERVED: ReadonlyArray<readonly [unknown, string]> = [
  [C.TICKS_PER_BEAT, 'TPB'],
  [C.GRID_DIVISORS, 'GDIVS'],
  [C.LEAD_IN_MS, 'LEAD_IN_MS'],
  [C.RESUME_LEAD_MS, 'PLAY_RESUME_LEAD_MS'],
  [C.JUDGE_SYNC_MS, 'JUDGE_SYNC'],
  [C.JUDGE_PERFECT_MS, 'JUDGE_PERFECT'],
  [C.JUDGE_GOOD_MS, 'JUDGE_GOOD'],
  [C.JUDGE_WIDE_SYNC_MS, 'JUDGE_WIDE_SYNC'],
  [C.HOLD_RELEASE_GRACE_MS, 'LN_RELEASE_GRACE_MS'],
  [C.GAUGE_START, 'GAUGE_START'],
  [C.NORMAL_CLEAR_PCT, 'NORMAL_CLEAR_PCT'],
  [C.GAUGE_NORMAL_TOTAL_GAIN, 'GAUGE_NORMAL_TOTAL_GAIN'],
  [C.RANK_TABLE, 'RANK_TABLE'],
  [C.SCROLL_SPEED_MIN, 'SPEED_MIN'],
  [C.SCROLL_SPEED_MAX, 'SPEED_MAX'],
  [C.SCROLL_SPEED_STEP, 'SPEED_STEP'],
  [C.OVERLAP_LANES, 'OVERLAP_CHANNELS'],
  [DEFAULT_ACTION_KEYS, 'DEFAULT_ACTION_KEYS'],
];

describe('constants — 원본 보존', () => {
  it.each(PRESERVED)('%# 원본 %s와 값이 같다', (ours, name) => {
    expect(ours).toEqual(original(name));
  });

  it('lane 키 바인딩·매핑이 원본과 같다', () => {
    // 원본은 바인딩(DEFAULT_KEYS)과 lane 매핑(KEY2LINE)을 두 객체로 나눠 뒀다.
    // 재설계는 한 표에 모았다 — 값은 그대로다(D-2026-031).
    const keys = original('DEFAULT_KEYS') as Record<string, string>;
    const lanes = original('KEY2LINE') as Record<string, number>;

    for (const [index, id] of (
      ['key1', 'key2', 'key3', 'key4', 'key5', 'key6'] as const
    ).entries()) {
      const slot = String(index + 1);
      expect(LANE_KEYS[id].binding).toBe(keys[slot]);
      expect(LANE_KEYS[id].lane).toBe(lanes[slot]);
    }
  });

  it('lane capacity가 OVERLAP_CHANNELS와 어긋나지 않는다', () => {
    const overlap = original('OVERLAP_CHANNELS') as number[];
    for (const [lane, capacity] of Object.entries(C.LANE_CAPACITY)) {
      expect(capacity).toBe(overlap.includes(Number(lane)) ? 2 : 1);
    }
  });
});

describe('constants — 의도한 차이', () => {
  it('게이지 델타에서 tail 특례가 사라졌다', () => {
    expectDivergence('GA-1');
    const origin = original('GAUGE_DELTA') as Record<string, Record<string, number>>;

    // 판정 4종 축의 값 자체는 원본과 같다.
    for (const mode of ['normal', 'hard'] as const) {
      for (const kind of ['SYNC', 'PERFECT', 'GOOD', 'MISS'] as const) {
        expect(C.GAUGE_DELTA[mode][kind]).toBe(origin[mode]?.[kind]);
      }
      // 사라진 것은 TAIL_OK·TAIL_MISS 두 특례뿐이다.
      expect(Object.keys(C.GAUGE_DELTA[mode])).toEqual(['SYNC', 'PERFECT', 'GOOD', 'MISS']);
      expect(origin[mode]).toHaveProperty('TAIL_OK');
      expect(origin[mode]).toHaveProperty('TAIL_MISS');
    }
  });
});

describe('settings 기본값', () => {
  const origin = original('DEFAULT_SETTINGS') as Record<string, unknown>;

  /** 재설계 필드 → 원본 필드. 값이 보존된 것만. */
  const SAME: ReadonlyArray<readonly [keyof typeof DEFAULT_SETTINGS, string]> = [
    ['scrollSpeed', 'hiSpeed'],
    ['audioOffset', 'audioOffset'],
    ['visualOffset', 'visualOffset'],
    ['volMaster', 'volMaster'],
    ['volEffect', 'volEffect'],
    ['noteSkin', 'noteSkin'],
    ['laneOpacity', 'laneOpacity'],
    ['jacketBrightness', 'bgBrightness'],
    ['sudden', 'sudden'],
    ['hitEffect', 'hitEffect'],
    ['frameCap', 'frameCap'],
    ['noteThickness', 'noteThickness'],
    ['judgeLinePos', 'judgeLinePos'],
    ['showCombo', 'showCombo'],
    ['showJudgment', 'showJudgment'],
    ['showFastSlow', 'showFastSlow'],
    ['gaugeMode', 'gauge'],
    ['mirror', 'mirror'],
    ['autoplay', 'autoplay'],
    ['staticShape', 'staticShape'],
  ];

  it.each(SAME)('%s는 원본 %s와 같다', (ours, theirs) => {
    expect(DEFAULT_SETTINGS[ours]).toEqual(origin[theirs]);
  });

  it('volMusic만 원본과 다르다', () => {
    expectDivergence('ST-1');
    expect(origin['volMusic']).toBe(0.7);
    expect(DEFAULT_SETTINGS.volMusic).toBe(1.0);
  });

  it('폐기한 cmod가 기본값에 없다', () => {
    expectDivergence('ST-4');
    expect(origin).toHaveProperty('cmod');
    expect(DEFAULT_SETTINGS).not.toHaveProperty('cmod');
  });
});
