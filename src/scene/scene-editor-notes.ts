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
 * `_extracted/EXTRACTED_FACTS.md` §14). Z/X(`editor-editing.md` §5 배선
 * 확정, `editor-graph.md` §3)가 이 값을 조정한다 — Z=축소(viewMs ×1.35),
 * X=확대(viewMs ÷1.35). 스크롤(마우스 휠)도 지원한다 — `core-timing.ts`의
 * `minTick`으로 하한을 막는다(원본 `getMinTick` 재사용 위치, 이미 코드로
 * 있었다).
 *
 * **`viewMs`/`scrollMs`는 M5-4부터 notes·shapes가 공유한다**
 * (`editor-graph.md` §2 "scroll/zoom: notes·shapes 공유") — 상수·상태
 * 타입은 `scene-editor-view.ts`로 옮겼고, `api.view`로 받은 공유 객체를
 * 그대로 읽고 쓴다. M5-3 때는 이 파일 로컬 상태였다(shapes가 아직 없어
 * 공유할 대상이 없었다) — M5-4가 shapes 씬을 실제로 만들며 옮겼다.
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
 * - 붙여넣기 충돌 시 토스트 안내는 없다(조용히 스킵만 한다) — 토스트
 *   UI 자체가 아직 없다.
 *
 * **M5-7이 text 툴(`T`)을 채웠다**(`edit-text-commands.ts`, D-2026-105).
 * `editor-editing.md` §1은 "textEvent 2클릭(시작→끝)"까지만 정하고
 * content·position을 어떻게 입력받는지는 정하지 않는다 — 원본
 * `text-events.js`처럼 모달 폼(content textarea·position select)을 그
 * 2클릭 뒤에 연다. **원본과 달리 클릭 자체는 모달을 열지 않는다** — 이
 * 코드베이스가 notes에 이미 확립해 둔 "클릭=선택, Shift+클릭=토글" 모델을
 * text event에도 그대로 적용해(§1 "선택에 textEvents가 포함되면 함께
 * 복사·붙여넣기") 별도 `textSelection: Set<number>`로 note와 나란히
 * 관리한다 — **더블클릭이 기존 이벤트의 편집 모달을 연다**(원본의
 * click=모달 대신). 이 갈림은 해석적 결정이라 별도 보고했다.
 *
 * tick 범위(startTick/duration)는 배치 시점(2클릭)에 고정되고 편집 모달
 * 에서는 다시 못 바꾼다 — 원본은 모달에 시작/끝 measure 입력이 있었지만
 * (`teSave`), 이번 라운드는 content·position 두 필드만 다룬다(결정 필요
 * 항목, 범위 밖으로 뒀다). `transition`/`mode` 필드는 애초에
 * `core-chart.ts`의 `TextEvent`에 없다 — `data-model.md` §8이 이미
 * "폐기"로 정해 둔 걸 반영한 결과다.
 *
 * delete(`D`/`Delete`)는 선택된 note와 text event를 **각각 별도
 * dispatch**로 지운다(한 커맨드로 합치지 않았다 — undo가 note/text 두 번
 * 걸린다는 뜻, 결정 필요 항목). copy/paste(`Ctrl+C`/`Ctrl+V`)는 두 종류를
 * 한 클립보드에 같이 담되(§1 "함께 복사·붙여넣기"), 실제 배치는 역시
 * 두 번의 별도 dispatch다.
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
import {
  TEXT_POSITIONS,
  type Chart,
  type Lane,
  type Note,
  type TextEvent,
} from '../core/core-chart.js';
import {
  addNotesCommand,
  deleteNotesCommand,
  mirrorNotesCommand,
  moveNotesCommand,
  pasteNotesAndTextEventsCommand,
  type NotesSessionLike,
} from '../edit/edit-notes-commands.js';
import {
  addTextEventsCommand,
  deleteTextEventsCommand,
  editTextEventCommand,
  type TextEventsSessionLike,
} from '../edit/edit-text-commands.js';
import type { Command } from '../edit/edit-command.js';
import type { EditorCategoryController } from './scene-editor-workspace.js';
import {
  mountEditorScrollbar,
  zoomIn,
  zoomOut,
  type EditorScrollbar,
  type EditorViewState,
} from './scene-editor-view.js';
import './scene-editor-notes.css';

/** 히트 반경(px) — D-2026-096. */
const HIT_RADIUS_PX = 15;
/** 클릭↔드래그 판별 임계값(px) — D-2026-096. */
const DRAG_THRESHOLD_PX = 4;
/** 가로 lane 이동 히스테리시스 비율 — `editor-editing.md` §1(칸폭×0.5). */
const LANE_HYSTERESIS_RATIO = 0.5;

type NoteTool = 'tap' | 'hold' | 'wideTap' | 'wideHold' | 'text';

export interface EditorNotesApi {
  /** 실제 `WorkspaceSession`(또는 그 shape) — `chart`/`updateChart`가 진짜
   *  세션에 그대로 쓴다. command의 `apply()`/`undo()`가 이 객체를 직접
   *  받아 부른다(`edit-notes-commands.ts`/`edit-text-commands.ts`, 둘 다
   *  같은 `{chart, updateChart}` shape라 `session` 하나로 충분하다). */
  readonly session: NotesSessionLike & TextEventsSessionLike;
  /** 실제 `CommandHistory.dispatch` — 이 파일은 엔진을 모른다(M5-2 경계). */
  dispatch(command: Command): void;
  /** notes·shapes 공유 scroll/zoom 상태(M5-4, `scene-editor-view.ts`) —
   *  `scene-editor-workspace.ts`가 만들어 양쪽 mount 함수에 같은 참조로
   *  넘긴다. */
  readonly view: EditorViewState;
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

/** text event는 lane과 무관하게 전체 폭 띠로 그려진다 — y(tick 범위)만
 *  히트 판정한다(note와 달리 x 제약이 없다). */
function findTextEventIndexAt(
  events: readonly TextEvent[],
  py: number,
  canvasHeight: number,
  timeline: Timeline,
  scrollMs: number,
  viewMs: number,
): number | null {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i]!;
    const yStart = tickToPixelY(event.startTick, canvasHeight, timeline, scrollMs, viewMs);
    const yEnd = tickToPixelY(
      event.startTick + event.duration,
      canvasHeight,
      timeline,
      scrollMs,
      viewMs,
    );
    const top = Math.min(yStart, yEnd) - HIT_RADIUS_PX;
    const bottom = Math.max(yStart, yEnd) + HIT_RADIUS_PX;
    if (py >= top && py <= bottom) return i;
  }
  return null;
}

interface ClipboardEntry {
  readonly lane: Lane;
  readonly relTick: number;
  readonly duration: number;
  readonly isWide: boolean;
}

interface TextClipboardEntry {
  readonly relTick: number;
  readonly duration: number;
  readonly content: string;
  readonly position: TextEvent['position'];
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
  const canvasWrap = document.createElement('div');
  canvasWrap.className = 'editor-notes-canvas-wrap';
  const canvas = document.createElement('canvas');
  canvas.className = 'editor-notes-canvas';
  canvas.width = 800;
  canvas.height = 600;
  canvasWrap.append(canvas);
  // text 편집 폼(M5-7, D-2026-105) — 2클릭 배치 뒤 또는 기존 이벤트
  // 더블클릭 시 연다. content textarea + position select + Save/Delete/
  // Cancel. 기본 숨김.
  const textEditorPanel = document.createElement('div');
  textEditorPanel.className = 'editor-text-editor';
  textEditorPanel.hidden = true;
  const textContentInput = document.createElement('textarea');
  textContentInput.className = 'editor-text-editor-content';
  const textPositionSelect = document.createElement('select');
  textPositionSelect.className = 'editor-text-editor-position';
  for (const pos of TEXT_POSITIONS) {
    const opt = document.createElement('option');
    opt.value = pos;
    opt.textContent = pos;
    textPositionSelect.append(opt);
  }
  const textEditorButtons = document.createElement('div');
  textEditorButtons.className = 'editor-text-editor-buttons';
  const textSaveBtn = document.createElement('button');
  textSaveBtn.type = 'button';
  textSaveBtn.textContent = 'Save';
  const textDeleteBtn = document.createElement('button');
  textDeleteBtn.type = 'button';
  textDeleteBtn.textContent = 'Delete';
  const textCancelBtn = document.createElement('button');
  textCancelBtn.type = 'button';
  textCancelBtn.textContent = 'Cancel';
  textEditorButtons.append(textSaveBtn, textDeleteBtn, textCancelBtn);
  textEditorPanel.append(textContentInput, textPositionSelect, textEditorButtons);
  wrap.append(toolbar, canvasWrap, textEditorPanel);
  container.append(wrap);
  const ctx = canvas.getContext('2d');

  let chart = initialChart;
  let timeline = buildTimeline(chart);
  let tool: NoteTool = 'tap';
  let selection = new Set<number>();
  let textSelection = new Set<number>();
  let pendingHold: { readonly lane: Lane; readonly startTick: number } | null = null;
  /** T 툴 2클릭 중 첫 클릭(시작 tick) — pendingHold와 같은 자리. */
  let pendingText: { readonly startTick: number } | null = null;
  /** 편집 모달이 지금 다루는 대상. `index === null`이면 새 배치
   *  (`pendingText`가 확정된 startTick/endTick), 아니면 기존 이벤트 편집
   *  (tick 범위는 재편집하지 않는다 — 파일 헤더 "결정 필요 항목"). */
  let textEditor: {
    readonly index: number | null;
    readonly startTick: number;
    readonly endTick: number;
  } | null = null;
  let savedLNDur = TICKS_PER_BEAT;
  let clipboard: readonly ClipboardEntry[] | null = null;
  let textClipboard: readonly TextClipboardEntry[] | null = null;
  const view = api.view;

  // 세로 scrollbar(M5-6, D-2026-104) — 우측 고정, scrollMs를 드래그로 seek.
  // 상한은 고정 총량이 없어(원래 무제한 스크롤 모델) 현재 스크롤 위치까지
  // 동적으로 늘어난다(scene-editor-view.ts 헤더 참조, 결정 필요 항목).
  const scrollbar: EditorScrollbar = mountEditorScrollbar(canvasWrap, view, () => render());
  function scrollbarRange(): { minMs: number; maxMs: number } {
    const minMs = tickToMs(timeline, minTick(timeline));
    return { minMs, maxMs: Math.max(minMs + view.viewMs, view.scrollMs + view.viewMs) };
  }

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

  function dispatchTextCommand(build: (s: TextEventsSessionLike) => Command): void {
    api.dispatch(build(api.session));
  }

  function toolbarLabel(t: NoteTool): string {
    return {
      tap: 'Tap (Q)',
      hold: 'Hold (W)',
      wideTap: 'Wide Tap (E)',
      wideHold: 'Wide Hold (R)',
      text: 'Text (T)',
    }[t];
  }

  function renderToolbar(): void {
    toolbar.replaceChildren();
    const label = document.createElement('span');
    label.className = 'editor-notes-tool-label';
    label.textContent = toolbarLabel(tool);
    const sel = document.createElement('span');
    sel.className = 'editor-notes-sel-label';
    const selectedCount = selection.size + textSelection.size;
    sel.textContent = selectedCount > 0 ? `${selectedCount} selected` : '';
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
    const zeroY = tickToPixelY(0, ch, timeline, view.scrollMs, view.viewMs);
    ctx.strokeStyle = '#4fbcd0';
    ctx.beginPath();
    ctx.moveTo(0, zeroY);
    ctx.lineTo(cw, zeroY);
    ctx.stroke();

    const overlapMap = buildOverlapMap(chart.notes);
    chart.notes.forEach((note, index) => {
      const mark = overlapMap.marks[index];
      if (mark?.kind === 'hidden') return;
      const y0 = tickToPixelY(note.startTick, ch, timeline, view.scrollMs, view.viewMs);
      const y1 = tickToPixelY(
        note.startTick + note.duration,
        ch,
        timeline,
        view.scrollMs,
        view.viewMs,
      );
      const isSelected = selection.has(index);
      let dx = 0;
      let dy = 0;
      if (drag !== null && drag.indices.includes(index) && drag.moved) {
        dx = laneCenterX(clampLane(note.lane + drag.laneDelta), cw) - laneCenterX(note.lane, cw);
        dy =
          -(
            tickToMs(timeline, note.startTick + drag.tickDelta) - tickToMs(timeline, note.startTick)
          ) *
          (ch / view.viewMs);
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
      const y = tickToPixelY(pendingHold.startTick, ch, timeline, view.scrollMs, view.viewMs);
      ctx.strokeStyle = '#4fbcd0';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cw, y);
      ctx.stroke();
    }

    // text event(M5-7) — lane과 무관한 전체 폭 띠, 왼쪽에 content 미리보기.
    const textStripW = 10;
    chart.textEvents.forEach((event, index) => {
      const y0 = tickToPixelY(event.startTick, ch, timeline, view.scrollMs, view.viewMs);
      const y1 = tickToPixelY(
        event.startTick + event.duration,
        ch,
        timeline,
        view.scrollMs,
        view.viewMs,
      );
      const top = Math.min(y0, y1);
      const height = Math.max(4, Math.abs(y1 - y0));
      const isSelected = textSelection.has(index);
      ctx.fillStyle = isSelected ? '#4fbcd0' : '#ffd23f';
      ctx.fillRect(0, top, textStripW, height);
      ctx.fillStyle = '#ececf4';
      ctx.font = '11px sans-serif';
      ctx.textBaseline = 'top';
      const preview = event.content.split('\n')[0]!.slice(0, 24);
      ctx.fillText(`[${event.position}] ${preview}`, textStripW + 4, top + 2);
    });

    if (pendingText !== null) {
      const y = tickToPixelY(pendingText.startTick, ch, timeline, view.scrollMs, view.viewMs);
      ctx.strokeStyle = '#ffd23f';
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
    scrollbar.update(scrollbarRange());
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

  // ── text event 배치·편집(M5-7) ──────────────────────────────

  function beginPendingText(tick: number): void {
    pendingText = { startTick: tick };
    render();
  }

  /** T 툴 2번째 클릭 — tick 범위가 확정되면 새 이벤트용 편집 모달을 연다
   *  (원본 `teNewRange`처럼 content가 비어 있는 채로). 아직 dispatch하지
   *  않는다 — Save를 눌러야 실제로 추가된다. */
  function confirmPendingText(tick: number): void {
    if (pendingText === null) return;
    const startTick = Math.min(pendingText.startTick, tick);
    const endTick = Math.max(cellTick() + startTick, Math.max(pendingText.startTick, tick));
    pendingText = null;
    openTextEditor(null, startTick, endTick);
  }

  function openTextEditor(index: number | null, startTick: number, endTick: number): void {
    textEditor = { index, startTick, endTick };
    const existing = index !== null ? chart.textEvents[index] : null;
    textContentInput.value = existing?.content ?? '';
    textPositionSelect.value = existing?.position ?? 'middle';
    textDeleteBtn.hidden = index === null;
    textEditorPanel.hidden = false;
    textContentInput.focus();
  }

  function closeTextEditor(): void {
    textEditor = null;
    textEditorPanel.hidden = true;
  }

  function saveTextEditor(): void {
    if (textEditor === null) return;
    const { index, startTick, endTick } = textEditor;
    const content = textContentInput.value;
    const position = textPositionSelect.value as TextEvent['position'];
    closeTextEditor();
    if (index === null) {
      const event: TextEvent = { startTick, duration: endTick - startTick, content, position };
      dispatchTextCommand((s) => addTextEventsCommand(s, [event]));
    } else {
      dispatchTextCommand((s) => editTextEventCommand(s, index, { content, position }));
    }
  }

  function deleteTextEditorTarget(): void {
    if (textEditor === null || textEditor.index === null) return;
    const index = textEditor.index;
    closeTextEditor();
    dispatchTextCommand((s) => deleteTextEventsCommand(s, [index]));
    textSelection = new Set();
  }

  textSaveBtn.addEventListener('click', saveTextEditor);
  textDeleteBtn.addEventListener('click', deleteTextEditorTarget);
  textCancelBtn.addEventListener('click', () => {
    closeTextEditor();
    render();
  });

  // ── selection / delete / clipboard / mirror ────────────────

  function clearSelection(): boolean {
    if (selection.size === 0 && textSelection.size === 0) return false;
    selection = new Set();
    textSelection = new Set();
    render();
    return true;
  }

  /** note·text 선택을 각각 별도 dispatch로 지운다(파일 헤더 "결정 필요
   *  항목" — 한 undo로 합치지 않았다). */
  function deleteSelection(): void {
    if (selection.size > 0) {
      const indices = [...selection];
      dispatchNoteCommand((s) => deleteNotesCommand(s, indices));
      selection = new Set();
    }
    if (textSelection.size > 0) {
      const indices = [...textSelection];
      dispatchTextCommand((s) => deleteTextEventsCommand(s, indices));
      textSelection = new Set();
    }
  }

  /** note·textEvent 선택을 하나의 클립보드에 함께 담는다(`editor-editing.md`
   *  §1 "선택에 textEvents가 포함돼 있으면 함께 복사·붙여넣기"). 기준점은
   *  둘을 합친 전체의 최소 tick이다. */
  function copySelection(): void {
    if (selection.size === 0 && textSelection.size === 0) return;
    const notes = [...selection].map((i) => chart.notes[i]!);
    const texts = [...textSelection].map((i) => chart.textEvents[i]!);
    const starts = [...notes.map((n) => n.startTick), ...texts.map((e) => e.startTick)];
    const minStart = Math.min(...starts);
    clipboard =
      notes.length > 0
        ? notes.map((n) => ({
            lane: n.lane,
            relTick: n.startTick - minStart,
            duration: n.duration,
            isWide: n.isWide,
          }))
        : null;
    textClipboard =
      texts.length > 0
        ? texts.map((e) => ({
            relTick: e.startTick - minStart,
            duration: e.duration,
            content: e.content,
            position: e.position,
          }))
        : null;
  }

  /** note·text 붙여넣기를 한 undo로 합친다(D-2026-123) — §1 "선택에
   *  textEvents가 포함돼 있으면 함께 복사·붙여넣기"와 `editor-commands.md`
   *  §2(notes·textEvents가 같은 undo scope `n`)가 이미 "함께"를 말했지만,
   *  지금까지는 각각 별도 dispatch라 Ctrl+Z 한 번에 text만 되돌아가고
   *  note는 남는 문제가 있었다. `pasteNotesAndTextEventsCommand`
   *  (`edit-notes-commands.ts`)가 둘을 한 커맨드로 묶는다 — 어느 한쪽이
   *  비어 있어도(note만/text만 복사했던 경우) 안전하다. */
  function pasteClipboard(): void {
    const baseTick = snapTick(
      pixelYToTick(canvas.height / 2, canvas.height, timeline, view.scrollMs, view.viewMs),
      GRID_DIVISOR_DEFAULT,
    );
    const toAddNotes: Note[] = [];
    if (clipboard !== null && clipboard.length > 0) {
      const existing = new Set(chart.notes.map((n) => `${n.lane}:${n.startTick}:${n.isWide}`));
      for (const entry of clipboard) {
        const startTick = baseTick + entry.relTick;
        const key = `${entry.lane}:${startTick}:${entry.isWide}`;
        if (existing.has(key)) continue; // 같은 lane+tick+isWide 충돌은 조용히 스킵.
        toAddNotes.push({
          startTick,
          duration: entry.duration,
          lane: entry.lane,
          isWide: entry.isWide,
        });
      }
    }
    const toAddTexts: TextEvent[] =
      textClipboard !== null
        ? textClipboard.map((entry) => ({
            startTick: baseTick + entry.relTick,
            duration: entry.duration,
            content: entry.content,
            position: entry.position,
          }))
        : [];
    if (toAddNotes.length === 0 && toAddTexts.length === 0) return;
    dispatchNoteCommand((s) => pasteNotesAndTextEventsCommand(s, toAddNotes, toAddTexts));
  }

  function mirrorSelection(): void {
    if (selection.size === 0) return;
    dispatchNoteCommand((s) => mirrorNotesCommand(s, [...selection]));
  }

  /** Ctrl+D — 선택 구간을 그 길이만큼 바로 뒤에 복제한다(§7 "duplicate
   *  구간 복제 ... Ableton식", shapes 씬의 `duplicateSelection`과 같은
   *  규칙, D-2026-120). note·textEvent는 chain이 아니라 `startTick`이
   *  그대로 실제 배치 위치라서(shapes/lane처럼 정규화가 다시 세우는
   *  값이 아니다) `copySelection`의 relTick(선택 최소 **startTick** 기준)을
   *  그대로 쓸 수 있다 — shapes에서 겪은 "단일 선택의 구간이 0으로
   *  계산돼 제자리에서 스스로와 충돌하는" 문제가 애초에 생기지 않는다
   *  (범위가 이미 startTick~dest 기준이라 단일 항목도 자기 길이만큼
   *  나온다). §1 "선택에 textEvents가 포함돼 있으면 함께 복사·붙여넣기"를
   *  따라 note·text를 **하나의 구간**으로 합쳐 계산하되, dispatch는
   *  기존 관례대로 각각 별도다. 충돌(같은 lane+tick+isWide)은 note만
   *  조용히 스킵한다(paste와 같은 검사) — text는 원래도 충돌 검사가
   *  없다(겹침 허용). */
  function duplicateSelection(): void {
    if (selection.size === 0 && textSelection.size === 0) return;
    const notes = [...selection].map((i) => chart.notes[i]!);
    const texts = [...textSelection].map((i) => chart.textEvents[i]!);
    const starts = [...notes.map((n) => n.startTick), ...texts.map((e) => e.startTick)];
    const dests = [
      ...notes.map((n) => n.startTick + n.duration),
      ...texts.map((e) => e.startTick + e.duration),
    ];
    const rangeStart = Math.min(...starts);
    const rangeEnd = Math.max(...dests);

    if (notes.length > 0) {
      const existing = new Set(chart.notes.map((n) => `${n.lane}:${n.startTick}:${n.isWide}`));
      const toAdd: Note[] = [];
      for (const n of notes) {
        const startTick = rangeEnd + (n.startTick - rangeStart);
        const key = `${n.lane}:${startTick}:${n.isWide}`;
        if (existing.has(key)) continue; // 같은 lane+tick+isWide 충돌은 조용히 스킵.
        toAdd.push({ startTick, duration: n.duration, lane: n.lane, isWide: n.isWide });
      }
      if (toAdd.length > 0) dispatchNoteCommand((s) => addNotesCommand(s, toAdd));
    }
    if (texts.length > 0) {
      const toAdd: TextEvent[] = texts.map((e) => ({
        startTick: rangeEnd + (e.startTick - rangeStart),
        duration: e.duration,
        content: e.content,
        position: e.position,
      }));
      dispatchTextCommand((s) => addTextEventsCommand(s, toAdd));
    }
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
      view.scrollMs,
      view.viewMs,
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
        pixelYToTick(y, canvas.height, timeline, view.scrollMs, view.viewMs),
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

    // text event 히트(M5-7) — note와 같은 클릭=선택/Shift=토글 모델이지만
    // 드래그 이동은 없다(파일 헤더 "결정 필요 항목").
    const textHitIndex = findTextEventIndexAt(
      chart.textEvents,
      y,
      canvas.height,
      timeline,
      view.scrollMs,
      view.viewMs,
    );
    if (textHitIndex !== null) {
      if (!event.shiftKey && !textSelection.has(textHitIndex))
        textSelection = new Set([textHitIndex]);
      else if (event.shiftKey) {
        const next = new Set(textSelection);
        if (next.has(textHitIndex)) next.delete(textHitIndex);
        else next.add(textHitIndex);
        textSelection = next;
      }
      render();
      return;
    }

    // 빈 칸 — quick-hold(tap/wideTap에서 롱프레스 300ms) 대기.
    if (tool === 'tap' || tool === 'wideTap') {
      const lane = laneOfX(x, canvas.width);
      const tick = snapTick(
        pixelYToTick(y, canvas.height, timeline, view.scrollMs, view.viewMs),
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
          pixelYToTick(y, canvas.height, timeline, view.scrollMs, view.viewMs),
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
      view.scrollMs,
      view.viewMs,
    );
    if (hitIndex !== null) return; // 이미 pointerdown에서 선택 처리됨.

    const textHitIndex = findTextEventIndexAt(
      chart.textEvents,
      y,
      canvas.height,
      timeline,
      view.scrollMs,
      view.viewMs,
    );
    if (textHitIndex !== null) return; // 이미 pointerdown에서 선택 처리됨.

    const lane = laneOfX(x, canvas.width);
    const tick = snapTick(
      pixelYToTick(y, canvas.height, timeline, view.scrollMs, view.viewMs),
      GRID_DIVISOR_DEFAULT,
    );

    if (pendingHold !== null) {
      confirmPendingHold(tick);
      render();
      return;
    }
    if (pendingText !== null) {
      confirmPendingText(tick);
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
      case 'text':
        beginPendingText(tick);
        break;
    }
    void event;
  }

  function onDoubleClick(event: MouseEvent): void {
    const rect = canvas.getBoundingClientRect();
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    const textHitIndex = findTextEventIndexAt(
      chart.textEvents,
      y,
      canvas.height,
      timeline,
      view.scrollMs,
      view.viewMs,
    );
    if (textHitIndex === null) return;
    event.preventDefault();
    const target = chart.textEvents[textHitIndex]!;
    openTextEditor(textHitIndex, target.startTick, target.startTick + target.duration);
  }

  function onWheel(event: WheelEvent): void {
    event.preventDefault();
    const pxPerMs = canvas.height / view.viewMs;
    const deltaMs = event.deltaY / pxPerMs;
    const minMs = tickToMs(timeline, minTick(timeline));
    view.scrollMs = Math.max(minMs, view.scrollMs - deltaMs);
    render();
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('dblclick', onDoubleClick);

  render();

  return {
    onKeyDown(event: KeyboardEvent): boolean {
      if (textEditor !== null) {
        // 모달이 열린 동안은 이 파일의 단축키를 전부 죽인다 — `true`만
        // 돌려주고 `preventDefault()`는 안 하므로 네이티브 textarea 입력
        // (Ctrl+C/V 포함)은 그대로 통과한다. `Escape`만 취소로 가로챈다.
        if (event.key === 'Escape') {
          closeTextEditor();
          render();
        }
        return true;
      }
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
        if (event.key === 'd' || event.key === 'D') {
          if (selection.size === 0 && textSelection.size === 0) return false;
          event.preventDefault();
          duplicateSelection();
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
        case 't':
        case 'T':
          tool = 'text';
          render();
          return true;
        case 'z':
        case 'Z':
          zoomOut(view);
          render();
          return true;
        case 'x':
        case 'X':
          zoomIn(view);
          render();
          return true;
        case 'd':
        case 'D':
        case 'Delete':
          if (selection.size > 0 || textSelection.size > 0) {
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
          if (pendingText !== null) {
            pendingText = null;
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
      canvas.removeEventListener('dblclick', onDoubleClick);
      scrollbar.destroy();
      wrap.remove();
    },
  };
}
