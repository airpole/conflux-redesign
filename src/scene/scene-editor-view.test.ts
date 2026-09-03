// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEditorViewState, mountEditorScrollbar } from './scene-editor-view.js';

function withTrackRect(track: HTMLElement, top: number, height: number): void {
  track.getBoundingClientRect = () =>
    ({ top, height, bottom: top + height, left: 0, right: 0, width: 0 }) as DOMRect;
}

describe('mountEditorScrollbar (M5-6, D-2026-104)', () => {
  let target: HTMLElement;

  afterEach(() => {
    document.body.innerHTML = '';
  });

  function setup() {
    target = document.createElement('div');
    document.body.append(target);
    const view = createEditorViewState();
    view.viewMs = 1000;
    const onSeek = vi.fn();
    const scrollbar = mountEditorScrollbar(target, view, onSeek);
    scrollbar.update({ minMs: 0, maxMs: 4000 });
    const track = target.querySelector('.editor-scrollbar-track') as HTMLElement;
    withTrackRect(track, 0, 100);
    return { view, onSeek, scrollbar, track };
  }

  it('track·thumb을 만든다', () => {
    setup();
    expect(target.querySelector('.editor-scrollbar-track')).not.toBeNull();
    expect(target.querySelector('.editor-scrollbar-thumb')).not.toBeNull();
  });

  it('update()는 thumb 높이를 viewMs/range 비율로 잰다', () => {
    setup();
    // viewMs=1000, range=4000 → 25%.
    const thumb = target.querySelector('.editor-scrollbar-thumb') as HTMLElement;
    expect(thumb.style.height).toBe('25%');
  });

  it('트랙 클릭이 그 지점의 시각으로 seek하고 onSeek을 부른다', () => {
    const { view, onSeek, track } = setup();
    // 트랙 맨 아래(y=100) 클릭 = 가장 이른 시각(minMs=0) 근방.
    track.dispatchEvent(
      new PointerEvent('pointerdown', { clientY: 100, pointerId: 1, bubbles: true }),
    );
    expect(onSeek).toHaveBeenCalledTimes(1);
    expect(view.scrollMs).toBeGreaterThanOrEqual(0);
    expect(view.scrollMs).toBeLessThan(500);
  });

  it('드래그(pointermove)가 scrollMs를 계속 갱신하고, pointerup 이후엔 멈춘다', () => {
    const { view, onSeek, track } = setup();
    track.dispatchEvent(
      new PointerEvent('pointerdown', { clientY: 100, pointerId: 1, bubbles: true }),
    );
    onSeek.mockClear();
    track.dispatchEvent(
      new PointerEvent('pointermove', { clientY: 0, pointerId: 1, bubbles: true }),
    );
    expect(onSeek).toHaveBeenCalledTimes(1);
    const afterDrag = view.scrollMs;
    expect(afterDrag).toBeGreaterThan(0); // y=0 = 가장 늦은 시각 쪽으로 옮겨갔다.

    track.dispatchEvent(new PointerEvent('pointerup', { clientY: 0, pointerId: 1, bubbles: true }));
    onSeek.mockClear();
    track.dispatchEvent(
      new PointerEvent('pointermove', { clientY: 50, pointerId: 1, bubbles: true }),
    );
    expect(onSeek).not.toHaveBeenCalled(); // pointerup 뒤로는 드래그가 아니다.
    expect(view.scrollMs).toBe(afterDrag);
  });

  it('destroy()는 트랙을 제거한다', () => {
    const { scrollbar } = setup();
    scrollbar.destroy();
    expect(target.querySelector('.editor-scrollbar-track')).toBeNull();
  });
});
