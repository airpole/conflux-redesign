// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeChart } from '../core/core-chart-fixture.js';
import type { Chart } from '../core/core-chart.js';
import { buildTimeline, tickToMs } from '../core/core-timing.js';
import type { Command } from '../edit/edit-command.js';
import { mountEditorNotesBody, type EditorNotesApi } from './scene-editor-notes.js';

function mount(initialChart: Chart = makeChart()): {
  target: HTMLElement;
  canvas: HTMLCanvasElement;
  handle: ReturnType<typeof mountEditorNotesBody>;
  dispatch: ReturnType<typeof vi.fn>;
  getChart: () => Chart;
} {
  const target = document.createElement('div');
  document.body.append(target);
  let chart = initialChart;
  const dispatch = vi.fn((command: Command) => {
    command.apply();
  });
  const api: EditorNotesApi = {
    session: {
      get chart() {
        return chart;
      },
      updateChart(next) {
        chart = next;
      },
    },
    dispatch,
  };
  const handle = mountEditorNotesBody(target, initialChart, api);
  const canvas = target.querySelector('.editor-notes-canvas') as HTMLCanvasElement;
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

describe('scene-editor-notes', () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.useRealTimers();
  });

  it('mount는 canvas와 toolbar를 만든다', () => {
    const { target } = mount();
    expect(target.querySelector('.editor-notes-canvas')).not.toBeNull();
    expect(target.querySelector('.editor-notes-tool-label')?.textContent).toBe('Tap (Q)');
  });

  it('Q/W/E/R 키가 tool을 바꾼다', () => {
    const { target, handle } = mount();
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 'w' }));
    expect(target.querySelector('.editor-notes-tool-label')?.textContent).toBe('Hold (W)');
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 'E' }));
    expect(target.querySelector('.editor-notes-tool-label')?.textContent).toBe('Wide Tap (E)');
  });

  it('빈 칸 클릭(tap 툴)이 AddNotes command를 dispatch한다', () => {
    const { canvas, dispatch } = mount();
    click(canvas, 100, 100);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0]![0].name).toBe('AddNotes');
  });

  it('wide tap 배치는 isWide=true note를 만든다', () => {
    const { canvas, handle, getChart } = mount();
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 'e' }));
    click(canvas, 100, 100);
    expect(getChart().notes).toHaveLength(1);
    expect(getChart().notes[0]!.isWide).toBe(true);
    expect(getChart().notes[0]!.duration).toBe(0);
  });

  it('hold 툴은 2클릭으로 확정한다', () => {
    const { canvas, handle, getChart, dispatch } = mount();
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 'w' }));
    click(canvas, 100, 500); // 시작(늦은 시점 = 아래쪽)
    expect(dispatch).not.toHaveBeenCalled(); // 아직 pending.
    click(canvas, 100, 100); // 끝(이른 시점 = 위쪽)
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(getChart().notes).toHaveLength(1);
    expect(getChart().notes[0]!.duration).toBeGreaterThan(0);
  });

  it('Escape가 pending hold를 취소한다(consumed=true)', () => {
    const { canvas, handle, dispatch } = mount();
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 'w' }));
    click(canvas, 100, 500);
    const consumed = handle.onKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(consumed).toBe(true);
    click(canvas, 100, 100);
    expect(dispatch).not.toHaveBeenCalled(); // pending이 취소됐으니 확정도 없다.
  });

  /** 구현과 같은 식(`VIEW_MS_DEFAULT=8000`, scrollMs=0)으로 note의 화면
   *  y를 역산한다 — 스캔 대신 정확한 좌표를 계산해 클릭한다. */
  function pixelYOfTick(tick: number, canvasHeight = 600): number {
    const timeline = buildTimeline(makeChart());
    const ms = tickToMs(timeline, tick);
    const pxPerMs = canvasHeight / 8000;
    return canvasHeight - ms * pxPerMs;
  }

  it('클릭으로 note를 선택하고 D로 삭제한다', () => {
    const notes = [{ startTick: 100, duration: 0, lane: 1 as const, isWide: false }];
    const { canvas, handle, getChart, dispatch } = mount(makeChart({ notes }));
    const y = pixelYOfTick(100);
    click(canvas, 100, y); // lane 1 중심 x=100.
    expect(dispatch).not.toHaveBeenCalled(); // 클릭만으로는 선택만, 편집이 아니다.
    const consumed = handle.onKeyDown(new KeyboardEvent('keydown', { key: 'D' }));
    expect(consumed).toBe(true);
    expect(getChart().notes).toHaveLength(0);
  });

  it('선택 없이 D를 누르면 소비하지 않는다(consumed=false)', () => {
    const { handle } = mount();
    const consumed = handle.onKeyDown(new KeyboardEvent('keydown', { key: 'D' }));
    expect(consumed).toBe(false);
  });

  it('Ctrl+F가 선택된 note를 mirror한다', () => {
    const notes = [{ startTick: 100, duration: 0, lane: 1 as const, isWide: false }];
    const { canvas, handle, getChart } = mount(makeChart({ notes }));
    const y = pixelYOfTick(100);
    click(canvas, 100, y);
    const consumed = handle.onKeyDown(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true }));
    expect(consumed).toBe(true);
    expect(getChart().notes[0]!.lane).toBe(4);
  });

  it('선택 후 Ctrl+C·Ctrl+V가 note를 복제한다', () => {
    const notes = [{ startTick: 100, duration: 0, lane: 1 as const, isWide: false }];
    const { canvas, handle, getChart } = mount(makeChart({ notes }));
    const y = pixelYOfTick(100);
    click(canvas, 100, y);
    const copied = handle.onKeyDown(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true }));
    expect(copied).toBe(true);
    const pasted = handle.onKeyDown(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true }));
    expect(pasted).toBe(true);
    expect(getChart().notes.length).toBeGreaterThanOrEqual(1);
  });

  it('선택 없이 Ctrl+C·Ctrl+V는 소비하되 아무 것도 dispatch하지 않는다', () => {
    const { handle, dispatch } = mount();
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true }));
    handle.onKeyDown(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true }));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('note를 드래그하면 drag-end에 MoveNotes command 1개만 dispatch한다', () => {
    const notes = [{ startTick: 960, duration: 0, lane: 2 as const, isWide: false }];
    const { canvas, dispatch, getChart } = mount(makeChart({ notes }));
    const y = pixelYOfTick(960);
    canvas.dispatchEvent(
      new PointerEvent('pointerdown', { clientX: 300, clientY: y, bubbles: true }),
    );
    canvas.dispatchEvent(
      new PointerEvent('pointermove', { clientX: 300, clientY: y - 50, bubbles: true }),
    );
    expect(dispatch).not.toHaveBeenCalled(); // 드래그 도중엔 아직 dispatch 안 함.
    canvas.dispatchEvent(
      new PointerEvent('pointerup', { clientX: 300, clientY: y - 50, bubbles: true }),
    );
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0]![0].name).toBe('MoveNotes');
    expect(getChart().notes[0]!.startTick).not.toBe(960); // 위로 옮겨져 tick이 늘었다.
  });

  it('4px 미만 이동은 클릭으로 취급해 아무 command도 안 부른다', () => {
    const notes = [{ startTick: 960, duration: 0, lane: 2 as const, isWide: false }];
    const { canvas, dispatch } = mount(makeChart({ notes }));
    const y = pixelYOfTick(960);
    canvas.dispatchEvent(
      new PointerEvent('pointerdown', { clientX: 300, clientY: y, bubbles: true }),
    );
    canvas.dispatchEvent(
      new PointerEvent('pointermove', { clientX: 301, clientY: y + 1, bubbles: true }),
    );
    canvas.dispatchEvent(
      new PointerEvent('pointerup', { clientX: 301, clientY: y + 1, bubbles: true }),
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('destroy()는 에러 없이 정리한다', () => {
    const { handle } = mount();
    expect(() => handle.destroy()).not.toThrow();
  });

  it('update()는 새 chart로 다시 그린다(크래시 없음)', () => {
    const { handle } = mount();
    expect(() => handle.update(makeChart({ level: 99 }))).not.toThrow();
  });

  /** Z/X 줌(D-2026-098) — `viewMs`를 ×1.35/÷1.35로 바꾼 뒤, 그 새 축
   *  기준으로 다시 계산한 픽셀 y에서 note가 여전히 히트되는지로 간접
   *  검증한다(viewMs가 실제로 렌더/히트테스트에 반영됐다는 뜻). */
  function pixelYOfTickAtViewMs(tick: number, viewMs: number, canvasHeight = 600): number {
    const timeline = buildTimeline(makeChart());
    const ms = tickToMs(timeline, tick);
    const pxPerMs = canvasHeight / viewMs;
    return canvasHeight - ms * pxPerMs;
  }

  it('Z는 viewMs를 ×1.35 늘리고(축소), consumed=true', () => {
    const notes = [{ startTick: 960, duration: 0, lane: 1 as const, isWide: false }];
    const { canvas, handle } = mount(makeChart({ notes }));
    const consumed = handle.onKeyDown(new KeyboardEvent('keydown', { key: 'z' }));
    expect(consumed).toBe(true);
    const y = pixelYOfTickAtViewMs(960, 8000 * 1.35);
    click(canvas, 100, y);
    const consumed2 = handle.onKeyDown(new KeyboardEvent('keydown', { key: 'D' }));
    expect(consumed2).toBe(true);
  });

  it('X는 viewMs를 ÷1.35 줄이고(확대), consumed=true', () => {
    const notes = [{ startTick: 960, duration: 0, lane: 1 as const, isWide: false }];
    const { canvas, handle } = mount(makeChart({ notes }));
    const consumed = handle.onKeyDown(new KeyboardEvent('keydown', { key: 'X' }));
    expect(consumed).toBe(true);
    const y = pixelYOfTickAtViewMs(960, 8000 / 1.35);
    click(canvas, 100, y);
    const consumed2 = handle.onKeyDown(new KeyboardEvent('keydown', { key: 'D' }));
    expect(consumed2).toBe(true);
  });

  it('Z를 반복하면 VIEW_MS_MAX(32000ms)에서 clamp된다', () => {
    const notes = [{ startTick: 960, duration: 0, lane: 1 as const, isWide: false }];
    const { canvas, handle } = mount(makeChart({ notes }));
    for (let i = 0; i < 20; i += 1) {
      handle.onKeyDown(new KeyboardEvent('keydown', { key: 'z' }));
    }
    const y = pixelYOfTickAtViewMs(960, 32000);
    click(canvas, 100, y);
    const consumed = handle.onKeyDown(new KeyboardEvent('keydown', { key: 'D' }));
    expect(consumed).toBe(true);
  });

  it('X를 반복하면 VIEW_MS_MIN(1000ms)에서 clamp된다', () => {
    const notes = [{ startTick: 960, duration: 0, lane: 1 as const, isWide: false }];
    const { canvas, handle } = mount(makeChart({ notes }));
    for (let i = 0; i < 20; i += 1) {
      handle.onKeyDown(new KeyboardEvent('keydown', { key: 'x' }));
    }
    const y = pixelYOfTickAtViewMs(960, 1000);
    click(canvas, 100, y);
    const consumed = handle.onKeyDown(new KeyboardEvent('keydown', { key: 'D' }));
    expect(consumed).toBe(true);
  });
});
