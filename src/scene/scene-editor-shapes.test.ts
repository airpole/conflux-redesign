// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeChart } from '../core/core-chart-fixture.js';
import type { Chart, LaneEvent, ShapeEvent } from '../core/core-chart.js';
import type { Command } from '../edit/edit-command.js';
import { mountEditorShapesBody, type EditorShapesApi } from './scene-editor-shapes.js';
import { createEditorViewState } from './scene-editor-view.js';
import { buildTimeline, tickToMs } from '../core/core-timing.js';

/** 구현과 같은 식(기본 `viewMs=8000`, `scrollMs=0`)으로 tick의 화면 y를
 *  역산한다 — `scene-editor-notes.test.ts`의 `pixelYOfTick`과 같은 패턴. */
function pixelYOfTick(tick: number, canvasHeight = 600): number {
  const timeline = buildTimeline(makeChart());
  const ms = tickToMs(timeline, tick);
  const pxPerMs = canvasHeight / 8000;
  return canvasHeight - ms * pxPerMs;
}

/** targetPos(외부단위 -8~+8)의 화면 x. */
function pixelXOfExt(ext: number, canvasWidth = 800): number {
  return ((ext + 8) / 16) * canvasWidth;
}

function mount(initialChart: Chart = makeChart()): {
  target: HTMLElement;
  canvas: HTMLCanvasElement;
  handle: ReturnType<typeof mountEditorShapesBody>;
  dispatch: ReturnType<typeof vi.fn>;
  getChart: () => Chart;
} {
  const target = document.createElement('div');
  document.body.append(target);
  let chart = initialChart;
  const dispatch = vi.fn((command: Command) => {
    command.apply();
  });
  const api: EditorShapesApi = {
    session: {
      get chart() {
        return chart;
      },
      updateChart(next) {
        chart = next;
      },
    },
    dispatch,
    view: createEditorViewState(),
  };
  const handle = mountEditorShapesBody(target, initialChart, api);
  const canvas = target.querySelector('.editor-shapes-canvas') as HTMLCanvasElement;
  canvas.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 }) as DOMRect;
  return { target, canvas, handle, dispatch, getChart: () => chart };
}

function click(canvas: HTMLCanvasElement, x: number, y: number, opts: PointerEventInit = {}): void {
  canvas.dispatchEvent(
    new PointerEvent('pointerdown', { clientX: x, clientY: y, bubbles: true, ...opts }),
  );
  canvas.dispatchEvent(
    new PointerEvent('pointerup', { clientX: x, clientY: y, bubbles: true, ...opts }),
  );
}

const blueInit: ShapeEvent = {
  startTick: 0,
  duration: 0,
  isBlue: true,
  targetPos: -2,
  easing: null,
};
const redInit: ShapeEvent = {
  startTick: 0,
  duration: 0,
  isBlue: false,
  targetPos: 2,
  easing: null,
};
const line1Init: LaneEvent = {
  startTick: 0,
  duration: 0,
  lineNum: 1,
  targetPos: 0.25,
  easing: null,
};
const line2Init: LaneEvent = {
  startTick: 0,
  duration: 0,
  lineNum: 2,
  targetPos: 0.5,
  easing: null,
};
const line3Init: LaneEvent = {
  startTick: 0,
  duration: 0,
  lineNum: 3,
  targetPos: 0.75,
  easing: null,
};

describe('scene-editor-shapes', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('mount는 canvas와 toolbar를 만들고 기본 서브모드는 shape다', () => {
    const { target } = mount();
    expect(target.querySelector('.editor-shapes-canvas')).not.toBeNull();
    expect(target.querySelector('.editor-shapes-tool-label')?.textContent).toBe('SHAPE');
  });

  it('T가 shape ⟷ lane 서브모드를 전환한다(consumed=true)', () => {
    const { target, handle } = mount();
    const consumed = handle.onKeyDown(new KeyboardEvent('keydown', { key: 'T' }));
    expect(consumed).toBe(true);
    expect(target.querySelector('.editor-shapes-tool-label')?.textContent).toBe('LANE');
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 't' }));
    expect(target.querySelector('.editor-shapes-tool-label')?.textContent).toBe('SHAPE');
  });

  it('shape 모드 Q(빈 칸 클릭)가 AddShapeEvents를 dispatch한다(Blue 체인)', () => {
    const { canvas, dispatch, getChart } = mount(makeChart({ shapeEvents: [blueInit, redInit] }));
    click(canvas, 400, 300); // 캔버스 중앙 근처, 빈 자리.
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0]![0].name).toBe('AddShapeEvents');
    expect(getChart().shapeEvents.length).toBeGreaterThan(2);
    const added = getChart().shapeEvents.find((e) => e.easing !== null);
    expect(added?.isBlue).toBe(true);
  });

  it('E 툴은 Red 체인에 배치한다', () => {
    const { canvas, handle, getChart } = mount(makeChart({ shapeEvents: [blueInit, redInit] }));
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 'e' }));
    click(canvas, 400, 300);
    const added = getChart().shapeEvents.find((e) => e.easing !== null);
    expect(added?.isBlue).toBe(false);
  });

  it('W(center) 툴은 Blue·Red 쌍을 한 undo 단위로 배치한다', () => {
    const { canvas, handle, dispatch, getChart } = mount(
      makeChart({ shapeEvents: [blueInit, redInit] }),
    );
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 'w' }));
    click(canvas, 400, 300);
    expect(dispatch).toHaveBeenCalledTimes(1);
    const nonInit = getChart().shapeEvents.filter((e) => e.easing !== null);
    expect(nonInit).toHaveLength(2);
    expect(nonInit.some((e) => e.isBlue)).toBe(true);
    expect(nonInit.some((e) => !e.isBlue)).toBe(true);
  });

  it('R(pinch) 툴은 Blue·Red를 같은 위치에 배치한다', () => {
    const { canvas, handle, getChart } = mount(makeChart({ shapeEvents: [blueInit, redInit] }));
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 'r' }));
    click(canvas, 400, 300);
    const nonInit = getChart().shapeEvents.filter((e) => e.easing !== null);
    expect(nonInit).toHaveLength(2);
    expect(nonInit[0]!.targetPos).toBe(nonInit[1]!.targetPos);
  });

  it('S(symmetry) ON이면 Q 배치가 반대편에도 자동 생성된다', () => {
    const { canvas, handle, getChart } = mount(makeChart({ shapeEvents: [blueInit, redInit] }));
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 's' }));
    click(canvas, 200, 300); // 중앙에서 벗어난 위치.
    const nonInit = getChart().shapeEvents.filter((e) => e.easing !== null);
    expect(nonInit).toHaveLength(2);
    expect(nonInit.some((e) => e.isBlue)).toBe(true);
    expect(nonInit.some((e) => !e.isBlue)).toBe(true);
  });

  it('symmetry 축을 드래그하면 수동 축이 되고, 배치가 그 축을 쓴다', () => {
    const { canvas, handle, target, getChart } = mount(
      makeChart({ shapeEvents: [blueInit, redInit] }),
    );
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 's' })); // symmetry ON.
    // 기본 chart의 동적 축은 0(Blue -2·Red 2 평균) — pixelXOfExt(0)이 그
    // 위치. -1로 드래그해 옮긴다.
    dragPointer(canvas, { x: pixelXOfExt(0), y: 300 }, { x: pixelXOfExt(-1), y: 300 });
    expect(target.textContent).toContain('Axis: manual');
    expect(target.textContent).toContain('Auto axis');
    // 축이 -1로 고정된 채로 Q 배치 — mirror는 2*(-1) - 5 = -7.
    click(canvas, pixelXOfExt(5), pixelYOfTick(500));
    const mirrored = getChart().shapeEvents.find((e) => e.targetPos === -7 && !e.isBlue);
    expect(mirrored).toBeDefined();
  });

  it('symmetry를 껐다 켜면 수동 축이 지워지고 다시 동적으로 돌아간다', () => {
    const { canvas, handle, target, getChart } = mount(
      makeChart({ shapeEvents: [blueInit, redInit] }),
    );
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 's' })); // ON.
    dragPointer(canvas, { x: pixelXOfExt(0), y: 300 }, { x: pixelXOfExt(-4), y: 300 });
    expect(target.textContent).toContain('Axis: manual');
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 's' })); // OFF — 수동 축 삭제.
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 's' })); // 다시 ON.
    expect(target.textContent).not.toContain('Axis: manual');
    click(canvas, pixelXOfExt(3), pixelYOfTick(500));
    // 다시 동적 축(0) 기준 — mirror = 2*0 - 3 = -3.
    const mirrored = getChart().shapeEvents.find((e) => e.targetPos === -3 && !e.isBlue);
    expect(mirrored).toBeDefined();
  });

  it("'Auto axis' 버튼을 누르면 수동 축이 지워진다", () => {
    const { canvas, handle, target } = mount(makeChart({ shapeEvents: [blueInit, redInit] }));
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 's' }));
    dragPointer(canvas, { x: pixelXOfExt(0), y: 300 }, { x: pixelXOfExt(-4), y: 300 });
    expect(target.textContent).toContain('Axis: manual');
    const resetBtn = target.querySelector('.editor-shapes-axis-reset') as HTMLButtonElement;
    expect(resetBtn).not.toBeNull();
    resetBtn.click();
    expect(target.textContent).not.toContain('Axis: manual');
  });

  it('lane 2-그룹 symmetry 축도 드래그로 고정된다', () => {
    const { canvas, handle, target, getChart } = mount(
      makeChart({ laneEvents: [line1Init, line2Init, line3Init] }),
    );
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 't' })); // lane 모드.
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 'w' })); // group {1,2}.
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 's' })); // symmetry ON.
    // 기본 group {1,2}의 동적 축 = (line1 0.25 + line2 0.5)/2 = 0.375(rel) →
    // ext = -2 + 0.375*4 = -0.5. rel 1.0(ext 2)로 드래그해 옮긴다.
    dragPointer(canvas, { x: pixelXOfExt(-0.5), y: 300 }, { x: pixelXOfExt(2), y: 300 });
    expect(target.textContent).toContain('Axis: manual');
    // 축(rel 1.0) 기준 — line2(hi)=클릭 rel(1.5, ext 4), line1(lo)=2*1.0-1.5=0.5.
    // y는 tick 0(기존 anchor들의 y)과 충분히 떨어뜨려 기존 점을 안 잡게 한다.
    click(canvas, pixelXOfExt(4), 100);
    const line2 = getChart().laneEvents.find((e) => e.lineNum === 2 && e.easing !== null);
    const line1 = getChart().laneEvents.find((e) => e.lineNum === 1 && e.easing !== null);
    expect(line2?.targetPos).toBe(1.5);
    expect(line1?.targetPos).toBe(0.5);
  });

  it('lane 3-그룹(1,2,3) symmetry는 line3을 클릭 위치로, line1을 line2 중심 대칭으로 낸다(line2는 그대로)', () => {
    const { canvas, handle, getChart } = mount(
      makeChart({ laneEvents: [line1Init, line2Init, line3Init] }),
    );
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 't' })); // lane 모드.
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 'w' })); // {1} → {1,2}.
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 'e' })); // {1,2} → {1,2,3}.
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 's' })); // symmetry ON.
    const beforeLine2Count = getChart().laneEvents.filter((e) => e.lineNum === 2).length;
    // line2(axis) rel=0.5 → ext=0. line3 클릭 위치를 grid-정렬된 rel 1.5(ext 4)로
    // 잡는다 — y는 tick 0과 떨어뜨려 기존 anchor를 안 잡게 한다.
    click(canvas, pixelXOfExt(4), 100);
    const line3 = getChart().laneEvents.find((e) => e.lineNum === 3 && e.easing !== null);
    const line1 = getChart().laneEvents.find((e) => e.lineNum === 1 && e.easing !== null);
    expect(line3?.targetPos).toBe(1.5);
    expect(line1?.targetPos).toBe(-0.5); // 2*0.5 - 1.5.
    // line2는 이 배치로 새 이벤트가 안 생긴다(자기 자신이 축).
    expect(getChart().laneEvents.filter((e) => e.lineNum === 2)).toHaveLength(beforeLine2Count);
  });

  it('선택 후 D가 shape 이벤트를 삭제한다', () => {
    const target: ShapeEvent = {
      startTick: 0,
      duration: 500,
      isBlue: true,
      targetPos: 4,
      easing: 'Linear',
    };
    const { canvas, handle, getChart, dispatch } = mount(
      makeChart({ shapeEvents: [blueInit, redInit, target] }),
    );
    click(canvas, pixelXOfExt(4), pixelYOfTick(500));
    const consumed = handle.onKeyDown(new KeyboardEvent('keydown', { key: 'd' }));
    expect(consumed).toBe(true);
    expect(dispatch).toHaveBeenCalled();
    expect(getChart().shapeEvents).toHaveLength(2);
  });

  it('init(anchor) 이벤트는 선택해도 삭제되지 않는다', () => {
    const { canvas, handle, getChart, dispatch } = mount(
      makeChart({ shapeEvents: [blueInit, redInit] }),
    );
    click(canvas, pixelXOfExt(-2), pixelYOfTick(0));
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 'd' }));
    expect(dispatch).not.toHaveBeenCalled();
    expect(getChart().shapeEvents).toHaveLength(2);
  });

  it('선택 후 Ctrl+F가 shape 이벤트를 제자리 mirror한다', () => {
    const target: ShapeEvent = {
      startTick: 0,
      duration: 500,
      isBlue: true,
      targetPos: 3,
      easing: 'Linear',
    };
    const { canvas, handle, getChart, dispatch } = mount(
      makeChart({ shapeEvents: [blueInit, redInit, target] }),
    );
    click(canvas, pixelXOfExt(3), pixelYOfTick(500));
    const consumed = handle.onKeyDown(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true }));
    expect(consumed).toBe(true);
    expect(dispatch).toHaveBeenCalled();
    const mirrored = getChart().shapeEvents.find((e) => e.targetPos === -3);
    expect(mirrored).toBeDefined();
    expect(mirrored!.isBlue).toBe(false);
  });

  it('lane 선택 후 Ctrl+F가 위치를 0.5축 기준으로 뒤집는다(lineNum 불변)', () => {
    const { canvas, handle, getChart, dispatch } = mount(
      makeChart({ laneEvents: [line1Init, line2Init, line3Init] }),
    );
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 't' })); // → lane 모드.
    // lane은 shape와 같은 외부단위(-8~+8) 공간에 투영해 그린다(파일 헤더) —
    // 기본 chart의 Blue(-2)·Red(2) 사이에서 line1(targetPos 0.25)의 위치는
    // -2 + 0.25*4 = -1.
    click(canvas, pixelXOfExt(-1), pixelYOfTick(0));
    const consumed = handle.onKeyDown(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true }));
    expect(consumed).toBe(true);
    expect(dispatch).toHaveBeenCalled();
    expect(getChart().laneEvents[0]!.targetPos).toBe(0.75);
    expect(getChart().laneEvents[0]!.lineNum).toBe(1);
  });

  it('선택이 없으면 Ctrl+F는 아무 것도 하지 않는다(consumed=false)', () => {
    const { handle, dispatch } = mount(makeChart({ shapeEvents: [blueInit, redInit] }));
    const consumed = handle.onKeyDown(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true }));
    expect(consumed).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('shape Ctrl+C·Ctrl+V가 현재 스크롤 위치를 기준점으로 붙여넣는다', () => {
    const target: ShapeEvent = {
      startTick: 0,
      duration: 500,
      isBlue: true,
      targetPos: 3,
      easing: 'Linear',
    };
    const { canvas, handle, getChart, dispatch } = mount(
      makeChart({ shapeEvents: [blueInit, redInit, target] }),
    );
    click(canvas, pixelXOfExt(3), pixelYOfTick(500));
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true }));
    // 붙여넣기 기준점 = 캔버스 절반 높이(scrollMs=0, viewMs=8000 기본값 —
    // pixelYOfTick(4000, 600)이 캔버스 y=300에 해당).
    const consumed = handle.onKeyDown(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true }));
    expect(consumed).toBe(true);
    expect(dispatch).toHaveBeenCalled();
    const pasted = getChart().shapeEvents.filter((e) => e.targetPos === 3 && e.isBlue);
    expect(pasted).toHaveLength(2); // 원본 + 붙여넣은 것.
  });

  it('lane Ctrl+C·Ctrl+V는 lineNum을 그대로 유지한다', () => {
    const target: LaneEvent = {
      startTick: 0,
      duration: 500,
      lineNum: 2,
      targetPos: 0.6,
      easing: 'Linear',
    };
    const { canvas, handle, getChart, dispatch } = mount(
      makeChart({ laneEvents: [line1Init, line2Init, line3Init, target] }),
    );
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 't' })); // lane 모드.
    // line2(targetPos 0.6)의 화면 x: -2 + 0.6*4 = 0.4.
    click(canvas, pixelXOfExt(0.4), pixelYOfTick(500));
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true }));
    const consumed = handle.onKeyDown(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true }));
    expect(consumed).toBe(true);
    expect(dispatch).toHaveBeenCalled();
    const pasted = getChart().laneEvents.filter((e) => e.targetPos === 0.6 && e.lineNum === 2);
    expect(pasted).toHaveLength(2);
  });

  it('shape·lane 클립보드는 서브모드별로 분리된다(shape 모드에서 복사한 걸 lane에 못 붙인다)', () => {
    const target: ShapeEvent = {
      startTick: 0,
      duration: 500,
      isBlue: true,
      targetPos: 3,
      easing: 'Linear',
    };
    const { canvas, handle, getChart, dispatch } = mount(
      makeChart({
        shapeEvents: [blueInit, redInit, target],
        laneEvents: [line1Init, line2Init, line3Init],
      }),
    );
    click(canvas, pixelXOfExt(3), pixelYOfTick(500));
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true })); // shape 복사.
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 't' })); // → lane 모드.
    const before = getChart().laneEvents.length;
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true })); // lane 붙여넣기 시도.
    expect(getChart().laneEvents).toHaveLength(before); // shape 클립보드가 안 섞인다.
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('같은 dest tick·같은 체인에 이미 이벤트가 있으면 붙여넣기를 조용히 스킵한다', () => {
    // 같은 스크롤 위치에 두 번 연속 붙여넣으면 두 번째는 첫 번째가 방금
    // 만든 이벤트와 dest가 겹쳐 스킵돼야 한다 — 기준점 tick을 직접
    // 계산하지 않고 재현한다.
    const target: ShapeEvent = {
      startTick: 0,
      duration: 500,
      isBlue: true,
      targetPos: 3,
      easing: 'Linear',
    };
    const { canvas, handle, getChart, dispatch } = mount(
      makeChart({ shapeEvents: [blueInit, redInit, target] }),
    );
    click(canvas, pixelXOfExt(3), pixelYOfTick(500));
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true }));
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true })); // 1회차: 성공.
    handle.update(getChart()); // dispatch → onDispatch → update()의 실제 배선을 재현.
    const afterFirst = getChart().shapeEvents.length;
    dispatch.mockClear();
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true })); // 2회차: dest 충돌.
    expect(getChart().shapeEvents).toHaveLength(afterFirst);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('lane 모드 Q/W/E는 그룹 멤버십을 토글한다(툴바에 표시)', () => {
    const { target, handle } = mount(makeChart({ laneEvents: [line1Init, line2Init, line3Init] }));
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 't' })); // → lane 모드.
    expect(target.textContent).toContain('Group: L1');
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 'w' })); // line2 추가.
    expect(target.textContent).toContain('Group: L1+L2');
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 'q' })); // line1 제거.
    expect(target.textContent).toContain('Group: L2');
  });

  it('마지막 1개 멤버는 토글로 비워지지 않는다', () => {
    const { target, handle } = mount(makeChart({ laneEvents: [line1Init, line2Init, line3Init] }));
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 't' }));
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 'q' })); // line1 하나뿐 — 제거 시도.
    expect(target.textContent).toContain('Group: L1');
  });

  it('R이 lane 모드에서 간격유지 ↔ pinch를 토글한다', () => {
    const { target, handle } = mount(makeChart({ laneEvents: [line1Init, line2Init, line3Init] }));
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 't' }));
    expect(target.textContent).toContain('R: 간격유지');
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 'r' }));
    expect(target.textContent).toContain('R: pinch');
  });

  it('lane 단일 멤버 클릭 배치가 AddLaneEvents를 dispatch한다', () => {
    const { canvas, handle, dispatch, getChart } = mount(
      makeChart({ laneEvents: [line1Init, line2Init, line3Init] }),
    );
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 't' }));
    click(canvas, 400, 300);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0]![0].name).toBe('AddLaneEvents');
    expect(getChart().laneEvents.length).toBeGreaterThan(3);
  });

  it('Escape가 선택을 해제한다(consumed=true), 선택 없으면 false', () => {
    const target: ShapeEvent = {
      startTick: 0,
      duration: 500,
      isBlue: true,
      targetPos: 4,
      easing: 'Linear',
    };
    const { canvas, handle } = mount(makeChart({ shapeEvents: [blueInit, redInit, target] }));
    const noSel = handle.onKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(noSel).toBe(false);
    click(canvas, pixelXOfExt(4), pixelYOfTick(500));
    const withSel = handle.onKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(withSel).toBe(true);
  });

  it('Z/X가 공유 view 상태의 viewMs를 조정한다', () => {
    const view = createEditorViewState();
    const target = document.createElement('div');
    document.body.append(target);
    const chart = makeChart();
    const api: EditorShapesApi = {
      session: {
        get chart() {
          return chart;
        },
        updateChart() {
          /* not exercised */
        },
      },
      dispatch: vi.fn(),
      view,
    };
    const handle = mountEditorShapesBody(target, chart, api);
    const before = view.viewMs;
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 'z' }));
    expect(view.viewMs).toBeCloseTo(before * 1.35);
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 'x' }));
    expect(view.viewMs).toBeCloseTo(before);
  });

  it('destroy()는 에러 없이 정리한다', () => {
    const { handle } = mount();
    expect(() => handle.destroy()).not.toThrow();
  });

  it('update()는 새 chart로 다시 그린다(크래시 없음)', () => {
    const { handle } = mount();
    expect(() => handle.update(makeChart({ level: 99 }))).not.toThrow();
  });

  // ── 드래그 재배치(D-2026-100) ──────────────────────────────

  function dragPointer(
    canvas: HTMLCanvasElement,
    from: { x: number; y: number },
    to: { x: number; y: number },
  ): void {
    canvas.dispatchEvent(
      new PointerEvent('pointerdown', { clientX: from.x, clientY: from.y, bubbles: true }),
    );
    canvas.dispatchEvent(
      new PointerEvent('pointermove', { clientX: to.x, clientY: to.y, bubbles: true }),
    );
    canvas.dispatchEvent(
      new PointerEvent('pointerup', { clientX: to.x, clientY: to.y, bubbles: true }),
    );
  }

  it('shape 점을 드래그하면 MutateShapeEvents로 targetPos만 바뀌고 tick은 그대로다', () => {
    const target: ShapeEvent = {
      startTick: 0,
      duration: 500,
      isBlue: true,
      targetPos: 4,
      easing: 'Linear',
    };
    const { canvas, dispatch, getChart } = mount(
      makeChart({ shapeEvents: [blueInit, redInit, target] }),
    );
    const y = pixelYOfTick(500);
    dragPointer(canvas, { x: pixelXOfExt(4), y }, { x: pixelXOfExt(4) + 50, y });
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0]![0].name).toBe('MutateShapeEvents');
    const moved = getChart().shapeEvents[2]!;
    expect(moved.targetPos).toBe(5);
    expect(moved.startTick + moved.duration).toBe(500);
  });

  it('임계(3px) 미만 이동은 드래그가 아니라 클릭(선택)으로 처리한다', () => {
    const target: ShapeEvent = {
      startTick: 0,
      duration: 500,
      isBlue: true,
      targetPos: 4,
      easing: 'Linear',
    };
    const {
      canvas,
      dispatch,
      target: root,
    } = mount(makeChart({ shapeEvents: [blueInit, redInit, target] }));
    const y = pixelYOfTick(500);
    dragPointer(canvas, { x: pixelXOfExt(4), y }, { x: pixelXOfExt(4) + 2, y });
    expect(dispatch).not.toHaveBeenCalled();
    expect(root.textContent).toContain('1 selected');
  });

  it('symmetry ON이어도 드래그는 반대편 이벤트를 만들거나 옮기지 않는다(원본 dragDot에 sMirror 참조 없음)', () => {
    const target: ShapeEvent = {
      startTick: 0,
      duration: 500,
      isBlue: true,
      targetPos: 4,
      easing: 'Linear',
    };
    const { canvas, handle, dispatch, getChart } = mount(
      makeChart({ shapeEvents: [blueInit, redInit, target] }),
    );
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 's' })); // symmetry ON.
    const y = pixelYOfTick(500);
    dragPointer(canvas, { x: pixelXOfExt(4), y }, { x: pixelXOfExt(4) + 50, y });
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(getChart().shapeEvents).toHaveLength(3); // red 쪽에 새 이벤트가 생기지 않았다.
    expect(getChart().shapeEvents.find((e) => !e.isBlue && e.easing !== null)).toBeUndefined();
  });

  it('anchor(init) 점도 드래그로 위치를 옮길 수 있다', () => {
    const { canvas, dispatch, getChart } = mount(makeChart({ shapeEvents: [blueInit, redInit] }));
    const y = pixelYOfTick(0);
    dragPointer(canvas, { x: pixelXOfExt(-2), y }, { x: pixelXOfExt(-2) + 100, y });
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0]![0].name).toBe('MutateShapeEvents');
    const moved = getChart().shapeEvents[0]!;
    expect(moved.targetPos).toBe(0);
    expect(moved.easing).toBe(null);
  });

  it('lane 점을 드래그하면 MutateLaneEvents로 상대 targetPos가 바뀐다', () => {
    const { canvas, handle, dispatch, getChart } = mount(
      makeChart({ laneEvents: [line1Init, line2Init, line3Init] }),
    );
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 't' })); // lane 모드.
    const y = pixelYOfTick(0);
    dragPointer(canvas, { x: pixelXOfExt(0), y }, { x: pixelXOfExt(0) + 50, y });
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0]![0].name).toBe('MutateLaneEvents');
    const moved = getChart().laneEvents[1]!;
    expect(moved.targetPos).toBe(0.75);
    expect(moved.startTick + moved.duration).toBe(0);
  });

  // ── composite dot 드래그(D-2026-101) ──────────────────────

  it('pinch 쌍(같은 tick, 0.5 미만 차이, 둘 다 non-anchor)을 드래그하면 둘 다 같은 커서 위치로 한 undo에 옮겨진다', () => {
    const blueTrans: ShapeEvent = {
      startTick: 0,
      duration: 500,
      isBlue: true,
      targetPos: 4,
      easing: 'Linear',
    };
    const redTrans: ShapeEvent = {
      startTick: 0,
      duration: 500,
      isBlue: false,
      targetPos: 4.2,
      easing: 'Linear',
    };
    const { canvas, dispatch, getChart } = mount(
      makeChart({ shapeEvents: [blueInit, redInit, blueTrans, redTrans] }),
    );
    const y = pixelYOfTick(500);
    dragPointer(canvas, { x: pixelXOfExt(4), y }, { x: pixelXOfExt(4) + 50, y }); // rawCenter=5.
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0]![0].name).toBe('MutateShapeEvents');
    expect(getChart().shapeEvents[2]!.targetPos).toBe(5);
    expect(getChart().shapeEvents[3]!.targetPos).toBe(5);
  });

  it('center 쌍(같은 tick, 폭 있음)을 드래그하면 폭을 유지한 채 커서를 중심으로 옮겨진다', () => {
    const blueTrans: ShapeEvent = {
      startTick: 0,
      duration: 500,
      isBlue: true,
      targetPos: 2,
      easing: 'Linear',
    };
    const redTrans: ShapeEvent = {
      startTick: 0,
      duration: 500,
      isBlue: false,
      targetPos: 6,
      easing: 'Linear',
    };
    const { canvas, dispatch, getChart } = mount(
      makeChart({ shapeEvents: [blueInit, redInit, blueTrans, redTrans] }),
    );
    const y = pixelYOfTick(500);
    // 실제 evaluated 중점 = (2+6)/2 = 4 → px = pixelXOfExt(4).
    dragPointer(canvas, { x: pixelXOfExt(4), y }, { x: pixelXOfExt(4) + 50, y }); // rawCenter=5.
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0]![0].name).toBe('MutateShapeEvents');
    // halfWidth = (6-2)/2 = 2 → newBlue=5-2=3, newRed=5+2=7 (폭 4 유지).
    expect(getChart().shapeEvents[2]!.targetPos).toBe(3);
    expect(getChart().shapeEvents[3]!.targetPos).toBe(7);
  });

  it('half-pair center(반대편 이벤트가 그 tick에 없음)를 드래그하면 존재하는 쪽만 옮겨진다', () => {
    const blueTrans: ShapeEvent = {
      startTick: 0,
      duration: 500,
      isBlue: true,
      targetPos: 3,
      easing: 'Linear',
    };
    // redInit(targetPos 2)만 있고 tick 500엔 red 이벤트가 없다 — half-pair.
    const { canvas, dispatch, getChart } = mount(
      makeChart({ shapeEvents: [blueInit, redInit, blueTrans] }),
    );
    const y = pixelYOfTick(500);
    // evaluated 중점 = (3+2)/2 = 2.5 → px = pixelXOfExt(2.5).
    dragPointer(canvas, { x: pixelXOfExt(2.5), y }, { x: pixelXOfExt(2.5) + 50, y }); // rawCenter=3.5.
    expect(dispatch).toHaveBeenCalledTimes(1);
    // halfWidth = (2-3)/2 = -0.5 → newBlue = 3.5-(-0.5) = 4.
    expect(getChart().shapeEvents[2]!.targetPos).toBe(4);
    expect(getChart().shapeEvents[1]!.targetPos).toBe(2); // redInit 그대로.
  });

  it('composite 클릭(드래그 없이)은 존재하는 양쪽 인덱스를 모두 선택한다', () => {
    const blueTrans: ShapeEvent = {
      startTick: 0,
      duration: 500,
      isBlue: true,
      targetPos: 2,
      easing: 'Linear',
    };
    const redTrans: ShapeEvent = {
      startTick: 0,
      duration: 500,
      isBlue: false,
      targetPos: 6,
      easing: 'Linear',
    };
    const {
      canvas,
      dispatch,
      target: root,
      getChart,
    } = mount(makeChart({ shapeEvents: [blueInit, redInit, blueTrans, redTrans] }));
    const y = pixelYOfTick(500);
    click(canvas, pixelXOfExt(4), y); // 중점 클릭, 이동 없음.
    expect(dispatch).not.toHaveBeenCalled();
    expect(root.textContent).toContain('2 selected');
    expect(getChart().shapeEvents).toHaveLength(4); // 배치가 아니라 선택으로 처리됐다.
  });

  // ── [D-2026-119] V 순환·laneGridDivisor click-to-cycle ─────────

  it('V(무모디파이어)가 shape 모드에서 Snap 라벨을 1→0.5→0.25→1로 순환한다', () => {
    const { target, handle } = mount();
    expect(target.querySelector('.editor-shapes-toolbar')?.textContent).toContain('Snap: 0.25');
    let consumed = handle.onKeyDown(new KeyboardEvent('keydown', { key: 'v' }));
    expect(consumed).toBe(true);
    expect(target.querySelector('.editor-shapes-toolbar')?.textContent).toContain('Snap: 1');
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 'V' }));
    expect(target.querySelector('.editor-shapes-toolbar')?.textContent).toContain('Snap: 0.5');
    consumed = handle.onKeyDown(new KeyboardEvent('keydown', { key: 'v' }));
    expect(consumed).toBe(true);
    expect(target.querySelector('.editor-shapes-toolbar')?.textContent).toContain('Snap: 0.25');
  });

  it('Ctrl+V는 여전히 붙여넣기다 — V 순환과 충돌하지 않는다', () => {
    const { handle } = mount();
    const consumed = handle.onKeyDown(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true }));
    // 빈 클립보드라 실제로 붙여넣을 게 없어도, paste 분기로 소비돼야 한다
    // (V 순환 분기로 새지 않는다).
    expect(consumed).toBe(true);
  });

  it('V가 배치 스냅에 실제로 반영된다 — 1 단계에서 정수 위치로만 스냅한다', () => {
    const { canvas, dispatch, handle, getChart } = mount(
      makeChart({ shapeEvents: [blueInit, redInit] }),
    );
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 'v' })); // 0.25 → 1.
    // ext 5.4 — 0.25 단계였다면 5.5로 스냅했겠지만, 1 단계는 5로 스냅한다.
    // 기존 anchor(±2, tick0)와 멀리 떨어뜨려 hit-radius(35px)에 안 걸리게 한다.
    click(canvas, pixelXOfExt(5.4), pixelYOfTick(500));
    expect(dispatch).toHaveBeenCalledTimes(1);
    const added = getChart().shapeEvents.find((e) => e.easing !== null);
    expect(added?.targetPos).toBe(5);
  });

  it('lane 모드 Grid 라벨 클릭이 프리셋 7종을 순환한다(2/3/4/6/8/12/16)', () => {
    const { target, handle } = mount();
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 't' })); // lane 서브모드로.
    const gridBtn = () =>
      [...target.querySelectorAll('button')].find((b) => b.textContent?.startsWith('Grid: '))!;
    expect(gridBtn().textContent).toBe('Grid: 4');
    gridBtn().click();
    expect(gridBtn().textContent).toBe('Grid: 6');
    gridBtn().click();
    expect(gridBtn().textContent).toBe('Grid: 8');
    for (const expected of [12, 16, 2, 3, 4]) {
      gridBtn().click();
      expect(gridBtn().textContent).toBe(`Grid: ${expected}`);
    }
  });

  // ── [D-2026-120] Ctrl+D 구간 복제 ───────────────────────────

  it('Ctrl+D — 단일 선택은 그 자신의 길이만큼 바로 뒤에 복제된다(자기 자신과 안 겹친다)', () => {
    const target: ShapeEvent = {
      startTick: 0,
      duration: 500,
      isBlue: true,
      targetPos: 4,
      easing: 'Linear',
    };
    const { canvas, handle, dispatch, getChart } = mount(
      makeChart({ shapeEvents: [blueInit, redInit, target] }),
    );
    const y = pixelYOfTick(500);
    click(canvas, pixelXOfExt(4), y); // 임계 미만 이동 없이 클릭 = 선택.
    const consumed = handle.onKeyDown(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true }));
    expect(consumed).toBe(true);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0]![0].name).toBe('AddShapeEvents');
    const added = getChart().shapeEvents.find(
      (e) => e.easing !== null && e.isBlue && e.startTick + e.duration === 1000,
    );
    expect(added).toBeDefined(); // dest 500(원본) 바로 뒤인 1000에 복제됐다.
  });

  it('Ctrl+D — 다중 선택은 서로 상대 간격을 유지한 채 구간 전체가 뒤로 옮겨진다', () => {
    const first: ShapeEvent = {
      startTick: 0,
      duration: 300,
      isBlue: true,
      targetPos: 3,
      easing: 'Linear',
    };
    const second: ShapeEvent = {
      startTick: 300,
      duration: 200,
      isBlue: true,
      targetPos: 4,
      easing: 'Linear',
    };
    const { canvas, handle, dispatch, getChart } = mount(
      makeChart({ shapeEvents: [blueInit, redInit, first, second] }),
    );
    click(canvas, pixelXOfExt(3), pixelYOfTick(300)); // first 선택(dest 300).
    click(canvas, pixelXOfExt(4), pixelYOfTick(500), { shiftKey: true }); // second 추가 선택(dest 500).
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true }));
    expect(dispatch).toHaveBeenCalledTimes(1);
    // 구간 = [0, 500), 길이 500 — 복제는 dest 800(=500+300)·1000(=500+500)에 온다.
    const dests = getChart()
      .shapeEvents.filter((e) => e.easing !== null)
      .map((e) => e.startTick + e.duration)
      .sort((a, b) => a - b);
    expect(dests).toEqual([300, 500, 800, 1000]); // first·second·복제 둘(anchor는 easing=null이라 필터됨).
  });

  it('Ctrl+D — 복제 목적지에 이미 이벤트가 있으면 조용히 스킵한다(dispatch 자체가 안 나간다)', () => {
    const target: ShapeEvent = {
      startTick: 0,
      duration: 500,
      isBlue: true,
      targetPos: 4,
      easing: 'Linear',
    };
    // 복제 목적지(dest 500+500=1000)에 미리 이벤트를 심어 충돌을 강제한다.
    const blocking: ShapeEvent = {
      startTick: 500,
      duration: 500,
      isBlue: true,
      targetPos: 6,
      easing: 'Linear',
    };
    const { canvas, handle, dispatch, getChart } = mount(
      makeChart({ shapeEvents: [blueInit, redInit, target, blocking] }),
    );
    click(canvas, pixelXOfExt(4), pixelYOfTick(500)); // target(dest 500)만 선택.
    const consumed = handle.onKeyDown(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true }));
    expect(consumed).toBe(true); // 선택은 있었으니 소비는 한다.
    expect(dispatch).not.toHaveBeenCalled(); // 유일한 후보가 충돌해 toAdd가 비었다.
    expect(getChart().shapeEvents).toHaveLength(4); // 아무것도 안 늘었다.
  });

  it('Ctrl+D — 선택이 없으면 아무것도 하지 않는다(consumed=false)', () => {
    const { handle, dispatch } = mount(makeChart({ shapeEvents: [blueInit, redInit] }));
    const consumed = handle.onKeyDown(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true }));
    expect(consumed).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('Ctrl+D — lane 서브모드에서는 laneSelection만 복제한다(shape와 안 섞인다)', () => {
    const laneTarget: LaneEvent = {
      startTick: 0,
      duration: 400,
      lineNum: 2,
      targetPos: 0.6,
      easing: 'Linear',
    };
    const { canvas, handle, dispatch, getChart } = mount(
      makeChart({
        shapeEvents: [blueInit, redInit],
        laneEvents: [line1Init, line2Init, line3Init, laneTarget],
      }),
    );
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 't' })); // lane 서브모드.
    // line2(targetPos 0.6)의 화면 x: 기본 blueInit(-2)/redInit(2) 기준 -2+0.6*4=0.4.
    click(canvas, pixelXOfExt(0.4), pixelYOfTick(400));
    const consumed = handle.onKeyDown(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true }));
    expect(consumed).toBe(true);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0]![0].name).toBe('AddLaneEvents');
    // shape 쪽은 전혀 안 건드려지지 않았다(anchor 둘만 그대로).
    expect(getChart().shapeEvents).toHaveLength(2);
    const dupLine2 = getChart().laneEvents.filter(
      (e) => e.easing !== null && e.lineNum === 2 && e.targetPos === 0.6,
    );
    expect(dupLine2).toHaveLength(2); // 원본 + 복제.
  });

  // ── [D-2026-122] 같은 dest tick 배치 = easing 갱신(skip 아님) ──

  it('Q 배치가 같은 dest tick의 기존 이벤트와 충돌하면 easing만 갱신한다(UpdateShapeEasing)', () => {
    // dest는 GRID_DIVISOR_DEFAULT(8) 격자(칸=960)에 맞춰야 placeShape의
    // snapTick이 클릭 tick을 같은 자리로 스냅한다.
    const existing: ShapeEvent = {
      startTick: 0,
      duration: 960,
      isBlue: true,
      targetPos: -2,
      easing: 'Out-Sine',
    };
    const { canvas, handle, dispatch, getChart } = mount(
      makeChart({ shapeEvents: [blueInit, redInit, existing] }),
    );
    handle.onKeyDown(new KeyboardEvent('keydown', { key: '4' })); // Linear로 배치.
    click(canvas, pixelXOfExt(3), pixelYOfTick(960)); // 위치는 달라도 dest tick(960)이 같다.
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0]![0].name).toBe('UpdateShapeEasing');
    const updated = getChart().shapeEvents.find(
      (e) => e.isBlue && e.startTick + e.duration === 960,
    );
    expect(updated?.easing).toBe('Linear'); // easing만 바뀌었다.
    expect(updated?.targetPos).toBe(-2); // targetPos는 그대로(클릭 위치 3이 아니다).
    expect(getChart().shapeEvents).toHaveLength(3); // 새로 추가된 게 없다.
  });

  it('symmetry ON — 한쪽은 충돌해 갱신, 반대쪽은 새로 추가되면 한 undo(AddShapeEvents)로 나간다', () => {
    const existingRed: ShapeEvent = {
      startTick: 0,
      duration: 960,
      isBlue: false,
      targetPos: 2,
      easing: 'Out-Sine',
    };
    const { canvas, handle, dispatch, getChart } = mount(
      makeChart({ shapeEvents: [blueInit, redInit, existingRed] }),
    );
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 's' })); // symmetry ON.
    // Blue 툴 기본. 충돌 판정은 위치가 아니라 (isBlue, dest tick)만
    // 본다 — Red는 dest 960에 이미 있으니 그 자리가 갱신되고 Blue는
    // 새로 추가된다. ext 0(대칭축)은 피한다 — 그 자리가 기존 Red의
    // evaluated "center" composite 히트와 겹쳐 배치가 아니라 드래그
    // 선택으로 샌다.
    click(canvas, pixelXOfExt(5), pixelYOfTick(960));
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0]![0].name).toBe('AddShapeEvents'); // 뭔가 새로 놓였다.
    const events = getChart().shapeEvents.filter((e) => e.easing !== null);
    expect(events).toHaveLength(2); // existingRed(갱신) + 새 Blue.
    const newBlue = events.find((e) => e.isBlue);
    expect(newBlue).toBeDefined();
    const updatedRed = events.find((e) => !e.isBlue);
    expect(updatedRed?.targetPos).toBe(2); // Red 위치는 그대로(덮지 않았다).
  });

  it('lane 단일 배치가 같은 dest tick의 기존 이벤트와 충돌하면 easing만 갱신한다(UpdateLaneEasing)', () => {
    // 기본 laneGroup은 {1}이라 line1로 충돌시킨다. dest는 tick0(=init 3개가
    // 몰려 있는 자리)와 화면상 충분히 떨어뜨려야 클릭이 그 init 점들의
    // 히트 반경(35px)에 우연히 걸리지 않는다 — tick 7680이면 화면 y가
    // 충분히 벌어진다.
    const existing: LaneEvent = {
      startTick: 0,
      duration: 7680,
      lineNum: 1,
      targetPos: 0.6,
      easing: 'Out-Sine',
    };
    const { canvas, handle, dispatch, getChart } = mount(
      makeChart({ laneEvents: [line1Init, line2Init, line3Init, existing] }),
    );
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 't' })); // lane 서브모드.
    handle.onKeyDown(new KeyboardEvent('keydown', { key: '4' })); // Linear.
    // 클릭 위치는 existing 자신의 렌더 위치(ext 0.6 → -2+0.6*4=0.4)와도
    // 충분히 떨어뜨려 그 점 자체를 히트(드래그 시작)하지 않게 한다 — 충돌
    // 판정은 위치가 아니라 (lineNum, dest tick)만 본다.
    click(canvas, pixelXOfExt(-6), pixelYOfTick(7680));
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0]![0].name).toBe('UpdateLaneEasing');
    const updated = getChart().laneEvents.find(
      (e) => e.lineNum === 1 && e.startTick + e.duration === 7680,
    );
    expect(updated?.easing).toBe('Linear');
    expect(updated?.targetPos).toBe(0.6); // targetPos는 그대로.
    expect(getChart().laneEvents).toHaveLength(4); // 새로 추가된 게 없다.
  });
});
