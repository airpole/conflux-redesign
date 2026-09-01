import { describe, expect, it } from 'vitest';
import {
  buildCursorStops,
  buildSongRow,
  cursorTarget,
  deriveCategoryTabs,
  filterByCategory,
  filterBySearch,
  folderIndexOf,
  groupRows,
  locateCursor,
  matchesSearch,
  moveCursorByPage,
  moveCursorEnd,
  moveCursorHome,
  moveCursorHorizontal,
  moveCursorVertical,
  sortRows,
  UNCATEGORIZED,
  ALL_CATEGORY,
  type CursorPosition,
  type CursorStop,
  type SongChartInput,
  type SongRow,
} from './core-song-select.js';
import type { ChartRecord } from './core-records.js';

/** row 목록을 header 없는 정지점 배열로 감싼다 — groupBy/아코디언과 무관한
 *  순수 row-단위 이동 테스트용. */
function stopsOf(rows: readonly SongRow[]): readonly CursorStop[] {
  return buildCursorStops([{ label: '', rows, clearedCount: 0, totalCount: 0 }], false, null);
}

function chart(overrides: Partial<SongChartInput> & { chartId: number }): SongChartInput {
  return {
    songId: 'song-a',
    title: 'Song A',
    musicBy: 'Composer A',
    category: '',
    difficulty: 'Trace',
    level: 1,
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function record(overrides: Partial<ChartRecord> = {}): ChartRecord {
  return {
    bestJudgments: { SYNC: 10, PERFECT: 0, GOOD: 0, MISS: 0 },
    totalUnits: 10,
    bestState: 'AS',
    maxCombo: 10,
    ...overrides,
  };
}

describe('buildSongRow', () => {
  it('init이 없으면 null이다', () => {
    expect(buildSongRow([chart({ chartId: 1 })], new Map())).toBeNull();
  });

  it('init의 title·musicBy·category를 row 대표값으로 쓴다([[cfx]] §6)', () => {
    const row = buildSongRow(
      [chart({ chartId: 0, title: 'Init Title', musicBy: 'Init By', category: 'Original' })],
      new Map(),
    );
    expect(row?.title).toBe('Init Title');
    expect(row?.musicBy).toBe('Init By');
    expect(row?.category).toBe('Original');
  });

  it('chartId 1~5를 슬롯 인덱스 0~4에 채우고 6+는 무시한다', () => {
    const row = buildSongRow(
      [
        chart({ chartId: 0 }),
        chart({ chartId: 1, difficulty: 'Trace' }),
        chart({ chartId: 3, difficulty: 'Surge' }),
        chart({ chartId: 6, difficulty: 'Trace', level: 99 }),
      ],
      new Map(),
    );
    expect(row?.slots).toHaveLength(5);
    expect(row?.slots[0]?.difficulty).toBe('Trace');
    expect(row?.slots[1]).toBeNull();
    expect(row?.slots[2]?.difficulty).toBe('Surge');
    // chartId 6은 어느 슬롯에도 안 들어간다.
    expect(row?.slots.some((s) => s?.level === 99)).toBe(false);
  });

  it('기록 없는 slot은 state N, score/rank null이다', () => {
    const row = buildSongRow([chart({ chartId: 0 }), chart({ chartId: 1 })], new Map());
    expect(row?.slots[0]?.state).toBe('N');
    expect(row?.slots[0]?.score).toBeNull();
    expect(row?.slots[0]?.rank).toBeNull();
  });

  it('기록이 있으면 state·score·rank를 record에서 파생한다', () => {
    const records = new Map([['song-a:1', record({ bestState: 'FC' })]]);
    const row = buildSongRow([chart({ chartId: 0 }), chart({ chartId: 1 })], records);
    expect(row?.slots[0]?.state).toBe('FC');
    expect(row?.slots[0]?.score).not.toBeNull();
    expect(row?.slots[0]?.rank).not.toBeNull();
  });

  it('row의 updatedAt은 chart들 중 최댓값이다', () => {
    const row = buildSongRow(
      [
        chart({ chartId: 0, updatedAt: '2026-01-01T00:00:00Z' }),
        chart({ chartId: 1, updatedAt: '2026-03-01T00:00:00Z' }),
        chart({ chartId: 2, updatedAt: '2026-02-01T00:00:00Z' }),
      ],
      new Map(),
    );
    expect(row?.updatedAt).toBe('2026-03-01T00:00:00Z');
  });
});

describe('category', () => {
  const rows: SongRow[] = [
    { songId: 'a', title: 'A', musicBy: '', category: 'Original', slots: [], updatedAt: '' },
    { songId: 'b', title: 'B', musicBy: '', category: 'Licensed', slots: [], updatedAt: '' },
    { songId: 'c', title: 'C', musicBy: '', category: '', slots: [], updatedAt: '' },
  ];

  it('All이 항상 첫 번째, Uncategorized가 항상 마지막이다', () => {
    expect(deriveCategoryTabs(rows)).toEqual([ALL_CATEGORY, 'Original', 'Licensed', UNCATEGORIZED]);
  });

  it('빈 category가 없으면 Uncategorized 탭이 없다', () => {
    expect(deriveCategoryTabs(rows.slice(0, 2))).toEqual([ALL_CATEGORY, 'Original', 'Licensed']);
  });

  it('filterByCategory가 All이면 전부, 특정 탭이면 해당 category만 남긴다', () => {
    expect(filterByCategory(rows, ALL_CATEGORY)).toHaveLength(3);
    expect(filterByCategory(rows, 'Original').map((r) => r.songId)).toEqual(['a']);
    expect(filterByCategory(rows, UNCATEGORIZED).map((r) => r.songId)).toEqual(['c']);
  });
});

describe('sortRows', () => {
  function row(songId: string, title: string, slots: SongRow['slots']): SongRow {
    return { songId, title, musicBy: '', category: '', slots, updatedAt: '2026-01-01T00:00:00Z' };
  }

  it('title 축이 asc/desc로 정렬한다', () => {
    const rows = [row('a', 'Banana', []), row('b', 'Apple', [])];
    expect(sortRows(rows, 'title', 'asc').map((r) => r.title)).toEqual(['Apple', 'Banana']);
    expect(sortRows(rows, 'title', 'desc').map((r) => r.title)).toEqual(['Banana', 'Apple']);
  });

  it('default 축은 원래 순서를 유지한다(sortDir 무관)', () => {
    const rows = [row('a', 'Z', []), row('b', 'A', [])];
    expect(sortRows(rows, 'default', 'asc').map((r) => r.songId)).toEqual(['a', 'b']);
    expect(sortRows(rows, 'default', 'desc').map((r) => r.songId)).toEqual(['a', 'b']);
  });

  it('score 축에서 기록 없는 row는 sortDir 무관 항상 최하단이다', () => {
    const withRecord = row('a', 'A', [
      {
        chartId: 1,
        difficulty: 'Trace',
        level: 1,
        state: 'FC',
        score: 900000,
        rank: 'A',
        judgments: null,
      },
    ]);
    const noRecord = row('b', 'B', [
      {
        chartId: 1,
        difficulty: 'Trace',
        level: 1,
        state: 'N',
        score: null,
        rank: null,
        judgments: null,
      },
    ]);
    expect(sortRows([noRecord, withRecord], 'score', 'asc').map((r) => r.songId)).toEqual([
      'a',
      'b',
    ]);
    expect(sortRows([noRecord, withRecord], 'score', 'desc').map((r) => r.songId)).toEqual([
      'a',
      'b',
    ]);
  });

  it('level 축은 row가 표시하는 slot 중 최상위 값을 쓴다', () => {
    const rows = [
      row('a', 'A', [
        {
          chartId: 1,
          difficulty: 'Trace',
          level: 3,
          state: 'N',
          score: null,
          rank: null,
          judgments: null,
        },
        {
          chartId: 2,
          difficulty: 'Drift',
          level: 9,
          state: 'N',
          score: null,
          rank: null,
          judgments: null,
        },
      ]),
      row('b', 'B', [
        {
          chartId: 1,
          difficulty: 'Trace',
          level: 5,
          state: 'N',
          score: null,
          rank: null,
          judgments: null,
        },
      ]),
    ];
    // a의 최상위 level=9 > b의 5
    expect(sortRows(rows, 'level', 'desc').map((r) => r.songId)).toEqual(['a', 'b']);
  });
});

describe('groupRows', () => {
  function row(songId: string, title: string, updatedAt: string): SongRow {
    return {
      songId,
      title,
      musicBy: '',
      category: '',
      slots: [
        {
          chartId: 1,
          difficulty: 'Trace',
          level: 1,
          state: 'FC',
          score: 1,
          rank: 'A',
          judgments: null,
        },
      ],
      updatedAt,
    };
  }

  it('none이면 folder가 하나뿐이고 label이 빈 문자열이다', () => {
    const folders = groupRows([row('a', 'A', '2026-01-01T00:00:00Z')], 'none');
    expect(folders).toHaveLength(1);
    expect(folders[0]!.label).toBe('');
    expect(folders[0]!.rows).toHaveLength(1);
  });

  it('title 축이 첫 글자로 묶는다', () => {
    const rows = [row('a', 'Apple', ''), row('b', 'Banana', ''), row('c', 'Ant', '')];
    const folders = groupRows(rows, 'title');
    expect(folders.map((f) => f.label)).toEqual(['A', 'B']);
    expect(folders[0]!.rows.map((r) => r.songId)).toEqual(['a', 'c']);
  });

  it('folder의 clearedCount/totalCount가 slot 단위로 집계된다', () => {
    const folders = groupRows([row('a', 'A', '')], 'none');
    expect(folders[0]!.totalCount).toBe(1);
    expect(folders[0]!.clearedCount).toBe(1); // FC는 클리어로 친다
  });
});

function slot(chartId: number, level = 1): SongRow['slots'][number] {
  return {
    chartId,
    difficulty: 'Trace',
    level,
    state: 'N',
    score: null,
    rank: null,
    judgments: null,
  };
}

function cursorRow(songId: string, slots: SongRow['slots']): SongRow {
  return { songId, title: songId, musicBy: '', category: '', slots, updatedAt: '' };
}

describe('locateCursor / cursorTarget', () => {
  it('정지점이 없으면 null이다', () => {
    expect(locateCursor([], null)).toBeNull();
  });

  it('target이 null이면 첫 row의 첫 채워진 slot으로 간다', () => {
    const stops = stopsOf([cursorRow('a', [null, slot(2), null, null, null])]);
    expect(locateCursor(stops, null)).toEqual({ stopIndex: 0, slotIndex: 1 });
  });

  it('target이 현재 목록에 있으면 그 위치를 찾는다', () => {
    const stops = stopsOf([cursorRow('a', [slot(1)]), cursorRow('b', [slot(1), slot(2)])]);
    expect(locateCursor(stops, { songId: 'b', chartId: 2 })).toEqual({
      stopIndex: 1,
      slotIndex: 1,
    });
  });

  it('target이 사라졌으면(정렬·필터로) 첫 항목으로 돌아간다(§8)', () => {
    const stops = stopsOf([cursorRow('a', [slot(1)])]);
    expect(locateCursor(stops, { songId: 'gone', chartId: 9 })).toEqual({
      stopIndex: 0,
      slotIndex: 0,
    });
  });

  it('cursorTarget이 좌표를 chart 정체성으로 되돌린다', () => {
    const stops = stopsOf([cursorRow('a', [slot(1), slot(2)])]);
    expect(cursorTarget(stops, { stopIndex: 0, slotIndex: 1 })).toEqual({
      songId: 'a',
      chartId: 2,
    });
  });

  it('빈 슬롯을 가리키면 cursorTarget이 null이다', () => {
    const stops = stopsOf([cursorRow('a', [null, slot(2)])]);
    expect(cursorTarget(stops, { stopIndex: 0, slotIndex: 0 })).toBeNull();
  });
});

describe('moveCursorHorizontal', () => {
  it('오른쪽으로 다음 채워진 슬롯까지 건너뛴다', () => {
    const stops = stopsOf([cursorRow('a', [slot(1), null, slot(3), null, null])]);
    const pos: CursorPosition = { stopIndex: 0, slotIndex: 0 };
    expect(moveCursorHorizontal(stops, pos, 1)).toEqual({ stopIndex: 0, slotIndex: 2 });
  });

  it('마지막 채워진 슬롯에서 더 오른쪽으로 가면 멈춘다(페이지네이션은 미룸)', () => {
    const stops = stopsOf([cursorRow('a', [slot(1), slot(2), null, null, null])]);
    const pos: CursorPosition = { stopIndex: 0, slotIndex: 1 };
    expect(moveCursorHorizontal(stops, pos, 1)).toEqual(pos);
  });

  it('왼쪽으로도 같은 규칙을 따른다', () => {
    const stops = stopsOf([cursorRow('a', [null, slot(2), null, slot(4), null])]);
    const pos: CursorPosition = { stopIndex: 0, slotIndex: 3 };
    expect(moveCursorHorizontal(stops, pos, -1)).toEqual({ stopIndex: 0, slotIndex: 1 });
  });
});

describe('moveCursorVertical — 열 대응 규칙(§7)', () => {
  it('같은 열에 chart가 있으면 그 slot으로 간다', () => {
    const stops = stopsOf([cursorRow('a', [slot(1), slot(2)]), cursorRow('b', [slot(1), slot(2)])]);
    const pos: CursorPosition = { stopIndex: 0, slotIndex: 1 };
    expect(moveCursorVertical(stops, pos, 1)).toEqual({ stopIndex: 1, slotIndex: 1 });
  });

  it('같은 열이 비어 있으면 더 낮은 열 중 가장 가까운 slot', () => {
    const stops = stopsOf([
      cursorRow('a', [null, null, slot(3)]),
      cursorRow('b', [slot(1), slot(2), null]),
    ]);
    const pos: CursorPosition = { stopIndex: 0, slotIndex: 2 };
    expect(moveCursorVertical(stops, pos, 1)).toEqual({ stopIndex: 1, slotIndex: 1 });
  });

  it('낮은 열도 없으면 더 높은 열 중 가장 가까운 slot', () => {
    const stops = stopsOf([
      cursorRow('a', [null, null, slot(3)]),
      cursorRow('b', [null, null, null, slot(4)]),
    ]);
    const pos: CursorPosition = { stopIndex: 0, slotIndex: 2 };
    expect(moveCursorVertical(stops, pos, 1)).toEqual({ stopIndex: 1, slotIndex: 3 });
  });

  it('목록 끝에서는 멈춘다', () => {
    const stops = stopsOf([cursorRow('a', [slot(1)])]);
    const pos: CursorPosition = { stopIndex: 0, slotIndex: 0 };
    expect(moveCursorVertical(stops, pos, 1)).toEqual(pos);
    expect(moveCursorVertical(stops, pos, -1)).toEqual(pos);
  });

  it('직전 열을 기억하지 않는다 — 이동 결과 열이 다음 이동의 기준이다', () => {
    const stops = stopsOf([
      cursorRow('a', [slot(1), null, slot(3)]),
      cursorRow('b', [slot(1), null, null]), // 2행: col2 없음 → col1로 이동(낮은 열)
      cursorRow('c', [slot(1), slot(2), null]), // 3행: col1에 chart 있음 — 원래 col2를 기억했다면 여기서 col2로 안 감
    ]);
    let pos: CursorPosition = { stopIndex: 0, slotIndex: 2 };
    pos = moveCursorVertical(stops, pos, 1); // → row1, col1(낮은 열로 이동)
    expect(pos).toEqual({ stopIndex: 1, slotIndex: 0 });
    pos = moveCursorVertical(stops, pos, 1); // → row2, 지금 col(col0)에 chart 있음 → 그대로 col0
    expect(pos).toEqual({ stopIndex: 2, slotIndex: 0 });
  });
});

describe('folder 헤더 — 아코디언(§4, M4-4)', () => {
  const folders = [
    { label: 'A', rows: [cursorRow('a', [slot(1)])], clearedCount: 0, totalCount: 1 },
    {
      label: 'B',
      rows: [cursorRow('b', [slot(1)]), cursorRow('c', [slot(1)])],
      clearedCount: 0,
      totalCount: 2,
    },
  ];

  it('헤더가 있으면 접힌 folder는 row 없이 헤더 정지점만 남는다', () => {
    const stops = buildCursorStops(folders, true, 0);
    expect(stops).toEqual([
      { kind: 'header', folderIndex: 0 },
      { kind: 'row', folderIndex: 0, row: folders[0]!.rows[0] },
      { kind: 'header', folderIndex: 1 },
    ]);
  });

  it('펼친 folder를 바꾸면 그 folder의 row가 정지점에 나타난다', () => {
    const stops = buildCursorStops(folders, true, 1);
    expect(stops.filter((s) => s.kind === 'row')).toHaveLength(2);
  });

  it('아무 folder도 안 펼치면(null) 헤더만 남는다', () => {
    const stops = buildCursorStops(folders, true, null);
    expect(stops.every((s) => s.kind === 'header')).toBe(true);
  });

  it('헤더 없음(검색 중·groupBy none)이면 모든 row가 정지점이다', () => {
    const stops = buildCursorStops(folders, false, null);
    expect(stops.filter((s) => s.kind === 'row')).toHaveLength(3);
    expect(stops.some((s) => s.kind === 'header')).toBe(false);
  });

  it('상하 이동이 헤더를 정지점으로 통과한다', () => {
    const stops = buildCursorStops(folders, true, 0);
    let pos: CursorPosition = { stopIndex: 0, slotIndex: 0 }; // A 헤더
    pos = moveCursorVertical(stops, pos, 1);
    expect(stops[pos.stopIndex]).toEqual({ kind: 'row', folderIndex: 0, row: folders[0]!.rows[0] });
    pos = moveCursorVertical(stops, pos, 1);
    expect(stops[pos.stopIndex]).toEqual({ kind: 'header', folderIndex: 1 }); // B 헤더(접혀 있어 row는 안 보임)
  });

  it('folderIndexOf가 target이 속한 folder를 찾는다', () => {
    expect(folderIndexOf(folders, { songId: 'c', chartId: 1 })).toBe(1);
    expect(folderIndexOf(folders, { songId: 'gone', chartId: 1 })).toBeNull();
    expect(folderIndexOf(folders, null)).toBeNull();
  });
});

describe('moveCursorByPage / moveCursorHome / moveCursorEnd (§7)', () => {
  const stops = stopsOf([
    cursorRow('a', [slot(1)]),
    cursorRow('b', [slot(1)]),
    cursorRow('c', [slot(1)]),
    cursorRow('d', [slot(1)]),
  ]);

  it('moveCursorByPage가 pageSize만큼 아래로 이동한다', () => {
    const pos = moveCursorByPage(stops, { stopIndex: 0, slotIndex: 0 }, 1, 2);
    expect(pos).toEqual({ stopIndex: 2, slotIndex: 0 });
  });

  it('moveCursorByPage가 배열 끝에 닿으면 그 자리에서 멈춘다', () => {
    const pos = moveCursorByPage(stops, { stopIndex: 0, slotIndex: 0 }, 1, 100);
    expect(pos).toEqual({ stopIndex: 3, slotIndex: 0 });
  });

  it('moveCursorHome이 첫 정지점으로 간다', () => {
    expect(moveCursorHome(stops)).toEqual({ stopIndex: 0, slotIndex: 0 });
  });

  it('moveCursorEnd가 마지막 정지점으로 간다', () => {
    expect(moveCursorEnd(stops)).toEqual({ stopIndex: 3, slotIndex: 0 });
  });
});

describe('matchesSearch / filterBySearch (§6)', () => {
  const song = cursorRow('a', [slot(1)]);
  const withNames = { ...song, title: 'Foo Bar', musicBy: 'Some Artist' };

  it('빈 검색어는 전부 매치한다', () => {
    expect(matchesSearch(withNames, '')).toBe(true);
  });

  it('대소문자를 무시한다', () => {
    expect(matchesSearch(withNames, 'FOO')).toBe(true);
  });

  it('부분 문자열로 매치한다', () => {
    expect(matchesSearch(withNames, 'oo Ba')).toBe(true);
  });

  it('공백으로 나눈 낱말이 각각 다른 필드에 있어도 매치한다(AND)', () => {
    expect(matchesSearch(withNames, 'Foo Artist')).toBe(true);
  });

  it('낱말 중 하나라도 어느 필드에도 없으면 매치하지 않는다', () => {
    expect(matchesSearch(withNames, 'Foo Nope')).toBe(false);
  });

  it('공백을 제거한 검색어가 공백 제거한 필드에 포함되면 매치한다', () => {
    expect(matchesSearch(withNames, 'oobar')).toBe(true);
  });

  it('NFC 정규화 후 비교한다', () => {
    // 'é'를 combining form(e + ́)으로 구성 — NFC 정규화 없인 안 맞는다.
    const decomposed = 'Café';
    const row = { ...song, title: 'Café', musicBy: '' };
    expect(matchesSearch(row, decomposed)).toBe(true);
  });

  it('filterBySearch가 매치하는 row만 남긴다', () => {
    const other = { ...song, songId: 'b', title: 'Nothing', musicBy: '' };
    expect(filterBySearch([withNames, other], 'Foo').map((r) => r.songId)).toEqual(['a']);
  });
});
