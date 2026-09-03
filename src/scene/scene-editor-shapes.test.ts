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
});
