import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  GAUGE_MODES,
  JUDGE_LINE_DEFAULT,
  LANE_KEY_IDS,
  SETTING_CHECKS,
  laneOf,
  mergeSettings,
} from './core-settings.js';

describe('settings 스키마', () => {
  it('모든 기본값 필드에 허용 판정이 하나씩 걸려 있다', () => {
    // 검사 없는 필드가 조용히 생기면 그 자리에 검증 공백이 난다.
    expect(Object.keys(SETTING_CHECKS).sort()).toEqual(Object.keys(DEFAULT_SETTINGS).sort());
  });

  it('기본값 자신이 모든 검사를 통과한다', () => {
    for (const [key, check] of Object.entries(SETTING_CHECKS)) {
      expect(check(DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS]), key).toBe(true);
    }
  });

  it('[ST-5] 키 배치가 settings 영속 필드다', () => {
    // 원본은 런타임 상태(PS)에 뒀다. rebinding이 영속하려면 여기 있어야 한다.
    expect(DEFAULT_SETTINGS.keyBindings.key1).toBe('KeyE');
    expect(SETTING_CHECKS).toHaveProperty('keyBindings');
  });

  it('lane 매핑은 바인딩과 무관하게 고정이다', () => {
    expect(LANE_KEY_IDS.map(laneOf)).toEqual([1, 2, 3, 2, 3, 4]);
  });
});

describe('settings 병합', () => {
  it('저장본이 없으면 기본값 그대로다', () => {
    const { settings, report } = mergeSettings(undefined);
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(report.unknownKeys).toEqual([]);
    expect(report.rejectedKeys).toEqual([]);
  });

  it('저장본이 객체가 아니어도 온전한 settings가 나온다', () => {
    for (const junk of [null, 42, 'settings', [1, 2, 3]]) {
      expect(mergeSettings(junk).settings).toEqual(DEFAULT_SETTINGS);
    }
  });

  it('유효한 값은 기본값을 덮는다', () => {
    const { settings } = mergeSettings({ scrollSpeed: 5.5, gaugeMode: 'hard', mirror: true });
    expect(settings.scrollSpeed).toBe(5.5);
    expect(settings.gaugeMode).toBe('hard');
    expect(settings.mirror).toBe(true);
    // 나머지는 손대지 않는다.
    expect(settings.noteSkin).toBe(DEFAULT_SETTINGS.noteSkin);
  });

  it('[ST-2] 알 수 없는 키를 버린다', () => {
    // 폐기된 cmod가 남은 저장본이 실제로 존재한다. 조용히 살아남으면 폐기가 아니다.
    const { settings, report } = mergeSettings({ cmod: true, hiSpeed: 9 });

    expect(settings).not.toHaveProperty('cmod');
    expect(settings).not.toHaveProperty('hiSpeed');
    expect([...report.unknownKeys].sort()).toEqual(['cmod', 'hiSpeed']);
  });

  it('[ST-3] 범위 밖·타입 불일치 값을 필드 단위로 되돌린다', () => {
    const { settings, report } = mergeSettings({
      scrollSpeed: 99, // 범위 밖
      volMaster: 'loud', // 타입 불일치
      gaugeMode: 'insane', // enum 밖
      sudden: 95, // 0..90 밖
      noteSkin: 'circle', // 유효 — 함께 죽지 않아야 한다
    });

    expect(settings.scrollSpeed).toBe(DEFAULT_SETTINGS.scrollSpeed);
    expect(settings.volMaster).toBe(DEFAULT_SETTINGS.volMaster);
    expect(settings.gaugeMode).toBe(DEFAULT_SETTINGS.gaugeMode);
    expect(settings.sudden).toBe(DEFAULT_SETTINGS.sudden);
    expect(settings.noteSkin).toBe('circle');
    expect([...report.rejectedKeys].sort()).toEqual([
      'gaugeMode',
      'scrollSpeed',
      'sudden',
      'volMaster',
    ]);
  });

  it('깨진 필드 하나가 키 바인딩을 날리지 않는다', () => {
    // 손해가 비대칭이다 — 객체 전체를 버리면 rebinding이 통째로 사라진다.
    const rebound = { ...DEFAULT_SETTINGS.keyBindings, key1: 'KeyA' };
    const { settings } = mergeSettings({ keyBindings: rebound, laneOpacity: -3 });

    expect(settings.keyBindings.key1).toBe('KeyA');
    expect(settings.laneOpacity).toBe(DEFAULT_SETTINGS.laneOpacity);
  });

  it('불완전한 키 바인딩은 통째로 되돌린다', () => {
    // 일부만 살리면 어떤 키가 안 먹는지 사용자가 알 수 없다.
    const { settings, report } = mergeSettings({ keyBindings: { key1: 'KeyA' } });
    expect(settings.keyBindings).toEqual(DEFAULT_SETTINGS.keyBindings);
    expect(report.rejectedKeys).toContain('keyBindings');
  });

  it('병합 결과가 기본값 객체를 오염시키지 않는다', () => {
    const { settings } = mergeSettings({ mirror: true });
    settings.keyBindings.key1 = 'KeyZ';
    expect(DEFAULT_SETTINGS.mirror).toBe(false);
    expect(DEFAULT_SETTINGS.keyBindings.key1).toBe('KeyE');
  });

  it('judgeLinePos는 올리기만 된다', () => {
    expect(mergeSettings({ judgeLinePos: 0.5 }).settings.judgeLinePos).toBe(0.5);
    // 기본값보다 낮추기(= 값을 키우기)는 거부된다.
    expect(mergeSettings({ judgeLinePos: 0.95 }).settings.judgeLinePos).toBe(JUDGE_LINE_DEFAULT);
  });

  it('gaugeMode 6종을 전부 받는다', () => {
    for (const mode of GAUGE_MODES) {
      expect(mergeSettings({ gaugeMode: mode }).settings.gaugeMode).toBe(mode);
    }
  });
});
