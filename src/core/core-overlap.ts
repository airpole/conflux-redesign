/**
 * 겹침 검출 — overlap / conflict.
 *
 * 정의는 `core/data-model.md` §5.1이다. 여기는 그 구조의 코드 표현이다.
 *
 * **캐시가 없다.** 원본은 `defineCache('noteOverlapMap', ['notes'], …)`로 무효화를
 * 관리했지만, 여기서는 `buildOverlapMap(notes)`가 결과를 한 번 만들고 소비자가
 * 그것을 인자로 받는다 — `buildTimeline`과 같은 형태다(D-2026-037).
 *
 * **judge는 이 모듈을 모른다**(`core/judge.md` §11). 검출은 chart notes만 보는
 * 순수 계산이고, 표시(색·z-order)는 render, 삭제 실행은 editor 소관이다.
 *
 * 노트를 **순번**으로 가리킨다. 영속 note ID가 없고(`data-model` §5), notes 배열
 * 순서가 곧 배치 순서라 순번이 이미 도메인 값이기 때문이다.
 */

import { LANE_CAPACITY, OVERLAP_LANES, TOTAL_KEYS } from './core-constants.js';
import type { Lane, Note } from './core-chart.js';

// ── 표시 ────────────────────────────────────────────────────

/**
 * 노트 하나에 붙는 표시.
 *
 * `conflict`는 나머지를 덮는다 — 세부 분류(`merged`/`hidden`/`yellow`/`clipped`)는
 * **정확히 2겹에서만** 생기고, 3겹부터는 conflict가 가져간다. 그래서 세부 분류가
 * 쌍 단위 개념으로 닫히고 n-way 규칙이 필요 없다.
 */
export type OverlapMark =
  /** 칠 수 없는 배치. 흰 채움 + 빨간 경고 테두리. */
  | { readonly kind: 'conflict' }
  /** 활성구간이 완전히 같은 2겹 중 배치가 이른 쪽. 이 한 장만 그린다. */
  | { readonly kind: 'merged' }
  /** 같은 쌍의 늦은 쪽. 그리지 않는다. */
  | { readonly kind: 'hidden' }
  /** 부분 겹침에서 노랗게 칠할 쪽. 구간은 tick이다 — px는 render가 만든다. */
  | {
      readonly kind: 'yellow';
      readonly yellowStart: number;
      readonly yellowEnd: number;
      /** 겹침부가 이 노트 전체를 덮는가. */
      readonly fullYellow: boolean;
    }
  /** 부분 겹침에서 흰 몸통이 가려지는 쪽. Hold일 때만 나온다. */
  | { readonly kind: 'clipped'; readonly clipStart: number; readonly clipEnd: number };

// ── conflict group ──────────────────────────────────────────

/** 로컬 = 한 풀의 capacity 초과. global = 물리 키 총수요 초과. */
export type ConflictScope = 'local' | 'global';

/**
 * 칠 수 없는 순간 하나와 거기 기여한 노트 전체.
 *
 * `excess`를 검출 쪽이 함께 내는 이유: capacity 규칙이 core와 editor 두 곳에
 * 살면 화면에 빨간 노트가 3장 보이는데 삭제는 1장만 되는 식으로 어긋난다.
 * group을 **내는 것**까지가 domain이고 **지우는 것**은 `editor-editing` §1이다.
 */
export interface ConflictGroup {
  readonly scope: ConflictScope;
  /** 초과가 관측된 tick. */
  readonly tick: number;
  /** 그 tick에 활성인 노트의 순번. 오름차순. */
  readonly noteIndices: readonly number[];
  /** 몇 장이 넘치는가. 로컬은 `활성 수 − capacity`, global은 `총수요 − 6`. */
  readonly excess: number;
}

/** `buildOverlapMap`의 결과. */
export interface NoteOverlapMap {
  /** notes와 같은 길이·같은 순번. 겹치지 않은 노트는 `null`. */
  readonly marks: readonly (OverlapMark | null)[];
  readonly conflicts: readonly ConflictGroup[];
}

// ── 풀 ──────────────────────────────────────────────────────

/** lane 1~4 각각과 Wide, 5개. 풀끼리는 키 집합이 서로소다. */
type PoolId = Lane | 'wide';

const POOLS: readonly PoolId[] = [1, 2, 3, 4, 'wide'];

/** Wide 수요는 언제나 최대 1이다(`judge` §5 — WideHold는 단일 소유). */
const WIDE_CAPACITY = 1;

function poolOf(note: Note): PoolId {
  return note.isWide ? 'wide' : note.lane;
}

function capacityOf(pool: PoolId): number {
  return pool === 'wide' ? WIDE_CAPACITY : LANE_CAPACITY[pool];
}

// ── 활성 ────────────────────────────────────────────────────

/**
 * tick `t`에서 노트가 활성인가 — Tap은 `startTick == t`, Hold는
 * `startTick <= t < startTick + duration`이다.
 *
 * Hold가 **끝나는** tick은 이미 활성이 아니다 `[보존]`. 같은 tick에서 tail이 먼저
 * 빠지고 그다음 head가 평가되는 것(`judge` §7)은 별도 규칙이 아니라 이 정의의
 * 귀결이다 — 순서를 따로 못박지 않는다.
 */
export function isActiveAt(note: Note, tick: number): boolean {
  if (note.duration > 0) return note.startTick <= tick && tick < note.startTick + note.duration;
  return note.startTick === tick;
}

/** 활성구간의 끝. Tap은 시작과 같다. */
function endOf(note: Note): number {
  return note.duration > 0 ? note.startTick + note.duration : note.startTick;
}

/**
 * 이 노트가 더 이상 활성이 아니게 되는 조건.
 *
 * Hold는 `t >= end`, Tap은 `t > start`다. 두 조건이 갈리므로 만료 목록을
 * `(끝, Hold 먼저)`로 정렬해 둔다 — 같은 tick에 끝나는 Hold와 그 tick의 Tap이
 * 섞여도 포인터가 멈추지 않는다.
 */
function hasExpired(end: number, isHold: boolean, tick: number): boolean {
  return isHold ? end <= tick : end < tick;
}

// ── 검출 ────────────────────────────────────────────────────

interface Entry {
  readonly index: number;
  readonly note: Note;
  readonly pool: PoolId;
  readonly end: number;
  readonly isHold: boolean;
}

/**
 * notes에서 표시와 conflict group을 만든다.
 *
 * 활성 집합은 노트의 `startTick`에서만 커지므로, 서로 다른 `startTick` 전부에서만
 * 검사하면 충분하다 — 그 사이는 볼 필요가 없다. sweep은 이것을 O(n log n)으로
 * 계산하는 방법이지 정의가 아니다.
 *
 * notes를 mutate하지 않는다.
 */
export function buildOverlapMap(notes: readonly Note[]): NoteOverlapMap {
  const marks: (OverlapMark | null)[] = notes.map(() => null);
  if (notes.length < 2) return { marks, conflicts: [] };

  const entries: Entry[] = notes.map((note, index) => ({
    index,
    note,
    pool: poolOf(note),
    end: endOf(note),
    isHold: note.duration > 0,
  }));

  const conflicts = detectConflicts(entries);
  classifyPairs(entries, marks);

  // conflict가 세부 분류를 덮는다. 마지막에 한 번에 걸어 순서 의존을 없앤다.
  for (const group of conflicts) {
    for (const index of group.noteIndices) marks[index] = { kind: 'conflict' };
  }
  return { marks, conflicts };
}

/** 검사 지점마다 풀별 활성 수를 세어 로컬·global 초과를 잡는다. */
function detectConflicts(entries: readonly Entry[]): ConflictGroup[] {
  const byStart = [...entries].sort((a, b) => a.note.startTick - b.note.startTick);
  // Hold를 먼저 두어, 같은 tick에 끝나는 Hold가 그 tick의 Tap 뒤에 갇히지 않게 한다.
  const byEnd = [...entries].sort((a, b) => a.end - b.end || Number(b.isHold) - Number(a.isHold));

  const active = new Map<PoolId, Set<number>>(POOLS.map((pool) => [pool, new Set<number>()]));
  const conflicts: ConflictGroup[] = [];
  let startAt = 0;
  let endAt = 0;

  for (const tick of [...new Set(entries.map((entry) => entry.note.startTick))].sort(
    (a, b) => a - b,
  )) {
    while (endAt < byEnd.length && hasExpired(byEnd[endAt]!.end, byEnd[endAt]!.isHold, tick)) {
      const entry = byEnd[endAt]!;
      active.get(entry.pool)!.delete(entry.index);
      endAt += 1;
    }
    while (startAt < byStart.length && byStart[startAt]!.note.startTick === tick) {
      const entry = byStart[startAt]!;
      active.get(entry.pool)!.add(entry.index);
      startAt += 1;
    }

    let total = 0;
    for (const pool of POOLS) {
      const set = active.get(pool)!;
      total += set.size;

      const excess = set.size - capacityOf(pool);
      if (excess > 0) {
        conflicts.push({ scope: 'local', tick, noteIndices: sorted(set), excess });
      }
    }

    // 로컬을 모두 통과해도 손가락이 모자란 배치(예: 1+2+2+1+1=7)를 여기서 잡는다.
    if (total > TOTAL_KEYS) {
      const union = new Set<number>();
      for (const pool of POOLS) for (const index of active.get(pool)!) union.add(index);
      conflicts.push({
        scope: 'global',
        tick,
        noteIndices: sorted(union),
        excess: total - TOTAL_KEYS,
      });
    }
  }
  return conflicts;
}

function sorted(set: ReadonlySet<number>): number[] {
  return [...set].sort((a, b) => a - b);
}

/**
 * 2겹 쌍의 세부 분류.
 *
 * 3겹부터는 conflict가 덮으므로 실제로 남는 것은 lane 2·3뿐이지만(다른 풀은 2겹이
 * 곧 conflict), 분류는 모든 풀에 같은 규칙으로 돌리고 덮어쓰기를 `buildOverlapMap`이
 * 맡는다 — 어느 풀에 적용되는지를 여기서 다시 판단하지 않는다.
 *
 * 한 노트가 서로 다른 두 쌍에 낄 수 있다. 이때 **먼저 만난 쌍의 표시가 남는다**
 * `[보존]` — 쌍은 `(startTick, duration, 배치 순서)` 정렬로 훑는다.
 */
function classifyPairs(entries: readonly Entry[], marks: (OverlapMark | null)[]): void {
  for (const pool of POOLS) {
    const pooled = entries
      .filter((entry) => entry.pool === pool)
      .sort(
        (a, b) =>
          a.note.startTick - b.note.startTick ||
          a.note.duration - b.note.duration ||
          a.index - b.index,
      );

    for (let i = 0; i < pooled.length; i += 1) {
      const a = pooled[i]!;

      for (let j = i + 1; j < pooled.length; j += 1) {
        const b = pooled[j]!;
        // 정렬돼 있으므로 b가 a의 끝을 넘어서면 그 뒤도 전부 넘어선다.
        if (b.note.startTick > a.end) break;
        if (!overlaps(a, b)) continue;

        if (a.note.startTick === b.note.startTick && a.note.duration === b.note.duration) {
          marks[a.index] ??= { kind: 'merged' };
          marks[b.index] ??= { kind: 'hidden' };
          continue;
        }
        markPartial(a, b, marks);
      }
    }
  }
}

/** 두 노트가 동시에 활성인 tick이 있는가. */
function overlaps(a: Entry, b: Entry): boolean {
  if (a.isHold && b.isHold) return a.note.startTick < b.end && b.note.startTick < a.end;
  if (a.isHold) return isActiveAt(a.note, b.note.startTick);
  if (b.isHold) return isActiveAt(b.note, a.note.startTick);
  return a.note.startTick === b.note.startTick;
}

/** 부분 겹침 — 늦게 시작한 쪽이, 시작이 같으면 짧은 쪽이 노랑이다. */
function markPartial(a: Entry, b: Entry, marks: (OverlapMark | null)[]): void {
  // 정렬 덕분에 a가 먼저 시작하거나(다르면), 시작이 같으면 a가 더 짧다.
  const yellow = a.note.startTick === b.note.startTick ? a : b;
  const white = yellow === a ? b : a;

  const overlapStart = Math.max(a.note.startTick, b.note.startTick);
  const overlapEnd = Math.min(a.end, b.end);

  marks[yellow.index] ??= {
    kind: 'yellow',
    yellowStart: overlapStart,
    yellowEnd: overlapEnd,
    fullYellow: overlapStart <= yellow.note.startTick && overlapEnd >= yellow.end,
  };
  if (white.isHold) {
    marks[white.index] ??= { kind: 'clipped', clipStart: overlapStart, clipEnd: overlapEnd };
  }
}

/** lane 2·3만 2겹을 허용한다 — `data-model` §5.1 표의 코드 표현. */
export function allowsOverlap(lane: Lane): boolean {
  return (OVERLAP_LANES as readonly number[]).includes(lane);
}
