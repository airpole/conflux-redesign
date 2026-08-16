/**
 * 시간축 단일 출처의 구현.
 *
 * 정의는 `core/timing.md`다. 여기는 그 구조의 코드 표현이다.
 *
 * **캐시가 없다.** 원본은 `defineCache('bpmSegments', ['tempo'], …)` + 전역 `D`로
 * 무효화를 관리했지만, 여기서는 `buildTimeline(chart)`가 파생 객체를 한 번 만들고
 * 그 뒤의 함수는 전부 그것을 인자로 받는다 — chart가 바뀌면 다시 만든다.
 * "chart session 교체 시 재구성"이 규칙이 아니라 **호출 구조 그 자체**가 된다
 * (D-2026-037). core가 전역 상태를 모른다는 `_plan/architecture.md`의 조건도
 * 같은 형태로 만족된다.
 *
 * 모든 함수는 순수하고 인자를 mutate하지 않는다.
 */

import {
  TICKS_PER_BEAT as TPB,
  SCROLL_VIEW_MS,
  SONG_END_TAIL_MS,
  GRID_DIVISOR_DEFAULT,
} from './core-constants.js';
import type { Chart } from './core-chart.js';

// ── 세그먼트 ────────────────────────────────────────────────

/** BPM 구간. `ms`는 이 구간이 시작하는 시각(누산값)이다. */
export interface TempoSegment {
  readonly startTick: number;
  readonly ms: number;
  readonly bpm: number;
  readonly msPerTick: number;
}

/** 박자 구간. `measure`는 이 구간의 첫 마디 번호(1-based, labelOffset 적용 전)다. */
export interface MeasureSegment {
  readonly startTick: number;
  readonly measure: number;
  readonly numerator: number;
  readonly denominator: number;
  /** 한 박의 tick 수. `TPB`는 4분음표 기준이므로 denominator로 환산한다. */
  readonly tpbUnit: number;
  /** 한 마디의 tick 수. */
  readonly tpm: number;
}

/**
 * chart에서 뽑은 시간축 파생 객체. 두 세그먼트를 함께 담는다 — 항상 짝으로
 * 쓰이므로 호출자가 두 개를 들고 다니게 하지 않는다.
 */
export interface Timeline {
  readonly tempos: readonly TempoSegment[];
  readonly measures: readonly MeasureSegment[];
}

/** tempos가 비면 여기로 떨어진다. */
const FALLBACK_TEMPO = { startTick: 0, bpm: 120 } as const;
/** timeSignatures가 비면 여기로 떨어진다. */
const FALLBACK_TIME_SIGNATURE = { startTick: 0, numerator: 4, denominator: 4 } as const;

/** chart의 tick↔ms·measure 변환에 필요한 것만 추린 입력. */
type TimelineSource = Pick<Chart, 'tempos' | 'timeSignatures'>;

function buildTempoSegments(source: TimelineSource): TempoSegment[] {
  const sorted =
    source.tempos.length > 0
      ? [...source.tempos].sort((a, b) => a.startTick - b.startTick)
      : [FALLBACK_TEMPO];

  const segments: TempoSegment[] = [];
  let ms = 0;

  for (let i = 0; i < sorted.length; i += 1) {
    const entry = sorted[i]!;
    const previous = segments[i - 1];
    if (previous) ms += (entry.startTick - sorted[i - 1]!.startTick) * previous.msPerTick;

    segments.push({
      startTick: entry.startTick,
      ms,
      bpm: entry.bpm,
      msPerTick: 60000 / (entry.bpm * TPB),
    });
  }
  return segments;
}

function buildMeasureSegments(source: TimelineSource): MeasureSegment[] {
  const sorted =
    source.timeSignatures.length > 0
      ? [...source.timeSignatures].sort((a, b) => a.startTick - b.startTick)
      : [FALLBACK_TIME_SIGNATURE];

  const segments: MeasureSegment[] = [];
  let measure = 1;

  for (let i = 0; i < sorted.length; i += 1) {
    const entry = sorted[i]!;
    const tpbUnit = (TPB * 4) / entry.denominator;
    const tpm = tpbUnit * entry.numerator;

    segments.push({
      startTick: entry.startTick,
      measure,
      numerator: entry.numerator,
      denominator: entry.denominator,
      tpbUnit,
      tpm,
    });

    const next = sorted[i + 1];
    if (next) measure += Math.floor((next.startTick - entry.startTick) / tpm);
  }
  return segments;
}

/**
 * chart에서 시간축 파생 객체를 만든다. `tempos`·`timeSignatures`가 비면 각각
 * 120bpm·4/4로 떨어진다 — 원본과 같은 폴백이되 chart를 mutate하지 않는다
 * (원본은 `D.tempo`에 폴백을 써 넣었다).
 */
export function buildTimeline(chart: TimelineSource): Timeline {
  return { tempos: buildTempoSegments(chart), measures: buildMeasureSegments(chart) };
}

/**
 * 값이 속한 마지막 세그먼트. 어느 세그먼트보다도 앞이면 첫 세그먼트로 떨어진다
 * — 음수 tick이 첫 구간의 외삽으로 처리되는 근거다(`timing.md` §0).
 */
function segmentAt<T>(segments: readonly T[], value: number, keyOf: (segment: T) => number): T {
  let found = segments[0]!;
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const segment = segments[i]!;
    if (value >= keyOf(segment)) {
      found = segment;
      break;
    }
  }
  return found;
}

/** BPM 구간 조회. `getBPMAt`을 따로 두지 않는다 — 값은 여기서 나온다. */
export function tempoSegmentAt(timeline: Timeline, tick: number): TempoSegment {
  return segmentAt(timeline.tempos, tick, (segment) => segment.startTick);
}

/** 박자 구간 조회. `getTimeSig`를 따로 두지 않는다 — 값은 여기서 나온다. */
export function measureSegmentAt(timeline: Timeline, tick: number): MeasureSegment {
  return segmentAt(timeline.measures, tick, (segment) => segment.startTick);
}

// ── tick ↔ ms ───────────────────────────────────────────────

export function tickToMs(timeline: Timeline, tick: number): number {
  const segment = tempoSegmentAt(timeline, tick);
  return segment.ms + (tick - segment.startTick) * segment.msPerTick;
}

export function msToTick(timeline: Timeline, ms: number): number {
  const segment = segmentAt(timeline.tempos, ms, (candidate) => candidate.ms);
  return segment.startTick + (ms - segment.ms) / segment.msPerTick;
}

// ── scroll ──────────────────────────────────────────────────

/**
 * 판정선 기준 진행도. `0` = 판정선, 양수 = 미래, 음수 = 지나감.
 * px 매핑은 render 소관이고 `nowMs`·playbackRate는 game 소관이다.
 */
export function scrollProgressAt(
  timeline: Timeline,
  tick: number,
  nowMs: number,
  scrollSpeed: number,
): number {
  return (tickToMs(timeline, tick) - nowMs) / (SCROLL_VIEW_MS / scrollSpeed);
}

// ── measure 표기 ────────────────────────────────────────────

/**
 * measure 표기의 caller 주입 값.
 *
 * 둘 다 core가 스스로 알 수 없다 — `labelOffset`은 editor setting이고
 * `gridDivisor`는 session editorState다. game 쪽 호출부는 기본값으로 둔다.
 */
export interface MeasureOptions {
  readonly labelOffset?: number;
  readonly gridDivisor?: number;
}

/** 분박 한 칸의 tick 수. `gridDivisor`는 온음표의 분모다(`timing.md` §6). */
export function cellTickOf(gridDivisor: number): number {
  return (TPB * 4) / gridDivisor;
}

function formatMeasure(
  measure: number,
  beat: number,
  subTick: number,
  cellTick: number,
  tick: number,
): string {
  if (subTick === 0 && beat === 1) return `${measure}`;
  if (subTick === 0) return `${measure}.${beat}`;
  if (subTick % cellTick !== 0) return `t${tick}`;
  return `${measure}.${beat}.${Math.round(subTick / cellTick)}`;
}

/**
 * tick → `measure.beat.sub` 표기.
 *
 * `sub`는 `gridDivisor` 격자 칸 수다 — 원본의 "박당 고정 16분할"을 폐기하고
 * 표기와 snap이 같은 격자를 쓴다(설계 대장 TM-7). sub가 그 tick을 정확히
 * 표현하지 못하면(마디 상대 나머지가 cell로 나눠떨어지지 않으면) 근사하지
 * 않고 `t{tick}` 원시 표기로 떨어진다(D-2026-045) — 절대 tick이 canonical
 * representation이고, 이 표기는 그 파생일 뿐이다.
 */
export function tickToMeasure(
  timeline: Timeline,
  tick: number,
  { labelOffset = 0, gridDivisor = GRID_DIVISOR_DEFAULT }: MeasureOptions = {},
): string {
  const cellTick = cellTickOf(gridDivisor);

  if (tick < 0) {
    const first = timeline.measures[0]!;
    const measuresBack = Math.ceil(-tick / first.tpm);
    const relativeTick = tick - -measuresBack * first.tpm;

    return formatMeasure(
      1 - measuresBack + labelOffset,
      Math.floor(relativeTick / first.tpbUnit) + 1,
      relativeTick % first.tpbUnit,
      cellTick,
      tick,
    );
  }

  const segment = measureSegmentAt(timeline, tick);
  const relativeTick = tick - segment.startTick;
  const measureInSegment = Math.floor(relativeTick / segment.tpm);
  const remainder = relativeTick - measureInSegment * segment.tpm;

  return formatMeasure(
    segment.measure + measureInSegment + labelOffset,
    Math.floor(remainder / segment.tpbUnit) + 1,
    remainder % segment.tpbUnit,
    cellTick,
    tick,
  );
}

/**
 * `measure.beat.sub` 표기 → tick. 파싱에 실패하면 `null`이다.
 * `t` 접두사는 원시 tick 입력이다.
 */
export function measureToTick(
  timeline: Timeline,
  input: string,
  { labelOffset = 0, gridDivisor = GRID_DIVISOR_DEFAULT }: MeasureOptions = {},
): number | null {
  let text = input.trim();

  if (text.startsWith('t')) {
    const raw = Number.parseInt(text.slice(1), 10);
    return Number.isNaN(raw) ? null : raw;
  }

  const negative = text.startsWith('-');
  if (negative) text = text.slice(1);

  const parts = text.split('.').map(Number);
  if (parts.length === 0 || parts.some(Number.isNaN)) return null;

  // 원본은 `parts[0] || 1`이라 마디 `0`이 마디 1로 떨어졌다 — `tickToMeasure`는
  // pre-roll을 `"0"`으로 표기하므로 왕복이 그 자리에서 깨진다(설계 대장 TM-10).
  // 빈 문자열(`".2"` 같은 입력)만 1로 떨어뜨린다.
  let measure = text.split('.')[0] === '' ? 1 : parts[0]!;
  if (negative) measure = -measure;
  measure -= labelOffset;

  const beat = parts.length >= 2 ? parts[1]! : 1;
  const sub = parts.length >= 3 ? parts[2]! : 0;
  const cellTick = cellTickOf(gridDivisor);

  // 마디 0 이하는 첫 박자 구간을 뒤로 외삽한다.
  if (measure <= 0) {
    const first = timeline.measures[0]!;
    return Math.round(
      (measure - 1) * first.tpm + (beat - 1) * first.tpbUnit + sub * cellTick + first.startTick,
    );
  }

  for (let i = 0; i < timeline.measures.length; i += 1) {
    const segment = timeline.measures[i]!;
    const next = timeline.measures[i + 1];
    const segmentMeasures = next
      ? Math.floor((next.startTick - segment.startTick) / segment.tpm)
      : Infinity;

    if (measure < segment.measure + segmentMeasures) {
      const measureInSegment = measure - segment.measure;
      return Math.round(
        segment.startTick +
          measureInSegment * segment.tpm +
          (beat - 1) * segment.tpbUnit +
          sub * cellTick,
      );
    }
  }
  return null;
}

// ── grid line ───────────────────────────────────────────────

/**
 * 격자선 하나. **px를 모른다** — 좌표 변환은 render 소관이다.
 *
 * `isPreRoll`은 위치(`tick < 0`)이고 `measureNum`은 표시값이다. 원본이 둘을
 * `measureNum <= 0`으로 겸했던 것을 분리해 둔다 — `labelOffset`이 붙으면
 * 표시값으로 위치를 판별할 수 없다.
 */
export interface GridLine {
  readonly tick: number;
  readonly isMeasure: boolean;
  readonly measureNum: number;
  readonly beatInMeasure: number;
  readonly isPreRoll: boolean;
}

/**
 * `[startTick, endTick]` 구간의 격자선. 간격은 **박 단위**다 — 분박 선을 그릴지는
 * render의 밀도 판단이고, core가 `gridDivisor` 단위로 쏟아내면 화면 밖까지
 * 수천 개가 나온다.
 */
export function gridLines(
  timeline: Timeline,
  startTick: number,
  endTick: number,
  { labelOffset = 0 }: Pick<MeasureOptions, 'labelOffset'> = {},
): GridLine[] {
  const lines: GridLine[] = [];

  if (startTick < 0) {
    const first = timeline.measures[0]!;
    const negativeEnd = Math.min(0, endTick);

    for (
      let tick = Math.floor(startTick / first.tpbUnit) * first.tpbUnit;
      tick < negativeEnd;
      tick += first.tpbUnit
    ) {
      if (tick < startTick) continue;

      const measuresBack = tick < 0 ? Math.ceil(-tick / first.tpm) : 0;
      const relativeTick = tick - -measuresBack * first.tpm;
      const beatInMeasure = Math.floor(relativeTick / first.tpbUnit) % first.numerator;

      lines.push({
        tick,
        isMeasure: beatInMeasure === 0,
        measureNum: 1 - measuresBack + labelOffset,
        beatInMeasure: beatInMeasure + 1,
        isPreRoll: true,
      });
    }
  }

  for (let i = 0; i < timeline.measures.length; i += 1) {
    const segment = timeline.measures[i]!;
    const next = timeline.measures[i + 1];
    const segmentEnd = next ? next.startTick : Infinity;

    if (segment.startTick >= endTick) break;
    if (segmentEnd <= startTick) continue;

    const relativeStart = Math.max(0, startTick - segment.startTick);
    const firstBeatOffset = Math.floor(relativeStart / segment.tpbUnit) * segment.tpbUnit;

    for (let offset = firstBeatOffset; ; offset += segment.tpbUnit) {
      const tick = segment.startTick + offset;
      if (tick > endTick || tick >= segmentEnd) break;
      if (tick < startTick) continue;

      const beatInSegment = Math.floor(offset / segment.tpbUnit);
      const beatInMeasure = beatInSegment % segment.numerator;

      lines.push({
        tick,
        isMeasure: beatInMeasure === 0,
        measureNum: segment.measure + Math.floor(beatInSegment / segment.numerator) + labelOffset,
        beatInMeasure: beatInMeasure + 1,
        isPreRoll: false,
      });
    }
  }
  return lines;
}

/** 첫 박자 기준 한 마디 pre-roll. editor scroll의 하한이다. */
export function minTick(timeline: Timeline): number {
  return -timeline.measures[0]!.tpm;
}

// ── song end ────────────────────────────────────────────────

/** `timing.md` §9의 네 값. 한 계산의 중간 단계라 함께 나온다. */
export interface SongEnd {
  readonly chartEndMs: number;
  readonly musicEndMs: number;
  /** 진행 표시의 **분모**. 종료 조건이 아니다. */
  readonly contentEndMs: number;
  /** 종료 조건. `currentMs > songEndMs`이면 판이 끝난다. */
  readonly songEndMs: number;
}

/**
 * 모든 event 종류의 마지막 종료 tick. event가 하나도 없으면 `null`이다 —
 * `0`을 돌려주면 첫 tempo가 tick 0이 아닐 때 `tickToMs(0)`이 0이 아니어서
 * "event가 없으면 0"이 깨진다.
 */
function lastEventTick(chart: Chart): number | null {
  let last: number | null = null;
  for (const events of [chart.notes, chart.shapeEvents, chart.laneEvents, chart.textEvents]) {
    for (const event of events) {
      const end = event.startTick + event.duration;
      if (last === null || end > last) last = end;
    }
  }
  return last;
}

/**
 * 곡이 끝나는 시각. `musicDurationMs`는 env(audio decode)에서 오므로 인자다 —
 * 음악이 없으면 `null`이고 `musicEndMs`는 0이 된다.
 *
 * 원본과 다른 자리가 넷이다(설계 대장 TM-1~4): tail이 4s/2s 비대칭에서 3000ms
 * 단일로, `musicEndMs`가 offset 보정으로, `chartEndMs`가 laneEvent 포함으로,
 * 그리고 종료 판정에서 5000ms 하한이 사라졌다.
 */
export function songEndOf(
  timeline: Timeline,
  chart: Chart,
  musicDurationMs: number | null,
): SongEnd {
  const lastTick = lastEventTick(chart);
  const chartEndMs = lastTick === null ? 0 : tickToMs(timeline, lastTick);
  const musicEndMs = musicDurationMs === null ? 0 : musicDurationMs - chart.metadata.offset;
  const contentEndMs = Math.max(chartEndMs, musicEndMs);

  return { chartEndMs, musicEndMs, contentEndMs, songEndMs: contentEndMs + SONG_END_TAIL_MS };
}
