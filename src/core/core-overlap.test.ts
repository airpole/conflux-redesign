/**
 * 겹침 검출 — `core/data-model.md` §5.1의 검증.
 *
 * 골든 `overlap.json`은 원본 `overlaps.js`의 관측 자료다. 2겹은 `[보존]`이라
 * 값까지 맞아야 하고, 3겹 이상(DM-3)과 global 6키(JD-5)는 원본에 검출 자체가
 * 없어 대장이 통과시킨다.
 */
import { describe, expect, it } from 'vitest';
import { buildOverlapMap, isActiveAt } from './core-overlap.js';
import type { ConflictGroup, NoteOverlapMap, OverlapMark } from './core-overlap.js';
import type { Lane, Note } from './core-chart.js';
import { loadGolden } from '../../tests/support/golden.js';
import { assignedStep, ledgerEntry } from '../../tests/support/divergences.js';

const T = 1920;

function note(lane: Lane, startTick: number, duration = 0, isWide = false): Note {
  return { lane, startTick, duration, isWide };
}

function kinds(map: NoteOverlapMap): (OverlapMark['kind'] | null)[] {
  return map.marks.map((mark) => mark?.kind ?? null);
}

function scopes(map: NoteOverlapMap): string[] {
  return map.conflicts.map((group) => group.scope);
}

function groupsOf(map: NoteOverlapMap, scope: ConflictGroup['scope']): readonly ConflictGroup[] {
  return map.conflicts.filter((group) => group.scope === scope);
}

// ── §1. 활성 정의 ───────────────────────────────────────────

describe('§1 활성 정의 — Hold가 끝나는 tick은 이미 활성이 아니다', () => {
  it('Tap은 자기 tick에서만 활성이다', () => {
    const tap = note(2, T);
    expect(isActiveAt(tap, T - 1)).toBe(false);
    expect(isActiveAt(tap, T)).toBe(true);
    expect(isActiveAt(tap, T + 1)).toBe(false);
  });

  it('Hold는 시작을 포함하고 끝을 포함하지 않는다', () => {
    const hold = note(2, 0, T);
    expect(isActiveAt(hold, -1)).toBe(false);
    expect(isActiveAt(hold, 0)).toBe(true);
    expect(isActiveAt(hold, T - 1)).toBe(true);
    expect(isActiveAt(hold, T)).toBe(false);
  });

  it('맞닿은 Hold 두 장은 겹치지 않는다 — 순서 규칙 없이 정의만으로 갈린다', () => {
    const map = buildOverlapMap([note(2, 0, T), note(2, T, T)]);
    expect(kinds(map)).toEqual([null, null]);
    expect(map.conflicts).toEqual([]);
  });

  it('Hold 끝 tick의 Tap은 겹치지 않고, 한 tick 앞의 Tap은 겹친다', () => {
    expect(kinds(buildOverlapMap([note(2, 0, T), note(2, T)]))).toEqual([null, null]);
    expect(kinds(buildOverlapMap([note(2, 0, T), note(2, T - 1)]))).toEqual(['clipped', 'yellow']);
  });

  it('같은 tick의 Tap 두 장은 서로 만난다 — 자기 끝이 자기 시작을 밀어내지 않는다', () => {
    const map = buildOverlapMap([note(1, 0), note(1, 0)]);
    expect(kinds(map)).toEqual(['conflict', 'conflict']);
  });
});

// ── §2. 로컬 capacity ───────────────────────────────────────

describe('§2 로컬 capacity — 풀마다 몇 겹부터 못 치는가', () => {
  it('lane 1·4는 2겹부터 conflict다', () => {
    for (const lane of [1, 4] as const) {
      const map = buildOverlapMap([note(lane, 0), note(lane, 0)]);
      expect(kinds(map)).toEqual(['conflict', 'conflict']);
      expect(groupsOf(map, 'local')).toHaveLength(1);
      expect(groupsOf(map, 'local')[0]!.excess).toBe(1);
    }
  });

  it('lane 1·4는 Hold 중간의 같은 lane Tap도 conflict다', () => {
    const map = buildOverlapMap([note(4, 0, T), note(4, T / 2)]);
    expect(kinds(map)).toEqual(['conflict', 'conflict']);
    expect(groupsOf(map, 'local')[0]!.tick).toBe(T / 2);
  });

  it('lane 2·3은 2겹이 overlap이고 conflict가 아니다', () => {
    for (const lane of [2, 3] as const) {
      const map = buildOverlapMap([note(lane, 0), note(lane, 0)]);
      expect(kinds(map)).toEqual(['merged', 'hidden']);
      expect(map.conflicts).toEqual([]);
    }
  });

  it('Wide 풀은 2겹부터 conflict다', () => {
    const map = buildOverlapMap([note(1, 0, 0, true), note(1, 0, 0, true)]);
    expect(kinds(map)).toEqual(['conflict', 'conflict']);
  });

  it('풀이 다르면 겹치지 않는다 — Wide와 lane note는 다른 손가락이다', () => {
    expect(kinds(buildOverlapMap([note(1, 0, 0, true), note(1, 0)]))).toEqual([null, null]);
    expect(kinds(buildOverlapMap([note(2, 0), note(3, 0)]))).toEqual([null, null]);
  });

  it('conflict group은 그 tick에 활성인 그 풀의 노트 전체를 담는다', () => {
    const map = buildOverlapMap([note(2, 0, T), note(2, T / 4, T), note(2, T / 2, T)]);
    const group = groupsOf(map, 'local')[0]!;
    expect(group.noteIndices).toEqual([0, 1, 2]);
    expect(group.tick).toBe(T / 2);
  });
});

// ── §3. 3겹 이상 (DM-3) ─────────────────────────────────────

describe('§3 3겹 이상 — 원본이 잡지 못하던 자리 (DM-3)', () => {
  it('lane 2의 3겹 계단이 셋 다 conflict다', () => {
    const map = buildOverlapMap([note(2, 0, T), note(2, T / 4, T), note(2, T / 2, T)]);
    expect(kinds(map)).toEqual(['conflict', 'conflict', 'conflict']);
    expect(groupsOf(map, 'local')[0]!.excess).toBe(1);
  });

  it('같은 tick 4겹은 초과 2로 잡히고 아무도 숨지 않는다', () => {
    const map = buildOverlapMap([note(3, 0), note(3, 0), note(3, 0), note(3, 0)]);
    expect(kinds(map)).toEqual(['conflict', 'conflict', 'conflict', 'conflict']);
    expect(kinds(map)).not.toContain('hidden');

    const group = groupsOf(map, 'local')[0]!;
    expect(group.excess).toBe(2);
    expect(group.noteIndices).toEqual([0, 1, 2, 3]);
  });

  it('초과분은 capacity를 뺀 값이다 — 삭제 개수의 단일 출처', () => {
    const five = [0, 1, 2, 3, 4].map(() => note(2, 0));
    expect(groupsOf(buildOverlapMap(five), 'local')[0]!.excess).toBe(3);
  });

  it('DM-3이 대장에 등재돼 있고 담당 step이 M1-8이다', () => {
    expect(ledgerEntry('DM-3').relation).toBe('어긋남');
    expect(assignedStep('DM-3')).toBe('M1-8');
  });
});

// ── §4. global 6키 (JD-5) ───────────────────────────────────

describe('§4 global 6키 — 로컬을 다 통과해도 손가락이 모자란 자리 (JD-5)', () => {
  /** 1+2+2+1+1 = 7. 각 풀은 capacity 이내다. */
  const seven: readonly Note[] = [
    note(1, 0),
    note(2, 0),
    note(2, 0),
    note(3, 0),
    note(3, 0),
    note(4, 0),
    note(1, 0, 0, true),
  ];

  it('7-입력이 global conflict로 잡힌다', () => {
    const map = buildOverlapMap(seven);
    expect(groupsOf(map, 'global')).toHaveLength(1);
    expect(groupsOf(map, 'global')[0]!.excess).toBe(1);
  });

  it('로컬 검사는 전부 통과한다 — global이 아니면 놓쳤을 자리다', () => {
    expect(groupsOf(buildOverlapMap(seven), 'local')).toEqual([]);
  });

  it('group이 기여한 노트 전체를 담고 풀을 가리지 않는다', () => {
    const group = groupsOf(buildOverlapMap(seven), 'global')[0]!;
    expect(group.noteIndices).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(group.tick).toBe(0);
  });

  it('총 6은 통과한다 — 경계가 6이지 5가 아니다', () => {
    const six = seven.slice(0, 6);
    expect(groupsOf(buildOverlapMap(six), 'global')).toEqual([]);
  });

  it('지속 중인 Hold가 나중 tick의 head와 합쳐져 7이 되는 것도 잡는다', () => {
    const map = buildOverlapMap([
      note(2, 0, T),
      note(2, 0, T),
      note(3, 0, T),
      note(3, 0, T),
      note(1, T / 2),
      note(4, T / 2),
      note(1, T / 2, 0, true),
    ]);
    const global = groupsOf(map, 'global');
    expect(global).toHaveLength(1);
    expect(global[0]!.tick).toBe(T / 2);
    expect(global[0]!.excess).toBe(1);
  });

  it('JD-5가 대장에 등재돼 있고 담당 step이 M1-8이다', () => {
    expect(ledgerEntry('JD-5').relation).toBe('없음');
    expect(assignedStep('JD-5')).toBe('M1-8');
  });
});

// ── §5. 우선순위 (DM-6) ─────────────────────────────────────

describe('§5 우선순위 — conflict가 세부 분류를 덮는다 (DM-6)', () => {
  it('global conflict 안의 2겹 쌍은 merged/hidden이 아니라 conflict다', () => {
    const map = buildOverlapMap([
      note(1, 0),
      note(2, 0),
      note(2, 0),
      note(3, 0),
      note(3, 0),
      note(4, 0),
      note(1, 0, 0, true),
    ]);
    expect(kinds(map)).toEqual(Array<string>(7).fill('conflict'));
  });

  it('hidden이 conflict에 덮이므로 노트가 화면에서 사라지지 않는다', () => {
    const map = buildOverlapMap([note(2, 0), note(2, 0), note(2, 0)]);
    expect(kinds(map)).not.toContain('hidden');
  });

  it('conflict가 아닌 시각의 2겹은 그대로 overlap으로 남는다', () => {
    // lane 2의 [0,T) 3겹과, 그와 무관한 lane 3의 2겹이 한 chart에 있다.
    const map = buildOverlapMap([
      note(2, 0, T),
      note(2, 0, T),
      note(2, 0, T),
      note(3, T * 4, T),
      note(3, T * 4, T),
    ]);
    expect(kinds(map)).toEqual(['conflict', 'conflict', 'conflict', 'merged', 'hidden']);
  });

  it('DM-6이 대장에 등재돼 있다 — 원본에는 두 종류가 겨루는 자리가 없다', () => {
    expect(ledgerEntry('DM-6').relation).toBe('없음');
    expect(assignedStep('DM-6')).toBe('M1-8');
  });
});

// ── §6. 세부 분류 (보존) ────────────────────────────────────

describe('§6 2겹 세부 분류 — 원본 규칙 그대로', () => {
  it('활성구간이 같으면 배치가 이른 쪽이 merged, 늦은 쪽이 hidden이다', () => {
    expect(kinds(buildOverlapMap([note(2, 0, T), note(2, 0, T)]))).toEqual(['merged', 'hidden']);
  });

  it('시작이 다르면 늦게 시작한 쪽이 yellow다', () => {
    const map = buildOverlapMap([note(2, 0, T), note(2, T / 2, T)]);
    expect(map.marks[1]).toEqual({
      kind: 'yellow',
      yellowStart: T / 2,
      yellowEnd: T,
      fullYellow: false,
    });
    expect(map.marks[0]).toEqual({ kind: 'clipped', clipStart: T / 2, clipEnd: T });
  });

  it('시작이 같으면 짧은 쪽이 yellow다 — Hold 머리 위의 Tap', () => {
    const map = buildOverlapMap([note(2, 0, T), note(2, 0)]);
    expect(map.marks[1]).toMatchObject({ kind: 'yellow', fullYellow: true });
    expect(map.marks[0]).toMatchObject({ kind: 'clipped' });
  });

  it('겹침부가 노트 전체를 덮으면 fullYellow다', () => {
    const map = buildOverlapMap([note(2, 0, T), note(2, T / 2)]);
    expect(map.marks[1]).toMatchObject({ fullYellow: true });
  });

  it('흰 쪽이 Tap이면 clipped를 붙이지 않는다 — 가려질 몸통이 없다', () => {
    const map = buildOverlapMap([note(2, 0), note(2, 0, T)]);
    expect(kinds(map)).toEqual(['yellow', 'clipped']);
  });

  it('한 노트가 두 쌍에 끼면 먼저 만난 쌍의 표시가 남는다', () => {
    const map = buildOverlapMap([note(2, 0, T), note(2, T / 2, T), note(2, T + T / 4, T)]);
    // 가운데 노트는 앞 쌍에서 yellow가 됐다. 뒤 쌍의 clipped가 덮지 않는다.
    expect(kinds(map)).toEqual(['clipped', 'yellow', 'yellow']);
  });
});

// ── §7. 골든 대조 ───────────────────────────────────────────

interface GoldenCase {
  readonly fixture: string;
  readonly index: number;
  readonly note: { startTick: number; duration: number; channel: number; isWide: boolean };
  readonly expected: { type: string; [key: string]: unknown } | null;
}

/** 원본 명칭 → 재설계 명칭. 표는 원본 이름을 쓰고 매핑은 테스트가 갖는다. */
const TYPE_MAP: Readonly<Record<string, OverlapMark['kind']>> = {
  invalid: 'conflict',
  merged: 'merged',
  hidden: 'hidden',
  yellow: 'yellow',
  clipped: 'clipped',
};

/** 원본에 검출 자체가 없어 값이 갈리는 fixture와 그 근거. */
const DIVERGENT: Readonly<Record<string, string>> = {
  tripleStaircase: 'DM-3',
  quadSameTick: 'DM-3',
  sevenInput: 'JD-5',
  heldThenHeads: 'JD-5',
};

describe('§7 골든 대조 — 원본 overlaps.js', () => {
  const table = loadGolden<GoldenCase>('overlap');
  const byFixture = new Map<string, GoldenCase[]>();
  for (const kase of table.cases) {
    byFixture.set(kase.fixture, [...(byFixture.get(kase.fixture) ?? []), kase]);
  }

  function rebuild(cases: readonly GoldenCase[]): Note[] {
    return [...cases]
      .sort((a, b) => a.index - b.index)
      .map((kase) =>
        note(kase.note.channel as Lane, kase.note.startTick, kase.note.duration, kase.note.isWide),
      );
  }

  it('표가 비어 있지 않다', () => {
    expect(table.cases.length).toBe(54);
    expect(byFixture.size).toBe(18);
  });

  for (const [fixture, cases] of byFixture) {
    const divergence = DIVERGENT[fixture];

    it(`${fixture} — ${divergence ? `${divergence}로 갈린다` : '값까지 일치한다'}`, () => {
      const map = buildOverlapMap(rebuild(cases));

      if (divergence) {
        // 원본은 아무 conflict도 내지 못했고, 재설계는 전부 conflict로 잡는다.
        expect(cases.every((kase) => kase.expected?.type !== 'invalid')).toBe(true);
        expect(kinds(map).every((kind) => kind === 'conflict')).toBe(true);
        expect(ledgerEntry(divergence).id).toBe(divergence);
        return;
      }

      for (const kase of cases) {
        const actual = map.marks[kase.index];
        if (kase.expected === null) {
          expect(actual, `${fixture}[${kase.index}]`).toBeNull();
          continue;
        }
        const { type, ...rest } = kase.expected;
        expect(actual, `${fixture}[${kase.index}]`).toEqual({ kind: TYPE_MAP[type], ...rest });
      }
    });
  }

  it('갈리는 fixture 밖에서는 conflict group이 원본의 invalid와 같은 노트를 잡는다', () => {
    for (const [fixture, cases] of byFixture) {
      if (DIVERGENT[fixture]) continue;

      const map = buildOverlapMap(rebuild(cases));
      const original = cases
        .filter((kase) => kase.expected?.type === 'invalid')
        .map((k) => k.index);
      const redesign = map.marks.flatMap((mark, i) => (mark?.kind === 'conflict' ? [i] : []));
      expect(redesign, fixture).toEqual(original);
    }
  });
});

// ── §8. 불변식 ──────────────────────────────────────────────

describe('§8 불변식', () => {
  it('결과 목록은 notes와 길이가 같다', () => {
    const notes = [note(1, 0), note(2, 0), note(2, 0)];
    expect(buildOverlapMap(notes).marks).toHaveLength(notes.length);
  });

  it('notes를 mutate하지 않는다', () => {
    const notes = [note(2, 0, T), note(2, 0, T), note(2, 0, T)];
    const before = structuredClone(notes);
    buildOverlapMap(notes);
    expect(notes).toEqual(before);
  });

  it('노트가 0~1장이면 아무것도 나오지 않는다', () => {
    expect(buildOverlapMap([])).toEqual({ marks: [], conflicts: [] });
    expect(buildOverlapMap([note(2, 0)])).toEqual({ marks: [null], conflicts: [] });
  });

  it('음수 tick에서도 같은 규칙이 선다', () => {
    const map = buildOverlapMap([note(1, -T), note(1, -T)]);
    expect(kinds(map)).toEqual(['conflict', 'conflict']);
    expect(groupsOf(map, 'local')[0]!.tick).toBe(-T);
  });

  it('scope는 local과 global 둘뿐이다', () => {
    const map = buildOverlapMap([
      note(2, 0),
      note(2, 0),
      note(2, 0),
      note(3, 0),
      note(3, 0),
      note(1, 0),
      note(4, 0),
    ]);
    expect(new Set(scopes(map)).size).toBeGreaterThan(0);
    for (const scope of scopes(map)) expect(['local', 'global']).toContain(scope);
  });
});
