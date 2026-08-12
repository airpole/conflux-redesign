/**
 * 입력 판정의 구현 — 후보 선택·판정창·lane 매칭·mirror·`commitJudgment`.
 *
 * 정의의 단일 출처는 `core/judge.md`다. 여기는 그 §1~§4의 코드 표현이며,
 * Hold 소유(§5·§6)·reconciliation(§9 나머지)은 M1-5·M1-6의 자리다.
 *
 * 세 가지가 구조로 못 박혀 있다:
 *
 * - **judge는 아무것도 호출하지 않는다.** 게이지도 render도 import하지 않고,
 *   판정 결과를 `JudgmentEvent[]`로 **반환만** 한다(D-2026-038 J-4). 게이지가
 *   붙는 M1-7은 이 파일을 열지 않는다.
 * - **`visualOffset`은 진입 경계에서 한 번만** 걸린다(§1). 내부 함수는
 *   `visualOffset`을 인자로 받지 않으므로 두 번 걸릴 자리가 없고, keydown만
 *   보정하는 오류(§1이 직접 짚은 자리)가 구조적으로 불가능하다.
 * - **노트 정체성은 파생 표의 인덱스**다. 영속 note ID는 없다(§1) — 판정에
 *   관련된 속성이 같은 노트는 서로 교환 가능하다.
 */

import {
  WINDOW_GOOD_MS,
  WINDOW_PERFECT_MS,
  WINDOW_SYNC_MS,
  WINDOW_WIDE_SYNC_MS,
} from './core-constants.js';
import type { Chart, Lane, Note } from './core-chart.js';
import { DEFAULT_LANE_KEYS, type LaneKeyId } from './core-settings.js';
import { tickToMs, type Timeline } from './core-timing.js';

// ── lane 매핑 ───────────────────────────────────────────────

/**
 * 물리 키 → lane. 매핑의 단일 출처는 `_meta/settings.md` §2의 `DEFAULT_LANE_KEYS` 표이며
 * judge는 **읽기만** 한다(§3). 바인딩은 rebinding으로 바뀌어도 이 매핑은 고정이다.
 */
export function laneOfKey(key: LaneKeyId): Lane {
  return DEFAULT_LANE_KEYS[key].lane;
}

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
 */
export function judgeLaneOf(note: Note, laneMap: LaneMap): Lane | null {
  if (note.isWide) return null;
  return laneMap ? laneMap[note.lane] : note.lane;
}

// ── 판정 ────────────────────────────────────────────────────

export const JUDGMENTS = ['SYNC', 'PERFECT', 'GOOD', 'MISS'] as const;
export type Judgment = (typeof JUDGMENTS)[number];

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
 * 표 자체는 chart·timeline에서만 나오는 **불변** 파생물이고, 진행 상태(`status`)는
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
  const built = chart.notes.map((note, index) => {
    const startMs = tickToMs(timeline, note.startTick);
    return {
      note,
      index,
      startMs,
      tailMs: note.duration > 0 ? tickToMs(timeline, note.startTick + note.duration) : startMs,
      deadlineMs: startMs + windowOf(note),
    } satisfies JudgeNote;
  });

  return { ordered: [...built].sort(compareCandidates) };
}

// ── 상태 ────────────────────────────────────────────────────

/** 노트별 진행. `pending`만 후보가 된다(§3). */
export type NoteStatus = 'pending' | 'hit' | 'missed';

/**
 * 판정 진행 상태. **가변 객체**이며 모든 연산이 첫 인자로 받는다(J-2) —
 * 숨은 모듈 전역은 두지 않는다. 판정은 프레임마다 도는 최내곽 루프라 매 입력마다
 * 상태를 복사하지 않고, §6의 불변식은 복사 대신 assertion으로 지킨다.
 */
export interface JudgeState {
  /** `JudgeNotes.ordered`가 아니라 **원본 `notes` 인덱스**로 읽는다. */
  status: NoteStatus[];
  combo: number;
  maxCombo: number;
  hits: number;
  misses: number;
  fastCount: number;
  slowCount: number;
  /** `advanceJudgmentStateTo`가 마지막으로 진행시킨 시각(보정된 시계). */
  nowMs: number;
}

export function createJudgeState(notes: JudgeNotes): JudgeState {
  return {
    status: new Array<NoteStatus>(notes.ordered.length).fill('pending'),
    combo: 0,
    maxCombo: 0,
    hits: 0,
    misses: 0,
    fastCount: 0,
    slowCount: 0,
    nowMs: Number.NEGATIVE_INFINITY,
  };
}

// ── 이벤트 ──────────────────────────────────────────────────

/**
 * judge의 **유일한 출력**이다. 게이지·이펙트·표시 큐는 이 열을 소비하는 바깥이
 * 맡는다(§11, J-4) — judge는 그들이 존재하는지도 모른다.
 *
 * `units`는 회계 단위 수다(§8). Tap은 1, Hold head MISS는 2 — 후자는 M1-5에서
 * 채워진다. score·accuracy·게이지가 **같은 단위**를 쓴다(설계 대장 GA-5).
 */
export type JudgmentEvent =
  | {
      readonly kind: 'judged';
      readonly judgment: Judgment;
      readonly noteIndex: number;
      readonly note: Note;
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
 * 한 번의 keydown은 head를 최대 하나만 확정한다.
 */
export function selectCandidate(
  state: JudgeState,
  context: CandidateContext,
  key: LaneKeyId,
  nowMs: number,
): JudgeNote | null {
  const inputLane = laneOfKey(key);

  for (const entry of context.notes.ordered) {
    if (state.status[entry.index] !== 'pending') continue;
    if (Math.abs(nowMs - entry.startMs) > windowOf(entry.note)) continue;
    if (!laneMatches(entry, inputLane, context.laneMap)) continue;
    return entry;
  }
  return null;
}

// ── 확정 ────────────────────────────────────────────────────

/**
 * 후보 하나를 확정한다(§4). 게이지를 호출하지 않고 이펙트를 만들지 않으며,
 * `above/below`를 싣지 않는다 `[수정]` — 겹침 검출은 domain, 시각 분리는 render다
 * (설계 대장 JD-3·JD-4).
 *
 * Hold head는 `holdOpened`를 내보내기만 하고 활성 Hold 등록은 하지 않는다.
 * 그 소비자가 M1-5의 자리다(§5).
 */
export function commitJudgment(
  state: JudgeState,
  entry: JudgeNote,
  nowMs: number,
): JudgmentEvent[] {
  const diff = nowMs - entry.startMs;
  const judgment = judgmentOf(diff, entry.note.isWide);
  const events: JudgmentEvent[] = [];

  state.status[entry.index] = 'hit';
  state.hits += 1;
  state.combo += 1;
  state.maxCombo = Math.max(state.maxCombo, state.combo);

  events.push({
    kind: 'judged',
    judgment,
    noteIndex: entry.index,
    note: entry.note,
    diff,
    units: 1,
  });

  if (entry.note.duration > 0) {
    events.push({
      kind: 'holdOpened',
      noteIndex: entry.index,
      tailMs: entry.tailMs,
    });
  }

  // Fast/Slow: normal head만, SYNC·wide 제외 `[보존]` (§4.6).
  // `diff < 0` FAST / `> 0` SLOW. 누적 카운터와 순간 깜빡은 같은 신호의 두 층위이며
  // 순간 깜빡(`flashTiming`)은 표시 레이어가 이 이벤트에서 만든다.
  if (!entry.note.isWide && judgment !== 'SYNC' && diff !== 0) {
    const side = diff < 0 ? 'FAST' : 'SLOW';
    if (side === 'FAST') state.fastCount += 1;
    else state.slowCount += 1;
    events.push({ kind: 'fastSlow', side, diff });
  }

  return events;
}

// ── 시간 진행 ───────────────────────────────────────────────

/**
 * 결정론적 시간 순서로 상태를 `nowMs`까지 진행시킨다(§9).
 *
 * **M1-4의 범위는 Tap head 만료뿐**이다(1단위 MISS). Hold의 tail 자동완료와
 * head 만료 2단위 회계(§7·§8)는 활성 Hold 모델을 요구하므로 M1-5의 자리이며,
 * 여기서는 Hold head를 만료시키지 **않는다** — 절반만 맞는 회계(1단위 MISS)를
 * 내보내면 그것이 M1-5까지 조용히 살아남는다.
 *
 * 만료는 `deadlineMs`를 **지나야** 일어난다(§2, 경계 포함).
 */
export function advanceJudgmentStateTo(
  state: JudgeState,
  context: CandidateContext,
  nowMs: number,
): JudgmentEvent[] {
  const events: JudgmentEvent[] = [];

  for (const entry of context.notes.ordered) {
    if (state.status[entry.index] !== 'pending') continue;
    if (entry.note.duration > 0) continue; // Hold head 만료 → M1-5 (§8, 2단위)
    if (nowMs <= entry.deadlineMs) continue;

    state.status[entry.index] = 'missed';
    state.misses += 1;
    events.push({
      kind: 'judged',
      judgment: 'MISS',
      noteIndex: entry.index,
      note: entry.note,
      diff: nowMs - entry.startMs,
      units: 1,
    });

    if (state.combo !== 0) {
      state.combo = 0;
      events.push({ kind: 'comboReset' });
    }
  }

  state.nowMs = nowMs;
  return events;
}

// ── 입력 경로 ───────────────────────────────────────────────

/**
 * keydown 한 번(§9). `rawMs`는 **보정 전** 시각이며 `visualOffset` 보정이 여기,
 * 진입 경계에서 한 번 걸린다 — 이 함수 아래로는 보정된 시계만 흐른다.
 *
 * `reconcileHeldCapacity`(§6)는 활성 Hold 모델과 함께 M1-5에서 이 경로에 붙는다.
 */
export function judgeKeyDown(
  state: JudgeState,
  context: CandidateContext,
  key: LaneKeyId,
  rawMs: number,
  visualOffset: number,
): JudgmentEvent[] {
  const nowMs = toJudgeMs(rawMs, visualOffset);
  const events = advanceJudgmentStateTo(state, context, nowMs);

  const entry = selectCandidate(state, context, key, nowMs);
  if (entry) events.push(...commitJudgment(state, entry, nowMs));

  return events;
}
