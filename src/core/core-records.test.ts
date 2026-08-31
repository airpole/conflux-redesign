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
  it('전부 SYNC면 만점(1,000,000)·accuracy 100이다', () => {
    const j = counts({ SYNC: 10 });
    expect(deriveScore(j)).toBe(1_000_000);
    expect(deriveAccuracy(j)).toBe(100);
  });

  it('MISS는 score·accuracy에 기여하지 않는다', () => {
    const j = counts({ SYNC: 5, MISS: 5 });
    expect(deriveScore(j)).toBe(500_000);
    expect(deriveAccuracy(j)).toBe(50);
  });

  it('판정이 하나도 없으면(전부 0) 0이다', () => {
    const j = counts();
    expect(deriveScore(j)).toBe(0);
    expect(deriveAccuracy(j)).toBe(0);
  });

  it('총 노트 수는 judgments의 합이다 — chart의 totalUnits를 몰라도 자기완결이다', () => {
    // 절반만 SYNC고 나머지 절반은 아예 기록에 없는(합계에 안 잡히는) 상황은
    // 있을 수 없다 — judgments 자체가 이미 "판정된 것들의 분포"이므로
    // 합계가 곧 그 판의 전체 단위 수다.
    const j = counts({ SYNC: 3, GOOD: 1 });
    expect(deriveScore(j)).toBe(Math.round(((3 * 1 + 1 * 0.5) / 4) * 1_000_000));
  });
});

describe('deriveRecordSummary', () => {
  it('score·accuracy·rank를 record에서 파생한다 — record 자체엔 그 필드가 없다', () => {
    const record: ChartRecord = {
      bestJudgments: counts({ SYNC: 10 }),
      bestState: 'AS',
      maxCombo: 10,
    };
    const summary = deriveRecordSummary(record);

    expect(summary.score).toBe(1_000_000);
    expect(summary.accuracy).toBe(100);
    expect(summary.rank).toBeDefined();
  });
});

describe('mergeRecord', () => {
  it('기존 기록이 없으면(null) 이번 판 값으로 그대로 시작한다', () => {
    const candidate: RecordCandidate = {
      judgments: counts({ SYNC: 5 }),
      state: 'FC',
      maxCombo: 20,
    };

    const { record, judgmentsImproved } = mergeRecord(null, candidate);

    expect(record).toEqual({ bestJudgments: candidate.judgments, bestState: 'FC', maxCombo: 20 });
    expect(judgmentsImproved).toBe(true);
  });

  it('이번 판의 파생 score가 더 높으면 bestJudgments를 교체한다', () => {
    const existing: ChartRecord = {
      bestJudgments: counts({ SYNC: 5, MISS: 5 }),
      bestState: 'F',
      maxCombo: 5,
    };
    const candidate: RecordCandidate = {
      judgments: counts({ SYNC: 10 }),
      state: 'AS',
      maxCombo: 10,
    };

    const { record, judgmentsImproved } = mergeRecord(existing, candidate);

    expect(record.bestJudgments).toEqual(candidate.judgments);
    expect(judgmentsImproved).toBe(true);
  });

  it('이번 판의 파생 score가 더 낮거나 같으면 bestJudgments를 유지한다', () => {
    const existing: ChartRecord = {
      bestJudgments: counts({ SYNC: 10 }),
      bestState: 'AS',
      maxCombo: 10,
    };
    const candidate: RecordCandidate = {
      judgments: counts({ SYNC: 5, MISS: 5 }),
      state: 'F',
      maxCombo: 1,
    };

    const { record, judgmentsImproved } = mergeRecord(existing, candidate);

    expect(record.bestJudgments).toEqual(existing.bestJudgments);
    expect(judgmentsImproved).toBe(false);
  });

  it('bestState는 우선순위가 더 높은 쪽으로 병합된다(AS > AP > FC > H > C > F)', () => {
    const existing: ChartRecord = { bestJudgments: counts(), bestState: 'C', maxCombo: 0 };
    const candidate: RecordCandidate = { judgments: counts(), state: 'AP', maxCombo: 0 };

    expect(mergeRecord(existing, candidate).record.bestState).toBe('AP');
  });

  it('bestState는 더 나쁜 값이 와도 내려가지 않는다', () => {
    const existing: ChartRecord = { bestJudgments: counts(), bestState: 'AS', maxCombo: 0 };
    const candidate: RecordCandidate = { judgments: counts(), state: 'F', maxCombo: 0 };

    expect(mergeRecord(existing, candidate).record.bestState).toBe('AS');
  });

  it('maxCombo는 독립적으로 max를 취한다 — bestJudgments가 안 바뀌어도 오를 수 있다', () => {
    const existing: ChartRecord = {
      bestJudgments: counts({ SYNC: 10 }),
      bestState: 'AS',
      maxCombo: 5,
    };
    const candidate: RecordCandidate = {
      judgments: counts({ SYNC: 1 }),
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
      state: 'F',
      maxCombo: 50,
    }).record;
    // 2판: 높은 score, 높은 state, 낮은 combo.
    record = mergeRecord(record, {
      judgments: counts({ SYNC: 4 }),
      state: 'AS',
      maxCombo: 3,
    }).record;

    expect(record).toEqual({ bestJudgments: counts({ SYNC: 4 }), bestState: 'AS', maxCombo: 50 });
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
