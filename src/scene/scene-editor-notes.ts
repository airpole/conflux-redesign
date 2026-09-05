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
 * **delete(`D`/`Delete`)·paste(`Ctrl+V`)는 note와 text event를 한
 * undo로 합쳐 낸다** — `deleteNotesAndTextEventsCommand`(D-2026-124)·
 * `pasteNotesAndTextEventsCommand`(D-2026-123, `edit-notes-commands.ts`)
 * 가 `notes`·`textEvents` 둘 다 한 apply/undo로 건드린다. 둘 다 같은
 * undo scope `n`을 쓰는데(`editor-commands.md` §2) 따로 dispatch하면
 * Ctrl+Z 한 번에 하나만 되돌아가는 문제가 있었다 — `mirrorEventsCommand`
 * (shapeEvents·laneEvents를 합친 선례)와 같은 패턴으로 닫았다.
 *
 * **M5.5-1(D-2026-129)이 캔버스 시각 디자인 일부를 확정했다** — 정상/wide
 * 노트를 머리+몸통 두 톤으로(`render/theme.md` §1의 `NOTE_COLOR`/
 * `WIDE_BODY_ALPHA`, gameplay와 같은 값 재사용), overlap을 금색 두 톤으로
 * (`OVERLAP_COLOR`, 이번 라운드가 첫 소비자), 마디/박 격자선+번호를
 * `core-timing.ts`의 `gridLines`(원본 grid-render.js 포트, 이번 라운드가
 * 첫 소비자)로 새로 그린다. **conflict(빨강)·selected(파랑 stroke)·판정선·
 * text event·pending 미리보기는 이번 라운드가 건드리지 않았다** — 사용자가
 * 참조한 목표값(빨강 점선 테두리·초록 glow·노랑 삼각 마커)과 실제 코드가
 * 다르다는 걸 확인했지만(구현 격차), 명시적으로 "이번 라운드는 그대로"라고
 * 확인받아 그 격차를 그대로 남겨 뒀다 — 별도 보고.
 *
 * **툴바 크롬(Material Design 3, tabs/버튼 그룹)은 이번 라운드에 포함되지
 * 않았다** — 요청받은 버튼 중 Undo/Redo·Note·Long·Wide·WLN·Txt·Copy·
 * Paste·Flip은 기존 키보드 기능에 매핑되지만, Sel(select-all에 대응하는
 * 기능이 없다)·½(대응 기능 불명)·Fol(D-2026-128로 이미 "미구현" 기록된
 * `F`, follow-중 재생 스크롤)·Files·전체화면 버튼은 대응하는 기능이 이
 * 코드베이스 어디에도 없다 — 사용자 확인 대기, 별도 보고.
 */
import {
  buildTimeline,
  gridLines,
  minTick,
  snapTick,
  songEndOf,
  tickToMs,
  msToTick,
  type Timeline,
} from '../core/core-timing.js';
import { buildOverlapMap, type OverlapMark } from '../core/core-overlap.js';
import { TICKS_PER_BEAT, GRID_DIVISOR_DEFAULT } from '../core/core-constants.js';
import { NOTE_COLOR, OVERLAP_COLOR, WIDE_BODY_ALPHA } from '../render/render-theme.js';
import {
  TEXT_POSITIONS,
  type Chart,
  type Lane,
  type Note,
  type TextEvent,
} from '../core/core-chart.js';
import {
  addNotesCommand,
  deleteNotesAndTextEventsCommand,
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

/** conflict/hidden 표시는 이번 라운드가 건드리지 않는다(사용자 확인,
 *  M5.5-1 2번째 라운드) — 기존 flat fill 그대로 유지한다. 정상/overlap
 *  표시만 아래 `draw()`가 `NOTE_COLOR`/`OVERLAP_COLOR`로 새로 그린다. */
function markColor(mark: OverlapMark | null | undefined): string {
  if (mark === null || mark === undefined) return '#ececf4';
  if (mark.kind === 'conflict') return '#ff5f70';
  if (mark.kind === 'yellow') return '#ffd23f';
  if (mark.kind === 'hidden') return 'transparent';
  return '#ececf4';
}

/** 모서리 반경 `r`인 사각형 path — wide 노트 전용(D-2026-129, `render/theme.md`
 *  §1의 색과 함께 이번 라운드가 새로 그리는 모양). 일반 노트는 계속 각진
 *  사각형이라 이 helper를 안 쓴다. */
function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** wide 노트 모서리 반경(px) — 사용자 확인값("small radius, ~3px"). */
const WIDE_CORNER_RADIUS_PX = 3;
/** note "head" 밴드 두께(px) — tap류는 이 두께 자체가 노트 전체다. */
const NOTE_HEAD_PX = 4;

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
  /** D-2026-126 — 상한은 chart 실제 길이(`contentEndMs`, [[timing]] §9)를
   *  기준으로 삼되, 그보다 더 스크롤하면(편집 중엔 chart 끝 너머로 note를
   *  놓는 게 정상이라 계속 허용한다) 그만큼 자란다 — test scene이 이미
   *  쓰는 `songEndOf` 패턴 그대로(`scene-editor-test.ts` 참조), 음악
   *  재생 길이는 이 씬에서 알 수 없어 test scene과 같이 `null`이다. */
  function scrollbarRange(): { minMs: number; maxMs: number } {
    const minMs = tickToMs(timeline, minTick(timeline));
    const contentEndMs = songEndOf(timeline, chart, null).contentEndMs;
    return {
      minMs,
      maxMs: Math.max(minMs + view.viewMs, contentEndMs, view.scrollMs + view.viewMs),
    };
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

    // 마디/박 격자선 + 번호(D-2026-129) — `core-timing.ts`의 `gridLines`
    // (원본 grid-render.js 포트, 단일 출처)를 그대로 쓴다. 마디선(굵은
    // 번호)과 박선(옅은 회색, 작은 번호)을 구분해 그린다 — 박 "1"은
    // 마디선 자신의 굵은 번호로 대신하고 따로 안 찍는다(원본 로직 그대로).
    const topTick = pixelYToTick(0, ch, timeline, view.scrollMs, view.viewMs);
    const bottomTick = pixelYToTick(ch, ch, timeline, view.scrollMs, view.viewMs);
    for (const line of gridLines(timeline, bottomTick, topTick)) {
      const y = tickToPixelY(line.tick, ch, timeline, view.scrollMs, view.viewMs);
      ctx.strokeStyle = line.isMeasure ? '#3a3a54' : '#33333c';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cw, y);
      ctx.stroke();

      ctx.textBaseline = 'bottom';
      if (line.isMeasure) {
        ctx.fillStyle = '#ececf4';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(String(line.measureNum), 4, y - 2);
      } else {
        ctx.fillStyle = '#5a5a62';
        ctx.font = '9px sans-serif';
        ctx.fillText(String(line.beatInMeasure), 8, y - 2);
      }
    }

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

      ctx.strokeStyle = isSelected ? '#4fbcd0' : '#00000000';
      ctx.lineWidth = 2;

      // conflict/hidden 표시는 이번 라운드가 건드리지 않는다(사용자 확인) —
      // 기존 flat fill 그대로 유지한다. 정상/overlap만 아래 두 톤(머리+몸통)
      // 으로 새로 그린다(D-2026-129, `render/theme.md` §1 색).
      if (mark?.kind === 'conflict') {
        ctx.fillStyle = markColor(mark);
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
        return;
      }

      const isOverlap = mark?.kind === 'yellow';
      const headColor = isOverlap
        ? OVERLAP_COLOR.head
        : note.isWide
          ? NOTE_COLOR.wideHead
          : NOTE_COLOR.normalHead;
      const bodyColor = isOverlap
        ? OVERLAP_COLOR.body
        : note.isWide
          ? WIDE_BODY_ALPHA
          : NOTE_COLOR.normalBody;

      const top = Math.min(y0, y1) + dy;
      const height = Math.max(4, Math.abs(y1 - y0));
      const bottom = top + height;
      const headH = Math.min(NOTE_HEAD_PX, height);

      if (note.isWide) {
        const x = 0 + dx;
        roundedRectPath(ctx, x, top, cw, height, WIDE_CORNER_RADIUS_PX);
        ctx.fillStyle = bodyColor;
        ctx.fill();
        roundedRectPath(ctx, x, bottom - headH, cw, headH, WIDE_CORNER_RADIUS_PX);
        ctx.fillStyle = headColor;
        ctx.fill();
        if (isSelected) ctx.strokeRect(x, top, cw, height);
      } else {
        const cx = laneCenterX(note.lane, cw) + dx;
        const w = cw / 4 - 8;
        const x = cx - w / 2;
        ctx.fillStyle = bodyColor;
        ctx.fillRect(x, top, w, height);
        ctx.fillStyle = headColor;
        ctx.fillRect(x, bottom - headH, w, headH);
        if (isSelected) ctx.strokeRect(x, top, w, height);
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

  /** note·text 선택을 한 undo로 함께 지운다(D-2026-124) — paste와 같은
   *  이유(`pasteNotesAndTextEventsCommand` 참조): 같은 undo scope `n`에
   *  두 dispatch가 쌓이면 Ctrl+Z 한 번에 하나만 되돌아간다. 어느 한쪽이
   *  비어 있어도 안전하다(`deleteNotesAndTextEventsCommand`가 빈 인덱스
   *  배열을 그대로 둔다). */
  function deleteSelection(): void {
    if (selection.size === 0 && textSelection.size === 0) return;
    const noteIndices = [...selection];
    const textIndices = [...textSelection];
    dispatchNoteCommand((s) => deleteNotesAndTextEventsCommand(s, noteIndices, textIndices));
    selection = new Set();
    textSelection = new Set();
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
   *  따라 note·text를 **하나의 구간**으로 합쳐 계산하고, 추가도 한
   *  undo로 합친다(D-2026-125) — 이 모양은 paste가 "두 배열에 추가"로
   *  이미 쓰는 것과 정확히 같아서 새 command를 만들지 않고
   *  `pasteNotesAndTextEventsCommand`를 그대로 재사용한다. 충돌(같은
   *  lane+tick+isWide)은 note만 조용히 스킵한다(paste와 같은 검사) —
   *  text는 원래도 충돌 검사가 없다(겹침 허용). */
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

    const toAddNotes: Note[] = [];
    if (notes.length > 0) {
      const existing = new Set(chart.notes.map((n) => `${n.lane}:${n.startTick}:${n.isWide}`));
      for (const n of notes) {
        const startTick = rangeEnd + (n.startTick - rangeStart);
        const key = `${n.lane}:${startTick}:${n.isWide}`;
        if (existing.has(key)) continue; // 같은 lane+tick+isWide 충돌은 조용히 스킵.
        toAddNotes.push({ startTick, duration: n.duration, lane: n.lane, isWide: n.isWide });
      }
    }
    const toAddTexts: TextEvent[] = texts.map((e) => ({
      startTick: rangeEnd + (e.startTick - rangeStart),
      duration: e.duration,
      content: e.content,
      position: e.position,
    }));
    if (toAddNotes.length === 0 && toAddTexts.length === 0) return;
    // note·text 추가를 한 undo로 합친다(D-2026-125) — paste와 완전히 같은
    // "두 배열에 추가" 모양이라 새 command를 만들지 않고
    // pasteNotesAndTextEventsCommand를 그대로 재사용한다.
    dispatchNoteCommand((s) => pasteNotesAndTextEventsCommand(s, toAddNotes, toAddTexts));
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
