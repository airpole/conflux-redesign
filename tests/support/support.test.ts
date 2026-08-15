import { describe, expect, it } from 'vitest';
import { loadGolden, realEquals, integerEquals, REAL_TOLERANCE } from './golden.js';
import {
  assignedStep,
  expectDivergence,
  ledgerEntry,
  loadLedger,
  uncoveredIds,
} from './divergences.js';

/**
 * 골든 표 전부. **표를 새로 뽑으면 여기에 더한다** — M1-8이 `overlap.json`을
 * 만들면서 이 목록에 넣지 않아 그 표가 아무 가드도 받지 않았고, 지문이 다른 표와
 * 어긋난 것도 드러나지 않았다(D-2026-043).
 */
const TABLES = ['constants', 'timing', 'judge', 'gauge', 'shape', 'overlap'] as const;

describe('골든 표 로더', () => {
  it.each(TABLES)('%s 표를 읽고 케이스가 비어 있지 않다', (name) => {
    const table = loadGolden(name);
    expect(table.source).toBe('conflux-editor');
    expect(table.cases.length).toBeGreaterThan(0);
  });

  it('모든 표가 같은 원본 지문에서 나왔다', () => {
    // 표마다 다른 시점의 원본에서 떴다면 서로 모순되는 기대값을 담을 수 있다.
    // 지문은 하네스의 모듈 목록 전체를 덮으므로, 한 표만 다시 뽑으면 여기서 걸린다.
    const fingerprints = TABLES.map((name) => JSON.stringify(loadGolden(name).sourceFingerprint));
    expect(new Set(fingerprints).size).toBe(1);
  });

  it('없는 표를 읽으면 던진다', () => {
    expect(() => loadGolden('nope')).toThrow();
  });
});

describe('허용 오차', () => {
  it('원본의 IEEE 잡음을 흡수한다', () => {
    // t2ms(1920)이 500이 아니라 500.00000000000006으로 나오는 자리.
    expect(realEquals(500, 500.00000000000006)).toBe(true);
  });

  it('실제 계산 차이는 잡는다', () => {
    expect(realEquals(500, 500.001)).toBe(false);
    expect(realEquals(0, REAL_TOLERANCE * 10)).toBe(false);
  });

  it('정수형은 완전 일치만 통과한다', () => {
    expect(integerEquals(1920, 1920)).toBe(true);
    expect(integerEquals(1920, 1921)).toBe(false);
  });
});

describe('설계 대장', () => {
  it('항목을 읽고 ID가 중복되지 않는다', () => {
    const entries = loadLedger();
    expect(entries.length).toBeGreaterThan(0);
    expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length);
  });

  it('모든 항목이 근거를 갖는다', () => {
    // 등재는 가볍지만 근거 없는 등재는 예외 목록으로 전락한다.
    for (const entry of loadLedger()) {
      expect(entry.basis, `${entry.id}에 근거가 없다`).not.toBe('');
    }
  });

  it('대장에 없는 ID를 대면 실패한다', () => {
    // "대장에 없는 차이는 실패다"의 기계 표현.
    expect(() => ledgerEntry('ZZ-99')).toThrow(/대장에 없는 ID/);
  });

  it('어긋남으로 등재된 항목만 골든 예외로 쓸 수 있다', () => {
    expect(expectDivergence('GA-1').relation).toBe('어긋남');
    // TM-1은 미커버 — 대조할 골든 값이 없으므로 골든 예외로 쓰일 수 없다.
    expect(() => expectDivergence('TM-1')).toThrow(/골든 어긋남으로 쓸 수 없다/);
  });

  it('미커버 목록을 노출한다', () => {
    // M1-1에서는 노출까지. 담당 테스트와의 연결은 각 step이 붙인다.
    expect(uncoveredIds().length).toBeGreaterThan(0);
  });

  it('모든 미커버 항목에 담당 step이 배정돼 있다', () => {
    // 골든도 안 걸고 담당도 없으면 아무 검증 없이 통과한다.
    // 검증 공백은 어긋남보다 위험하므로, 배정 누락을 §7 롤업과 대조해 잡는다.
    const orphans = uncoveredIds().filter((id) => assignedStep(id) === undefined);
    expect(orphans, '§7 롤업에 담당 step이 없는 미커버 항목').toEqual([]);
  });
});
