import { describe, expect, it, vi } from 'vitest';
import { resolveSessionTransition } from './edit-session-transition.js';

describe('resolveSessionTransition', () => {
  it('clean이면 확인 없이 전환한다 — choice가 무엇이든 액션을 부르지 않는다', async () => {
    const saveNewVersion = vi.fn();
    const discard = vi.fn();

    const result = await resolveSessionTransition(false, 'cancel', { saveNewVersion, discard });

    expect(result).toEqual({ kind: 'proceed', reason: 'clean' });
    expect(saveNewVersion).not.toHaveBeenCalled();
    expect(discard).not.toHaveBeenCalled();
  });

  it('dirty + saveNewVersion 성공 → 전환을 계속한다', async () => {
    const saveNewVersion = vi.fn(async () => 'saved' as const);
    const discard = vi.fn();

    const result = await resolveSessionTransition(true, 'saveNewVersion', {
      saveNewVersion,
      discard,
    });

    expect(result).toEqual({ kind: 'proceed', reason: 'saved' });
    expect(discard).not.toHaveBeenCalled();
  });

  it('dirty + saveNewVersion 취소 → 현재 세션을 유지한다', async () => {
    const saveNewVersion = vi.fn(async () => 'cancelled' as const);

    const result = await resolveSessionTransition(true, 'saveNewVersion', {
      saveNewVersion,
      discard: vi.fn(),
    });

    expect(result).toEqual({ kind: 'stay', reason: 'save-cancelled' });
  });

  it('dirty + saveNewVersion 실패(쓰기 실패) → 이 함수는 삼키지 않고 그대로 던진다', async () => {
    const saveNewVersion = vi.fn(async () => {
      throw new Error('디스크 오류');
    });

    await expect(
      resolveSessionTransition(true, 'saveNewVersion', { saveNewVersion, discard: vi.fn() }),
    ).rejects.toThrow('디스크 오류');
  });

  it('dirty + discardChanges → 폐기 후 전환한다', async () => {
    const discard = vi.fn(async () => {});

    const result = await resolveSessionTransition(true, 'discardChanges', {
      saveNewVersion: vi.fn(),
      discard,
    });

    expect(result).toEqual({ kind: 'proceed', reason: 'discarded' });
    expect(discard).toHaveBeenCalledTimes(1);
  });

  it('dirty + cancel → 전환을 취소하고 세션을 유지한다', async () => {
    const saveNewVersion = vi.fn();
    const discard = vi.fn();

    const result = await resolveSessionTransition(true, 'cancel', { saveNewVersion, discard });

    expect(result).toEqual({ kind: 'stay', reason: 'cancelled' });
    expect(saveNewVersion).not.toHaveBeenCalled();
    expect(discard).not.toHaveBeenCalled();
  });

  it('dirty + 선택 없음(null) → cancel과 동일하게 세션을 유지한다', async () => {
    const result = await resolveSessionTransition(true, null, {
      saveNewVersion: vi.fn(),
      discard: vi.fn(),
    });

    expect(result).toEqual({ kind: 'stay', reason: 'cancelled' });
  });
});
