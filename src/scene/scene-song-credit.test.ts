// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CREDIT_FADE_IN_MS, CREDIT_FADE_OUT_MS, CREDIT_HOLD_MS } from '../core/core-constants.js';
import { makeChart } from '../core/core-chart-fixture.js';
import { mountSongCreditScene } from './scene-song-credit.js';

const TOTAL_MS = CREDIT_FADE_IN_MS + CREDIT_HOLD_MS + CREDIT_FADE_OUT_MS;

describe('scene-song-credit', () => {
  let target: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    target = document.createElement('div');
    document.body.append(target);
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  function setup() {
    const onDone = vi.fn();
    const handle = mountSongCreditScene(target, { onDone });
    return { handle, onDone };
  }

  it('mount 시점에는 숨김 상태다', () => {
    setup();
    const root = target.querySelector('.song-credit-scene') as HTMLElement;
    expect(root.hidden).toBe(true);
  });

  it('update가 Music by/Jacket by/Chart by 세 줄을 채운다(§6, "by" 접두 라벨)', () => {
    const { handle } = setup();
    handle.update(
      makeChart({
        metadata: { ...makeChart().metadata, musicBy: 'A', jacketBy: 'B' },
        chartBy: 'C',
      }),
    );
    const lines = target.querySelectorAll('.credit-line');
    expect(lines[0]?.textContent).toBe('Music by A');
    expect(lines[1]?.textContent).toBe('Jacket by B');
    expect(lines[2]?.textContent).toBe('Chart by C');
  });

  it(`총 ${TOTAL_MS}ms(5초) 뒤 onDone을 정확히 한 번 부른다(§6)`, () => {
    const { handle, onDone } = setup();
    handle.update(makeChart());
    handle.show();

    vi.advanceTimersByTime(TOTAL_MS - 1);
    expect(onDone).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('update 즉시 visible 클래스가 붙어 CSS fade-in이 시작되고, hold가 끝나면 다시 사라진다', () => {
    const { handle } = setup();
    handle.update(makeChart());
    handle.show();
    const text = target.querySelector('.song-credit-text') as HTMLElement;

    expect(text.classList.contains('visible')).toBe(true); // t=0 — fade-in transition이 걸린 상태로 시작.
    vi.advanceTimersByTime(CREDIT_FADE_IN_MS + CREDIT_HOLD_MS - 1);
    expect(text.classList.contains('visible')).toBe(true);
    vi.advanceTimersByTime(1);
    expect(text.classList.contains('visible')).toBe(false);
  });

  it('hide()가 예약된 onDone을 취소한다(재진입 방어)', () => {
    const { handle, onDone } = setup();
    handle.update(makeChart());
    handle.show();
    handle.hide();

    vi.advanceTimersByTime(TOTAL_MS + 1000);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('입력·클릭에 반응하지 않는다(§6 "입력·skip·back 없음")', () => {
    const { handle, onDone } = setup();
    handle.update(makeChart());
    handle.show();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    vi.advanceTimersByTime(TOTAL_MS);
    expect(onDone).toHaveBeenCalledTimes(1); // 입력과 무관하게 시간이 다 돼서만 불렸다.
  });
});
