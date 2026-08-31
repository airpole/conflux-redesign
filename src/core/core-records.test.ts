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

  it('자기완결 근사(§2) — 판정된 것만의 합을 분모로 쓴다, chart의 진짜 totalUnits와 무관하게', () => {
    // 이 함수는 "저장된 기록을 chart 없이 다시 읽을 때"만 쓴다(D-2026-069) —
    // 그래서 판정된 4단위만 갖고도 계산이 되고, 실제 chart가 몇 단위였는지는
    // 몰라도 된다.
    const j = counts({ SYNC: 3, GOOD: 1 });
    expect(deriveScore(j)).toBe(Math.round(((3 * 1 + 1 * 0.5) / 4) * 1_000_000));
  });

  it('미완주 판의 판정 분포에 적용하면 실제 score보다 후하게(높게) 나온다', () => {
    // chart가 총 10단위인데 앞의 4단위만 전부 SYNC로 치고 죽었다고 하자.
    // 자기완결 근사(분모=4)는 만점을 주지만, 진짜 chart 기준 score
    // (core-gauge.computeResult, 분모=10)는 400,000에 그친다 —
    // D-2026-069가 이 함수를 "이번 판" 비교에 쓰지 않는 이유다.
    const partial = counts({ SYNC: 4 });
    const selfContained = deriveScore(partial);
    const realScoreAgainstFullChart = Math.round((4 / 10) * 1_000_000);

    expect(selfContained).toBe(1_000_000);
    expect(realScoreAgainstFullChart).toBe(400_000);
    expect(selfContained).toBeGreaterThan(realScoreAgainstFullChart);
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
      score: 500_000,
      state: 'FC',
      maxCombo: 20,
    };

    const { record, judgmentsImproved } = mergeRecord(null, candidate);

    expect(record).toEqual({ bestJudgments: candidate.judgments, bestState: 'FC', maxCombo: 20 });
    expect(judgmentsImproved).toBe(true);
  });

  it('이번 판의 실제 score(candidate.score)가 저장된 파생 score보다 높으면 bestJudgments를 교체한다', () => {
    const existing: ChartRecord = {
      bestJudgments: counts({ SYNC: 5, MISS: 5 }),
      bestState: 'F',
      maxCombo: 5,
    };
    const candidate: RecordCandidate = {
      judgments: counts({ SYNC: 10 }),
      score: 1_000_000,
      state: 'AS',
      maxCombo: 10,
    };

    const { record, judgmentsImproved } = mergeRecord(existing, candidate);

    expect(record.bestJudgments).toEqual(candidate.judgments);
    expect(judgmentsImproved).toBe(true);
  });

  it('이번 판의 score가 더 낮거나 같으면 bestJudgments를 유지한다', () => {
    const existing: ChartRecord = {
      bestJudgments: counts({ SYNC: 10 }),
      bestState: 'AS',
      maxCombo: 10,
    };
    const candidate: RecordCandidate = {
      judgments: counts({ SYNC: 5, MISS: 5 }),
      score: 500_000,
      state: 'F',
      maxCombo: 1,
    };

    const { record, judgmentsImproved } = mergeRecord(existing, candidate);

    expect(record.bestJudgments).toEqual(existing.bestJudgments);
    expect(judgmentsImproved).toBe(false);
  });

  it('비교는 candidate.score를 그대로 쓴다 — judgments만으로 다시 계산하지 않는다(D-2026-069)', () => {
    // judgments 분포만 보면 자기완결 score가 낮게 보일 수 있는 판이어도,
    // 진짜 chart 기준 score(candidate.score)가 저장된 값보다 높다면 교체된다.
    // 여기서는 judgments 자체의 자기완결 파생값(1,000,000, 전부 SYNC 2개)이
    // 기존 기록(500,000)보다 이미 높아 그 경로로도 교체되지만, 핵심은
    // mergeRecord가 judgments를 다시 파생하지 않고 candidate.score를
    // 그대로 비교에 쓴다는 것 — candidate.score를 낮게 주면 judgments가
    // 아무리 좋아 보여도 교체되지 않아야 한다.
    const existing: ChartRecord = {
      bestJudgments: counts({ SYNC: 5, MISS: 5 }),
      bestState: 'F',
      maxCombo: 0,
    };
    const candidate: RecordCandidate = {
      judgments: counts({ SYNC: 2 }), // 자기완결로 보면 1,000,000(만점)처럼 보인다.
      score: 100, // 하지만 진짜 chart 기준 score는 아주 낮다(미완주).
      state: 'F',
      maxCombo: 0,
    };

    const { judgmentsImproved } = mergeRecord(existing, candidate);

    expect(judgmentsImproved).toBe(false); // candidate.score(100) < deriveScore(existing)(500,000).
  });

  it('bestState는 우선순위가 더 높은 쪽으로 병합된다(AS > AP > FC > H > C > F)', () => {
    const existing: ChartRecord = { bestJudgments: counts(), bestState: 'C', maxCombo: 0 };
    const candidate: RecordCandidate = { judgments: counts(), score: 0, state: 'AP', maxCombo: 0 };

    expect(mergeRecord(existing, candidate).record.bestState).toBe('AP');
  });

  it('bestState는 더 나쁜 값이 와도 내려가지 않는다', () => {
    const existing: ChartRecord = { bestJudgments: counts(), bestState: 'AS', maxCombo: 0 };
    const candidate: RecordCandidate = { judgments: counts(), score: 0, state: 'F', maxCombo: 0 };

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
      score: 100_000,
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
      score: 200_000,
      state: 'F',
      maxCombo: 50,
    }).record;
    // 2판: 높은 score, 높은 state, 낮은 combo.
    record = mergeRecord(record, {
      judgments: counts({ SYNC: 4 }),
      score: 1_000_000,
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
