/**
 * 테스트용 최소 chart 생성기.
 *
 * `.ts`가 `src/core/`에 살지만 프로덕션 경로에서 쓰지 않는다 — 골든 추출용 합성
 * chart(`tools/golden/fixtures.mjs`)와 달리 이쪽은 **스펙 테스트**의 입력이다.
 * 두 부류를 한 파일에 섞지 않는다: 전자는 원본에 먹이는 관측 입력이고,
 * 후자는 재설계 구조를 그대로 쓴다.
 */
import { SCHEMA_VERSION, type Chart } from './core-chart.js';

/** 검증을 통과하는 가장 작은 chart. 필요한 자리만 덮어쓴다. */
export function makeChart(overrides: Partial<Chart> = {}): Chart {
  return {
    schemaVersion: SCHEMA_VERSION,
    songId: 'song-1',
    chartId: 1,
    metadata: {
      title: 'Test',
      musicBy: '',
      jacketBy: '',
      offset: 0,
      category: '',
      previewStartMs: 0,
    },
    tempos: [{ startTick: 0, bpm: 120 }],
    timeSignatures: [{ startTick: 0, numerator: 4, denominator: 4 }],
    musicFile: null,
    jacketFile: null,
    difficulty: 'Trace',
    subtitle: '',
    level: 1,
    chartBy: '',
    version: 1,
    updatedAt: '2026-08-08T00:00:00Z',
    notes: [],
    shapeEvents: [],
    laneEvents: [],
    textEvents: [],
    ...overrides,
  };
}
