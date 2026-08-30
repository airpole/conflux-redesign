// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeChart } from '../core/core-chart-fixture.js';
import type { ResultData } from '../game/game-session.js';
import { mountResultScene, type ResultView } from './scene-result.js';

function fakeResult(overrides: Partial<ResultData> = {}): ResultData {
  return {
    score: 987_654,
    accuracy: 96.5,
    rank: 'S',
    state: 'FC',
    tier: 'normal',
    maxCombo: 200,
    counts: { SYNC: 150, PERFECT: 40, GOOD: 10, MISS: 0 },
    forceEnded: false,
    gaugeTrace: [80, 85, 90, 95, 100],
    progress: 1,
    timingErrors: Float32Array.from([-10, 5, 20, NaN]),
    fastCount: 2,
    slowCount: 1,
    playedAt: Date.UTC(2026, 0, 1, 12, 0),
    ...overrides,
  };
}

function fakeView(overrides: Partial<ResultView> = {}): ResultView {
  return {
    chart: makeChart({
      metadata: { ...makeChart().metadata, title: '테스트 곡', musicBy: 'Alice' },
    }),
    result: fakeResult(),
    prevBest: null,
    mods: [],
    ...overrides,
  };
}

describe('mountResultScene — 데이터 바인딩', () => {
  let target: HTMLDivElement;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.append(target);
  });

  afterEach(() => {
    target.remove();
  });

  it('score·rank·state·accuracy·판정 수·FAST-SLOW·max combo가 표시된다 (M2-6 Exit)', () => {
    const handle = mountResultScene(target, fakeView(), { onRetry: vi.fn(), onBack: vi.fn() });

    expect(target.textContent).toContain('987,654'); // score
    expect(target.textContent).toContain('S'); // rank
    expect(target.textContent).toContain('FULL COMBO'); // state 풀네임
    expect(target.textContent).toContain('96.50%'); // accuracy
    expect(target.textContent).toContain('200'); // max combo
    expect(target.textContent).toContain('FAST 2');
    expect(target.textContent).toContain('SLOW 1');
    // 판정 수 — SYNC 150 / PERFECT 40 / GOOD 10 / MISS 0.
    expect(target.textContent).toMatch(/SYNC\s*150/);
    expect(target.textContent).toContain('200'); // TOTAL NOTES = 150+40+10+0

    handle.destroy();
  });

  it('prevBest가 null이면 0/0.00%를 기준선으로 델타를 낸다(D-2026-054 §6.1)', () => {
    const handle = mountResultScene(target, fakeView({ prevBest: null }), {
      onRetry: vi.fn(),
      onBack: vi.fn(),
    });

    const delta = target.querySelector('.records-grid .delta')!;
    expect(delta.textContent).toBe('+987654'); // score − 0
    handle.destroy();
  });

  it('autoplay가 아니어도 tier가 cascade가 아니라 확정 tier로만 게이지 라벨에 나타난다(§2.4)', () => {
    const handle = mountResultScene(target, fakeView({ result: fakeResult({ tier: 'ap' }) }), {
      onRetry: vi.fn(),
      onBack: vi.fn(),
    });
    expect(target.textContent).toContain('Gauge: All Perfect');
    handle.destroy();
  });

  it('update()로 다시 그리면 새 값이 반영된다', () => {
    const handle = mountResultScene(target, fakeView(), { onRetry: vi.fn(), onBack: vi.fn() });
    handle.update(fakeView({ result: fakeResult({ score: 1_000_000, rank: 'U' }) }));
    expect(target.textContent).toContain('1,000,000');
    handle.destroy();
  });
});

describe('mountResultScene — 키 계약 (§4)', () => {
  let target: HTMLDivElement;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.append(target);
    vi.useFakeTimers();
  });

  afterEach(() => {
    target.remove();
    vi.useRealTimers();
  });

  function fire(key: string): void {
    const event = new KeyboardEvent('keydown', { key, cancelable: true });
    document.dispatchEvent(event);
  }

  it('진입 400ms 안의 입력은 완전히 막힌다', () => {
    const onRetry = vi.fn();
    const handle = mountResultScene(target, fakeView(), { onRetry, onBack: vi.fn() });

    vi.advanceTimersByTime(100);
    fire('Enter');
    expect(onRetry).not.toHaveBeenCalled();

    handle.destroy();
  });

  it('락아웃 뒤 첫 입력은 연출 스킵으로 소비되고, 두 번째부터 동작한다', () => {
    const onRetry = vi.fn();
    const handle = mountResultScene(target, fakeView(), { onRetry, onBack: vi.fn() });

    vi.advanceTimersByTime(500);
    fire('Enter'); // 첫 입력 — 소비만.
    expect(onRetry).not.toHaveBeenCalled();

    fire('Enter'); // 두 번째 — 동작.
    expect(onRetry).toHaveBeenCalledTimes(1);

    handle.destroy();
  });

  it('Backspace=Back, Enter=Retry (D-2026-053), Space는 아무것도 하지 않는다', () => {
    const onRetry = vi.fn();
    const onBack = vi.fn();
    const handle = mountResultScene(target, fakeView(), { onRetry, onBack });

    vi.advanceTimersByTime(500);
    fire('Enter'); // 스킵 소비
    fire(' ');
    expect(onRetry).not.toHaveBeenCalled();
    expect(onBack).not.toHaveBeenCalled();

    fire('Backspace');
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();

    handle.destroy();
  });

  it('destroy() 후에는 키 입력이 아무 동작도 하지 않는다', () => {
    const onRetry = vi.fn();
    const handle = mountResultScene(target, fakeView(), { onRetry, onBack: vi.fn() });
    vi.advanceTimersByTime(500);
    fire('Enter'); // 스킵 소비
    handle.destroy();

    fire('Enter');
    expect(onRetry).not.toHaveBeenCalled();
  });
});
