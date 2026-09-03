/**
 * notes 탭 편집 캔버스 — M5-3, 단일 출처 `editor/editor-editing.md` §1,
 * command 목록은 `editor/editor-commands.md` §6.
 *
 * `scene-editor-workspace.ts`(M5-1)의 `EditorCategoryController` delegation
 * 자리에 꽂힌다 — `mountEditorNotesBody(container, chart, api)`가 그
 * controller를 돌려준다. 실제 chart 편집(`Command` 생성)은
 * `edit-notes-commands.ts`(M5-2 엔진 위에 지은 6개 command)에 전부
 * 위임한다 — 이 파일은 캔버스 좌표·마우스/키보드 이벤트만 다룬다.
 *
 * **좌표계**: 세로 = 시간(ms 비례, `editor-graph.md` §3), 시간은 위로
 * 흐른다(원본 `tk2y` 관례 보존). 가로 = lane 1~4 균등 4칸. `viewMs`(한
 * 화면에 보이는 시간 폭)는 D-2026-098로 확정됐다 — 원본의 `edZm`(tick/beat
 * 비례 줌 계수, 기본 1·범위 0.25~8·step ×1.35)을 `viewMs = 960000 /
 * (edZm × bpm)`으로 환산한 값이다(120bpm을 기준 tempo로 선택 — 측정값이
 * 아니라 코드베이스 자체의 기본/fallback 관례에서 고른 해석, 다른 기준
 * tempo였다면 ms 값이 비례로 달라졌을 것이다 — 근거는
 * `_extracted/EXTRACTED_FACTS.md` §14). `VIEW_MS_DEFAULT`=8000ms(edZm=1),
 * `VIEW_MS_MIN`=1000ms(edZm=8, 최대 확대)·`VIEW_MS_MAX`=32000ms(edZm=0.25,
 * 최대 축소) — reciprocal 관계라 step ratio(×1.35)는 방향만 뒤집혀 그대로
 * 넘어온다. Z/X(`editor-editing.md` §5 배선 확정, `editor-graph.md` §3)가
 * 이 값을 조정한다 — Z=축소(viewMs ×1.35), X=확대(viewMs ÷1.35), 범위는
 * [`VIEW_MS_MIN`, `VIEW_MS_MAX`]로 clamp. 스크롤(마우스 휠)도 지원한다 —
 * `core-timing.ts`의 `minTick`으로 하한을 막는다(원본 `getMinTick` 재사용
 * 위치, 이미 코드로 있었다).
 *
 * **히트 반경·드래그 임계**는 D-2026-096으로 실측 확정된 값을 그대로
 * 쓴다: 히트 반경 15px, 드래그 임계 4px(모든 축 공통).
 *
 * **이번 라운드가 단순화한 지점(결정 필요 항목으로 남김)**:
 * - 배치는 항상 `AddNotesCommand`(추가)뿐이다 — 원본의 "lane 2·3 용량
 *   초과 시 기존 tap 자동 치환" 같은 배치-시점 자동 해소 규칙은 구현하지
 *   않았다. 대신 `core-overlap.ts`(이미 있던 core 모듈)의 conflict 표시가
 *   그 문제를 시각적으로 보여주고, 유저가 직접 delete로 해소한다
 *   (`editor-editing.md` §1 "conflict 해소 삭제" 규칙 자체는 아래에서
 *   구현했다 — 배치 시점 자동 치환만 뺐다).
 * - drag-move는 매 프레임 chart를 갱신하지 않는다 — 드래그 중엔 화면
 *   오프셋만으로 그리고, drag-end에 커맨드 1개만 dispatch한다(스펙이
 *   요구하는 "drag-end snapshot" 그대로지만, 원본처럼 드래그 도중에도
 *   실제 데이터가 계속 바뀌는 건 아니다 — 결과는 같다).
 *   가로 히스테리시스(칸폭×0.5마다 ±1 lane)는 구현했다.
 * - `A` 드래그 사각 선택 모디파이어는 없다 — 클릭(단일)·Shift+클릭(추가/
 *   제거)만 지원한다. 사각 선택은 아직 없다.
 * - text 툴(`T`)은 이 파일 범위 밖이다 — textEvent는 M5-7(text events)
 *   소관.
 * - 붙여넣기 충돌 시 토스트 안내는 없다(조용히 스킵만 한다) — 토스트
 *   UI 자체가 아직 없다.
 */
import {
  buildTimeline,
  minTick,
  snapTick,
  tickToMs,
  msToTick,
  type Timeline,
} from '../core/core-timing.js';
import { buildOverlapMap, type OverlapMark } from '../core/core-overlap.js';
import { TICKS_PER_BEAT, GRID_DIVISOR_DEFAULT } from '../core/core-constants.js';
import type { Chart, Lane, Note } from '../core/core-chart.js';
import {
  addNotesCommand,
  deleteNotesCommand,
  mirrorNotesCommand,
  moveNotesCommand,
  type NotesSessionLike,
} from '../edit/edit-notes-commands.js';
import type { Command } from '../edit/edit-command.js';
import type { EditorCategoryController } from './scene-editor-workspace.js';
import './scene-editor-notes.css';

/** `viewMs` 기본값 — D-2026-098(edZm=1, 120bpm 기준 환산). */
const VIEW_MS_DEFAULT = 8000;
/** `viewMs` 최소값(최대 확대) — D-2026-098(edZm=8 환산). */
const VIEW_MS_MIN = 1000;
/** `viewMs` 최대값(최대 축소) — D-2026-098(edZm=0.25 환산). */
const VIEW_MS_MAX = 32000;
/** Z/X 줌 step 비율 — 원본 `edZm` step ×1.35 그대로(D-2026-098, reciprocal이라 방향만 반전). */
const VIEW_MS_ZOOM_STEP = 1.35;

/** 히트 반경(px) — D-2026-096. */
const HIT_RADIUS_PX = 15;
/** 클릭↔드래그 판별 임계값(px) — D-2026-096. */
const DRAG_THRESHOLD_PX = 4;
/** 가로 lane 이동 히스테리시스 비율 — `editor-editing.md` §1(칸폭×0.5). */
const LANE_HYSTERESIS_RATIO = 0.5;

type NoteTool = 'tap' | 'hold' | 'wideTap' | 'wideHold';

export interface EditorNotesApi {
  /** 실제 `WorkspaceSession`(또는 그 shape) — `chart`/`updateChart`가 진짜
   *  세션에 그대로 쓴다. command의 `apply()`/`undo()`가 이 객체를 직접
   *  받아 부른다(`edit-notes-commands.ts`). */
  readonly session: NotesSessionLike;
  /** 실제 `CommandHistory.dispatch` — 이 파일은 엔진을 모른다(M5-2 경계). */
  dispatch(command: Command): void;
}

/** 클릭 좌표 → tick(스냅 전). `msToTick` + 픽셀→ms 환산만 한다. */
function pixelYToTick(
  y: number,
  canvasHeight: number,
  timeline: Timeline,
  scrollMs: number,
  viewMs: number,
): number {
  const pxPerMs = canvasHeight / viewMs;
  const ms = scrollMs + (canvasHeight - y) / pxPerMs;
  return msToTick(timeline, ms);
}

function tickToPixelY(
  tick: number,
  canvasHeight: number,
  timeline: Timeline,
  scrollMs: number,
  viewMs: number,
): number {
  const pxPerMs = canvasHeight / viewMs;
  const ms = tickToMs(timeline, tick);
  return canvasHeight - (ms - scrollMs) * pxPerMs;
}

function laneOfX(x: number, canvasWidth: number): Lane {
  const colW = canvasWidth / 4;
  return Math.min(4, Math.max(1, Math.floor(x / colW) + 1)) as Lane;
}

function laneCenterX(lane: Lane, canvasWidth: number): number {
  const colW = canvasWidth / 4;
  return colW * (lane - 0.5);
}

/** note 하나가 화면상 (px, py)에서 히트 반경 안인가 — D-2026-096 15px. */
function noteHitAt(
  note: Note,
  px: number,
  py: number,
  canvasWidth: number,
  canvasHeight: number,
  timeline: Timeline,
  scrollMs: number,
  viewMs: number,
): boolean {
  if (!note.isWide) {
    const cx = laneCenterX(note.lane, canvasWidth);
    if (Math.abs(px - cx) > canvasWidth / 8) return false;
  }
  const yStart = tickToPixelY(note.startTick, canvasHeight, timeline, scrollMs, viewMs);
  const yEnd = tickToPixelY(
    note.startTick + note.duration,
    canvasHeight,
    timeline,
    scrollMs,
    viewMs,
  );
  const top = Math.min(yStart, yEnd) - HIT_RADIUS_PX;
  const bottom = Math.max(yStart, yEnd) + HIT_RADIUS_PX;
  return py >= top && py <= bottom;
}

function findNoteIndexAt(
  notes: readonly Note[],
  px: number,
  py: number,
  canvasWidth: number,
  canvasHeight: number,
  timeline: Timeline,
  scrollMs: number,
  viewMs: number,
): number | null {
  // 우선순위(가까운 히트가 여럿이면 나중에 그려진, 즉 배치가 늦은 쪽이 위)
  // — 원본은 tap > hold > wideTap > wideHold 우선이지만 이 라운드는 단순화해
  // "가장 최근에 배치된 것"으로 고른다(결정 필요 항목).
  for (let i = notes.length - 1; i >= 0; i -= 1) {
    if (noteHitAt(notes[i]!, px, py, canvasWidth, canvasHeight, timeline, scrollMs, viewMs))
      return i;
  }
  return null;
}

function markColor(mark: OverlapMark | null | undefined): string {
  if (mark === null || mark === undefined) return '#ececf4';
  if (mark.kind === 'conflict') return '#ff5f70';
  if (mark.kind === 'yellow') return '#ffd23f';
  if (mark.kind === 'hidden') return 'transparent';
  return '#ececf4';
}

interface ClipboardEntry {
  readonly lane: Lane;
  readonly relTick: number;
  readonly duration: number;
  readonly isWide: boolean;
}

export function mountEditorNotesBody(
  container: HTMLElement,
  initialChart: Chart,
  api: EditorNotesApi,
): EditorCategoryController {
  const wrap = document.createElement('div');
  wrap.className = 'editor-notes-body';
  const toolbar = document.createElement('div');
  toolbar.className = 'editor-notes-toolbar';
  const canvas = document.createElement('canvas');
  canvas.className = 'editor-notes-canvas';
  canvas.width = 800;
  canvas.height = 600;
  wrap.append(toolbar, canvas);
  container.append(wrap);
  const ctx = canvas.getContext('2d');

  let chart = initialChart;
  let timeline = buildTimeline(chart);
  let tool: NoteTool = 'tap';
  let selection = new Set<number>();
  let pendingHold: { readonly lane: Lane; readonly startTick: number } | null = null;
  let savedLNDur = TICKS_PER_BEAT;
  let clipboard: readonly ClipboardEntry[] | null = null;
  let scrollMs = 0;
  let viewMs = VIEW_MS_DEFAULT;

  let drag: {
    readonly indices: readonly number[];
    readonly startX: number;
    readonly startY: number;
    readonly startTick: number;
    moved: boolean;
    tickDelta: number;
    laneDelta: -1 | 0 | 1;
    colShiftAccum: number;
  } | null = null;

  // command factory가 `api.session`(진짜 `WorkspaceSession`)을 직접 받아
  // 그 `updateChart`를 부른다 — 이 파일의 로컬 `chart` 변수는 렌더용
  // 캐시일 뿐이고, `update()`로 host가 다시 넣어주는 최신값을 따라간다
  // (`scene-editor-workspace.ts`의 `onDispatch` 구독이 그 경로).
  function dispatchNoteCommand(build: (s: NotesSessionLike) => Command): void {
    api.dispatch(build(api.session));
  }

  function toolbarLabel(t: NoteTool): string {
    return { tap: 'Tap (Q)', hold: 'Hold (W)', wideTap: 'Wide Tap (E)', wideHold: 'Wide Hold (R)' }[
      t
    ];
  }

  function renderToolbar(): void {
    toolbar.replaceChildren();
    const label = document.createElement('span');
    label.className = 'editor-notes-tool-label';
    label.textContent = toolbarLabel(tool);
    const sel = document.createElement('span');
    sel.className = 'editor-notes-sel-label';
    sel.textContent = selection.size > 0 ? `${selection.size} selected` : '';
    toolbar.append(label, sel);
  }

  function draw(): void {
    if (ctx === null) return;
    const { width: cw, height: ch } = canvas;
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, cw, ch);

    // lane 구분선.
    ctx.strokeStyle = '#1e1e30';
    ctx.lineWidth = 1;
    for (let lane = 1; lane <= 3; lane += 1) {
      const x = (cw / 4) * lane;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ch);
      ctx.stroke();
    }

    // 판정선(tick 0) 표시 — 세로축 기준점.
    const zeroY = tickToPixelY(0, ch, timeline, scrollMs, viewMs);
    ctx.strokeStyle = '#4fbcd0';
    ctx.beginPath();
    ctx.moveTo(0, zeroY);
    ctx.lineTo(cw, zeroY);
    ctx.stroke();

    const overlapMap = buildOverlapMap(chart.notes);
    chart.notes.forEach((note, index) => {
      const mark = overlapMap.marks[index];
      if (mark?.kind === 'hidden') return;
      const y0 = tickToPixelY(note.startTick, ch, timeline, scrollMs, viewMs);
      const y1 = tickToPixelY(note.startTick + note.duration, ch, timeline, scrollMs, viewMs);
      const isSelected = selection.has(index);
      let dx = 0;
      let dy = 0;
      if (drag !== null && drag.indices.includes(index) && drag.moved) {
        dx = laneCenterX(clampLane(note.lane + drag.laneDelta), cw) - laneCenterX(note.lane, cw);
        dy =
          -(
            tickToMs(timeline, note.startTick + drag.tickDelta) - tickToMs(timeline, note.startTick)
          ) *
          (ch / viewMs);
      }

      ctx.fillStyle = markColor(mark);
      ctx.strokeStyle = isSelected ? '#4fbcd0' : '#00000000';
      ctx.lineWidth = 2;

      if (note.isWide) {
        const top = Math.min(y0, y1) + dy;
        const height = Math.max(4, Math.abs(y1 - y0));
        ctx.fillRect(0 + dx, top, cw, height);
        if (isSelected) ctx.strokeRect(0 + dx, top, cw, height);
      } else {
        const cx = laneCenterX(note.lane, cw) + dx;
        const top = Math.min(y0, y1) + dy;
        const height = Math.max(4, Math.abs(y1 - y0));
        const w = cw / 4 - 8;
        ctx.fillRect(cx - w / 2, top, w, height);
        if (isSelected) ctx.strokeRect(cx - w / 2, top, w, height);
      }
    });

    if (pendingHold !== null) {
      const y = tickToPixelY(pendingHold.startTick, ch, timeline, scrollMs, viewMs);
      ctx.strokeStyle = '#4fbcd0';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cw, y);
      ctx.stroke();
    }
  }

  function clampLane(lane: number): Lane {
    return Math.min(4, Math.max(1, lane)) as Lane;
  }

  function render(): void {
    renderToolbar();
    draw();
  }

  // ── placement ────────────────────────────────────────────

  function placeTapLike(lane: Lane, tick: number, isWide: boolean): void {
    const note: Note = { startTick: tick, duration: 0, lane, isWide };
    dispatchNoteCommand((s) => addNotesCommand(s, [note]));
  }

  function beginPendingHold(lane: Lane, tick: number): void {
    pendingHold = { lane, startTick: tick };
    render();
  }

  function confirmPendingHold(tick: number): void {
    if (pendingHold === null) return;
    const startTick = Math.min(pendingHold.startTick, tick);
    const endTick = Math.max(pendingHold.startTick, tick);
    const duration = Math.max(cellTick(), endTick - startTick);
    savedLNDur = duration;
    const note: Note = {
      startTick,
      duration,
      lane: pendingHold.lane,
      isWide: tool === 'wideHold',
    };
    pendingHold = null;
    dispatchNoteCommand((s) => addNotesCommand(s, [note]));
  }

  function cellTick(): number {
    return (TICKS_PER_BEAT * 4) / GRID_DIVISOR_DEFAULT;
  }

  function placeQuickHold(lane: Lane, tick: number, isWide: boolean): void {
    const note: Note = { startTick: tick, duration: savedLNDur, lane, isWide };
    dispatchNoteCommand((s) => addNotesCommand(s, [note]));
  }

  // ── selection / delete / clipboard / mirror ────────────────

  function clearSelection(): boolean {
    if (selection.size === 0) return false;
    selection = new Set();
    render();
    return true;
  }

  function deleteSelection(): void {
    if (selection.size === 0) return;
    const indices = [...selection];
    dispatchNoteCommand((s) => deleteNotesCommand(s, indices));
    selection = new Set();
  }

  function copySelection(): void {
    if (selection.size === 0) return;
    const notes = [...selection].map((i) => chart.notes[i]!);
    const minStart = Math.min(...notes.map((n) => n.startTick));
    clipboard = notes.map((n) => ({
      lane: n.lane,
      relTick: n.startTick - minStart,
      duration: n.duration,
      isWide: n.isWide,
    }));
  }

  function pasteClipboard(): void {
    if (clipboard === null || clipboard.length === 0) return;
    const baseTick = snapTick(
      pixelYToTick(canvas.height / 2, canvas.height, timeline, scrollMs, viewMs),
      GRID_DIVISOR_DEFAULT,
    );
    const existing = new Set(chart.notes.map((n) => `${n.lane}:${n.startTick}:${n.isWide}`));
    const toAdd: Note[] = [];
    for (const entry of clipboard) {
      const startTick = baseTick + entry.relTick;
      const key = `${entry.lane}:${startTick}:${entry.isWide}`;
      if (existing.has(key)) continue; // 같은 lane+tick+isWide 충돌은 조용히 스킵.
      toAdd.push({ startTick, duration: entry.duration, lane: entry.lane, isWide: entry.isWide });
    }
    if (toAdd.length === 0) return;
    dispatchNoteCommand((s) => addNotesCommand(s, toAdd));
  }

  function mirrorSelection(): void {
    if (selection.size === 0) return;
    dispatchNoteCommand((s) => mirrorNotesCommand(s, [...selection]));
  }

  // ── pointer 처리 ─────────────────────────────────────────

  let pointerDown: { x: number; y: number } | null = null;
  let longPressTimer: number | null = null;
  let longPressFired = false;

  function canvasPoint(event: PointerEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function cancelLongPress(): void {
    if (longPressTimer !== null) {
      window.clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function onPointerDown(event: PointerEvent): void {
    const { x, y } = canvasPoint(event);
    pointerDown = { x, y };
    longPressFired = false;

    const hitIndex = findNoteIndexAt(
      chart.notes,
      x,
      y,
      canvas.width,
      canvas.height,
      timeline,
      scrollMs,
      viewMs,
    );
    if (hitIndex !== null) {
      if (!event.shiftKey && !selection.has(hitIndex)) selection = new Set([hitIndex]);
      else if (event.shiftKey) {
        const next = new Set(selection);
        if (next.has(hitIndex)) next.delete(hitIndex);
        else next.add(hitIndex);
        selection = next;
      }
      const indices = [...selection];
      const startTick = snapTick(
        pixelYToTick(y, canvas.height, timeline, scrollMs, viewMs),
        GRID_DIVISOR_DEFAULT,
      );
      drag = {
        indices,
        startX: x,
        startY: y,
        startTick,
        moved: false,
        tickDelta: 0,
        laneDelta: 0,
        colShiftAccum: 0,
      };
      render();
      return;
    }

    // 빈 칸 — quick-hold(tap/wideTap에서 롱프레스 300ms) 대기.
    if (tool === 'tap' || tool === 'wideTap') {
      const lane = laneOfX(x, canvas.width);
      const tick = snapTick(
        pixelYToTick(y, canvas.height, timeline, scrollMs, viewMs),
        GRID_DIVISOR_DEFAULT,
      );
      longPressTimer = window.setTimeout(() => {
        longPressFired = true;
        placeQuickHold(lane, tick, tool === 'wideTap');
      }, 300);
    }
  }

  function onPointerMove(event: PointerEvent): void {
    if (pointerDown === null) return;
    const { x, y } = canvasPoint(event);
    const dx = x - pointerDown.x;
    const dy = y - pointerDown.y;
    if (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX) {
      cancelLongPress();
    }

    if (drag !== null) {
      const movedNow = Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX;
      if (movedNow) drag.moved = true;
      if (drag.moved) {
        const curTick = snapTick(
          pixelYToTick(y, canvas.height, timeline, scrollMs, viewMs),
          GRID_DIVISOR_DEFAULT,
        );
        drag.tickDelta = curTick - drag.startTick;

        const colW = canvas.width / 4;
        const threshold = colW * LANE_HYSTERESIS_RATIO;
        const dxFromStart = x - drag.startX;
        while (dxFromStart - drag.colShiftAccum * colW > threshold) {
          drag.colShiftAccum += 1;
        }
        while (dxFromStart - drag.colShiftAccum * colW < -threshold) {
          drag.colShiftAccum -= 1;
        }
        drag.laneDelta = Math.max(-1, Math.min(1, drag.colShiftAccum)) as -1 | 0 | 1;
        render();
      }
    }
  }

  function onPointerUp(event: PointerEvent): void {
    cancelLongPress();
    if (longPressFired) {
      pointerDown = null;
      return;
    }
    const { x, y } = canvasPoint(event);

    if (drag !== null) {
      const wasMoved = drag.moved;
      const d = drag;
      drag = null;
      if (wasMoved) {
        dispatchNoteCommand((s) => moveNotesCommand(s, d.indices, d.tickDelta, d.laneDelta));
      }
      pointerDown = null;
      render();
      return;
    }

    // 클릭(드래그 아님) — 배치 처리.
    const dx = pointerDown === null ? 0 : x - pointerDown.x;
    const dy = pointerDown === null ? 0 : y - pointerDown.y;
    pointerDown = null;
    if (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX) return;

    const hitIndex = findNoteIndexAt(
      chart.notes,
      x,
      y,
      canvas.width,
      canvas.height,
      timeline,
      scrollMs,
      viewMs,
    );
    if (hitIndex !== null) return; // 이미 pointerdown에서 선택 처리됨.

    const lane = laneOfX(x, canvas.width);
    const tick = snapTick(
      pixelYToTick(y, canvas.height, timeline, scrollMs, viewMs),
      GRID_DIVISOR_DEFAULT,
    );

    if (pendingHold !== null) {
      confirmPendingHold(tick);
      render();
      return;
    }

    switch (tool) {
      case 'tap':
        placeTapLike(lane, tick, false);
        break;
      case 'wideTap':
        placeTapLike(lane, tick, true);
        break;
      case 'hold':
      case 'wideHold':
        beginPendingHold(lane, tick);
        break;
    }
    void event;
  }

  function onWheel(event: WheelEvent): void {
    event.preventDefault();
    const pxPerMs = canvas.height / viewMs;
    const deltaMs = event.deltaY / pxPerMs;
    const minMs = tickToMs(timeline, minTick(timeline));
    scrollMs = Math.max(minMs, scrollMs - deltaMs);
    render();
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  render();

  return {
    onKeyDown(event: KeyboardEvent): boolean {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'c' || event.key === 'C') {
          event.preventDefault();
          copySelection();
          return true;
        }
        if (event.key === 'v' || event.key === 'V') {
          event.preventDefault();
          pasteClipboard();
          return true;
        }
        if (event.key === 'f' || event.key === 'F') {
          event.preventDefault();
          mirrorSelection();
          return true;
        }
        return false;
      }

      switch (event.key) {
        case 'q':
        case 'Q':
          tool = 'tap';
          render();
          return true;
        case 'w':
        case 'W':
          tool = 'hold';
          render();
          return true;
        case 'e':
        case 'E':
          tool = 'wideTap';
          render();
          return true;
        case 'r':
        case 'R':
          tool = 'wideHold';
          render();
          return true;
        case 'z':
        case 'Z':
          viewMs = Math.min(VIEW_MS_MAX, viewMs * VIEW_MS_ZOOM_STEP);
          render();
          return true;
        case 'x':
        case 'X':
          viewMs = Math.max(VIEW_MS_MIN, viewMs / VIEW_MS_ZOOM_STEP);
          render();
          return true;
        case 'd':
        case 'D':
        case 'Delete':
          if (selection.size > 0) {
            event.preventDefault();
            deleteSelection();
            return true;
          }
          return false;
        case 'Escape':
          if (pendingHold !== null) {
            pendingHold = null;
            render();
            return true;
          }
          if (clearSelection()) return true;
          return false;
        default:
          return false;
      }
    },
    update(next: Chart): void {
      chart = next;
      timeline = buildTimeline(next);
      render();
    },
    destroy(): void {
      cancelLongPress();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      wrap.remove();
    },
  };
}
