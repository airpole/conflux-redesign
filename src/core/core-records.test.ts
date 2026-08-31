import { describe, expect, it } from 'vitest';
import type { JudgmentCounts } from './core-gauge.js';
import {
  deriveAccuracy,
  deriveRecordSummary,
  deriveScore,
  isNoRecord,
  mergeRecord,
  recordKey,
  type ChartRecord,
  type RecordCandidate,
} from './core-records.js';

const counts = (overrides: Partial<JudgmentCounts> = {}): JudgmentCounts => ({
  SYNC: 0,
  PERFECT: 0,
  GOOD: 0,
  MISS: 0,
  ...overrides,
});

describe('recordKey', () => {
  it('songId:chartId 형태다', () => {
    expect(recordKey('song-1', 3)).toBe('song-1:3');
  });
});

describe('deriveScore / deriveAccuracy', () => {
  it('전부 SYNC고 완주했으면 만점(1,000,000)·accuracy 100이다', () => {
    const j = counts({ SYNC: 10 });
    expect(deriveScore(j, 10)).toBe(1_000_000);
    expect(deriveAccuracy(j, 10)).toBe(100);
  });

  it('MISS는 score·accuracy에 기여하지 않는다', () => {
    const j = counts({ SYNC: 5, MISS: 5 });
    expect(deriveScore(j, 10)).toBe(500_000);
    expect(deriveAccuracy(j, 10)).toBe(50);
  });

  it('totalUnits가 0이면 0이다', () => {
    const j = counts();
    expect(deriveScore(j, 0)).toBe(0);
    expect(deriveAccuracy(j, 0)).toBe(0);
  });

  it('미완주 판은 진짜 totalUnits를 분모로 써서 정직하게 낮게 나온다 — 자기완결 근사가 없다(D-2026-070)', () => {
    // chart가 총 10단위인데 앞의 4단위만 전부 SYNC로 치고 죽었다고 하자.
    // 판정된 몫(4)만으로 계산하는 자기완결 근사는 폐기됐다 — 항상 실제
    // totalUnits(10)를 분모로 쓰므로 만점(1,000,000)이 나올 길이 없다.
    const partial = counts({ SYNC: 4 });
    expect(deriveScore(partial, 10)).toBe(400_000);
    expect(deriveAccuracy(partial, 10)).toBe(40);
  });

  it('Hold가 있는 chart는 totalUnits가 note 수보다 크다 — 그래도 그냥 인자로 받는다', () => {
    // note 5개(tap 3 + hold 2)면 totalUnits = 3×1 + 2×2 = 7. 이 함수는
    // "notes 수"가 아니라 "판정 단위 수"를 인자로 받으므로 호출측이 직접
    // 그 차이를 신경 쓸 필요가 없다 — core-judge.ts의 unitsOf가 이미 계산해
    // GaugeState.totalUnits로 넘어온 값을 그대로 쓴다.
    const j = counts({ SYNC: 7 });
    expect(deriveScore(j, 7)).toBe(1_000_000);
  });
});

describe('deriveRecordSummary', () => {
  it('score·accuracy·rank를 record(bestJudgments + totalUnits)에서 파생한다 — record 자체엔 그 필드가 없다', () => {
    const record: ChartRecord = {
      bestJudgments: counts({ SYNC: 10 }),
      totalUnits: 10,
      bestState: 'AS',
      maxCombo: 10,
    };
    const summary = deriveRecordSummary(record);

    expect(summary.score).toBe(1_000_000);
    expect(summary.accuracy).toBe(100);
    expect(summary.rank).toBeDefined();
  });

  it('저장된 totalUnits가 bestJudgments의 합보다 크면(미완주 최고 기록) 그만큼 낮게 파생된다', () => {
    const record: ChartRecord = {
      bestJudgments: counts({ SYNC: 4 }),
      totalUnits: 10,
      bestState: 'F',
      maxCombo: 4,
    };
    expect(deriveRecordSummary(record).score).toBe(400_000);
  });
});

describe('mergeRecord', () => {
  it('기존 기록이 없으면(null) 이번 판 값으로 그대로 시작한다', () => {
    const candidate: RecordCandidate = {
      judgments: counts({ SYNC: 5 }),
      totalUnits: 10,
      state: 'FC',
      maxCombo: 20,
    };

    const { record, judgmentsImproved } = mergeRecord(null, candidate);

    expect(record).toEqual({
      bestJudgments: candidate.judgments,
      totalUnits: 10,
      bestState: 'FC',
      maxCombo: 20,
    });
    expect(judgmentsImproved).toBe(true);
  });

  it('이번 판의 score가 저장된 score보다 높으면 bestJudgments와 totalUnits를 함께 교체한다', () => {
    const existing: ChartRecord = {
      bestJudgments: counts({ SYNC: 5, MISS: 5 }),
      totalUnits: 10,
      bestState: 'F',
      maxCombo: 5,
    };
    const candidate: RecordCandidate = {
      judgments: counts({ SYNC: 10 }),
      totalUnits: 10,
      state: 'AS',
      maxCombo: 10,
    };

    const { record, judgmentsImproved } = mergeRecord(existing, candidate);

    expect(record.bestJudgments).toEqual(candidate.judgments);
    expect(record.totalUnits).toBe(10);
    expect(judgmentsImproved).toBe(true);
  });

  it('이번 판의 score가 더 낮거나 같으면 bestJudgments와 totalUnits 둘 다 유지한다', () => {
    const existing: ChartRecord = {
      bestJudgments: counts({ SYNC: 10 }),
      totalUnits: 10,
      bestState: 'AS',
      maxCombo: 10,
    };
    const candidate: RecordCandidate = {
      judgments: counts({ SYNC: 5, MISS: 5 }),
      totalUnits: 10,
      state: 'F',
      maxCombo: 1,
    };

    const { record, judgmentsImproved } = mergeRecord(existing, candidate);

    expect(record.bestJudgments).toEqual(existing.bestJudgments);
    expect(record.totalUnits).toBe(existing.totalUnits);
    expect(judgmentsImproved).toBe(false);
  });

  it('미완주 판이 최고 기록으로 저장돼 있어도 이후 완주 판이 정직하게 비교돼 교체한다', () => {
    // 이전엔(D-2026-069 이전) 자기완결 근사가 미완주 저장값을 부풀려 이런
    // 케이스에서 완주 판이 밀릴 수 있었다 — D-2026-070으로 그 잔여 약점도
    // 없어졌다: 저장된 쪽도 이제 진짜 totalUnits로 계산되기 때문이다.
    const existing: ChartRecord = {
      bestJudgments: counts({ SYNC: 4 }), // 4/10만 치고 죽은 판. 저장 당시 score=400,000.
      totalUnits: 10,
      bestState: 'F',
      maxCombo: 4,
    };
    const candidate: RecordCandidate = {
      judgments: counts({ SYNC: 6, GOOD: 4 }), // 완주. score = round((6+4*0.5)/10 * 1e6) = 800,000.
      totalUnits: 10,
      state: 'C',
      maxCombo: 10,
    };

    const { record, judgmentsImproved } = mergeRecord(existing, candidate);

    expect(judgmentsImproved).toBe(true);
    expect(record.bestJudgments).toEqual(candidate.judgments);
  });

  it('bestState는 우선순위가 더 높은 쪽으로 병합된다(AS > AP > FC > H > C > F)', () => {
    const existing: ChartRecord = {
      bestJudgments: counts(),
      totalUnits: 1,
      bestState: 'C',
      maxCombo: 0,
    };
    const candidate: RecordCandidate = {
      judgments: counts(),
      totalUnits: 1,
      state: 'AP',
      maxCombo: 0,
    };

    expect(mergeRecord(existing, candidate).record.bestState).toBe('AP');
  });

  it('bestState는 더 나쁜 값이 와도 내려가지 않는다', () => {
    const existing: ChartRecord = {
      bestJudgments: counts(),
      totalUnits: 1,
      bestState: 'AS',
      maxCombo: 0,
    };
    const candidate: RecordCandidate = {
      judgments: counts(),
      totalUnits: 1,
      state: 'F',
      maxCombo: 0,
    };

    expect(mergeRecord(existing, candidate).record.bestState).toBe('AS');
  });

  it('maxCombo는 독립적으로 max를 취한다 — bestJudgments가 안 바뀌어도 오를 수 있다', () => {
    const existing: ChartRecord = {
      bestJudgments: counts({ SYNC: 10 }),
      totalUnits: 10,
      bestState: 'AS',
      maxCombo: 5,
    };
    const candidate: RecordCandidate = {
      judgments: counts({ SYNC: 1 }),
      totalUnits: 10,
      state: 'F',
      maxCombo: 100,
    };

    const { record, judgmentsImproved } = mergeRecord(existing, candidate);

    expect(record.maxCombo).toBe(100);
    expect(judgmentsImproved).toBe(false); // bestJudgments는 그대로인데 maxCombo만 올랐다.
  });

  it('세 필드가 같은 판에서 나온 값일 필요가 없다 — 독립적으로 최고치를 모은다', () => {
    let record: ChartRecord | null = null;
    // 1판: 낮은 score, 낮은 state, 높은 combo.
    record = mergeRecord(record, {
      judgments: counts({ GOOD: 4 }),
      totalUnits: 4,
      state: 'F',
      maxCombo: 50,
    }).record;
    // 2판: 높은 score, 높은 state, 낮은 combo.
    record = mergeRecord(record, {
      judgments: counts({ SYNC: 4 }),
      totalUnits: 4,
      state: 'AS',
      maxCombo: 3,
    }).record;

    expect(record).toEqual({
      bestJudgments: counts({ SYNC: 4 }),
      totalUnits: 4,
      bestState: 'AS',
      maxCombo: 50,
    });
  });
});

describe('isNoRecord', () => {
  it('네 조건 모두 false면 기록 대상이다', () => {
    expect(
      isNoRecord({ autoplay: false, staticShape: false, midStart: false, editorOrigin: false }),
    ).toBe(false);
  });

  it('autoplay OR staticShape OR mid-start OR editorOrigin — 하나라도 true면 no-record', () => {
    const base = { autoplay: false, staticShape: false, midStart: false, editorOrigin: false };
    expect(isNoRecord({ ...base, autoplay: true })).toBe(true);
    expect(isNoRecord({ ...base, staticShape: true })).toBe(true);
    expect(isNoRecord({ ...base, midStart: true })).toBe(true);
    expect(isNoRecord({ ...base, editorOrigin: true })).toBe(true);
  });

  it('mirror·slowed editor playback·cmod는 게이트에 들어가지 않는다 — 타입에 아예 없다', () => {
    // NoRecordConditions에 mirror 필드가 없다는 것 자체가 settings.md §2의
    // "mirror: record 유지"를 구조로 보장한다. 여기서는 4필드 전체 false로도
    // 기록 대상이 되는 걸로 그 부재를 간접 확인한다.
    expect(
      isNoRecord({ autoplay: false, staticShape: false, midStart: false, editorOrigin: false }),
    ).toBe(false);
  });
});
