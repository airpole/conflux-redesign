import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from './core-settings.js';
import { SCROLL_SPEED_MAX, SCROLL_SPEED_MIN } from './core-constants.js';
import {
  applyQuickOptions,
  confirmQuickOption,
  jumpQuickOption,
  moveQuickOptionsRow,
  openQuickOptions,
  stepQuickOption,
  QUICK_OPTION_FIELDS,
} from './core-quick-options.js';

describe('openQuickOptions', () => {
  it('첫 row는 scrollSpeed고 draft가 확정값과 같다', () => {
    const state = openQuickOptions(DEFAULT_SETTINGS);
    expect(QUICK_OPTION_FIELDS[state.rowIndex]).toBe('scrollSpeed');
    expect(state.draft).toBe(DEFAULT_SETTINGS.scrollSpeed);
  });
});

describe('moveQuickOptionsRow', () => {
  it('아래로 이동하면 다음 필드의 확정값이 draft가 된다', () => {
    const state = moveQuickOptionsRow(openQuickOptions(DEFAULT_SETTINGS), 'down');
    expect(QUICK_OPTION_FIELDS[state.rowIndex]).toBe('gaugeMode');
    expect(state.draft).toBe(DEFAULT_SETTINGS.gaugeMode);
  });

  it('맨 위에서 위로, 맨 아래에서 아래로는 더 안 움직인다', () => {
    const top = openQuickOptions(DEFAULT_SETTINGS);
    expect(moveQuickOptionsRow(top, 'up').rowIndex).toBe(0);

    let bottom = top;
    for (let i = 0; i < 10; i++) bottom = moveQuickOptionsRow(bottom, 'down');
    expect(bottom.rowIndex).toBe(QUICK_OPTION_FIELDS.length - 1);
  });

  it('이동하면 이전 row의 미확정 draft가 버려진다', () => {
    let state = openQuickOptions(DEFAULT_SETTINGS);
    state = stepQuickOption(state, 'right'); // scrollSpeed draft만 바뀜, 미확정.
    expect(state.draft).not.toBe(DEFAULT_SETTINGS.scrollSpeed);

    state = moveQuickOptionsRow(state, 'down');
    state = moveQuickOptionsRow(state, 'up'); // scrollSpeed로 복귀.
    expect(state.draft).toBe(DEFAULT_SETTINGS.scrollSpeed); // step은 버려졌다.
  });
});

describe('stepQuickOption — scrollSpeed', () => {
  it('right/scrollUp이 한 스텝 증가, left/scrollDown이 감소', () => {
    const base = openQuickOptions(DEFAULT_SETTINGS);
    const up = stepQuickOption(base, 'right');
    expect(up.draft).toBeCloseTo(DEFAULT_SETTINGS.scrollSpeed + 0.1, 5);

    const down = stepQuickOption(base, 'left');
    expect(down.draft).toBeCloseTo(DEFAULT_SETTINGS.scrollSpeed - 0.1, 5);

    expect(stepQuickOption(base, 'scrollUp').draft).toBeCloseTo(up.draft as number, 5);
    expect(stepQuickOption(base, 'scrollDown').draft).toBeCloseTo(down.draft as number, 5);
  });

  it('SCROLL_SPEED_MIN/MAX를 안 넘는다', () => {
    let state = openQuickOptions({ ...DEFAULT_SETTINGS, scrollSpeed: SCROLL_SPEED_MAX });
    state = stepQuickOption(state, 'right');
    expect(state.draft).toBe(SCROLL_SPEED_MAX);

    state = openQuickOptions({ ...DEFAULT_SETTINGS, scrollSpeed: SCROLL_SPEED_MIN });
    state = stepQuickOption(state, 'left');
    expect(state.draft).toBe(SCROLL_SPEED_MIN);
  });
});

describe('stepQuickOption — gaugeMode', () => {
  it('GAUGE_MODES 목록을 오가고 양 끝에서 멈춘다', () => {
    let state = openQuickOptions({ ...DEFAULT_SETTINGS, gaugeMode: 'normal' });
    state = moveQuickOptionsRow(state, 'down'); // gaugeMode row
    expect(state.draft).toBe('normal');

    state = stepQuickOption(state, 'right');
    expect(state.draft).toBe('hard');

    state = stepQuickOption(state, 'left');
    expect(state.draft).toBe('normal');
    state = stepQuickOption(state, 'left'); // 이미 맨 앞 — 더 안 간다.
    expect(state.draft).toBe('normal');
  });
});

describe('stepQuickOption — boolean 필드(mirror/staticShape/autoplay)', () => {
  it('방향과 무관하게 토글이다', () => {
    let state = openQuickOptions({ ...DEFAULT_SETTINGS, mirror: false });
    state = moveQuickOptionsRow(state, 'down');
    state = moveQuickOptionsRow(state, 'down'); // mirror row
    expect(state.draft).toBe(false);

    expect(stepQuickOption(state, 'right').draft).toBe(true);
    expect(stepQuickOption(state, 'left').draft).toBe(true);
    expect(stepQuickOption(state, 'scrollUp').draft).toBe(true);
  });
});

describe('jumpQuickOption', () => {
  it('마우스 클릭 값을 draft로 바로 세팅한다', () => {
    const state = jumpQuickOption(openQuickOptions(DEFAULT_SETTINGS), 5.5);
    expect(state.draft).toBe(5.5);
  });

  it('scrollSpeed는 범위를 clamp한다', () => {
    const state = jumpQuickOption(openQuickOptions(DEFAULT_SETTINGS), 999);
    expect(state.draft).toBe(SCROLL_SPEED_MAX);
  });
});

describe('confirmQuickOption', () => {
  it('Enter 전에는 committed가 안 바뀐다', () => {
    let state = openQuickOptions(DEFAULT_SETTINGS);
    state = stepQuickOption(state, 'right');
    expect(state.committed.scrollSpeed).toBe(DEFAULT_SETTINGS.scrollSpeed);
  });

  it('Enter가 지금 row의 draft를 committed로 승격한다', () => {
    let state = openQuickOptions(DEFAULT_SETTINGS);
    state = stepQuickOption(state, 'right');
    const draftValue = state.draft;
    state = confirmQuickOption(state);
    expect(state.committed.scrollSpeed).toBe(draftValue);
  });

  it('다른 row는 그대로다', () => {
    let state = openQuickOptions(DEFAULT_SETTINGS);
    state = stepQuickOption(state, 'right');
    state = confirmQuickOption(state);
    expect(state.committed.gaugeMode).toBe(DEFAULT_SETTINGS.gaugeMode);
  });
});

describe('applyQuickOptions', () => {
  it('확정값 5필드만 settings에 얹는다', () => {
    let state = openQuickOptions(DEFAULT_SETTINGS);
    state = stepQuickOption(state, 'right');
    state = confirmQuickOption(state);

    const applied = applyQuickOptions(DEFAULT_SETTINGS, state);
    expect(applied.scrollSpeed).toBe(state.committed.scrollSpeed);
    expect(applied.volMaster).toBe(DEFAULT_SETTINGS.volMaster); // 무관한 필드는 그대로.
  });
});
