import { describe, expect, it } from 'vitest';
import {
  AXIS_MS,
  computeDelta,
  deltaColorVar,
  fastSlowColorVar,
  formatAccuracy,
  formatPlayedAt,
  formatScore,
  gaugeColorVar,
  gaugeLabel,
  histogramBuckets,
  judgmentColorVar,
  msToPct,
  rankColorVar,
  stateColorVar,
  stateLabel,
  tierChipColors,
  timingStats,
  WINDOW,
} from './scene-result-format.js';

describe('msToPct (§3 좌표 유도)', () => {
  it('축 끝은 0%·100%, 중앙(0ms)은 50%다', () => {
    expect(msToPct(-AXIS_MS)).toBe(0);
    expect(msToPct(AXIS_MS)).toBe(100);
    expect(msToPct(0)).toBe(50);
  });
});

describe('judgmentColorVar (§2.3 히스토그램 채색)', () => {
  it('|오차| 구간별로 판정색이 갈린다', () => {
    expect(judgmentColorVar(0)).toBe('var(--j-sync)');
    expect(judgmentColorVar(WINDOW.SYNC)).toBe('var(--j-sync)');
    expect(judgmentColorVar(WINDOW.SYNC + 1)).toBe('var(--j-perfect)');
    expect(judgmentColorVar(WINDOW.PERFECT)).toBe('var(--j-perfect)');
    expect(judgmentColorVar(WINDOW.PERFECT + 1)).toBe('var(--j-good)');
    expect(judgmentColorVar(WINDOW.GOOD)).toBe('var(--j-good)');
    expect(judgmentColorVar(WINDOW.GOOD + 1)).toBe('var(--j-miss)');
  });
});

describe('timingStats (D-2026-054 §6.4 NaN 제외)', () => {
  it('NaN(MISS)이 평균·σ를 오염시키지 않는다', () => {
    const stats = timingStats([10, -10, NaN, NaN]);
    expect(stats.count).toBe(2);
    expect(stats.mean).toBeCloseTo(0, 10);
    expect(Number.isNaN(stats.mean)).toBe(false);
  });

  it('유한 표본이 없으면 count 0에 mean·sigma는 0이다', () => {
    const stats = timingStats([NaN, NaN]);
    expect(stats).toEqual({ mean: 0, sigma: 0, count: 0 });
  });

  it('Float32Array도 그대로 받는다', () => {
    const stats = timingStats(Float32Array.from([5, -5, NaN]));
    expect(stats.count).toBe(2);
  });
});

describe('histogramBuckets', () => {
  it('NaN을 세지 않고, 범위 밖 값은 가장자리 버킷으로 클램프한다', () => {
    const buckets = histogramBuckets([0, NaN, AXIS_MS + 1000, -AXIS_MS - 1000], 5);
    const total = buckets.reduce((sum, b) => sum + b.count, 0);
    expect(total).toBe(3); // NaN 하나만 빠진다.
    expect(buckets[0]!.count).toBe(1); // 왼쪽 클램프
    expect(buckets[buckets.length - 1]!.count).toBe(1); // 오른쪽 클램프
  });
});

describe('computeDelta (§2.2 반올림 후 부호)', () => {
  it('반올림 전 미세한 음수 차이가 반올림 후 0(동률)이면 dim이다', () => {
    const delta = computeDelta(100.001, 100.0, 2);
    expect(delta.sign).toBe(0);
    expect(delta.text).toBe('+0.00');
  });

  it('양수는 --cyan, 음수는 U+2212(마이너스)를 쓴다', () => {
    expect(computeDelta(10, 5, 0).text).toBe('+5');
    expect(deltaColorVar(1)).toBe('var(--cyan)');

    const negative = computeDelta(5, 10, 0);
    expect(negative.text).toBe('−5');
    expect(negative.text).not.toContain('-'); // 하이픈 혼용 금지(§5)
    expect(deltaColorVar(-1)).toBe('var(--j-miss)');
  });
});

describe('fastSlowColorVar (§1.7)', () => {
  it('0이면 dimmer, 그 외엔 FAST/SLOW 각자 색이다', () => {
    expect(fastSlowColorVar(0, 'FAST')).toBe('var(--dimmer)');
    expect(fastSlowColorVar(3, 'FAST')).toBe('var(--fast)');
    expect(fastSlowColorVar(3, 'SLOW')).toBe('var(--slow)');
  });
});

describe('state/rank/gauge 라벨·색 (§1.4~§1.6, §2.4)', () => {
  it('state는 풀네임과 판정·게이지 파생색을 낸다', () => {
    expect(stateLabel('FC')).toBe('FULL COMBO');
    expect(stateLabel('F')).toBe('FAILED');
    expect(stateColorVar('H')).toBe('var(--gauge-HARD)');
  });

  it('rank는 색 토큰을 낸다(U는 cyan)', () => {
    expect(rankColorVar('U')).toBe('var(--cyan)');
    expect(rankColorVar('F')).toBe('var(--j-miss)');
  });

  it('tier 칩은 init에서 null — 플레이 결과에 나타나지 않는다', () => {
    expect(tierChipColors('init')).toBeNull();
    expect(tierChipColors('Surge')).toEqual({ bg: 'var(--tier-SURGE)', ink: 'var(--ink-SURGE)' });
  });

  it('gaugeLabel/gaugeColorVar는 cascade가 아니라 확정 tier로만 나타난다(§2.4)', () => {
    expect(gaugeLabel('ap')).toBe('All Perfect');
    expect(gaugeColorVar('as')).toBe('var(--gauge-AS)');
    expect(gaugeColorVar('normal')).toBe('var(--gauge-NORMAL)');
  });
});

describe('서식', () => {
  it('score는 천단위 구분, accuracy는 소수 2자리 %다', () => {
    expect(formatScore(1000000)).toBe('1,000,000');
    expect(formatAccuracy(99.5)).toBe('99.50%');
  });

  it('playedAt은 epoch ms를 사람이 읽는 형식으로 편다', () => {
    const text = formatPlayedAt(Date.UTC(2026, 0, 2, 3, 4));
    expect(text).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });
});
