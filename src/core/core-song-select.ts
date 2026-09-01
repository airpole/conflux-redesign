/**
 * song-select 목록 모델 — row/slot 구성, category 필터, sort 9축. 순수
 * 계산이라 브라우저 API를 하나도 안 쓴다(`architecture.md` §1). 정의의
 * 단일 출처는 [[song-select]] §1~§5, 레이아웃은 `ui-design.md` §2.5.
 *
 * **groupBy는 이 파일에 없다.** [[song-select]] §4는 7축 중 `level`/
 * `difficulty`/`state`/`rank`(chart 분기 축)에서 "그 folder 조건을 만족하는
 * chart만 채우고 나머지는 `-`"라고만 하고, 기록이 없는(`N`) chart가 그
 * 축의 folder에 아예 안 들어가는지 별도 "미기록" folder로 묶이는지는
 * 정하지 않는다 — sort의 "기록 기반 축은 미기록이 항상 최하단"(§5)과
 * 같은 규칙이 groupBy에도 적용되는지 스펙에 없다. 이 모호함을 추측으로
 * 채우지 않고 `none`/`updated`/`title`(song 공통 축, 모호함 없음) 3개만
 * 이번 범위에 구현한다 — chart 분기 groupBy 4종은 결정 필요 항목으로
 * `DECISION_LOG`에 남긴다.
 *
 * `chartId 6+`(추가 chart, subtitle 있음)는 페이지네이션 대상이라
 * ([[song-select]] §3 "chart가 그보다 많으면 페이지로 나눈다") cursor·
 * page 상태가 있어야 의미가 생긴다 — M4-4 범위. 이 파일은 고정 슬롯
 * 1~5(chartId 1~5)만 채우고 6+는 무시한다.
 */
import { RANK_TABLE, SLOTS_PER_ROW } from './core-constants.js';
import { deriveRecordSummary, type ChartRecord } from './core-records.js';
import type { Difficulty } from './core-chart.js';
import type { PlayState, Rank } from './core-gauge.js';

/** 기록 없음(`N`)까지 포함한 song-select 전용 state — core-gauge의
 *  `PlayState`에는 없다(records/UI 개념, [[glossary]]). */
export type SongSelectState = PlayState | 'N';

export interface SlotView {
  readonly chartId: number;
  readonly difficulty: Difficulty;
  readonly level: number;
  readonly state: SongSelectState;
  /** 기록 없으면 `null`. */
  readonly score: number | null;
  readonly rank: Rank | null;
}

export interface SongRow {
  readonly songId: string;
  /** Representative Chart(chartId 0, init)의 값 — [[cfx]] §6 "표시 기본값". */
  readonly title: string;
  readonly musicBy: string;
  readonly category: string;
  /** 길이 `SLOTS_PER_ROW`. 빈 슬롯은 `null`. */
  readonly slots: readonly (SlotView | null)[];
  /** 이 song에 속한 chart(1~5) 중 최댓값 — `updated` 정렬·groupBy용. */
  readonly updatedAt: string;
}

export interface SongChartInput {
  readonly songId: string;
  readonly chartId: number;
  readonly title: string;
  readonly musicBy: string;
  readonly category: string;
  readonly difficulty: Difficulty;
  readonly level: number;
  readonly updatedAt: string;
}

/**
 * 한 song의 chart 목록(init 포함)에서 row 하나를 만든다. init(`chartId 0`)이
 * 없으면(구조상 있어야 하는데 없는 경우) `null` — 방어적 처리다.
 */
export function buildSongRow(
  charts: readonly SongChartInput[],
  records: ReadonlyMap<string, ChartRecord>,
): SongRow | null {
  const init = charts.find((c) => c.chartId === 0);
  if (init === undefined) return null;

  const slots: (SlotView | null)[] = new Array(SLOTS_PER_ROW).fill(null);
  let updatedAt = init.updatedAt;

  for (const chart of charts) {
    if (chart.chartId < 1 || chart.chartId > SLOTS_PER_ROW) continue; // init 또는 chartId 6+(M4-4)
    const record = records.get(`${chart.songId}:${chart.chartId}`);
    const summary = record !== undefined ? deriveRecordSummary(record) : null;
    slots[chart.chartId - 1] = {
      chartId: chart.chartId,
      difficulty: chart.difficulty,
      level: chart.level,
      state: record?.bestState ?? 'N',
      score: summary?.score ?? null,
      rank: summary?.rank ?? null,
    };
    if (chart.updatedAt > updatedAt) updatedAt = chart.updatedAt;
  }

  return {
    songId: init.songId,
    title: init.title,
    musicBy: init.musicBy,
    category: init.category,
    slots,
    updatedAt,
  };
}

// ── category 탭 ([[song-select]] §2) ──────────────────────────────────

export const UNCATEGORIZED = 'Uncategorized';
export const ALL_CATEGORY = 'All';

/** `All`이 항상 첫 번째, `Uncategorized`가 항상 마지막. 그 사이는 등장
 *  순서(첫 발견 순)다 — 정렬 규칙이 스펙에 없어 안정적인 기본값을 쓴다. */
export function deriveCategoryTabs(rows: readonly SongRow[]): readonly string[] {
  const seen = new Set<string>();
  for (const row of rows) {
    if (row.category !== '') seen.add(row.category);
  }
  const hasUncategorized = rows.some((row) => row.category === '');
  return [ALL_CATEGORY, ...seen, ...(hasUncategorized ? [UNCATEGORIZED] : [])];
}

export function filterByCategory(rows: readonly SongRow[], tab: string): readonly SongRow[] {
  if (tab === ALL_CATEGORY) return rows;
  if (tab === UNCATEGORIZED) return rows.filter((row) => row.category === '');
  return rows.filter((row) => row.category === tab);
}

// ── sort ([[song-select]] §5) ──────────────────────────────────────────

export const SORT_KEYS = [
  'default',
  'title',
  'musicBy',
  'difficulty',
  'level',
  'score',
  'percent',
  'rank',
  'state',
] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export type SortDir = 'asc' | 'desc';

const STATE_ORDER: readonly SongSelectState[] = ['AS', 'AP', 'FC', 'H', 'C', 'F', 'N'];

function stateRank(state: SongSelectState): number {
  return STATE_ORDER.indexOf(state);
}

function rankRank(rank: Rank | null): number {
  if (rank === null) return RANK_TABLE.length; // 미기록이 최하단
  return RANK_TABLE.findIndex(([name]) => name === rank);
}

/** row가 표시하는 slot 중 축 기준 "최상위" 값 하나를 고른다(§5 "그 row가
 *  표시하는 slot 중 최상위 값을 row의 정렬값으로 삼는다"). 기록 없는
 *  slot(`N`)은 값 자체가 없는 취급이라 최상위 후보에서 제외한다 — 있으면
 *  항상 최하단(§5 "미플레이는 sortDir와 무관하게 항상 최하단")과 맞아야
 *  하므로, "최상위"를 고를 때도 무기록 slot이 섞여 엉뚱한 chart를 대표로
 *  뽑지 않게 한다. */
function bestSlot(row: SongRow, pick: (slot: SlotView) => number): SlotView | null {
  const filled = row.slots.filter((slot): slot is SlotView => slot !== null);
  if (filled.length === 0) return null;
  return filled.reduce((best, slot) => (pick(slot) > pick(best) ? slot : best));
}

/** 정렬값이 없으면(미기록 축에서 기록 없는 row) `null` — 항상 최하단으로
 *  보낸다. 오름차순이든 내림차순이든 이 규칙은 안 바뀐다(§5). */
function sortValue(row: SongRow, key: SortKey): string | number | null {
  switch (key) {
    case 'default':
      return null; // 안정 정렬로 원 순서 유지 — comparator에서 별도 처리
    case 'title':
      return row.title;
    case 'musicBy':
      return row.musicBy;
    case 'difficulty': {
      const slot = bestSlot(row, (s) => s.chartId);
      return slot?.chartId ?? null;
    }
    case 'level': {
      const slot = bestSlot(row, (s) => s.level);
      return slot?.level ?? null;
    }
    case 'score': {
      const slot = bestSlot(row, (s) => s.score ?? -Infinity);
      return slot?.score ?? null;
    }
    case 'percent': {
      // accuracy는 SlotView에 없다 — score와 동순위(같은 record에서 파생)라
      // score 기준으로 최상위 slot을 고른 뒤 그 slot의 score를 그대로
      // percent 정렬키로도 쓴다. 이 파일이 accuracy를 따로 안 들고 있어
      // 근사지만, "최상위 slot"을 고르는 목적(어느 slot이 대표인가)에는
      // score와 percent가 항상 같은 chart를 가리킨다(둘 다 같은 record의
      // 파생값이므로 대소 순서가 갈릴 수 있는 축이 아니다).
      const slot = bestSlot(row, (s) => s.score ?? -Infinity);
      return slot?.score ?? null;
    }
    case 'rank': {
      const slot = bestSlot(row, (s) => -rankRank(s.rank));
      return slot !== null ? -rankRank(slot.rank) : null;
    }
    case 'state': {
      const slot = bestSlot(row, (s) => -stateRank(s.state));
      return slot !== null ? -stateRank(slot.state) : null;
    }
  }
}

const RECORD_BASED_KEYS: readonly SortKey[] = ['score', 'percent', 'rank', 'state'];

export function sortRows(rows: readonly SongRow[], key: SortKey, dir: SortDir): readonly SongRow[] {
  const indexed = rows.map((row, index) => ({ row, index }));

  indexed.sort((a, b) => {
    if (key === 'default') return a.index - b.index; // library 추가순(입력 순서) 유지

    const va = sortValue(a.row, key);
    const vb = sortValue(b.row, key);

    // 기록 기반 축: 미기록은 sortDir 무관 항상 최하단(§5).
    if (RECORD_BASED_KEYS.includes(key)) {
      if (va === null && vb === null) return a.index - b.index;
      if (va === null) return 1;
      if (vb === null) return -1;
    }

    const cmp = va! < vb! ? -1 : va! > vb! ? 1 : 0;
    if (cmp !== 0) return dir === 'asc' ? cmp : -cmp;
    return a.index - b.index; // 동값은 default(원 순서)로 tie-break(§5)
  });

  return indexed.map((entry) => entry.row);
}

// ── groupBy — song 공통 축 3종만 ([[song-select]] §4) ──────────────────

/** 이번 범위에 구현한 groupBy 축 — `level`/`difficulty`/`state`/`rank`(chart
 *  분기 축)는 파일 머리말의 이유로 제외했다. */
export const GROUP_BY_AXES = ['none', 'updated', 'title'] as const;
export type GroupByAxis = (typeof GROUP_BY_AXES)[number];

export interface Folder {
  /** `groupBy: 'none'`이면 folder가 하나뿐이고 `label`이 빈 문자열이다
   *  (§4 "none이면 folder 없이 전체를 하나의 목록으로 표시한다"). */
  readonly label: string;
  readonly rows: readonly SongRow[];
  /** 이 folder 안에서 best state가 클리어(AS/AP/FC/H/C)인 chart 수 —
   *  헤더의 클리어 진척(§4 "클리어한 chart 수 / 전체")에 쓴다. slot
   *  단위로 센다(song 단위가 아니다 — 헤더 문구 자체가 "chart 수"). */
  readonly clearedCount: number;
  /** 이 folder에 속한 chart 전체 수(빈 슬롯 제외) — 진척의 분모. */
  readonly totalCount: number;
}

const CLEARED_STATES: ReadonlySet<SongSelectState> = new Set(['AS', 'AP', 'FC', 'H', 'C']);

function countProgress(rows: readonly SongRow[]): { cleared: number; total: number } {
  let cleared = 0;
  let total = 0;
  for (const row of rows) {
    for (const slot of row.slots) {
      if (slot === null) continue;
      total += 1;
      if (CLEARED_STATES.has(slot.state)) cleared += 1;
    }
  }
  return { cleared, total };
}

function groupKey(row: SongRow, axis: GroupByAxis): string {
  switch (axis) {
    case 'none':
      return '';
    case 'updated':
      return row.updatedAt.slice(0, 10); // 날짜 단위(§4 "updatedAt 날짜") — UTC 문자열 앞 10자.
    case 'title':
      return row.title.length > 0 ? row.title[0]!.toUpperCase() : '';
  }
}

/**
 * `rows`는 이미 원하는 `sortRows`를 거친 상태로 받는다 — 이 함수는 그
 * 순서를 보존하며 묶기만 한다. folder 사이의 순서는 각 folder의 첫 row가
 * 정렬돼 들어온 순서를 그대로 따른다(§4 "folder 사이의 순서는 축의 자연
 * 순서를 sortDir에 따라 적용한다"의 가장 단순한 구현 — 정렬된 rows를
 * 순서대로 훑으며 처음 보는 key마다 새 folder를 연다).
 */
export function groupRows(rows: readonly SongRow[], axis: GroupByAxis): readonly Folder[] {
  if (axis === 'none') {
    const { cleared, total } = countProgress(rows);
    return [{ label: '', rows, clearedCount: cleared, totalCount: total }];
  }

  const order: string[] = [];
  const buckets = new Map<string, SongRow[]>();
  for (const row of rows) {
    const key = groupKey(row, axis);
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key)!.push(row);
  }

  return order.map((key) => {
    const bucketRows = buckets.get(key)!;
    const { cleared, total } = countProgress(bucketRows);
    return { label: key, rows: bucketRows, clearedCount: cleared, totalCount: total };
  });
}

// ── cursor 이동 ([[song-select]] §7) ────────────────────────────────────
//
// 이 절은 M4-3 헤더 주석이 "cursor·page 상태가 있어야 의미가 생겨 M4-4
// 범위"라 미뤘던 chartId 6+ 페이지네이션은 여전히 다루지 않는다 — 가속
// 스크롤 수치와 함께 아직 열려 있는 M4-3 前 게이트("가속 스크롤 수치")가
// 페이지 전환 조작(마지막 slot에서 Right → 다음 페이지)의 세부까지
// 묶고 있어, 고정 슬롯 1~5(chartId 1~5)만 다룬다.

/** 화면에 보이는 row 배열(현재 category·sort·groupBy 적용 후) 안에서의
 *  좌표. `rowIndex`는 folder 구분과 무관하게 **평평하게 이어붙인** row
 *  목록 기준이다 — folder 접힘/펼침(아코디언, §4)은 이 파일이 다루지
 *  않는다: M4-3의 렌더가 애초에 접힘 상태를 구현하지 않아(커서가 없어
 *  의미가 없었음) 전체 row가 항상 펼쳐진 채로 렌더된다는 전제 위에서만
 *  좌표가 유효하다 — 아코디언 자체의 구현은 결정 필요 항목으로 별도
 *  보고한다. */
export interface CursorPosition {
  readonly rowIndex: number;
  readonly slotIndex: number;
}

/** 재정렬·재필터 후에도 살아남는 커서의 **정체성** — 좌표가 아니라
 *  chart다(§8 "변경 전 커서의 chart를 그대로 유지"). */
export interface CursorTarget {
  readonly songId: string;
  readonly chartId: number;
}

/** `[[song-select]]` §12 `viewState`의 전체 모양 — `game-viewstate.ts`(영속)와
 *  `scene-song-select.ts`(렌더) 둘 다 이 타입 하나를 쓴다(중복 정의 금지,
 *  `CLAUDE.md` §7). */
export type RecordCellMode = 'percent' | 'judge';

export interface SongSelectViewState {
  readonly category: string;
  readonly groupBy: GroupByAxis;
  readonly sortKey: SortKey;
  readonly sortDir: SortDir;
  readonly recordCellMode: RecordCellMode;
  readonly lastSelected: CursorTarget | null;
}

function firstFilledSlot(row: SongRow): number {
  return row.slots.findIndex((slot) => slot !== null);
}

/** 현재 row 목록에서 `target`이 가리키는 chart를 다시 찾는다. 못 찾으면
 *  (정렬·필터로 사라졌거나 `target`이 `null`) 목록 첫 항목으로 간다
 *  (§8 "그 chart가 현재 조건에서 사라지면 목록 첫 항목으로 간다"). row가
 *  아예 없으면 `null`. */
export function locateCursor(
  rows: readonly SongRow[],
  target: CursorTarget | null,
): CursorPosition | null {
  if (rows.length === 0) return null;

  if (target !== null) {
    const rowIndex = rows.findIndex((row) => row.songId === target.songId);
    if (rowIndex !== -1) {
      const slotIndex = rows[rowIndex]!.slots.findIndex((s) => s?.chartId === target.chartId);
      if (slotIndex !== -1) return { rowIndex, slotIndex };
    }
  }

  const slotIndex = firstFilledSlot(rows[0]!);
  return slotIndex === -1 ? null : { rowIndex: 0, slotIndex };
}

/** 좌표를 다시 chart 정체성으로 되돌린다 — 위치가 가리키는 slot이 비어
 *  있거나(있어선 안 되지만 방어적으로) row 범위를 벗어나면 `null`. */
export function cursorTarget(
  rows: readonly SongRow[],
  position: CursorPosition,
): CursorTarget | null {
  const row = rows[position.rowIndex];
  const slot = row?.slots[position.slotIndex];
  if (row === undefined || slot === undefined || slot === null) return null;
  return { songId: row.songId, chartId: slot.chartId };
}

/** 같은 row 안에서 slot을 좌우로 옮긴다. 빈 슬롯에는 커서가 들어갈 수
 *  없어(§3) 다음 채워진 슬롯까지 건너뛴다. row 끝에서는 그대로 멈춘다 —
 *  다음 페이지로 넘어가는 동작(§3)은 페이지네이션과 함께 미룬다(파일
 *  머리말 참조). */
export function moveCursorHorizontal(
  rows: readonly SongRow[],
  position: CursorPosition,
  direction: -1 | 1,
): CursorPosition {
  const slots = rows[position.rowIndex]?.slots;
  if (slots === undefined) return position;

  for (let i = position.slotIndex + direction; i >= 0 && i < slots.length; i += direction) {
    if (slots[i] !== null) return { rowIndex: position.rowIndex, slotIndex: i };
  }
  return position;
}

/** 이웃 row로 옮긴다. 열 대응 규칙(§7): (1) 같은 열에 chart가 있으면
 *  그 slot, (2) 없으면 더 낮은 열 중 가장 가까운 slot, (3) 그것도
 *  없으면 더 높은 열 중 가장 가까운 slot. 직전 열을 따로 기억하지
 *  않는다 — 이동 결과 열이 곧 다음 이동의 기준이다. 목록 끝에서는
 *  그대로 멈춘다. */
export function moveCursorVertical(
  rows: readonly SongRow[],
  position: CursorPosition,
  direction: -1 | 1,
): CursorPosition {
  const targetRow = position.rowIndex + direction;
  if (targetRow < 0 || targetRow >= rows.length) return position;

  const slots = rows[targetRow]!.slots;
  if (slots[position.slotIndex] !== null) {
    return { rowIndex: targetRow, slotIndex: position.slotIndex };
  }
  for (let i = position.slotIndex - 1; i >= 0; i--) {
    if (slots[i] !== null) return { rowIndex: targetRow, slotIndex: i };
  }
  for (let i = position.slotIndex + 1; i < slots.length; i++) {
    if (slots[i] !== null) return { rowIndex: targetRow, slotIndex: i };
  }
  return { rowIndex: targetRow, slotIndex: position.slotIndex }; // 방어적 — 유효한 row는 slot이 최소 1개.
}

// ── search ([[song-select]] §6) ─────────────────────────────────────────
//
// 대상 필드는 `title`·`musicBy`만이다 — 스펙(§6)은 `subtitle`도 대상으로
// 넣지만, `subtitle`은 chart(slot) 필드지 song(row) 필드가 아니고 M4-3의
// row 모델은 chartId 6+(subtitle이 있는 추가 chart, [[cfx]] §4)를 아예
// 싣지 않는다(파일 머리말 — 페이지네이션과 함께 미룸). `subtitle` 매칭은
// 그 작업이 들어올 때 같이 추가한다 — 결정 필요 항목으로 별도 보고.

function normalizeForSearch(text: string): string {
  return text.normalize('NFC').toLowerCase();
}

/** §6 매칭 규칙: 대소문자 무시, NFC 정규화 후 (1) 공백으로 나눈 모든
 *  낱말이 각각 어느 대상 필드에든 포함되거나(AND, 낱말마다 다른 필드여도
 *  됨), (2) 공백을 제거한 검색어가 공백을 제거한 대상 필드에 포함되면
 *  매치. 빈 검색어는 전부 매치(idle 상태). */
export function matchesSearch(row: SongRow, rawQuery: string): boolean {
  const query = normalizeForSearch(rawQuery).trim();
  if (query === '') return true;

  const fields = [row.title, row.musicBy].map(normalizeForSearch);

  const words = query.split(/\s+/).filter((w) => w.length > 0);
  const allWordsMatchSomeField = words.every((w) => fields.some((f) => f.includes(w)));

  const strippedQuery = query.replace(/\s+/g, '');
  const strippedFieldMatch = fields.some((f) => f.replace(/\s+/g, '').includes(strippedQuery));

  return allWordsMatchSomeField || strippedFieldMatch;
}

export function filterBySearch(rows: readonly SongRow[], query: string): readonly SongRow[] {
  return rows.filter((row) => matchesSearch(row, query));
}
