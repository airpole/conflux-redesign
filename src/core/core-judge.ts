/**
 * 입력 판정의 구현 — 후보 선택·판정창·lane 매칭·mirror·`commitJudgment`·Hold 소유.
 *
 * 정의의 단일 출처는 `core/judge.md`다. 여기는 그 §1~§9의 코드 표현이며,
 * mid-start 시드·Resume 재조정(§10)과 global 6키 conflict는 M1-6의 자리다.
 *
 * 네 가지가 구조로 못 박혀 있다:
 *
 * - **judge는 아무것도 호출하지 않는다.** 게이지도 render도 import하지 않고,
 *   판정 결과를 `JudgmentEvent[]`로 **반환만** 한다(D-2026-038 J-4). 게이지가
 *   붙는 M1-7은 이 파일을 열지 않는다.
 * - **`visualOffset`은 진입 경계에서 한 번만** 걸린다(§1). 내부 함수는
 *   `visualOffset`을 인자로 받지 않으므로 두 번 걸릴 자리가 없고, keydown만
 *   보정하는 오류(§1이 직접 짚은 자리)가 구조적으로 불가능하다. 프레임 진행도
 *   `judgeAdvance`라는 같은 형태의 경계를 지난다(D-2026-039).
 * - **노트 정체성은 파생 표의 인덱스**다. 영속 note ID는 없다(§1) — 판정에
 *   관련된 속성이 같은 노트는 서로 교환 가능하다.
 * - **누적은 judge가 갖지 않는다.** score·accuracy·게이지가 같은 단위를 쓴다는
 *   계약(대장 GA-5)의 실체는 이벤트의 `units`이며, judge가 합계를 따로 들면
 *   두 수가 어긋날 자리가 생긴다. `combo`/`maxCombo`만 판정 중 직접 쓰므로 남는다.
 */

import {
  HOLD_RELEASE_WINDOW_MS,
  WINDOW_GOOD_MS,
  WINDOW_PERFECT_MS,
  WINDOW_SYNC_MS,
  WINDOW_WIDE_SYNC_MS,
} from './core-constants.js';
import type { Chart, Lane, Note } from './core-chart.js';
import { laneOf, type LaneKeyId } from './core-settings.js';
import { tickToMs, type Timeline } from './core-timing.js';

/** lane 1~4. 순회 순서를 한 곳에 둔다. */
const LANES: readonly Lane[] = [1, 2, 3, 4];

// ── lane 매핑 ───────────────────────────────────────────────

/** mirror 교환 규칙 `1↔4, 2↔3`(고정) `[보존]`. → `judge.md` §3 */
export const MIRROR_LANE_MAP: Readonly<Record<Lane, Lane>> = {
  1: 4,
  2: 3,
  3: 2,
  4: 1,
};

/** mirror가 꺼져 있으면 `null`. 곡 중에 바뀌지 않지만 표에 굽지 않는다(J-5). */
export type LaneMap = Readonly<Record<Lane, Lane>> | null;

export function laneMapOf(mirror: boolean): LaneMap {
  return mirror ? MIRROR_LANE_MAP : null;
}

/**
 * 노트를 어느 lane의 키가 칠 수 있는가. `null`이면 **아무 키나** 친다.
 *
 * wide는 map을 무시한다(§3) — 아무 키로 치므로 미러가 의미를 갖지 않는다.
 * 미러가 shape 렌더를 좌우 반전하는 것은 render 소관이고, judge는 입력 매핑만 안다.
 *
 * Hold 수요(§5)도 이 lane을 쓴다 — 수요는 "그 노트를 실제로 누르고 있는 손가락"의
 * 문제이므로 미러가 켜지면 매핑된 lane의 키가 그 Hold를 지탱한다.
 */
export function judgeLaneOf(note: Note, laneMap: LaneMap): Lane | null {
  if (note.isWide) return null;
  return laneMap ? laneMap[note.lane] : note.lane;
}

// ── 판정 ────────────────────────────────────────────────────

export const JUDGMENTS = ['SYNC', 'PERFECT', 'GOOD', 'MISS'] as const;
export type Judgment = (typeof JUDGMENTS)[number];

/**
 * 판정 단위의 종류(§8). Tap은 1단위, Hold는 head + tail 2단위다.
 *
 * judge는 표시를 모르지만 **어느 단위인지는 싣는다** — 원본에서 tail 성공은 화면에
 * 아무것도 띄우지 않고 중간 릴리즈만 MISS를 띄웠는데(`play-judgment.js`
 * `applyTailSuccess`/`applyMidRelease` 실측), 그 규칙을 render가 재현하려면 이 표시가
 * 필요하다. 게이지는 `judgment`와 `units`만 읽으면 된다.
 */
export type JudgmentPart = 'tap' | 'head' | 'tail';

/**
 * `abs(diff)` 임계로 판정을 고른다. wide는 창(±100) 안이면 **항상 SYNC**다(§2).
 * 경계는 포함이다 — `abs == 100`이면 유효하다.
 */
export function judgmentOf(diff: number, isWide: boolean): Judgment {
  const abs = Math.abs(diff);
  if (isWide) return abs <= WINDOW_WIDE_SYNC_MS ? 'SYNC' : 'MISS';
  if (abs <= WINDOW_SYNC_MS) return 'SYNC';
  if (abs <= WINDOW_PERFECT_MS) return 'PERFECT';
  if (abs <= WINDOW_GOOD_MS) return 'GOOD';
  return 'MISS';
}

/** 그 노트의 후보 자격 창(ms). normal·wide 둘 다 100이지만 근거가 다르다(§2). */
function windowOf(note: Note): number {
  return note.isWide ? WINDOW_WIDE_SYNC_MS : WINDOW_GOOD_MS;
}

/**
 * 판정 시각 보정. 바깥이 raw 시각을 주면 여기서 한 번 바꾸고, 그 뒤 judge 내부의
 * 모든 `nowMs`는 이미 보정된 값이다(§1) — keydown과 keyup/tail 분류가 같은
 * 보정 시계를 쓴다는 요구가 "규율"이 아니라 **호출 구조**가 된다. (설계 대장 JD-8)
 */
export function toJudgeMs(rawMs: number, visualOffset: number): number {
  return rawMs - visualOffset;
}

// ── 파생 노트 표 ────────────────────────────────────────────

/**
 * 판정용으로 가공한 노트 하나. `index`가 이 세션의 정체성이다 — 영속 ID가 아니다.
 *
 * 표 자체는 chart·timeline에서만 나오는 **불변** 파생물이고, 진행 상태(`hits`)는
 * `JudgeState`의 나란한 배열에 산다. 상태를 표에 넣으면 "표를 다시 만들면 판이
 * 리셋된다"가 되어, `buildTimeline`과 같은 성질(언제 다시 만들어도 안전)을 잃는다.
 */
export interface JudgeNote {
  readonly note: Note;
  readonly index: number;
  readonly startMs: number;
  /** tap이면 `startMs`와 같다. */
  readonly tailMs: number;
  /** 이 시각을 **지나야** 만료된다(§2). */
  readonly deadlineMs: number;
}

export interface JudgeNotes {
  /** 후보 순서(§1)로 정렬돼 있다. 앞에서부터 처음 맞는 것이 답이다. */
  readonly ordered: readonly JudgeNote[];
  /** 같은 객체를 원본 `notes` 인덱스로 본 것. 활성 Hold를 인덱스로 들고 다니므로 필요하다. */
  readonly byIndex: readonly JudgeNote[];
}

/**
 * 후보 순서 `[번복]` (§1, D-2026-024):
 *
 * ```text
 * earliest startTick
 * → 같은 startTick: normal이 wide보다 우선
 * → 같은 풀·같은 startTick: hold가 tap보다 우선
 * → 같은 startTick의 hold끼리: tail이 이른 쪽 우선
 * → 전부 같으면: 동등하므로 아무거나
 * ```
 *
 * normal/wide를 **분리 풀**로 두고 `bestNormal ?? bestWide`로 고르던 구 방식은
 * 폐기했다 — 같은 창 안에서 더 이른 wide가 더 늦은 normal을 이긴다. (설계 대장 JD-1)
 */
function compareCandidates(a: JudgeNote, b: JudgeNote): number {
  if (a.note.startTick !== b.note.startTick) return a.note.startTick - b.note.startTick;
  if (a.note.isWide !== b.note.isWide) return a.note.isWide ? 1 : -1;

  const aHold = a.note.duration > 0;
  const bHold = b.note.duration > 0;
  if (aHold !== bHold) return aHold ? -1 : 1;

  if (a.tailMs !== b.tailMs) return a.tailMs - b.tailMs;
  return a.index - b.index;
}

/**
 * chart에서 판정용 파생 표를 만든다. `buildTimeline`과 같은 형태로, 이후 함수는
 * 이것을 인자로 받는다(J-3). tick→ms 변환이 노트당 정확히 한 번만 일어난다.
 */
export function buildJudgeNotes(chart: Pick<Chart, 'notes'>, timeline: Timeline): JudgeNotes {
  const byIndex = chart.notes.map((note, index) => {
    const startMs = tickToMs(timeline, note.startTick);
    return {
      note,
      index,
      startMs,
      tailMs: note.duration > 0 ? tickToMs(timeline, note.startTick + note.duration) : startMs,
      deadlineMs: startMs + windowOf(note),
    } satisfies JudgeNote;
  });

  return { ordered: [...byIndex].sort(compareCandidates), byIndex };
}

// ── 상태 ────────────────────────────────────────────────────

/** 노트별 진행. `pending`만 후보가 된다(§3). head가 확정되면 그 자리에서 벗어난다. */
export type NoteStatus = 'pending' | 'hit' | 'missed';

/**
 * 판정 진행 상태. **가변 객체**이며 모든 연산이 첫 인자로 받는다(J-2) —
 * 숨은 모듈 전역은 두지 않는다. 판정은 프레임마다 도는 최내곽 루프라 매 입력마다
 * 상태를 복사하지 않고, §6의 불변식은 복사 대신 `heldCapacityViolations`로 지킨다.
 *
 * 필드 이름의 단일 출처는 `core/naming.md` §4다.
 */
export interface JudgeState {
  /** note별 판정 상태. `JudgeNotes.ordered`가 아니라 **원본 `notes` 인덱스**로 읽는다. */
  hits: NoteStatus[];
  combo: number;
  maxCombo: number;

  /** 눌린 lane 키 집합(§5). 물리 키는 실제 keyup 전까지 남는다. */
  keysHeld: Set<LaneKeyId>;
  /** Wide owner 이양 판정용 keydown 순번 — 큰 쪽이 최근이다(§6). */
  keyPressSerial: Map<LaneKeyId, number>;
  nextPressSerial: number;

  /** head-hit·tail-미확정 Normal Hold의 note index. lane별로 **tail 이른 순** 정렬(§5). */
  activeNormalHolds: Record<Lane, number[]>;
  /** 현재 활성 WideHold의 note index 또는 `null`. 유효한 chart에서 최대 1개다. */
  activeWideHold: number | null;
  /** `activeWideHold`를 담당하는 물리 key 또는 `null`. 중복 소유는 금지된다. */
  wideOwnerKey: LaneKeyId | null;

  /** `advanceJudgmentStateTo`가 마지막으로 진행시킨 시각(보정된 시계). */
  nowMs: number;
}

export function createJudgeState(notes: JudgeNotes): JudgeState {
  return {
    hits: new Array<NoteStatus>(notes.byIndex.length).fill('pending'),
    combo: 0,
    maxCombo: 0,
    keysHeld: new Set<LaneKeyId>(),
    keyPressSerial: new Map<LaneKeyId, number>(),
    nextPressSerial: 0,
    activeNormalHolds: { 1: [], 2: [], 3: [], 4: [] },
    activeWideHold: null,
    wideOwnerKey: null,
    nowMs: Number.NEGATIVE_INFINITY,
  };
}

// ── 이벤트 ──────────────────────────────────────────────────

/**
 * judge의 **유일한 출력**이다. 게이지·이펙트·표시 큐는 이 열을 소비하는 바깥이
 * 맡는다(§11, J-4) — judge는 그들이 존재하는지도 모른다.
 *
 * `units`는 회계 단위 수다(§8). Tap·head·tail은 1, Hold head MISS만 2다 —
 * head를 놓치면 tail이 성립할 수 없어 두 단위가 그 자리에서 함께 종결된다.
 * score·accuracy·게이지가 **같은 단위**를 쓴다(설계 대장 GA-5).
 */
export type JudgmentEvent =
  | {
      readonly kind: 'judged';
      readonly judgment: Judgment;
      readonly part: JudgmentPart;
      readonly noteIndex: number;
      readonly note: Note;
      /** head는 `nowMs − startMs`, tail은 `nowMs − tailMs`(부호 있음). */
      readonly diff: number;
      readonly units: number;
    }
  | { readonly kind: 'comboReset' }
  | {
      readonly kind: 'holdOpened';
      readonly noteIndex: number;
      readonly tailMs: number;
    }
  | {
      readonly kind: 'fastSlow';
      readonly side: 'FAST' | 'SLOW';
      readonly diff: number;
    };

// ── 후보 선택 ───────────────────────────────────────────────

export interface CandidateContext {
  readonly notes: JudgeNotes;
  readonly laneMap: LaneMap;
}

/** 그 키로 그 노트를 칠 수 있나(§3). wide는 `judgeLane`이 `null`이라 항상 참이다. */
function laneMatches(entry: JudgeNote, inputLane: Lane, laneMap: LaneMap): boolean {
  const judgeLane = judgeLaneOf(entry.note, laneMap);
  return judgeLane === null || judgeLane === inputLane;
}

/**
 * 한 번의 keydown이 집을 노트 하나. 없으면 `null`.
 *
 * 후보 순서(§1)로 정렬된 표를 앞에서부터 훑어 **처음 자격을 갖춘 것**을 고른다 —
 * 한 번의 keydown은 head를 최대 하나만 확정한다. 이미 활성 Hold인 노트는 head가
 * `hit`이라 자연히 빠진다(§3).
 */
export function selectCandidate(
  state: JudgeState,
  context: CandidateContext,
  key: LaneKeyId,
  nowMs: number,
): JudgeNote | null {
  const inputLane = laneOf(key);

  for (const entry of context.notes.ordered) {
    if (state.hits[entry.index] !== 'pending') continue;
    if (Math.abs(nowMs - entry.startMs) > windowOf(entry.note)) continue;
    if (!laneMatches(entry, inputLane, context.laneMap)) continue;
    return entry;
  }
  return null;
}

// ── Hold 수요 (§5) ──────────────────────────────────────────

/** 그 lane에 속한 눌린 키 개수. lane 1·4는 최대 1, lane 2·3은 최대 2다. */
export function heldCount(state: JudgeState, lane: Lane): number {
  let count = 0;
  for (const key of state.keysHeld) if (laneOf(key) === lane) count += 1;
  return count;
}

/** 그 lane이 요구하는 손가락 수 = 활성 Normal Hold 개수. 익명 수요다 — 특정 키가 아니다. */
export function normalDemand(state: JudgeState, lane: Lane): number {
  return state.activeNormalHolds[lane].length;
}

/**
 * 그 키를 Wide에 내주고도 같은 lane의 Normal 수요가 충족되나(§5).
 * Normal 수요가 **항상** Wide 소유보다 우선한다.
 */
function eligibleForWide(state: JudgeState, key: LaneKeyId): boolean {
  const lane = laneOf(key);
  return heldCount(state, lane) - 1 >= normalDemand(state, lane);
}

/** 활성 Normal Hold 목록을 tail 이른 순으로 유지한다 — shortage 해소가 앞에서 꺼내면 된다. */
function insertByTail(context: CandidateContext, list: number[], index: number): void {
  const tailMs = context.notes.byIndex[index]!.tailMs;
  let at = list.length;
  while (at > 0 && context.notes.byIndex[list[at - 1]!]!.tailMs > tailMs) at -= 1;
  list.splice(at, 0, index);
}

// ── 확정 (§4) ───────────────────────────────────────────────

function bumpCombo(state: JudgeState): void {
  state.combo += 1;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
}

function resetCombo(state: JudgeState, events: JudgmentEvent[]): void {
  if (state.combo === 0) return;
  state.combo = 0;
  events.push({ kind: 'comboReset' });
}

/**
 * 후보 하나를 확정한다(§4). 게이지를 호출하지 않고 이펙트를 만들지 않으며,
 * `above/below`를 싣지 않는다 `[수정]` — 겹침 검출은 domain, 시각 분리는 render다
 * (설계 대장 JD-3·JD-4).
 *
 * Hold head는 활성 Hold로 등록만 하고 tail은 미확정으로 둔다(§5). 등록 뒤의
 * 수요 재조정은 호출자(`judgeKeyDown`)가 `reconcileHeldCapacity`로 수행한다.
 */
export function commitJudgment(
  state: JudgeState,
  context: CandidateContext,
  entry: JudgeNote,
  nowMs: number,
): JudgmentEvent[] {
  const diff = nowMs - entry.startMs;
  const judgment = judgmentOf(diff, entry.note.isWide);
  const isHold = entry.note.duration > 0;
  const events: JudgmentEvent[] = [];

  state.hits[entry.index] = 'hit';
  bumpCombo(state);

  events.push({
    kind: 'judged',
    judgment,
    part: isHold ? 'head' : 'tap',
    noteIndex: entry.index,
    note: entry.note,
    diff,
    units: 1,
  });

  if (isHold) {
    events.push(...openHold(state, context, entry, nowMs));
  }

  // Fast/Slow: normal head만, SYNC·wide 제외 `[보존]` (§4.6).
  // `diff < 0` FAST / `> 0` SLOW. 누적은 이벤트를 받는 쪽이 갖는다 — 순간 깜빡
  // (`flashTiming`)도 세션 누적(`fastCount`/`slowCount`)도 표시 레이어의 몫이다.
  if (!entry.note.isWide && judgment !== 'SYNC' && diff !== 0) {
    events.push({ kind: 'fastSlow', side: diff < 0 ? 'FAST' : 'SLOW', diff });
  }

  return events;
}

/** Hold head가 확정됐을 때 활성 Hold로 등록한다(§5). */
function openHold(
  state: JudgeState,
  context: CandidateContext,
  entry: JudgeNote,
  nowMs: number,
): JudgmentEvent[] {
  const events: JudgmentEvent[] = [];
  const lane = judgeLaneOf(entry.note, context.laneMap);

  if (lane === null) {
    // WideHold — 소유는 하나뿐이다. 유효한 chart에는 활성 WideHold가 최대 1개이므로
    // 여기 걸리는 것은 무효 chart의 중복 Wide뿐이고, 그때는 tail이 늦은 쪽이 미해소분이
    // 되어 즉시 MISS된다(§12). crash하거나 중복 소유를 만들지 않는다.
    const previous = state.activeWideHold;
    if (previous !== null) {
      const loser =
        context.notes.byIndex[previous]!.tailMs <= entry.tailMs ? entry.index : previous;
      const keep = loser === previous ? entry.index : previous;
      state.activeWideHold = keep;
      events.push(...closeTail(state, context, loser, nowMs, 'MISS'));
    } else {
      state.activeWideHold = entry.index;
    }
  } else {
    insertByTail(context, state.activeNormalHolds[lane], entry.index);
  }

  events.push({ kind: 'holdOpened', noteIndex: entry.index, tailMs: entry.tailMs });
  return events;
}

// ── tail 처리 (§7) ──────────────────────────────────────────

/** 활성 Hold 목록에서 뺀다. 어느 쪽에 있었는지는 상태가 안다. */
function dropActive(state: JudgeState, index: number): void {
  if (state.activeWideHold === index) {
    state.activeWideHold = null;
    state.wideOwnerKey = null;
    return;
  }
  for (const lane of LANES) {
    const at = state.activeNormalHolds[lane].indexOf(index);
    if (at !== -1) {
      state.activeNormalHolds[lane].splice(at, 1);
      return;
    }
  }
}

/**
 * tail 한 단위를 확정한다. 확정된 tail은 다시 판정되지 않는다(§6 불변식).
 *
 * `atMs`는 그 tail이 **끝난 시각**이다 — 자동완료는 `tailMs`이고 release는 그 시각이다.
 * 프레임 간격이 판정 기록을 흔들지 않게 호출 시점이 아니라 사건 시각을 싣는다.
 */
function closeTail(
  state: JudgeState,
  context: CandidateContext,
  index: number,
  atMs: number,
  judgment: 'SYNC' | 'MISS',
): JudgmentEvent[] {
  const entry = context.notes.byIndex[index]!;
  const events: JudgmentEvent[] = [];

  dropActive(state, index);

  events.push({
    kind: 'judged',
    judgment,
    part: 'tail',
    noteIndex: index,
    note: entry.note,
    diff: atMs - entry.tailMs,
    units: 1,
  });

  if (judgment === 'SYNC') bumpCombo(state);
  else resetCombo(state, events);

  return events;
}

/**
 * 손을 떼서 해소되는 Hold의 tail 분류(§7).
 *
 * `nowMs >= tailMs − HOLD_RELEASE_WINDOW_MS`면 tail SYNC, 그보다 이르면 tail MISS.
 * 임계 폭은 GOOD 창 + grace = 150ms이며 원본과 같다(D-2026-039, `constants` §1).
 */
function releaseTail(
  state: JudgeState,
  context: CandidateContext,
  index: number,
  nowMs: number,
): JudgmentEvent[] {
  const entry = context.notes.byIndex[index]!;
  const inGrace = nowMs >= entry.tailMs - HOLD_RELEASE_WINDOW_MS;
  return closeTail(state, context, index, nowMs, inGrace ? 'SYNC' : 'MISS');
}

// ── 재조정 (§6) ─────────────────────────────────────────────

/**
 * 수요 재조정 `[신규]`. 매 keydown/keyup 뒤에 실행한다(§9).
 *
 * 순서가 규칙이다 — Normal shortage를 **먼저** 해소하고 나서 Wide 배정을 정한다.
 * 현재 Wide 소유를 먼저 빼고 Normal shortage를 계산하지 않는다(§6).
 */
export function reconcileHeldCapacity(
  state: JudgeState,
  context: CandidateContext,
  nowMs: number,
): JudgmentEvent[] {
  const events: JudgmentEvent[] = [];

  // 1. Normal shortage — held 키 전체를 기준으로, tail이 이른 것부터 해소한다.
  for (const lane of LANES) {
    const capacity = heldCount(state, lane);
    while (state.activeNormalHolds[lane].length > capacity) {
      events.push(...releaseTail(state, context, state.activeNormalHolds[lane][0]!, nowMs));
    }
  }

  // 2. 활성 WideHold가 없으면 소유도 없다.
  if (state.activeWideHold === null) {
    state.wideOwnerKey = null;
    return events;
  }

  // 3~4. 현재 owner가 여전히 눌려 있고 자격이 있으면 유지한다.
  const owner = state.wideOwnerKey;
  if (owner !== null && state.keysHeld.has(owner) && eligibleForWide(state, owner)) {
    return events;
  }

  // 5. 아니면 자격 있는 키 중 가장 최근에 누른 키로 원자적으로 이양한다.
  let next: LaneKeyId | null = null;
  let bestSerial = -1;
  for (const key of state.keysHeld) {
    if (!eligibleForWide(state, key)) continue;
    const serial = state.keyPressSerial.get(key) ?? -1;
    if (serial > bestSerial) {
      bestSerial = serial;
      next = key;
    }
  }

  if (next !== null) {
    state.wideOwnerKey = next;
    return events;
  }

  // 6. 자격 있는 키가 없으면 WideHold의 tail을 release 규칙으로 해소한다.
  state.wideOwnerKey = null;
  events.push(...releaseTail(state, context, state.activeWideHold, nowMs));
  return events;
}

/**
 * §6 불변식을 문장으로 확인한다. 어긋난 항목의 설명을 돌려주며, 빈 배열이 정상이다.
 *
 * 판정은 프레임마다 도는 최내곽 루프라 상태를 복사하지 않는다 — 그 대신 이 검사가
 * 개발/테스트 빌드의 assertion 자리다(§6).
 */
export function heldCapacityViolations(state: JudgeState, context: CandidateContext): string[] {
  const violations: string[] = [];

  for (const lane of LANES) {
    if (normalDemand(state, lane) > heldCount(state, lane)) {
      violations.push(`lane ${lane}: Normal 수요가 눌린 키보다 많다`);
    }
    for (const index of state.activeNormalHolds[lane]) {
      if (state.hits[index] !== 'hit')
        violations.push(`note ${index}: 활성인데 head가 확정 안 됐다`);
      if (context.notes.byIndex[index]!.note.duration <= 0) {
        violations.push(`note ${index}: Hold가 아닌데 활성 목록에 있다`);
      }
    }
    const tails = state.activeNormalHolds[lane].map((i) => context.notes.byIndex[i]!.tailMs);
    if (tails.some((tailMs, at) => at > 0 && tailMs < tails[at - 1]!)) {
      violations.push(`lane ${lane}: 활성 목록이 tail 순이 아니다`);
    }
  }

  if (state.activeWideHold === null && state.wideOwnerKey !== null) {
    violations.push('WideHold가 없는데 owner가 남아 있다');
  }
  if (state.wideOwnerKey !== null) {
    if (!state.keysHeld.has(state.wideOwnerKey)) {
      violations.push('Wide owner 키가 눌려 있지 않다');
    } else if (!eligibleForWide(state, state.wideOwnerKey)) {
      violations.push('Wide owner가 같은 lane의 Normal 수요를 잠식했다');
    }
  }

  return violations;
}

// ── 시간 진행 (§9) ──────────────────────────────────────────

/** `tailMs <= nowMs`인 활성 tail을 자동 완료한다. 사건 시각은 `tailMs`다(§7). */
function autoCompleteTails(
  state: JudgeState,
  context: CandidateContext,
  nowMs: number,
): JudgmentEvent[] {
  const events: JudgmentEvent[] = [];

  for (;;) {
    let due: number | null = null;
    let dueTailMs = Infinity;

    const consider = (index: number): void => {
      const tailMs = context.notes.byIndex[index]!.tailMs;
      if (tailMs <= nowMs && tailMs < dueTailMs) {
        due = index;
        dueTailMs = tailMs;
      }
    };
    for (const lane of LANES) for (const index of state.activeNormalHolds[lane]) consider(index);
    if (state.activeWideHold !== null) consider(state.activeWideHold);

    if (due === null) return events;
    events.push(...closeTail(state, context, due, dueTailMs, 'SYNC'));
  }
}

/**
 * 결정론적 시간 순서로 상태를 `nowMs`까지 진행시킨다(§9).
 *
 * 1. 활성 tail 자동 완료 — 같은 tick이면 tail이 먼저 끝난다(`[head, tail)`, §7).
 * 2. 최종 유효 시각을 **지난** 미확정 head 만료(§2, 경계 포함).
 * 3. Hold head 만료는 §8의 2단위 MISS를 즉시 커밋하고 그 Hold를 영구히 닫는다 —
 *    활성 목록에 넣지 않고, 나중에 tail을 다시 판정하지 않는다.
 *
 * 진입 경계는 `judgeAdvance`·`judgeKeyDown`·`judgeKeyUp` 셋뿐이므로 `visualOffset`
 * 보정을 건너뛴 시각이 여기 들어올 자리가 없다.
 */
function advanceJudgmentStateTo(
  state: JudgeState,
  context: CandidateContext,
  nowMs: number,
): JudgmentEvent[] {
  const events = autoCompleteTails(state, context, nowMs);

  for (const entry of context.notes.ordered) {
    if (state.hits[entry.index] !== 'pending') continue;
    if (nowMs <= entry.deadlineMs) continue;

    const isHold = entry.note.duration > 0;
    state.hits[entry.index] = 'missed';

    events.push({
      kind: 'judged',
      judgment: 'MISS',
      part: isHold ? 'head' : 'tap',
      noteIndex: entry.index,
      note: entry.note,
      diff: nowMs - entry.startMs,
      // Hold head MISS는 head + tail 2단위를 그 자리에서 함께 확정한다(§8).
      units: isHold ? 2 : 1,
    });

    resetCombo(state, events);
  }

  state.nowMs = nowMs;
  return events;
}

// ── 입력 경로 (§9) ──────────────────────────────────────────

/**
 * 프레임 진행. play loop가 매 프레임 부른다.
 *
 * `rawMs`는 **보정 전** 시각이다 — 세 진입점이 모두 같은 모양이라 보정이 한쪽만
 * 걸리는 배선을 만들 수 없다(§1, JD-8).
 */
export function judgeAdvance(
  state: JudgeState,
  context: CandidateContext,
  rawMs: number,
  visualOffset: number,
): JudgmentEvent[] {
  return advanceJudgmentStateTo(state, context, toJudgeMs(rawMs, visualOffset));
}

/**
 * keydown 한 번(§9).
 *
 * 이미 눌려 있는 키의 반복 keydown은 **무시한다**(§5) — OS 키 반복이 판을 흔들지 않는다.
 */
export function judgeKeyDown(
  state: JudgeState,
  context: CandidateContext,
  key: LaneKeyId,
  rawMs: number,
  visualOffset: number,
): JudgmentEvent[] {
  if (state.keysHeld.has(key)) return [];

  const nowMs = toJudgeMs(rawMs, visualOffset);
  const events = advanceJudgmentStateTo(state, context, nowMs);

  state.keysHeld.add(key);
  state.keyPressSerial.set(key, state.nextPressSerial);
  state.nextPressSerial += 1;

  const entry = selectCandidate(state, context, key, nowMs);
  if (entry) events.push(...commitJudgment(state, context, entry, nowMs));

  events.push(...reconcileHeldCapacity(state, context, nowMs));
  return events;
}

/**
 * keyup 한 번(§9). blur·stuck-key 복구는 합성 release를 이 경로로 흘려보낸다.
 */
export function judgeKeyUp(
  state: JudgeState,
  context: CandidateContext,
  key: LaneKeyId,
  rawMs: number,
  visualOffset: number,
): JudgmentEvent[] {
  const nowMs = toJudgeMs(rawMs, visualOffset);
  const events = advanceJudgmentStateTo(state, context, nowMs);

  state.keysHeld.delete(key);
  state.keyPressSerial.delete(key);
  if (state.wideOwnerKey === key) state.wideOwnerKey = null;

  events.push(...reconcileHeldCapacity(state, context, nowMs));
  return events;
}
