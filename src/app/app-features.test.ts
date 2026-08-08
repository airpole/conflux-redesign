import { describe, expect, it } from 'vitest';
import { BUILD_PROFILE, FEATURES } from './app-features.js';

describe('빌드 프로필', () => {
  it('프로필을 지정하지 않으면 public으로 떨어진다', () => {
    // 이 테스트는 `VITE_BUILD_PROFILE`이 주입되지 않은 상태에서 돈다.
    // 잊었을 때 공개 빌드가 나가는 쪽이 아니라, 에디터가 안 뜨는 쪽으로 붕괴해야 한다.
    expect(BUILD_PROFILE).toBe('public');
  });

  it('public 프로필에서 두 플래그가 모두 꺼져 있다', () => {
    expect(FEATURES.editor).toBe(false);
    expect(FEATURES.recordReset).toBe(false);
  });

  it('플래그는 두 개뿐이다', () => {
    // 스펙이 요구하지 않는 플래그를 미리 만들면 켜지지 않는 분기가 코드에 남는다.
    expect(Object.keys(FEATURES).sort()).toEqual(['editor', 'recordReset']);
  });
});
