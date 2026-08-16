/**
 * 설계 대장 파서.
 *
 * `tests/golden/DIVERGENCES.md`가 "재구현이 원본에서 벗어난 자리"의 단일 출처다.
 * 규칙은 **대장에 없는 차이는 실패**다. 그 규칙을 사람 규율이 아니라 기계 규칙으로
 * 만들려면 테스트가 대장을 읽을 수 있어야 한다 — 이 파일이 그 연결이다.
 *
 * 별도 JSON을 두지 않는 이유: 두 곳이 어긋나기 때문이다. 파서는 얕게 둔다 —
 * 표 행에서 ID·관계·근거만 뽑고, 산문은 사람이 읽는다.
 *
 * 대장에는 표가 두 종류 있다. **등재 표**(§1~§6, 6열)와 **미커버 롤업**(§7, 3열)이며
 * 둘 다 첫 열이 `ID`다. 그래서 파서는 열 개수가 아니라 **헤더 전체**로 표를 가른다.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const LEDGER_PATH = fileURLToPath(new URL('../golden/DIVERGENCES.md', import.meta.url));

/** 대장 §0의 관계 표기. */
export type Relation = '어긋남' | '미커버' | '없음';

export interface DivergenceEntry {
  /** `TM-1`·`GA-3`·`JD-8` 형태. */
  readonly id: string;
  /** 어느 자리인가. */
  readonly site: string;
  readonly relation: Relation;
  /** 근거 링크 또는 결정 번호. */
  readonly basis: string;
}

const ENTRY_HEADER = ['ID', '자리', '원본', '재설계', '관계', '근거'];
const ROLLUP_HEADER = ['ID', '무엇을', '어느 step에서'];

const ID_PATTERN = /^([A-Z]{2})-(\d+)$/;
const RELATIONS: readonly string[] = ['어긋남', '미커버', '없음'];

/** 표 셀에서 강조·코드 표기를 벗긴다 (`**어긋남**` → `어긋남`). */
function plain(cell: string): string {
  return cell.replace(/[*`]/g, '').trim();
}

function splitRow(line: string): string[] {
  return line
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map(plain);
}

function isSeparator(cells: string[]): boolean {
  return cells.every((cell) => /^:?-{2,}:?$/.test(cell));
}

function sameHeader(cells: string[], header: readonly string[]): boolean {
  return cells.length === header.length && header.every((name, i) => cells[i] === name);
}

/**
 * 롤업의 ID 셀은 `DM-1·DM-2`나 `TM-1~4`처럼 묶여 적힌다. 사람이 읽기 좋게 쓴
 * 표기이므로 파서가 편다 — 표기를 기계 편의에 맞추려고 문서를 고치지 않는다.
 */
function expandIds(cell: string): string[] {
  const out: string[] = [];

  for (const chunk of cell.split(/[·,]/).map((s) => s.trim())) {
    const range = /^([A-Z]{2})-(\d+)~(\d+)$/.exec(chunk);
    if (range) {
      const prefix = range[1] as string;
      for (let n = Number(range[2]); n <= Number(range[3]); n += 1) out.push(`${prefix}-${n}`);
      continue;
    }
    if (ID_PATTERN.test(chunk)) out.push(chunk);
  }
  return out;
}

interface Ledger {
  readonly entries: readonly DivergenceEntry[];
  /** §7 롤업 — 미커버 ID → 담당 step. */
  readonly rollup: ReadonlyMap<string, string>;
}

let cached: Ledger | undefined;

function parse(): Ledger {
  const entries: DivergenceEntry[] = [];
  const rollup = new Map<string, string>();
  const seen = new Set<string>();
  let table: 'entry' | 'rollup' | undefined;

  for (const line of readFileSync(LEDGER_PATH, 'utf8').split('\n')) {
    if (!line.trimStart().startsWith('|')) {
      table = undefined;
      continue;
    }

    const cells = splitRow(line);
    if (sameHeader(cells, ENTRY_HEADER)) {
      table = 'entry';
      continue;
    }
    if (sameHeader(cells, ROLLUP_HEADER)) {
      table = 'rollup';
      continue;
    }
    if (table === undefined || isSeparator(cells)) continue;

    if (table === 'rollup') {
      const step = cells[2] ?? '';
      for (const id of expandIds(cells[0] ?? '')) rollup.set(id, step);
      continue;
    }

    const id = cells[0] ?? '';
    if (!ID_PATTERN.test(id)) continue;

    const relation = cells[4] ?? '';
    if (!RELATIONS.includes(relation)) {
      throw new Error(`설계 대장 ${id}: 알 수 없는 관계 표기 "${relation}"`);
    }
    if (seen.has(id)) throw new Error(`설계 대장에 ID가 중복됐다: ${id}`);
    seen.add(id);

    entries.push({
      id,
      site: cells[1] ?? '',
      relation: relation as Relation,
      basis: cells[5] ?? '',
    });
  }

  if (entries.length === 0) {
    throw new Error('설계 대장에서 항목을 하나도 읽지 못했다 — 파서가 서식과 어긋났다');
  }
  return { entries, rollup };
}

function ledger(): Ledger {
  cached ??= parse();
  return cached;
}

/** 대장의 등재 항목 전부(§1~§6). */
export function loadLedger(): readonly DivergenceEntry[] {
  return ledger().entries;
}

export function ledgerEntry(id: string): DivergenceEntry {
  const found = loadLedger().find((entry) => entry.id === id);
  if (!found) {
    throw new Error(
      `설계 대장에 없는 ID다: ${id}. 대장에 없는 차이는 실패다 — ` +
        `의도한 차이라면 tests/golden/DIVERGENCES.md에 한 줄과 근거 링크를 추가한다.`,
    );
  }
  return found;
}

/**
 * 골든과 어긋나는 케이스를 통과시킬 때 부른다. 등재되지 않은 ID면 던지고,
 * 등재됐지만 관계가 `어긋남`이 아니면 그것도 던진다 — `미커버`/`없음`은
 * 애초에 대조할 골든 값이 없으므로 여기 올 수 없다.
 */
export function expectDivergence(id: string): DivergenceEntry {
  const entry = ledgerEntry(id);
  if (entry.relation !== '어긋남') {
    throw new Error(
      `${id}은 대장에 "${entry.relation}"으로 등재됐다 — 골든 어긋남으로 쓸 수 없다.`,
    );
  }
  return entry;
}

/**
 * 골든이 닿지 않아 **스펙 테스트가 반드시 있어야 하는** 자리.
 * 검증 공백은 어긋남보다 위험하다(D-2026-035).
 *
 * M1-1 시점에는 목록을 노출만 한다. 각 항목과 담당 테스트의 연결은 해당 step이
 * 그 영역을 지을 때 붙인다 — 지금 강제하면 아직 짓지 않은 자리가 전부 실패한다.
 */
export function uncoveredIds(): readonly string[] {
  return loadLedger()
    .filter((entry) => entry.relation === '미커버')
    .map((entry) => entry.id);
}

/** §7 롤업이 배정한 담당 step. 배정이 없으면 `undefined`. */
export function assignedStep(id: string): string | undefined {
  return ledger().rollup.get(id);
}

/**
 * §7 롤업에 실제로 등장하는 step 이름 전부.
 *
 * 롤업은 `미커버`뿐 아니라 관계가 바뀐 행(DM-3)도 담으므로, 미커버 배정만
 * 모으면 M1-8처럼 미커버가 하나도 없는 step이 빠진다.
 */
export function assignedSteps(): ReadonlySet<string> {
  return new Set(ledger().rollup.values());
}
