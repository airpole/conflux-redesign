/**
 * 명칭 대응표와 구현의 대조.
 *
 * `core/naming.md` §3이 **상수 이름의 단일 출처**다. 그런데 M1-2가 그 표를
 * 대조하지 않고 원본 이름을 그대로 쓴 자리가 두 군데 있었고(`WINDOW_*` 4종,
 * `DEFAULT_LANE_KEYS`), 그 이탈이 M1-3을 지나 M1-4까지 살아남았다 —
 * 하마터면 명세를 구현에 맞춰 고치는 것으로 봉인될 뻔했다.
 *
 * 이름은 동작이 아니라 골든이 잡지 못하고, 대장(`DIVERGENCES.md`)도 동작 차이를
 * 담는 문서라 잡지 못한다. **검증 공백이 어긋남보다 위험하다**(D-2026-035)는
 * 원칙이 걸리는 자리이므로 여기서 기계 규칙으로 만든다.
 *
 * 파서는 얕게 둔다 — 표의 "새 이름" 열에서 `ALL_CAPS` 식별자만 뽑고, 산문과
 * 비고는 사람이 읽는다.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const NAMING_PATH = fileURLToPath(new URL('../../core/naming.md', import.meta.url));
const SRC_DIR = fileURLToPath(new URL('../', import.meta.url));

/**
 * 아직 짓지 않은 이름과 담당 step. 여기 있는 것은 구현에 **없어야** 한다 —
 * 지어놓고 목록에서 지우지 않으면 그것도 실패한다(목록이 낡는 것을 막는다).
 */
const PENDING: Readonly<Record<string, string>> = {};

/**
 * §2의 함수 중 아직 짓지 않은 것과 담당 step. 같은 규칙 — 지으면 여기서 지운다.
 *
 * §2는 M1 밖 이름을 많이 담는다. render층·editor 커맨드가 그것인데, 목록이 길다는
 * 사실 자체가 정보다 — 이 이름들이 언제 서는지가 한자리에 보인다.
 */
const PENDING_FUNCTIONS: Readonly<Record<string, string>> = {
  // render (M2)
  noteColor: 'M2-2',
  noteHeadColorAt: 'M2-2',
  noteSkin: 'M2-2',
  setNoteSkin: 'M2-2',
  recordFastSlow: 'M2-4',
  // editor (M5)
  normalizeShapeChain: 'M5-4',
  runCommand: 'M5-1',
  dispatch: 'M5-1',
  undo: 'M5-1',
  redo: 'M5-1',
  canUndo: 'M5-1',
  canRedo: 'M5-1',
  clearHistory: 'M5-1',
  MirrorNotes: 'M5-2',
  MirrorShapeEvents: 'M5-4',
  AddLaneEvents: 'M5-4',
  DeleteLaneEvents: 'M5-4',
  MutateLaneEvents: 'M5-4',
  EditTempo: 'M5-3',
  AddTimeSignature: 'M5-3',
};

/** §4의 상태 필드 중 아직 짓지 않은 것. 같은 규칙 — 지으면 여기서 지운다. */
const PENDING_FIELDS: Readonly<Record<string, string>> = {
  fastCount: 'M2',
  slowCount: 'M2',
  flashTiming: 'M2',
  laneGridDivisor: 'M5',
};

const FUNCTION_SECTION_HEADING = '## 2. 함수 대응표 (현재 → 새 이름)';
const SECTION_HEADING = '## 3. 상수 / 테이블 대응표';
const FIELD_SECTION_HEADING = '## 4. 상태 객체 / 필드 대응표';
const IDENTIFIER = /`([A-Z][A-Z0-9_]{2,})`/g;
/** §2는 `` `shapeGeometryAt(tick)` `` 꼴로 적는다 — 백틱 뒤 첫 식별자만 본다. */
const FUNCTION_IDENTIFIER = /`([A-Za-z][A-Za-z0-9]*)\b/g;
/** §4는 `playState.foo`·`editorState.foo` 형태로 필드를 적는다. */
const FIELD_IDENTIFIER = /`(?:playState|editorState)\.([A-Za-z][A-Za-z0-9]*)`/g;

/** `naming.md` §3의 "새 이름" 열에서 재설계가 쓰기로 한 상수 이름을 뽑는다. */
function declaredNames(): string[] {
  const text = readFileSync(NAMING_PATH, 'utf8');
  const start = text.indexOf(SECTION_HEADING);
  expect(start, `${SECTION_HEADING}을 찾지 못했다 — 파서가 서식과 어긋났다`).toBeGreaterThan(-1);

  const body = text.slice(start).split('\n## ')[0]!;
  const names = new Set<string>();

  for (const line of body.split('\n')) {
    if (!line.trimStart().startsWith('|')) continue;

    const cells = line
      .replace(/^\s*\|/, '')
      .replace(/\|\s*$/, '')
      .split('|')
      .map((cell) => cell.trim());
    if (cells.length < 2) continue;

    const current = cells[0] ?? '';
    const renamed = cells[1] ?? '';
    if (current === '현재' || /^:?-{2,}:?$/.test(current)) continue;

    // 폐기·흡수된 자리는 이름이 남지 않는다.
    if (/폐기|흡수/.test(renamed)) continue;

    // "유지"·"동일 유지"는 왼쪽 이름을 그대로 쓴다는 뜻이다.
    const source = /유지|동일/.test(renamed) ? current : renamed;
    for (const match of source.matchAll(IDENTIFIER)) names.add(match[1]!);
  }
  return [...names].sort();
}

/**
 * `naming.md` §4의 "새 이름" 열에서 런타임 상태 필드 이름을 뽑는다.
 *
 * M1-4가 §3 이탈 두 건을 드러냈을 때 §4는 아직 기계 대조가 없었고, 그 사이 구현이
 * `hits`·`misses`를 §4와 **다른 뜻**으로 쓰고 있었다(누적 개수 vs note별 상태).
 * M1-5가 §4의 Hold 필드 여섯 개를 한꺼번에 지으므로 여기서 같은 가드를 건다(D-2026-039).
 */
function declaredFields(): string[] {
  const text = readFileSync(NAMING_PATH, 'utf8');
  const start = text.indexOf(FIELD_SECTION_HEADING);
  expect(start, `${FIELD_SECTION_HEADING}을 찾지 못했다 — 파서가 서식과 어긋났다`).toBeGreaterThan(
    -1,
  );

  const body = text.slice(start).split('\n## ')[0]!;
  const fields = new Set<string>();

  for (const line of body.split('\n')) {
    if (!line.trimStart().startsWith('|')) continue;
    const cells = line
      .replace(/^\s*\|/, '')
      .replace(/\|\s*$/, '')
      .split('|')
      .map((cell) => cell.trim());
    if (cells.length < 2) continue;

    const renamed = cells[1] ?? '';
    // 폐기·흡수·폐지된 자리는 이름이 남지 않는다.
    if (/폐기|흡수|폐지/.test(renamed)) continue;

    for (const match of renamed.matchAll(FIELD_IDENTIFIER)) fields.add(match[1]!);
  }
  return [...fields].sort();
}

/**
 * `naming.md` §2의 "새 이름" 열에서 함수·커맨드 이름을 뽑는다.
 *
 * M1-4가 상수 이탈을, M1-5가 상태 필드 이탈을 드러냈을 때 §2에는 기계 대조가
 * 없었다. M1-9가 §2의 이름을 한 번에 다섯 개 넘게 지으므로 여기서 같은 가드를
 * 건다(D-2026-043). 세우자마자 judge 세 자리가 표와 어긋나 있는 것이 드러났고,
 * 그것은 표를 고치는 쪽으로 정리했다 — 조건은 `_rationale/rationale.md`.
 */
function declaredFunctions(): string[] {
  const text = readFileSync(NAMING_PATH, 'utf8');
  const start = text.indexOf(FUNCTION_SECTION_HEADING);
  expect(
    start,
    `${FUNCTION_SECTION_HEADING}을 찾지 못했다 — 파서가 서식과 어긋났다`,
  ).toBeGreaterThan(-1);

  const body = text.slice(start).split('\n## ')[0]!;
  const names = new Set<string>();

  for (const line of body.split('\n')) {
    if (!line.trimStart().startsWith('|')) continue;

    const cells = line
      .replace(/^\s*\|/, '')
      .replace(/\|\s*$/, '')
      .split('|')
      .map((cell) => cell.trim());
    if (cells.length < 2) continue;

    const renamed = cells[1] ?? '';
    // 폐기·제거된 자리와 다른 레이어로 넘긴 자리는 이름이 남지 않는다.
    if (/폐기|제거|흡수|폐지/.test(renamed)) continue;

    for (const match of renamed.matchAll(FUNCTION_IDENTIFIER)) names.add(match[1]!);
  }
  return [...names].sort();
}

/** `src/` 전체의 소스 텍스트. 레이어를 가리지 않고 이름의 존재만 본다. */
function sourceText(): string {
  const chunks: string[] = [];

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = `${dir}${entry.name}`;
      if (entry.isDirectory()) walk(`${path}/`);
      else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        chunks.push(readFileSync(path, 'utf8'));
      }
    }
  };
  walk(SRC_DIR);
  return chunks.join('\n');
}

/**
 * **정의**를 찾는다. 단순 언급으로는 만족되지 않는다 — 다른 파일이 import만 해도
 * 통과해버리면, 정의가 다른 이름인 채로 검사를 빠져나간다.
 */
function defines(source: string, name: string): boolean {
  return new RegExp(`export const ${name}\\b`).test(source);
}

/** 폐기된 이름은 정의든 언급이든 남아 있으면 안 된다. */
function mentions(source: string, name: string): boolean {
  return new RegExp(`\\b${name}\\b`).test(source);
}

/**
 * 필드는 **선언**을 찾는다 — 타입 멤버든 객체 리터럴 키든 `name:` 꼴이어야 한다.
 * 산문·주석의 단순 언급으로 통과하면 다른 이름으로 지어놓고 검사를 빠져나간다.
 */
function declaresField(source: string, name: string): boolean {
  return new RegExp(`(^|[^.\\w])${name}\\??\\s*:`, 'm').test(source);
}

/**
 * 함수는 **정의**를 찾되 `export`를 요구하지 않는다 — `advanceJudgmentStateTo`처럼
 * 모듈 안에만 사는 것도 §2가 이름을 정한 개념이다. 커맨드는 `const`로 설 수 있어
 * 둘 다 받는다.
 */
function definesFunction(source: string, name: string): boolean {
  return new RegExp(`(function|const|class)\\s+${name}\\b`).test(source);
}

describe('함수 대응표 (naming §2) ↔ 구현', () => {
  const names = declaredFunctions();
  const source = sourceText();

  it('표에서 함수 이름을 읽어낸다 — 파서가 서식과 어긋나면 조용히 통과하지 않는다', () => {
    expect(names.length).toBeGreaterThan(30);
    expect(names).toContain('shapeGeometryAt');
    expect(names).toContain('laneLayoutAt');
    expect(names).toContain('applyEasing');
    expect(names).toContain('buildTimeline');
  });

  it('표가 정한 이름을 구현이 그대로 쓴다', () => {
    const missing = names.filter(
      (name) => !(name in PENDING_FUNCTIONS) && !definesFunction(source, name),
    );

    expect(
      missing,
      `naming §2가 정한 함수 이름이 구현에 없다. 구현을 표에 맞추거나, 표가 뒤에 알게 된 ` +
        `사실을 못 담고 있다면 naming §2를 먼저 고친다 — 어느 쪽인지 판별하는 조건은 ` +
        `_rationale/rationale.md "표를 고치는 조건"이다.`,
    ).toEqual([]);
  });

  it('PENDING_FUNCTIONS 목록이 낡지 않았다 — 지어놓고 지우지 않으면 실패한다', () => {
    const built = Object.keys(PENDING_FUNCTIONS).filter((name) => definesFunction(source, name));

    expect(
      built,
      `PENDING_FUNCTIONS에 있는 이름이 구현에 나타났다. 해당 step이 끝났다면 목록에서 지운다.`,
    ).toEqual([]);
  });

  it('대기 목록의 이름이 전부 표에 실재한다 — 목록이 표와 어긋나지 않는다', () => {
    const orphans = Object.keys(PENDING_FUNCTIONS).filter((name) => !names.includes(name));
    expect(orphans, 'PENDING_FUNCTIONS에 표에 없는 이름이 있다').toEqual([]);
  });
});

describe('명칭 대응표 (naming §3) ↔ 구현', () => {
  const names = declaredNames();
  const source = sourceText();

  it('표에서 이름을 읽어낸다 — 파서가 서식과 어긋나면 조용히 통과하지 않는다', () => {
    expect(names.length).toBeGreaterThan(10);
    expect(names).toContain('WINDOW_GOOD_MS');
    expect(names).toContain('DEFAULT_LANE_KEYS');
  });

  it('표가 정한 이름을 구현이 그대로 쓴다', () => {
    const missing = names.filter((name) => !(name in PENDING) && !defines(source, name));

    expect(
      missing,
      `naming §3이 정한 이름이 구현에 없다. 구현을 표에 맞추거나, ` +
        `이름을 바꾸기로 했다면 naming §3을 먼저 고친다 — 명세가 source of truth다.`,
    ).toEqual([]);
  });

  it('PENDING 목록이 낡지 않았다 — 지어놓고 지우지 않으면 실패한다', () => {
    const built = Object.keys(PENDING).filter((name) => defines(source, name));

    expect(
      built,
      `PENDING에 있는 이름이 구현에 나타났다. 해당 step이 끝났다면 PENDING에서 지운다.`,
    ).toEqual([]);
  });

  it('폐기된 원본 이름이 구현에 남아 있지 않다', () => {
    const discarded = ['JUDGE_SYNC_MS', 'JUDGE_GOOD_MS', 'JUDGE_WIDE_SYNC_MS', 'KEY2LINE', 'CHL'];
    const alive = discarded.filter((name) => mentions(source, name));

    expect(alive).toEqual([]);
  });
});

describe('상태 필드 대응표 (naming §4) ↔ 구현', () => {
  const fields = declaredFields();
  const source = sourceText();

  it('표에서 필드 이름을 읽어낸다 — 파서가 서식과 어긋나면 조용히 통과하지 않는다', () => {
    expect(fields.length).toBeGreaterThan(10);
    expect(fields).toContain('activeNormalHolds');
    expect(fields).toContain('hits');
  });

  it('표가 정한 필드 이름을 구현이 그대로 쓴다', () => {
    const missing = fields.filter(
      (name) => !(name in PENDING_FIELDS) && !declaresField(source, name),
    );

    expect(
      missing,
      `naming §4가 정한 런타임 상태 필드가 구현에 없다. 구현을 표에 맞추거나, ` +
        `이름을 바꾸기로 했다면 naming §4를 먼저 고친다 — 명세가 source of truth다.`,
    ).toEqual([]);
  });

  it('PENDING_FIELDS 목록이 낡지 않았다', () => {
    const built = Object.keys(PENDING_FIELDS).filter((name) => declaresField(source, name));

    expect(
      built,
      `PENDING_FIELDS에 있는 이름이 구현에 나타났다. 해당 step이 끝났다면 목록에서 지운다.`,
    ).toEqual([]);
  });

  it('폐기된 원본 상태 이름이 구현에 남아 있지 않다', () => {
    const discarded = ['playHoldState', 'playHitMap', 'playMissSet', 'playKeyHeld', 'lineMap'];

    expect(discarded.filter((name) => mentions(source, name))).toEqual([]);
  });
});
