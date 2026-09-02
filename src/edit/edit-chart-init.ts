/**
 * 새 song 생성 — `_meta/persistence.md` §7의 init chart.
 *
 * 순수 로직만 담는다(브라우저 API 없음) — `chartId 0`·`difficulty 'init'`
 * 고정, songId만 호출측(start scene)이 받아 채운다. 나머지 필드는 §7이
 * "songId와 모든 chart 필드를 가질 수 있음"이라고만 하고 구체값을 정하지
 * 않아, `core-chart-fixture.ts`의 `makeChart()`(검증을 통과하는 가장 작은
 * chart)가 이미 골라 둔 값(bpm 120, 4/4, level 1)을 그대로 재사용했다 —
 * 새 product 결정이 아니라 기존에 검증 통과가 확인된 최소값의 재사용이다.
 * `tempos`/`timeSignatures`가 빈 배열이면 `core-validate.ts`가 domain
 * 문제로 flag하므로(적어도 하나 필요) 빈 채로 둘 수 없다.
 */
import { SCHEMA_VERSION, type Chart } from '../core/core-chart.js';

export function createInitChart(songId: string, now: () => string): Chart {
  return {
    schemaVersion: SCHEMA_VERSION,
    songId,
    chartId: 0,
    metadata: {
      title: '',
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
    difficulty: 'init',
    subtitle: '',
    level: 1,
    chartBy: '',
    version: 1,
    updatedAt: now(),
    notes: [],
    shapeEvents: [],
    laneEvents: [],
    textEvents: [],
  };
}
