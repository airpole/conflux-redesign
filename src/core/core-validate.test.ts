import { describe, expect, it } from 'vitest';
import { makeChart } from './core-chart-fixture.js';
import { type Chart, type Easing, type Lane } from './core-chart.js';
import { validateChartDomain, validateChartStructure } from './core-validate.js';

const paths = (issues: readonly { path: string }[]): string[] => issues.map((i) => i.path);

describe('[DM-5] structural — 통과하면 chart다', () => {
  it('정상 chart가 통과한다', () => {
    expect(validateChartStructure(makeChart())).toEqual({ ok: true, errors: [] });
  });

  it('객체가 아니면 거부한다', () => {
    for (const junk of [null, undefined, 42, 'chart', []]) {
      expect(validateChartStructure(junk).ok).toBe(false);
    }
  });

  it.each([
    ['songId', 7],
    ['chartId', '1'],
    ['tempos', null],
    ['notes', {}],
    ['updatedAt', undefined],
    ['musicFile', 42],
  ])('%s의 타입이 어긋나면 거부한다', (key, value) => {
    const broken = { ...makeChart(), [key]: value };
    const result = validateChartStructure(broken);

    expect(result.ok).toBe(false);
    expect(paths(result.errors)).toContain(key);
  });

  it('metadata 결측을 자리별로 보고한다', () => {
    const result = validateChartStructure({ ...makeChart(), metadata: { title: 'ok' } });

    expect(result.ok).toBe(false);
    expect(paths(result.errors)).toContain('metadata.offset');
  });

  it('musicFile·jacketFile은 null이 허용된다', () => {
    expect(validateChartStructure(makeChart({ musicFile: null })).ok).toBe(true);
    expect(validateChartStructure(makeChart({ musicFile: 'song.ogg' })).ok).toBe(true);
  });

  it.each([0, 2, '1', undefined])('schemaVersion이 %s면 거부한다', (version) => {
    const result = validateChartStructure({ ...makeChart(), schemaVersion: version });

    expect(result.ok).toBe(false);
    expect(paths(result.errors)).toContain('schemaVersion');
  });

  it('chart를 건드리지 않는다', () => {
    const chart = makeChart();
    const before = structuredClone(chart);
    validateChartStructure(chart);
    expect(chart).toEqual(before);
  });
});

describe('[DM-5] domain — 거부하지 않고 보고한다', () => {
  it('정상 chart는 보고할 것이 없다', () => {
    expect(validateChartDomain(makeChart()).issues).toEqual([]);
  });

  it('lane 범위 밖 노트를 보고한다', () => {
    const chart = makeChart({
      notes: [{ startTick: 0, duration: 0, lane: 5 as unknown as Lane, isWide: false }],
    });
    expect(paths(validateChartDomain(chart).issues)).toContain('notes[0].lane');
  });

  it('음수 duration을 보고한다', () => {
    const chart = makeChart({
      notes: [{ startTick: 0, duration: -480, lane: 1, isWide: false }],
    });
    expect(paths(validateChartDomain(chart).issues)).toContain('notes[0].duration');
  });

  it('tempos·timeSignatures가 비면 보고한다', () => {
    const chart = makeChart({ tempos: [], timeSignatures: [] });
    const found = paths(validateChartDomain(chart).issues);

    expect(found).toContain('tempos');
    expect(found).toContain('timeSignatures');
  });

  it('읽을 수 없는 updatedAt을 보고한다', () => {
    const chart = makeChart({ updatedAt: '어제' });
    expect(paths(validateChartDomain(chart).issues)).toContain('updatedAt');
  });

  it('shape targetPos가 -8~+8 밖이면 보고한다', () => {
    const chart = makeChart({
      shapeEvents: [{ startTick: 0, duration: 0, isBlue: true, targetPos: 9, easing: null }],
    });
    expect(paths(validateChartDomain(chart).issues)).toContain('shapeEvents[0].targetPos');
  });

  it('여러 문제를 한 번에 다 보고한다', () => {
    // 첫 문제에서 멈추면 에디터가 고칠 것을 한 번에 보여줄 수 없다.
    const chart = makeChart({
      version: 0,
      updatedAt: 'x',
      notes: [{ startTick: 0, duration: -1, lane: 9 as unknown as Lane, isWide: false }],
    });
    expect(validateChartDomain(chart).issues.length).toBeGreaterThanOrEqual(4);
  });

  it('chart를 건드리지 않는다', () => {
    const chart = makeChart({ version: 0 });
    const before = structuredClone(chart);
    validateChartDomain(chart);
    expect(chart).toEqual(before);
  });
});

describe('[DM-4] lane 데이터는 무구속이다', () => {
  it('targetPos의 역전·초과가 통과한다', () => {
    const chart = makeChart({
      laneEvents: [
        { startTick: 0, duration: 480, lineNum: 1, targetPos: 1, easing: 'Linear' },
        { startTick: 480, duration: 0, lineNum: 1, targetPos: 0, easing: null },
        { startTick: 960, duration: 0, lineNum: 2, targetPos: -3, easing: null },
        { startTick: 1440, duration: 0, lineNum: 3, targetPos: 4, easing: null },
      ],
    });

    expect(validateChartStructure(chart).ok).toBe(true);
    expect(validateChartDomain(chart).issues).toEqual([]);
  });

  it('구속하지 않는 것과 아무 값이나 받는 것은 다르다', () => {
    // `lineNum`은 구조적 식별자이므로 여전히 1~3이다.
    const chart = makeChart({
      laneEvents: [
        { startTick: 0, duration: 0, lineNum: 4 as unknown as 1, targetPos: 0, easing: null },
      ],
    });
    expect(paths(validateChartDomain(chart).issues)).toContain('laneEvents[0].lineNum');
  });
});

describe('[DM-1][DM-2] chart 하나가 계산에 필요한 전부를 소유한다', () => {
  it('같은 songId의 다른 chart 없이 검증이 완결된다', () => {
    // 같은 songId를 공유하되 metadata·timing·asset이 서로 다른 두 chart.
    const a = makeChart({
      chartId: 1,
      difficulty: 'Trace',
      metadata: { ...makeChart().metadata, title: 'A', offset: -20 },
      tempos: [{ startTick: 0, bpm: 120 }],
      musicFile: 'a.ogg',
    });
    const b = makeChart({
      chartId: 2,
      difficulty: 'Drift',
      metadata: { ...makeChart().metadata, title: 'B', offset: 35 },
      tempos: [{ startTick: 0, bpm: 174 }],
      musicFile: 'b.ogg',
    });

    // 각각 단독으로 유효하고, 서로의 값을 빌리지 않는다.
    for (const chart of [a, b]) {
      expect(validateChartStructure(chart).ok).toBe(true);
      expect(validateChartDomain(chart).issues).toEqual([]);
    }
    expect(a.songId).toBe(b.songId);
    expect(a.metadata.offset).not.toBe(b.metadata.offset);
    expect(a.tempos).not.toEqual(b.tempos);
  });

  it('core 함수는 chart 하나만 받는다', () => {
    // song 그룹이나 library를 요구하는 인자가 생기면 여기서 드러난다.
    const single: (chart: Chart) => unknown = validateChartDomain;

    expect(validateChartDomain.length).toBe(1);
    expect(single(makeChart())).toEqual({ issues: [] });
  });
});

describe('[SH-3] 조용히 사라지는 체인 데이터를 보고한다', () => {
  it('목록 밖 easing을 보고한다 — 평가는 Linear로 흘러 값이 멀쩡해 보인다', () => {
    const chart = makeChart({
      shapeEvents: [
        { startTick: 0, duration: 0, isBlue: true, targetPos: -2, easing: null },
        {
          startTick: 480,
          duration: 480,
          isBlue: true,
          targetPos: 2,
          easing: 'InOut' as unknown as Easing,
        },
      ],
    });
    expect(paths(validateChartDomain(chart).issues)).toContain('shapeEvents[1].easing');
  });

  it('구분선의 목록 밖 easing도 같이 본다', () => {
    const chart = makeChart({
      laneEvents: [
        {
          startTick: 0,
          duration: 480,
          lineNum: 2,
          targetPos: 0.5,
          easing: 'Bounce' as unknown as Easing,
        },
      ],
    });
    expect(paths(validateChartDomain(chart).issues)).toContain('laneEvents[0].easing');
  });

  it('한 체인에 anchor가 둘이면 보고한다 — 늦은 쪽은 흔적 없이 사라진다', () => {
    const chart = makeChart({
      shapeEvents: [
        { startTick: 0, duration: 0, isBlue: true, targetPos: -2, easing: null },
        { startTick: 960, duration: 0, isBlue: true, targetPos: 5, easing: null },
      ],
    });
    const issues = validateChartDomain(chart).issues;
    expect(paths(issues)).toContain('shapeEvents');
    expect(issues.some((issue) => issue.message.includes('blue'))).toBe(true);
  });

  it('체인이 다르면 anchor가 하나씩인 것은 정상이다', () => {
    const chart = makeChart({
      shapeEvents: [
        { startTick: 0, duration: 0, isBlue: true, targetPos: -2, easing: null },
        { startTick: 0, duration: 0, isBlue: false, targetPos: 2, easing: null },
      ],
      laneEvents: [
        { startTick: 0, duration: 0, lineNum: 1, targetPos: 0.25, easing: null },
        { startTick: 0, duration: 0, lineNum: 2, targetPos: 0.5, easing: null },
        { startTick: 0, duration: 0, lineNum: 3, targetPos: 0.75, easing: null },
      ],
    });
    expect(validateChartDomain(chart).issues).toEqual([]);
  });

  it('구분선 체인의 anchor 중복도 본다', () => {
    const chart = makeChart({
      laneEvents: [
        { startTick: 0, duration: 0, lineNum: 3, targetPos: 0.75, easing: null },
        { startTick: 480, duration: 0, lineNum: 3, targetPos: 0.9, easing: null },
      ],
    });
    const issues = validateChartDomain(chart).issues;
    expect(issues.some((issue) => issue.message.includes('line3'))).toBe(true);
  });
});

// ── WO-1 §3-11: 경계값 표 (DM-5 경계) ────────────────────────

describe('[DM-5 경계] domain 경계값 표', () => {
  it.each([
    {
      label: 'tempos[].bpm',
      path: 'tempos[0].bpm',
      build: (v: number): Chart => makeChart({ tempos: [{ startTick: 0, bpm: v }] }),
      flagged: 0,
      clean: 1,
    },
    {
      label: 'timeSignatures[].numerator',
      path: 'timeSignatures[0].numerator',
      build: (v: number): Chart =>
        makeChart({ timeSignatures: [{ startTick: 0, numerator: v, denominator: 4 }] }),
      flagged: 0,
      clean: 1,
    },
    {
      label: 'timeSignatures[].denominator',
      path: 'timeSignatures[0].denominator',
      build: (v: number): Chart =>
        makeChart({ timeSignatures: [{ startTick: 0, numerator: 4, denominator: v }] }),
      flagged: 0,
      clean: 1,
    },
    {
      label: 'notes[].duration',
      path: 'notes[0].duration',
      build: (v: number): Chart =>
        makeChart({ notes: [{ startTick: 0, duration: v, lane: 1, isWide: false }] }),
      flagged: -1,
      clean: 0,
    },
    {
      label: 'chartId',
      path: 'chartId',
      build: (v: number): Chart => makeChart({ chartId: v }),
      flagged: -1,
      clean: 0,
    },
    {
      label: 'textEvents[].duration',
      path: 'textEvents[0].duration',
      build: (v: number): Chart =>
        makeChart({
          textEvents: [{ startTick: 0, duration: v, content: 'x', position: 'left' }],
        }),
      flagged: -1,
      clean: 0,
    },
  ])('$label: flag되는 값과 안 되는 값', ({ path, build, flagged, clean }) => {
    expect(paths(validateChartDomain(build(flagged)).issues)).toContain(path);
    expect(paths(validateChartDomain(build(clean)).issues)).not.toContain(path);
  });

  it.each([
    { value: -8.001, flagged: true },
    { value: 8.001, flagged: true },
    { value: -8, flagged: false },
    { value: 8, flagged: false },
  ])('shapeEvents[].targetPos $value — flagged=$flagged', ({ value, flagged }) => {
    const chart = makeChart({
      shapeEvents: [{ startTick: 0, duration: 0, isBlue: true, targetPos: value, easing: null }],
    });
    const found = paths(validateChartDomain(chart).issues).includes('shapeEvents[0].targetPos');
    expect(found).toBe(flagged);
  });
});
