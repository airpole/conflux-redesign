/**
 * shapes 씬 — shape/lane 서브모드 편집 캔버스, M5-4. 단일 출처
 * `editor/editor-editing.md` §2·§3(symmetry)·§4(mirror는 이번 라운드 범위
 * 밖 — 아래 "단순화"), core 정의는 `core/shape.md`·`core/lane-events.md`.
 * command는 `edit-shape-commands.ts`(M5-2 엔진 위, Add/Delete 4개).
 *
 * `scene-editor-workspace.ts`의 `EditorCategoryController` delegation
 * 자리에 꽂힌다 — `scene-editor-notes.ts`(M5-3)와 같은 패턴이다.
 *
 * **M5-4 前 gate("shape 보조 툴(normalize 등)의 계승 여부")는 실측으로
 * 닫혔다(D-2026-099)**: `conflux-editor` 전체(`shape-input.js`·
 * `shape-tools.js`·HTML 툴바)에서 "normalize"라는 이름의 **사용자 노출
 * 툴/버튼은 찾지 못했다** — 유일한 "normalize"는 `shape.js`의
 * `normalizeShapeChain()`, 매 편집 커맨드의 apply/undo 안에서 자동으로
 * 불리는 내부 배열 정합화 함수다. 이건 이미 `editor-commands.md` §6
 * "shape/lane command는 apply·undo 양쪽에서 chain normalize"로 **확정돼
 * 있던 요구사항**이고, 이 파일이 `edit-shape-commands.ts`의
 * `normalizeShapeEvents`/`normalizeLaneEvents`로 구현했다 — 별도로
 * "계승할지 말지" 결정할 대상이 아니었다. 자세한 근거는
 * `_extracted/EXTRACTED_FACTS.md` §15.
 *
 * **좌표계**: 세로 = 시간(notes와 같은 ms 비례 축, `viewMs`/`scrollMs`를
 * `scene-editor-view.ts`로 공유 — `editor-graph.md` §2). 가로 = shape
 * 외부단위 -8~+8(`shape.md` §3)을 캔버스 폭 전체에 선형 매핑한다. lane
 * 구분선은 그 tick의 Blue·Red 경계 사이 상대 위치(`lane-events.md` §3)를
 * 같은 외부단위 공간으로 투영해(`left + targetPos×(right-left)`) 함께
 * 그린다 — 항상 5개 체인(Blue·1·2·3·Red)을 같이 그리고, 활성 서브모드의
 * 체인만 클릭 대상이 된다(§2 "선택·Ctrl+A는 서브모드 필터").
 *
 * **히트 반경 35px·배치 좌표 스냅**은 `shape-input.js`/`shape-tools.js`
 * 재실측이다 — `findDotAt`/`findShapeEvtAt`/`handleSTap`의 del 툴이 전부
 * `bd = 35`(px) 하나만 쓴다(D-2026-099).
 *
 * **기존 점 드래그 재배치는 D-2026-100(M5-4 후속)이 구현했다** —
 * `MutateShapeEvents`/`MutateLaneEvents`(`edit-shape-commands.ts`). 클릭
 * 대상이 기존 점이면 즉시 선택하지 않고 "잠정 드래그"로 시작한다 —
 * 포인터가 드래그 임계(3px, D-2026-099 §15.2 "점 재배치·그룹 이동")를
 * 넘기 전에 떼면 클릭(선택 토글)으로, 넘으면 드래그로 갈린다
 * (`scene-editor-notes.ts`의 click-vs-drag 판별과 같은 패턴).
 *
 * **드래그는 위치(`targetPos`)만 바꾼다 — tick은 바뀌지 않는다.** 근거는
 * 두 가지다: (1) `editor-editing.md` §2 "기존 이벤트 dot 드래그 = 위치
 * 수정(drag-end 커맨드)"이 이미 그렇게 명시했다. (2) 원본 `shape-input.js`의
 * `onMove` `dragDot` 분기를 다시 확인해도 `targetPos`만 갱신하고
 * `startTick`/`duration`은 건드리지 않는다(가로 이동만, 세로=시간축은
 * 드래그 대상이 아니다). anchor(`easing===null`)도 위치는 옮길 수 있다
 * (`editor-editing.md` §2 "init 이동 = ... + 드래그" — 삭제만 막힌다,
 * `deleteShapeEventsCommand`의 anchor 보호와는 다른 규칙).
 *
 * **symmetry는 드래그에 적용되지 않는다** — 원본 `shape-input.js`의
 * `dragDot`/`dragMoveSel` 분기 어디에도 `ES.sMirror` 참조가 없다(mirror는
 * `handleSTap`의 **배치** 경로에만 있다). 드래그는 항상 단일 이벤트
 * 하나만 옮긴다 — symmetry 짝은 자동으로 따라 움직이지 않는다. 이건
 * 추측이 아니라 원본 코드에 그렇게 나와 있다.
 *
 * **위치 스냅은 드래그 중에도 계속 적용된다** — 원본이 매 `onMove`마다
 * `snapPos()`를 부르는 것과 같다(`POS_SNAP_STEP`, shape/lane 공통).
 *
 * **composite dot(center/pinch로 배치된, 같은 tick의 Blue+Red 쌍) 드래그는
 * D-2026-101(M5-4 후속)이 구현했다** — `findShapeHitAt`이 원본 `findDotAt`
 * (`shape-input.js`)을 재구현해 단일 점(`dot`/`init`)뿐 아니라 `center`/
 * `pinch` 복합 후보도 같은 최소거리 경쟁에 넣는다. 원본을 다시 읽어
 * 정확한 그룹핑 규칙을 확인했다:
 * - **`pinch` 후보**는 같은 tick에 Blue·Red가 **둘 다** 있고, 위치 차이가
 *   0.5 미만이며 **둘 다 anchor가 아닐 때만**(`easing !== null`) 생긴다.
 * - **`center` 후보**는 Blue·Red 중 **하나만 있어도**(half-pair) 생긴다 —
 *   히트 지점은 그 tick의 실제 evaluated 경계 중점(`shapeGeometryAt`)이지,
 *   이벤트 자신의 저장값이 아니다(원본 `getShape(tk).left/right`와 동일).
 *
 * 드래그 동작도 원본 `onMove`를 그대로 옮겼다: **`pinch`는 두 쪽 다
 * 커서 위치로**(간격이 있었어도 드래그하면 하나로 모인다), **`center`는
 * 드래그 시작 시점의 폭(Red−Blue, 부호 있음)을 그대로 유지한 채 커서를
 * 중심으로** 움직인다(원본은 매 프레임 `getShape()`으로 폭을 다시
 * 계산하지만, 그 폭이 프레임마다 안 바뀌므로 — 매번 같은 halfW로
 * 대칭 재배치하니 — 드래그 시작 시 한 번만 캡처해도 결과가 같다).
 * half-pair `center`는 존재하는 쪽만 갱신한다. **composite 드래그도 한
 * undo 단위다** — `mutateShapeEventsCommand`가 index/targetPos 쌍을
 * 배열로 받아 한 커맨드로 묶는다(`editor-commands.md` §4 "drag-end에
 * snapshot command 1개").
 *
 * **Ctrl+F(선택 mirror)는 M6-후속이 닫았다** — `mirrorSelection()`이
 * `shapeSelection`·`laneSelection`(서브모드와 무관하게 둘 다 항상 유지되는
 * Set)을 합쳐 `mirrorEventsCommand`(`edit-shape-commands.ts`) 하나로
 * 낸다 — §4 "shape·lane 선택을 합쳐 한 번에 건다"를 그대로 만족한다.
 * shape는 축(중심) 0 기준 `targetPos′=-targetPos`+`isBlue` 반전, lane은
 * 축(중심) 0.5 기준 `targetPos′=1-targetPos`(`lineNum` 불변) — 자세한
 * 유도는 `edit-shape-commands.ts` 헤더.
 *
 * **클립보드(Ctrl+C/V)는 M6-후속이 닫았다** — notes 탭의 기존 패턴(§1)을
 * 그대로 옮겼다. mirror와 달리 서브모드 필터를 그대로 따른다(§1 "선택·
 * Ctrl+A는 서브모드 필터... 유일한 예외는 mirror") — `shapeClipboard`·
 * `laneClipboard`가 따로 있다. 복사는 선택 최소 dest tick(`startTick+
 * duration`) 기준 `relTick`으로 저장하고, 붙여넣기는 현재 스크롤 위치의
 * 스냅 tick을 기준점 삼아 `relTick`을 더한다. 충돌(같은 dest tick·같은
 * 체인)은 `hasShapeEventAtDest`/`hasLaneEventAtDest`(배치 때와 같은
 * 검사)로 조용히 스킵한다 — "전부 충돌이면 toast"(§1)는 이 에디터에
 * toast UI가 없어(`app-editor.ts` 헤더 참조) notes 탭도 안 하는 기존
 * 생략을 그대로 따랐다(결정 필요 항목).
 *
 * **이번 라운드가 단순화한 지점(전부 결정 필요 항목으로 남김)**:
 * - **symmetry 축은 항상 동적 스냅샷**이다(§3 "배치 지점 기준 쌍 평균") —
 *   드래그로 축을 수동 조절하는 UI·"토글 off까지 유지" 상태는 없다.
 * - **lane 그룹은 토글-누적 방식이다** — 원본은 Q/W/E를 물리적으로
 *   동시에 누르고 있는 상태로 그룹을 표현하지만(`keydown`/`keyup`),
 *   `EditorCategoryController`가 `onKeyDown`만 위임하고 `keyup`은
 *   델리게이션 경로가 없다. 이 파일이 직접 `document`에 `keyup`을
 *   구독할 수도 있었지만, "누르고 있는 동안" 모델은 테스트 신뢰성이
 *   낮아 **누를 때마다 그룹 멤버십을 토글**하는 방식을 택했다(마지막
 *   1개는 토글로 비우지 않는다 — 항상 최소 1개 유지). 결과로 얻는 그룹
 *   구성 집합은 원본과 같다 — 입력 메커니즘만 다르다.
 * - **lane symmetry는 그룹이 정확히 2개일 때만 적용된다** — §3의 "쌍"
 *   개념이 2개 조합(1-2/2-3/1-3)을 전제하므로, group.size가 1이나
 *   3이면 symmetry 토글이 켜져 있어도 대칭 생성 없이 일반 그룹 배치로
 *   떨어진다.
 * - **laneGridDivisor 드롭다운·`V` 위치 스냅 순환 UI가 없다** —
 *   `laneGridDivisor`는 4(spec 기본값) 고정, 위치 스냅은 항상 최소
 *   단계(0.25, shape/lane 공통)로 고정했다.
 * - **같은 dest tick·같은 체인에 이미 이벤트가 있으면 배치를 조용히
 *   건너뛴다** — 원본은 그 자리에서 easing만 갱신했지만(`addShapeEvt`
 *   "sameTickSameSide"), 이 command 모델은 추가 전용이라 갱신을
 *   표현하려면 별도 command가 필요하다 — 후속 라운드로 미룬다.
 * - **init(anchor, `easing===null`) 점은 삭제·선택 대상에서 제외**한다
 *   (원본 del 툴과 동일 — 조용히 무시).
 */
import {
  buildTimeline,
  minTick,
  snapTick,
  tickToMs,
  msToTick,
  type Timeline,
} from '../core/core-timing.js';
import { GRID_DIVISOR_DEFAULT } from '../core/core-constants.js';
import {
  buildFieldGeometry,
  laneLayoutAt,
  resolveArcEasing,
  shapeGeometryAt,
} from '../core/core-shape.js';
import type { Chart, Easing, LaneEvent, ShapeEvent } from '../core/core-chart.js';
import {
  addLaneEventsCommand,
  addShapeEventsCommand,
  deleteLaneEventsCommand,
  deleteShapeEventsCommand,
  mirrorEventsCommand,
  mutateLaneEventCommand,
  mutateShapeEventsCommand,
  type ShapeSessionLike,
} from '../edit/edit-shape-commands.js';
import type { Command } from '../edit/edit-command.js';
import type { EditorCategoryController } from './scene-editor-workspace.js';
import {
  mountEditorScrollbar,
  zoomIn,
  zoomOut,
  type EditorScrollbar,
  type EditorViewState,
} from './scene-editor-view.js';
import './scene-editor-shapes.css';

/** 히트 반경(px) — D-2026-099, `shape-input.js` `bd = 35` 재실측. */
const HIT_RADIUS_PX = 35;
/** 점 재배치 드래그 판별 임계값(px) — D-2026-099 §15.2, `dragDot`/`dragMoveSel` 재실측. */
const DRAG_THRESHOLD_PX = 3;
/** 위치축 스냅 단계 — `shape.md` §3 최소 단계(0.25) 고정(V 순환 UI는 이번 라운드 밖). */
const POS_SNAP_STEP = 0.25;
/** lane 가로 그리드 분할 수 — `lane-events.md` §5 기본값(4) 고정(드롭다운은 이번 라운드 밖). */
const LANE_GRID_DIVISOR = 4;

type SubMode = 'shape' | 'lane';
type ShapeTool = 'blue' | 'center' | 'red' | 'pinch';
type LaneMode = 'spread' | 'pinch';
type EasingChoice = 'Arc' | 'In-Sine' | 'Out-Sine' | 'Linear';
type LineNum = 1 | 2 | 3;

/** 클립보드 항목(§1 "복사 = {..., relTick(선택 최소 tick 기준), ...}"과
 *  같은 형태를 shape/lane 필드로 옮겼다). `relTick`은 **dest tick**(=
 *  `startTick+duration`, 보간 이벤트의 "그 위치") 기준 — anchor는
 *  선택 자체에서 제외돼 있어(파일 헤더) dest가 항상 유효하다. */
interface ShapeClipboardEntry {
  readonly relTick: number;
  readonly isBlue: boolean;
  readonly targetPos: number;
  readonly easing: Easing;
}
interface LaneClipboardEntry {
  readonly relTick: number;
  readonly lineNum: LineNum;
  readonly targetPos: number;
  readonly easing: Easing;
}

/** 단일 점(Q/E로 놓은 하나의 체인 이벤트, anchor 포함) 히트. */
interface ShapePointHit {
  readonly kind: 'point';
  readonly index: number;
}

/** composite dot 히트(D-2026-101) — 같은 tick의 Blue+Red 쌍. 원본
 *  `findDotAt`의 `center`/`pinch` 후보와 같다: `center`는 한쪽만 있어도
 *  후보가 되고(half-pair), `pinch`는 둘 다 있고 위치가 0.5 미만 차이 +
 *  둘 다 anchor가 아닐 때만 후보가 된다(아래 `findShapeHitAt`). */
interface ShapeCompositeHit {
  readonly kind: 'center' | 'pinch';
  readonly tick: number;
  readonly blueIndex: number | null;
  readonly redIndex: number | null;
}

type ShapeHit = ShapePointHit | ShapeCompositeHit;

export interface EditorShapesApi {
  readonly session: ShapeSessionLike;
  dispatch(command: Command): void;
  readonly view: EditorViewState;
}

// ── 좌표 변환 ────────────────────────────────────────────────

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

/** 외부단위(-8~+8) → px(0~canvasWidth). 원본 `sp2f`의 재설계 대응. */
function extToPx(ext: number, canvasWidth: number): number {
  return ((ext + 8) / 16) * canvasWidth;
}

function pxToExt(px: number, canvasWidth: number): number {
  return (px / canvasWidth) * 16 - 8;
}

function snapExt(ext: number): number {
  const snapped = Math.round(ext / POS_SNAP_STEP) * POS_SNAP_STEP;
  return Math.min(8, Math.max(-8, snapped));
}

function snapRel(rel: number): number {
  return Math.round(rel * LANE_GRID_DIVISOR) / LANE_GRID_DIVISOR;
}

/** lane의 상대 targetPos를 shape와 같은 외부단위 공간으로 투영한다
 *  (`lane-events.md` §3: `데이터 위치 = lerp(왼쪽 경계, 오른쪽 경계, targetPos)`). */
function laneRelToExt(rel: number, blue: number, red: number): number {
  const left = Math.min(blue, red);
  const right = Math.max(blue, red);
  return left + rel * (right - left);
}

function extToLaneRel(ext: number, blue: number, red: number): number {
  const left = Math.min(blue, red);
  const right = Math.max(blue, red);
  if (right === left) return 0;
  return (ext - left) / (right - left);
}

// ── easing 선택 ──────────────────────────────────────────────

/** lane 체인의 Arc 해석 — `core-shape.ts`의 `resolveArcEasing`(shape용)과
 *  같은 알고리즘을 `lineNum` 선택자로 재구현한다. lane 전용 체인이 core에
 *  없어(§6 "구현도 shape와 한 파일" — 평가만 공유, Arc 해석은 편집 전용
 *  결정이라 core에 없었다) 이 파일에 최소 범위로 뒀다. */
function resolveLaneArcEasing(
  laneEvents: readonly LaneEvent[],
  lineNum: LineNum,
  tick: number,
): 'Out-Sine' | 'In-Sine' {
  let previous: LaneEvent | undefined;
  let latestDest = -Infinity;
  for (const event of laneEvents) {
    if (event.lineNum !== lineNum || event.easing === null) continue;
    const dest = event.startTick + event.duration;
    if (dest >= tick) continue;
    if (dest >= latestDest) {
      latestDest = dest;
      previous = event;
    }
  }
  if (previous === undefined) return 'Out-Sine';
  if (previous.duration === 0) return 'Out-Sine';
  return previous.easing === 'Out-Sine' ? 'In-Sine' : 'Out-Sine';
}

function resolveShapeEasing(
  choice: EasingChoice,
  shapeEvents: readonly ShapeEvent[],
  isBlue: boolean,
  tick: number,
): Easing {
  return choice === 'Arc' ? resolveArcEasing(shapeEvents, isBlue, tick) : choice;
}

function resolveLaneEasing(
  choice: EasingChoice,
  laneEvents: readonly LaneEvent[],
  lineNum: LineNum,
  tick: number,
): Easing {
  return choice === 'Arc' ? resolveLaneArcEasing(laneEvents, lineNum, tick) : choice;
}

// ── 존재 여부(중복 dest 배치 스킵) ───────────────────────────

function hasShapeEventAtDest(
  shapeEvents: readonly ShapeEvent[],
  isBlue: boolean,
  tick: number,
): boolean {
  return shapeEvents.some(
    (e) => e.isBlue === isBlue && e.easing !== null && e.startTick + e.duration === tick,
  );
}

function hasLaneEventAtDest(
  laneEvents: readonly LaneEvent[],
  lineNum: LineNum,
  tick: number,
): boolean {
  return laneEvents.some(
    (e) => e.lineNum === lineNum && e.easing !== null && e.startTick + e.duration === tick,
  );
}

export function mountEditorShapesBody(
  container: HTMLElement,
  initialChart: Chart,
  api: EditorShapesApi,
): EditorCategoryController {
  const wrap = document.createElement('div');
  wrap.className = 'editor-shapes-body';
  const toolbar = document.createElement('div');
  toolbar.className = 'editor-shapes-toolbar';
  const canvasWrap = document.createElement('div');
  canvasWrap.className = 'editor-shapes-canvas-wrap';
  const canvas = document.createElement('canvas');
  canvas.className = 'editor-shapes-canvas';
  canvas.width = 800;
  canvas.height = 600;
  canvasWrap.append(canvas);
  wrap.append(toolbar, canvasWrap);
  container.append(wrap);
  const ctx = canvas.getContext('2d');

  let chart = initialChart;
  let timeline = buildTimeline(chart);
  let geometry = buildFieldGeometry(chart);
  const view = api.view;

  // 세로 scrollbar(M5-6, D-2026-104) — notes와 같은 위젯/규칙(scene-editor-
  // notes.ts 참조, 상한은 결정 필요 항목).
  const scrollbar: EditorScrollbar = mountEditorScrollbar(canvasWrap, view, () => render());
  function scrollbarRange(): { minMs: number; maxMs: number } {
    const minMs = tickToMs(timeline, minTick(timeline));
    return { minMs, maxMs: Math.max(minMs + view.viewMs, view.scrollMs + view.viewMs) };
  }

  let subMode: SubMode = 'shape';
  let shapeTool: ShapeTool = 'blue';
  let laneGroup = new Set<LineNum>([1]);
  let laneMode: LaneMode = 'spread';
  let easingChoice: EasingChoice = 'Linear';
  let symmetry = false;
  let shapeSelection = new Set<number>();
  let laneSelection = new Set<number>();
  // 서브모드 필터를 따른다(§1 "선택·Ctrl+A는 서브모드 필터" — mirror만
  // 예외, 클립보드는 예외가 아니다) — shape/lane 클립보드를 따로 둔다.
  let shapeClipboard: readonly ShapeClipboardEntry[] | null = null;
  let laneClipboard: readonly LaneClipboardEntry[] | null = null;

  // 기존 점 드래그 재배치(D-2026-100, composite는 D-2026-101) — 위치(ext
  // 단위)만 옮긴다, tick은 그대로. click-vs-drag는 DRAG_THRESHOLD_PX로
  // 가른다(헤더 참조). shape는 단일 점(point)과 composite(center/pinch
  // 쌍) 두 갈래, lane은 항상 단일 점이다.
  type DragState =
    | {
        readonly subject: 'shape-point';
        readonly index: number;
        readonly startPx: number;
        readonly startPy: number;
        readonly originalExt: number;
        moved: boolean;
        currentExt: number;
      }
    | {
        readonly subject: 'shape-composite';
        readonly type: 'center' | 'pinch';
        readonly blueIndex: number | null;
        readonly redIndex: number | null;
        readonly startPx: number;
        readonly startPy: number;
        /** center 전용 — Red−Blue(부호 있음), 드래그 내내 고정. */
        readonly halfWidth: number;
        readonly originalBlueExt: number | null;
        readonly originalRedExt: number | null;
        moved: boolean;
        currentBlueExt: number;
        currentRedExt: number;
      }
    | {
        readonly subject: 'lane';
        readonly index: number;
        readonly startPx: number;
        readonly startPy: number;
        readonly originalExt: number;
        moved: boolean;
        currentExt: number;
      };

  let drag: DragState | null = null;

  function dispatchShapeCommand(build: (s: ShapeSessionLike) => Command): void {
    api.dispatch(build(api.session));
  }

  // ── toolbar ──────────────────────────────────────────────

  function shapeToolLabel(t: ShapeTool): string {
    return { blue: 'Blue (Q)', center: 'Center (W)', red: 'Red (E)', pinch: 'Pinch (R)' }[t];
  }

  function laneGroupLabel(): string {
    return [...laneGroup]
      .sort((a, b) => a - b)
      .map((n) => `L${n}`)
      .join('+');
  }

  function renderToolbar(): void {
    toolbar.replaceChildren();
    const mk = (text: string, cls?: string): HTMLSpanElement => {
      const span = document.createElement('span');
      if (cls !== undefined) span.className = cls;
      span.textContent = text;
      return span;
    };
    toolbar.append(mk(subMode === 'shape' ? 'SHAPE' : 'LANE', 'editor-shapes-tool-label'));
    if (subMode === 'shape') {
      toolbar.append(mk(shapeToolLabel(shapeTool)));
    } else {
      toolbar.append(mk(`Group: ${laneGroupLabel()}`));
      toolbar.append(mk(`R: ${laneMode === 'spread' ? '간격유지' : 'pinch'}`));
    }
    toolbar.append(mk(`Ease: ${easingChoice}`));
    toolbar.append(mk(`Sym: ${symmetry ? 'ON' : 'off'}`));
    const selSize = subMode === 'shape' ? shapeSelection.size : laneSelection.size;
    if (selSize > 0) toolbar.append(mk(`${selSize} selected`));
  }

  // ── render ───────────────────────────────────────────────

  function sampleTicks(): number[] {
    const { height: ch } = canvas;
    const steps = 48;
    const ticks: number[] = [];
    for (let i = 0; i <= steps; i += 1) {
      const y = (ch * i) / steps;
      ticks.push(pixelYToTick(y, ch, timeline, view.scrollMs, view.viewMs));
    }
    return ticks;
  }

  function drawChainCurve(
    valueAt: (tick: number) => number,
    color: string,
    ch: number,
    cw: number,
  ): void {
    if (ctx === null) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const ticks = sampleTicks();
    ticks.forEach((tick, i) => {
      const x = extToPx(valueAt(tick), cw);
      const y = tickToPixelY(tick, ch, timeline, view.scrollMs, view.viewMs);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  function drawDots(): void {
    if (ctx === null) return;
    const { width: cw, height: ch } = canvas;

    chart.shapeEvents.forEach((event, index) => {
      const tick = event.startTick + event.duration;
      let posExt = event.targetPos;
      if (drag !== null && drag.moved) {
        if (drag.subject === 'shape-point' && drag.index === index) {
          posExt = drag.currentExt;
        } else if (drag.subject === 'shape-composite') {
          if (drag.blueIndex === index) posExt = drag.currentBlueExt;
          else if (drag.redIndex === index) posExt = drag.currentRedExt;
        }
      }
      const x = extToPx(posExt, cw);
      const y = tickToPixelY(tick, ch, timeline, view.scrollMs, view.viewMs);
      const isSelected = subMode === 'shape' && shapeSelection.has(index);
      ctx.fillStyle = event.isBlue ? '#4fbcff' : '#ff6f6f';
      ctx.beginPath();
      ctx.arc(x, y, event.easing === null ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();
      if (isSelected) {
        ctx.strokeStyle = '#4fbcd0';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    chart.laneEvents.forEach((event, index) => {
      const tick = event.startTick + event.duration;
      const { blue, red } = shapeGeometryAt(geometry, tick);
      const laneDrag =
        drag !== null && drag.subject === 'lane' && drag.index === index && drag.moved
          ? drag
          : null;
      const ext =
        laneDrag !== null ? laneDrag.currentExt : laneRelToExt(event.targetPos, blue, red);
      const x = extToPx(ext, cw);
      const y = tickToPixelY(tick, ch, timeline, view.scrollMs, view.viewMs);
      const isSelected = subMode === 'lane' && laneSelection.has(index);
      ctx.fillStyle = '#ececf4';
      ctx.beginPath();
      ctx.arc(x, y, event.easing === null ? 5 : 3, 0, Math.PI * 2);
      ctx.fill();
      if (isSelected) {
        ctx.strokeStyle = '#4fbcd0';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }

  function draw(): void {
    if (ctx === null) return;
    const { width: cw, height: ch } = canvas;
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, cw, ch);

    // 판정선(tick 0).
    const zeroY = tickToPixelY(0, ch, timeline, view.scrollMs, view.viewMs);
    ctx.strokeStyle = '#1e1e30';
    ctx.beginPath();
    ctx.moveTo(0, zeroY);
    ctx.lineTo(cw, zeroY);
    ctx.stroke();

    drawChainCurve((t) => shapeGeometryAt(geometry, t).blue, '#4fbcff', ch, cw);
    drawChainCurve((t) => shapeGeometryAt(geometry, t).red, '#ff6f6f', ch, cw);
    (['line1', 'line2', 'line3'] as const).forEach((key) => {
      drawChainCurve(
        (t) => {
          const { blue, red } = shapeGeometryAt(geometry, t);
          const layout = laneLayoutAt(geometry, t);
          return laneRelToExt(layout[key], blue, red);
        },
        '#5a5a72',
        ch,
        cw,
      );
    });

    drawDots();
  }

  function render(): void {
    renderToolbar();
    draw();
    scrollbar.update(scrollbarRange());
  }

  // ── 배치 ─────────────────────────────────────────────────

  function placeShape(px: number, py: number): void {
    const { width: cw, height: ch } = canvas;
    const tick = snapTick(
      pixelYToTick(py, ch, timeline, view.scrollMs, view.viewMs),
      GRID_DIVISOR_DEFAULT,
    );
    const pos = snapExt(pxToExt(px, cw));
    const { blue, red } = shapeGeometryAt(geometry, tick);
    const shapeCenter = (blue + red) / 2;

    const toAdd: ShapeEvent[] = [];

    if (shapeTool === 'blue' || shapeTool === 'red') {
      const isBlue = shapeTool === 'blue';
      if (hasShapeEventAtDest(chart.shapeEvents, isBlue, tick)) return;
      const easing = resolveShapeEasing(easingChoice, chart.shapeEvents, isBlue, tick);
      toAdd.push({ startTick: 0, duration: tick, isBlue, targetPos: pos, easing });
      if (symmetry) {
        const mirrorPos = snapExt(2 * shapeCenter - pos);
        if (!hasShapeEventAtDest(chart.shapeEvents, !isBlue, tick)) {
          toAdd.push({
            startTick: 0,
            duration: tick,
            isBlue: !isBlue,
            targetPos: mirrorPos,
            easing,
          });
        }
      }
    } else if (shapeTool === 'center') {
      const width = red - blue;
      const half = width / 2;
      const newBlue = snapExt(pos - half);
      const newRed = snapExt(pos + half);
      const easing = resolveShapeEasing(easingChoice, chart.shapeEvents, false, tick);
      if (!hasShapeEventAtDest(chart.shapeEvents, true, tick)) {
        toAdd.push({ startTick: 0, duration: tick, isBlue: true, targetPos: newBlue, easing });
      }
      if (!hasShapeEventAtDest(chart.shapeEvents, false, tick)) {
        toAdd.push({ startTick: 0, duration: tick, isBlue: false, targetPos: newRed, easing });
      }
    } else {
      // pinch — 같은 위치에 Blue·Red 동시 배치.
      const easingBlue = resolveShapeEasing(easingChoice, chart.shapeEvents, true, tick);
      const easingRed = resolveShapeEasing(easingChoice, chart.shapeEvents, false, tick);
      if (!hasShapeEventAtDest(chart.shapeEvents, true, tick)) {
        toAdd.push({
          startTick: 0,
          duration: tick,
          isBlue: true,
          targetPos: pos,
          easing: easingBlue,
        });
      }
      if (!hasShapeEventAtDest(chart.shapeEvents, false, tick)) {
        toAdd.push({
          startTick: 0,
          duration: tick,
          isBlue: false,
          targetPos: pos,
          easing: easingRed,
        });
      }
    }

    if (toAdd.length === 0) return;
    dispatchShapeCommand((s) => addShapeEventsCommand(s, toAdd));
  }

  function placeLane(px: number, py: number): void {
    const { width: cw, height: ch } = canvas;
    const tick = snapTick(
      pixelYToTick(py, ch, timeline, view.scrollMs, view.viewMs),
      GRID_DIVISOR_DEFAULT,
    );
    const { blue, red } = shapeGeometryAt(geometry, tick);
    const clickRel = snapRel(extToLaneRel(pxToExt(px, cw), blue, red));
    const members = [...laneGroup].sort((a, b) => a - b);

    const toAdd: LaneEvent[] = [];

    if (symmetry && members.length === 2) {
      const lo = members[0]!;
      const hi = members[1]!;
      const currentLayout = laneLayoutAt(geometry, tick);
      const layoutByLine: Record<LineNum, number> = {
        1: currentLayout.line1,
        2: currentLayout.line2,
        3: currentLayout.line3,
      };
      const axis = (layoutByLine[lo] + layoutByLine[hi]) / 2;
      const hiPos = clickRel;
      const loPos = snapRel(2 * axis - hiPos);
      const easingHi = resolveLaneEasing(easingChoice, chart.laneEvents, hi, tick);
      if (!hasLaneEventAtDest(chart.laneEvents, hi, tick)) {
        toAdd.push({
          startTick: 0,
          duration: tick,
          lineNum: hi,
          targetPos: hiPos,
          easing: easingHi,
        });
      }
      if (!hasLaneEventAtDest(chart.laneEvents, lo, tick)) {
        toAdd.push({
          startTick: 0,
          duration: tick,
          lineNum: lo,
          targetPos: loPos,
          easing: easingHi,
        });
      }
    } else if (members.length === 1) {
      const lineNum = members[0]!;
      if (!hasLaneEventAtDest(chart.laneEvents, lineNum, tick)) {
        const easing = resolveLaneEasing(easingChoice, chart.laneEvents, lineNum, tick);
        toAdd.push({ startTick: 0, duration: tick, lineNum, targetPos: clickRel, easing });
      }
    } else {
      const rightmost = members[members.length - 1]!;
      const currentLayout = laneLayoutAt(geometry, tick);
      const layoutByLine: Record<LineNum, number> = {
        1: currentLayout.line1,
        2: currentLayout.line2,
        3: currentLayout.line3,
      };
      for (const lineNum of members) {
        if (hasLaneEventAtDest(chart.laneEvents, lineNum, tick)) continue;
        const pos =
          laneMode === 'pinch'
            ? clickRel
            : snapRel(clickRel + (layoutByLine[lineNum] - layoutByLine[rightmost]));
        const easing = resolveLaneEasing(easingChoice, chart.laneEvents, lineNum, tick);
        toAdd.push({ startTick: 0, duration: tick, lineNum, targetPos: pos, easing });
      }
    }

    if (toAdd.length === 0) return;
    dispatchShapeCommand((s) => addLaneEventsCommand(s, toAdd));
  }

  // ── 선택/삭제 ────────────────────────────────────────────

  /** shape 캔버스 히트테스트 — 원본 `findDotAt`(`shape-input.js`) 재구현
   *  (D-2026-101). 단일 점(dot/init)뿐 아니라 같은 tick의 Blue+Red
   *  composite(center/pinch)도 후보에 넣고, 화면상 가장 가까운 하나를
   *  고른다 — 원본처럼 composite 후보와 개별 점 후보가 같은 최소거리
   *  경쟁에 참여한다(순서가 아니라 거리로 이긴다).
   *
   *  - `pinch` 후보: 같은 tick에 Blue·Red가 **둘 다** 있고, 위치 차이가
   *    0.5 미만이며 **둘 다 anchor가 아닐 때만**(easing !== null) 생긴다.
   *    히트 지점은 Blue의 위치.
   *  - `center` 후보: Blue·Red 중 **하나만 있어도**(half-pair) 생긴다.
   *    히트 지점은 그 tick의 실제 평가된 경계 중점(`shapeGeometryAt`) —
   *    이벤트 자신의 저장값이 아니라 evaluated geometry를 쓴다(원본
   *    `getShape(tk).left/right`와 동일).
   */
  function findShapeHitAt(px: number, py: number): ShapeHit | null {
    const { width: cw, height: ch } = canvas;
    let best: ShapeHit | null = null;
    let bestDist = HIT_RADIUS_PX;

    const byTick = new Map<number, { blue?: number; red?: number }>();
    chart.shapeEvents.forEach((event, index) => {
      const tick = event.startTick + event.duration;
      const entry = byTick.get(tick) ?? {};
      if (event.isBlue) entry.blue = index;
      else entry.red = index;
      byTick.set(tick, entry);
    });

    for (const [tick, pair] of byTick) {
      const y = tickToPixelY(tick, ch, timeline, view.scrollMs, view.viewMs);

      if (pair.blue !== undefined && pair.red !== undefined) {
        const blueEvt = chart.shapeEvents[pair.blue]!;
        const redEvt = chart.shapeEvents[pair.red]!;
        if (
          Math.abs(blueEvt.targetPos - redEvt.targetPos) < 0.5 &&
          blueEvt.easing !== null &&
          redEvt.easing !== null
        ) {
          const x = extToPx(blueEvt.targetPos, cw);
          const d = Math.hypot(px - x, py - y);
          if (d < bestDist) {
            bestDist = d;
            best = { kind: 'pinch', tick, blueIndex: pair.blue, redIndex: pair.red };
          }
        }
      }

      if (pair.blue !== undefined || pair.red !== undefined) {
        const { blue, red } = shapeGeometryAt(geometry, tick);
        const x = extToPx((blue + red) / 2, cw);
        const d = Math.hypot(px - x, py - y);
        if (d < bestDist) {
          bestDist = d;
          best = {
            kind: 'center',
            tick,
            blueIndex: pair.blue ?? null,
            redIndex: pair.red ?? null,
          };
        }
      }
    }

    chart.shapeEvents.forEach((event, index) => {
      const tick = event.startTick + event.duration;
      const x = extToPx(event.targetPos, cw);
      const y = tickToPixelY(tick, ch, timeline, view.scrollMs, view.viewMs);
      const d = Math.hypot(px - x, py - y);
      if (d < bestDist) {
        bestDist = d;
        best = { kind: 'point', index };
      }
    });

    return best;
  }

  function findLaneIndexAt(px: number, py: number): number | null {
    const { width: cw, height: ch } = canvas;
    let best: number | null = null;
    let bestDist = HIT_RADIUS_PX;
    chart.laneEvents.forEach((event, index) => {
      const tick = event.startTick + event.duration;
      const { blue, red } = shapeGeometryAt(geometry, tick);
      const x = extToPx(laneRelToExt(event.targetPos, blue, red), cw);
      const y = tickToPixelY(tick, ch, timeline, view.scrollMs, view.viewMs);
      const d = Math.hypot(px - x, py - y);
      if (d < bestDist) {
        bestDist = d;
        best = index;
      }
    });
    return best;
  }

  function clearSelection(): boolean {
    const had = subMode === 'shape' ? shapeSelection.size > 0 : laneSelection.size > 0;
    if (!had) return false;
    if (subMode === 'shape') shapeSelection = new Set();
    else laneSelection = new Set();
    render();
    return true;
  }

  function deleteSelection(): void {
    if (subMode === 'shape') {
      if (shapeSelection.size === 0) return;
      const indices = [...shapeSelection].filter((i) => chart.shapeEvents[i]?.easing !== null);
      shapeSelection = new Set();
      if (indices.length === 0) return;
      dispatchShapeCommand((s) => deleteShapeEventsCommand(s, indices));
    } else {
      if (laneSelection.size === 0) return;
      const indices = [...laneSelection].filter((i) => chart.laneEvents[i]?.easing !== null);
      laneSelection = new Set();
      if (indices.length === 0) return;
      dispatchShapeCommand((s) => deleteLaneEventsCommand(s, indices));
    }
  }

  /** Ctrl+F — shape·lane 선택을 합쳐 한 undo로 제자리 mirror한다(§4
   *  "shapes 씬에서 걸면 shape·lane 선택을 합쳐 한 번에 건다"). 서브모드
   *  필터의 유일한 예외라 `subMode`를 안 보고 두 선택 Set을 그대로 쓴다. */
  function mirrorSelection(): void {
    if (shapeSelection.size === 0 && laneSelection.size === 0) return;
    dispatchShapeCommand((s) => mirrorEventsCommand(s, [...shapeSelection], [...laneSelection]));
  }

  /** Ctrl+C — 서브모드 필터를 따른다(mirror만 예외, §1). 기준점은 선택
   *  최소 dest tick이다. anchor는 선택 자체에서 제외돼 있어(파일 헤더)
   *  별도 방어가 필요 없다. */
  function copySelection(): void {
    if (subMode === 'shape') {
      if (shapeSelection.size === 0) return;
      const events = [...shapeSelection].map((i) => chart.shapeEvents[i]!);
      const minDest = Math.min(...events.map((e) => e.startTick + e.duration));
      shapeClipboard = events.map((e) => ({
        relTick: e.startTick + e.duration - minDest,
        isBlue: e.isBlue,
        targetPos: e.targetPos,
        easing: e.easing,
      }));
    } else {
      if (laneSelection.size === 0) return;
      const events = [...laneSelection].map((i) => chart.laneEvents[i]!);
      const minDest = Math.min(...events.map((e) => e.startTick + e.duration));
      laneClipboard = events.map((e) => ({
        relTick: e.startTick + e.duration - minDest,
        lineNum: e.lineNum,
        targetPos: e.targetPos,
        easing: e.easing,
      }));
    }
  }

  /** Ctrl+V — 기준점은 현재 스크롤 위치의 스냅 tick(§1). 충돌(같은
   *  dest tick·같은 체인)은 `hasShapeEventAtDest`/`hasLaneEventAtDest`로
   *  조용히 스킵한다(placeShape/placeLane과 같은 규칙) — "전부 충돌이면
   *  토스트"(§1)는 이 에디터에 toast UI 자체가 없어(`app-editor.ts` 헤더
   *  참조) notes 탭의 기존 붙여넣기도 안 하는 생략이라 여기서도 새로
   *  만들지 않는다(결정 필요 항목). */
  function pasteClipboard(): void {
    const baseTick = snapTick(
      pixelYToTick(canvas.height / 2, canvas.height, timeline, view.scrollMs, view.viewMs),
      GRID_DIVISOR_DEFAULT,
    );
    if (subMode === 'shape') {
      if (shapeClipboard === null || shapeClipboard.length === 0) return;
      const toAdd: ShapeEvent[] = [];
      for (const entry of shapeClipboard) {
        const dest = baseTick + entry.relTick;
        if (hasShapeEventAtDest(chart.shapeEvents, entry.isBlue, dest)) continue;
        toAdd.push({
          startTick: 0,
          duration: dest,
          isBlue: entry.isBlue,
          targetPos: entry.targetPos,
          easing: entry.easing,
        });
      }
      if (toAdd.length === 0) return;
      dispatchShapeCommand((s) => addShapeEventsCommand(s, toAdd));
    } else {
      if (laneClipboard === null || laneClipboard.length === 0) return;
      const toAdd: LaneEvent[] = [];
      for (const entry of laneClipboard) {
        const dest = baseTick + entry.relTick;
        if (hasLaneEventAtDest(chart.laneEvents, entry.lineNum, dest)) continue;
        toAdd.push({
          startTick: 0,
          duration: dest,
          lineNum: entry.lineNum,
          targetPos: entry.targetPos,
          easing: entry.easing,
        });
      }
      if (toAdd.length === 0) return;
      dispatchShapeCommand((s) => addLaneEventsCommand(s, toAdd));
    }
  }

  // ── pointer ──────────────────────────────────────────────

  function canvasPoint(event: PointerEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  /** shape 선택을 `indices` 집합으로 바꾼다(shiftKey면 토글 병합) —
   *  composite 클릭(D-2026-101)이 인덱스 둘을 한 번에 넘길 수 있어
   *  `toggleShapeSelection(단일)` 대신 배열을 받는다. */
  function selectShapeIndices(indices: readonly number[], shiftKey: boolean): void {
    if (!shiftKey) {
      shapeSelection = new Set(indices);
      return;
    }
    const next = new Set(shapeSelection);
    for (const i of indices) {
      if (next.has(i)) next.delete(i);
      else next.add(i);
    }
    shapeSelection = next;
  }

  function toggleLaneSelection(hit: number, shiftKey: boolean): void {
    if (!shiftKey && !laneSelection.has(hit)) laneSelection = new Set([hit]);
    else if (shiftKey) {
      const next = new Set(laneSelection);
      if (next.has(hit)) next.delete(hit);
      else next.add(hit);
      laneSelection = next;
    }
  }

  let pointerDownShift = false;

  function onPointerDown(event: PointerEvent): void {
    const { x, y } = canvasPoint(event);
    pointerDownShift = event.shiftKey;
    if (subMode === 'shape') {
      const hit = findShapeHitAt(x, y);
      if (hit !== null) {
        if (hit.kind === 'point') {
          const ext = chart.shapeEvents[hit.index]!.targetPos;
          drag = {
            subject: 'shape-point',
            index: hit.index,
            startPx: x,
            startPy: y,
            originalExt: ext,
            moved: false,
            currentExt: ext,
          };
        } else {
          const { blue, red } = shapeGeometryAt(geometry, hit.tick);
          const originalBlueExt =
            hit.blueIndex !== null ? chart.shapeEvents[hit.blueIndex]!.targetPos : null;
          const originalRedExt =
            hit.redIndex !== null ? chart.shapeEvents[hit.redIndex]!.targetPos : null;
          drag = {
            subject: 'shape-composite',
            type: hit.kind,
            blueIndex: hit.blueIndex,
            redIndex: hit.redIndex,
            startPx: x,
            startPy: y,
            halfWidth: (red - blue) / 2,
            originalBlueExt,
            originalRedExt,
            moved: false,
            currentBlueExt: originalBlueExt ?? blue,
            currentRedExt: originalRedExt ?? red,
          };
        }
        return;
      }
      placeShape(x, y);
    } else {
      const hit = findLaneIndexAt(x, y);
      if (hit !== null) {
        const event_ = chart.laneEvents[hit]!;
        const tick = event_.startTick + event_.duration;
        const { blue, red } = shapeGeometryAt(geometry, tick);
        const originalExt = laneRelToExt(event_.targetPos, blue, red);
        drag = {
          subject: 'lane',
          index: hit,
          startPx: x,
          startPy: y,
          originalExt,
          moved: false,
          currentExt: originalExt,
        };
        return;
      }
      placeLane(x, y);
    }
  }

  function onPointerMove(event: PointerEvent): void {
    if (drag === null) return;
    const { x, y } = canvasPoint(event);
    const dx = x - drag.startPx;
    const dy = y - drag.startPy;
    if (!drag.moved && (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX)) {
      drag.moved = true;
    }
    if (drag.moved) {
      if (drag.subject === 'shape-composite') {
        const rawCenter = pxToExt(x, canvas.width);
        if (drag.type === 'pinch') {
          const v = snapExt(rawCenter);
          drag.currentBlueExt = v;
          drag.currentRedExt = v;
        } else {
          drag.currentBlueExt = snapExt(rawCenter - drag.halfWidth);
          drag.currentRedExt = snapExt(rawCenter + drag.halfWidth);
        }
      } else {
        drag.currentExt = snapExt(pxToExt(x, canvas.width));
      }
      render();
    }
    void event;
  }

  function onPointerUp(): void {
    if (drag === null) return;
    const d = drag;
    drag = null;

    if (!d.moved) {
      // 이동 없이 뗐다 — 클릭(선택 토글)으로 처리한다. composite면 존재하는
      // 양쪽 인덱스를 함께 선택한다(D-2026-101 — 이 재설계의 클릭=선택
      // 단순화를 composite에도 일관 적용한 것뿐, 원본은 sel 툴에서만
      // 선택했고 findDotAt은 드래그 전용이었다).
      if (d.subject === 'shape-point') {
        selectShapeIndices([d.index], pointerDownShift);
      } else if (d.subject === 'shape-composite') {
        const indices = [d.blueIndex, d.redIndex].filter((i): i is number => i !== null);
        if (indices.length > 0) selectShapeIndices(indices, pointerDownShift);
      } else {
        toggleLaneSelection(d.index, pointerDownShift);
      }
      render();
      return;
    }

    // 드래그 종료 — 위치만 바꾸는 Mutate 커맨드 1개를 dispatch한다(tick은
    // 그대로, symmetry는 적용하지 않는다 — 헤더 참조).
    if (d.subject === 'shape-point') {
      if (d.currentExt === d.originalExt) {
        render();
        return;
      }
      dispatchShapeCommand((s) =>
        mutateShapeEventsCommand(s, [{ index: d.index, targetPos: d.currentExt }]),
      );
    } else if (d.subject === 'shape-composite') {
      const updates: { index: number; targetPos: number }[] = [];
      if (d.blueIndex !== null && d.currentBlueExt !== d.originalBlueExt) {
        updates.push({ index: d.blueIndex, targetPos: d.currentBlueExt });
      }
      if (d.redIndex !== null && d.currentRedExt !== d.originalRedExt) {
        updates.push({ index: d.redIndex, targetPos: d.currentRedExt });
      }
      if (updates.length === 0) {
        render();
        return;
      }
      dispatchShapeCommand((s) => mutateShapeEventsCommand(s, updates));
    } else {
      const event_ = chart.laneEvents[d.index]!;
      const tick = event_.startTick + event_.duration;
      const { blue, red } = shapeGeometryAt(geometry, tick);
      const newRel = snapRel(extToLaneRel(d.currentExt, blue, red));
      if (newRel === event_.targetPos) {
        render();
        return;
      }
      dispatchShapeCommand((s) => mutateLaneEventCommand(s, d.index, newRel));
    }
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

  render();

  return {
    onKeyDown(event: KeyboardEvent): boolean {
      if ((event.ctrlKey || event.metaKey) && (event.key === 'f' || event.key === 'F')) {
        if (shapeSelection.size === 0 && laneSelection.size === 0) return false;
        event.preventDefault();
        mirrorSelection();
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
      }

      switch (event.key) {
        case 'T':
        case 't':
          subMode = subMode === 'shape' ? 'lane' : 'shape';
          render();
          return true;
        case 'S':
        case 's':
          symmetry = !symmetry;
          render();
          return true;
        case '1':
          easingChoice = 'Arc';
          render();
          return true;
        case '2':
          easingChoice = 'In-Sine';
          render();
          return true;
        case '3':
          easingChoice = 'Out-Sine';
          render();
          return true;
        case '4':
          easingChoice = 'Linear';
          render();
          return true;
        case 'Z':
        case 'z':
          zoomOut(view);
          render();
          return true;
        case 'X':
        case 'x':
          zoomIn(view);
          render();
          return true;
        case 'D':
        case 'd':
        case 'Delete': {
          const hasSel = subMode === 'shape' ? shapeSelection.size > 0 : laneSelection.size > 0;
          if (!hasSel) return false;
          event.preventDefault();
          deleteSelection();
          return true;
        }
        case 'Escape':
          return clearSelection();
        default:
          break;
      }

      if (subMode === 'shape') {
        switch (event.key) {
          case 'Q':
          case 'q':
            shapeTool = 'blue';
            render();
            return true;
          case 'W':
          case 'w':
            shapeTool = 'center';
            render();
            return true;
          case 'E':
          case 'e':
            shapeTool = 'red';
            render();
            return true;
          case 'R':
          case 'r':
            shapeTool = 'pinch';
            render();
            return true;
          default:
            return false;
        }
      }

      switch (event.key) {
        case 'Q':
        case 'q':
        case 'W':
        case 'w':
        case 'E':
        case 'e': {
          const LINE_NUM_OF_KEY: Record<'q' | 'w' | 'e', LineNum> = { q: 1, w: 2, e: 3 };
          const lineNum = LINE_NUM_OF_KEY[event.key.toLowerCase() as 'q' | 'w' | 'e'];
          const next = new Set(laneGroup);
          if (next.has(lineNum)) {
            if (next.size > 1) next.delete(lineNum);
          } else {
            next.add(lineNum);
          }
          laneGroup = next;
          render();
          return true;
        }
        case 'R':
        case 'r':
          laneMode = laneMode === 'spread' ? 'pinch' : 'spread';
          render();
          return true;
        default:
          return false;
      }
    },
    update(next: Chart): void {
      chart = next;
      timeline = buildTimeline(next);
      geometry = buildFieldGeometry(next);
      render();
    },
    destroy(): void {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      scrollbar.destroy();
      wrap.remove();
    },
  };
}
