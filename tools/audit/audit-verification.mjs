#!/usr/bin/env node
// 검증 공백 감사 — 대장 각 행에 판정자가 실재하는가.
//
// D-2026-035는 "골든도 안 걸고 대장에도 없으면 아무 검증 없이 통과하므로,
// 검증 공백이 어긋남보다 위험하다"를 원칙으로 세웠다. 그런데 그 원칙을 지키는
// 기계 장치가 없다 — `support.test.ts`는 미커버 전원이 롤업에 **배정**됐는지만
// 보고, 배정된 자리에 테스트가 **실재**하는지는 아무도 보지 않는다.
//
// 테스트 안의 `expect(ledgerEntry('DM-4').relation).toBe('미커버')`도 대장 문자열을
// 확인할 뿐이다 — 주변 테스트가 실제로 DM-4를 검증하는지와 무관하게 통과한다.
// 링크지 가드가 아니다.
//
// 이 스크립트는 그 공백을 드러내기만 한다. 판정은 사람이 한다 — 참조가 있다고
// 검증이 있는 것은 아니고(참조는 문자열일 뿐), 참조가 없다고 반드시 미검증인
// 것도 아니다(동작은 다른 이름으로 덮여 있을 수 있다). **참조 없음은 "확인이
// 필요한 자리"라는 뜻이다.**
//
// 사용법: 레포 루트에서 `node tools/audit/audit-verification.mjs`
//        `--json`을 붙이면 기계가 읽을 형태로 낸다.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const LEDGER = path.join(ROOT, 'tests/golden/DIVERGENCES.md');
const GOLDEN_DIR = path.join(ROOT, 'tests/golden');
const asJson = process.argv.includes('--json');

if (!existsSync(LEDGER)) {
  console.error(`대장을 찾지 못했다: ${LEDGER}\n레포 루트에서 실행한다.`);
  process.exit(2);
}

// ── 대장 파싱 ───────────────────────────────────────────────
// 등재표(6열)와 롤업(3열)이 둘 다 첫 열에 ID를 둔다. 단순 grep으로 가르면
// 섞이므로 헤더로 표를 가른다 (`tests/support/divergences.ts`와 같은 방식).

const ENTRY_HEADER = ['ID', '자리', '원본', '재설계', '관계', '근거'];
const ROLLUP_HEADER = ['ID', '무엇을', '어느 step에서'];
const ID_RE = /^[A-Z]{2}-\d+$/;

const plain = (cell) => cell.replace(/[*`]/g, '').trim();
const splitRow = (line) =>
  line
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map(plain);
const sameHeader = (cells, header) =>
  cells.length === header.length && header.every((name, i) => cells[i] === name);

function parseLedger() {
  const entries = [];
  const rollup = new Map();
  let table;

  for (const line of readFileSync(LEDGER, 'utf8').split('\n')) {
    if (!line.trimStart().startsWith('|')) {
      table = undefined;
      continue;
    }
    const cells = splitRow(line);
    if (sameHeader(cells, ENTRY_HEADER)) { table = 'entry'; continue; }
    if (sameHeader(cells, ROLLUP_HEADER)) { table = 'rollup'; continue; }
    if (!table || cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;

    if (table === 'rollup') {
      for (const id of expandIds(cells[0] ?? '')) rollup.set(id, cells[2] ?? '');
      continue;
    }
    if (!ID_RE.test(cells[0] ?? '')) continue;
    entries.push({ id: cells[0], site: cells[1], relation: cells[4], basis: cells[5] });
  }
  return { entries, rollup };
}

/** 롤업 ID 셀은 `DM-1·DM-2`나 `TM-1~4`처럼 묶여 적힌다. */
function expandIds(cell) {
  const out = [];
  for (const chunk of cell.split(/[·,]/).map((s) => s.trim())) {
    const range = /^([A-Z]{2})-(\d+)~(\d+)$/.exec(chunk);
    if (range) {
      for (let n = Number(range[2]); n <= Number(range[3]); n += 1) out.push(`${range[1]}-${n}`);
      continue;
    }
    if (ID_RE.test(chunk)) out.push(chunk);
  }
  return out;
}

// ── 테스트 수집 ─────────────────────────────────────────────

function walk(dir, hit, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, hit, out);
    else if (hit(entry.name)) out.push(p);
  }
  return out;
}

const testFiles = [
  ...walk(path.join(ROOT, 'src'), (n) => n.endsWith('.test.ts')),
  ...walk(path.join(ROOT, 'tests'), (n) => n.endsWith('.test.ts')),
];

/**
 * ID → 그 ID를 언급한 테스트 파일과 언급 방식.
 *
 * `tests/support/support.test.ts`는 제외한다. 그 파일은 **파서 자체**를 시험하려고
 * 대장 ID를 부른다(`expectDivergence('TM-1')`이 던지는지 확인하는 식) — 도메인
 * 동작을 재는 것이 아니므로 커버리지로 세면 없는 안심을 만든다.
 */
const META_TEST = 'tests/support/support.test.ts';

// D-2026-044가 참조를 테스트 제목의 `[ID]` 태그로 옮겼다(WO-1 §5). 수집원을 그에
// 맞춘다 — 아래 두 정규식은 tests/support/coverage.ts의 TAG_PATTERN·TITLE_PATTERN을
// 이식한 것이다(수정 시 양쪽을 함께 고친다). expectDivergence는 어긋남 판별용으로
// 계속 수집하고, core-overlap.test.ts의 DIVERGENT 맵(fixture 단위 어긋남 처리)도
// 같은 역할로 인정한다.
const TAG_PATTERN = /\[([A-Z]{2}-\d+)\]/g;
const TITLE_PATTERN =
  /\b(?:describe|it|test)\s*(?:\.\w+)?\s*\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;

function collectReferences() {
  const refs = new Map();
  const add = (id, file, fn) => {
    if (!refs.has(id)) refs.set(id, []);
    refs.get(id).push({ file: path.relative(ROOT, file), fn });
  };
  for (const file of testFiles) {
    if (path.relative(ROOT, file).replace(/\\/g, '/') === META_TEST) continue;
    const text = readFileSync(file, 'utf8');
    // 1) 제목 태그 — 판정자 실재의 1차 신호.
    for (const t of text.matchAll(TITLE_PATTERN)) {
      for (const m of t[2].matchAll(TAG_PATTERN)) add(m[1], file, 'tag');
    }
    // 2) 어긋남 명시 — expectDivergence 호출.
    for (const m of text.matchAll(/expectDivergence\(\s*'([A-Z]{2}-\d+)'/g)) {
      add(m[1], file, 'expectDivergence');
    }
    // 3) 어긋남 명시 — DIVERGENT 맵 (fixture명: 'ID' 형태의 객체 리터럴).
    const divergentBlock = /const DIVERGENT[^=]*=\s*{([\s\S]*?)}/m.exec(text);
    if (divergentBlock) {
      for (const m of divergentBlock[1].matchAll(/'([A-Z]{2}-\d+)'/g)) {
        add(m[1], file, 'expectDivergence');
      }
    }
  }
  return refs;
}

// ── 골든 소비 여부 ──────────────────────────────────────────
// M1-9에서 `shape.json`이 값을 담고도 대조되지 않는 표였다. 표에 어떤 `fn`이
// 들어 있는지와, 테스트가 그 `fn` 문자열을 언급하는지를 나란히 본다.

function goldenSurvey() {
  const rows = [];
  const allTestText = testFiles.map((f) => readFileSync(f, 'utf8')).join('\n');

  for (const name of readdirSync(GOLDEN_DIR).filter((f) => f.endsWith('.json'))) {
    const table = JSON.parse(readFileSync(path.join(GOLDEN_DIR, name), 'utf8'));
    const cases = table.cases ?? [];
    const byFn = new Map();
    for (const c of cases) {
      const key = c.fn ?? c.name ?? '(무명)';
      byFn.set(key, (byFn.get(key) ?? 0) + 1);
    }
    const stem = name.replace(/\.json$/, '');
    const loaded = new RegExp(`loadGolden<[^>]*>\\('${stem}'\\)|loadGolden\\('${stem}'\\)`).test(allTestText);

    // 빈 기대값을 **두 종류로 가른다.** 뭉뚱그리면 진짜 신호가 묻힌다.
    //
    // - `nullExpected`: 기대값 자체가 `null`. 원본이 "해당 없음"을 그렇게 돌려주는
    //   자리라면 정상이다 — `judge.json`의 판정창 밖 입력이 그렇다.
    // - `hollowExpected`: 객체인데 **속이 전부 비었다.** M1-9의 빈 표가 이 모양이었다
    //   — 픽스처 필드명이 원본과 어긋나 NaN이 `null`로 굳은 것이라 거의 항상 사고다.
    const isNull = (v) => v === null || v === undefined;
    const nullExpected = cases.filter((c) => isNull(c.expected)).length;
    const hollowExpected = cases.filter((c) => {
      const e = c.expected;
      if (isNull(e) || typeof e !== 'object' || Array.isArray(e)) return false;
      const vals = Object.values(e);
      return vals.length > 0 && vals.every(isNull);
    }).length;

    rows.push({
      table: stem,
      cases: cases.length,
      loaded,
      nullExpected,
      hollowExpected,
      fns: [...byFn.entries()]
        .map(([fn, n]) => ({ fn, n, mentioned: allTestText.includes(`'${fn}'`) }))
        .sort((a, b) => b.n - a.n),
      fingerprint: JSON.stringify(table.sourceFingerprint ?? null),
    });
  }
  return rows;
}

// ── 조립 ────────────────────────────────────────────────────

const { entries, rollup } = parseLedger();
const refs = collectReferences();
const golden = goldenSurvey();

const matrix = entries.map((e) => {
  const seen = refs.get(e.id) ?? [];
  const flags = [];

  if (seen.length === 0) flags.push('참조없음');
  if (e.relation === '어긋남' && !seen.some((r) => r.fn === 'expectDivergence')) {
    flags.push('어긋남인데 expectDivergence 없음');
  }
  if (e.relation === '미커버' && !rollup.has(e.id)) flags.push('롤업 배정 없음');
  // `어긋남`·`없음` 행이 롤업에 남는 것은 정상이다 — 관계가 바뀌어도 "의도한
  // 차이"라는 사실은 그대로이고, 롤업은 담당 step의 소재를 가리킨다(대장 §7 산문).

  return {
    id: e.id,
    relation: e.relation,
    step: rollup.get(e.id) ?? '',
    site: e.site,
    refs: seen.map((r) => `${r.file}:${r.fn}`),
    flags,
  };
});

const ghosts = [...refs.keys()].filter((id) => !entries.some((e) => e.id === id));
const rollupOrphans = [...rollup.keys()].filter((id) => !entries.some((e) => e.id === id));
const fingerprints = new Set(golden.map((g) => g.fingerprint));

if (asJson) {
  console.log(JSON.stringify({ matrix, ghosts, rollupOrphans, golden }, null, 2));
  process.exit(0);
}

// ── 출력 ────────────────────────────────────────────────────

const bar = (s) => `\n${'━'.repeat(78)}\n${s}\n${'━'.repeat(78)}`;
const pad = (s, n) => String(s).padEnd(n);

console.log(bar('1. 대장 × 테스트 매트릭스'));
console.log(`${pad('ID', 7)}${pad('관계', 8)}${pad('step', 8)}참조`);
for (const row of matrix) {
  const mark = row.flags.length ? ' ⚠' : '';
  const refText = row.refs.length ? row.refs.join(', ') : '— 없음';
  console.log(`${pad(row.id, 7)}${pad(row.relation, 8)}${pad(row.step || '-', 8)}${refText}${mark}`);
}

console.log(bar('2. 확인이 필요한 자리'));
const flagged = matrix.filter((r) => r.flags.length);
if (flagged.length === 0) console.log('없음');
for (const row of flagged) {
  console.log(`  ${row.id} (${row.relation}${row.step ? `, ${row.step}` : ''}) — ${row.flags.join(' / ')}`);
  console.log(`      자리: ${row.site}`);
}

console.log(bar('3. 골든 표'));
for (const g of golden) {
  const warn = [];
  if (!g.loaded) warn.push('테스트가 loadGolden 하지 않음');
  if (g.hollowExpected > 0) warn.push(`속 빈 기대값 ${g.hollowExpected}건 — 픽스처 필드명 확인`);
  const nullNote = g.nullExpected > 0 ? `, null 기대값 ${g.nullExpected}건` : '';
  console.log(`\n  ${g.table}.json — ${g.cases}건${nullNote}${warn.length ? '  ⚠ ' + warn.join(' / ') : ''}`);
  for (const f of g.fns) {
    console.log(`      ${pad(f.fn, 22)}${pad(f.n + '건', 8)}${f.mentioned ? '' : '⚠ 테스트가 이 fn을 언급하지 않음'}`);
  }
}
console.log(`\n  지문 종류: ${fingerprints.size}${fingerprints.size === 1 ? '' : '  ⚠ 표마다 다른 원본에서 떴다'}`);

console.log(bar('4. 대장과 테스트의 어긋남'));
console.log(`  테스트가 부르는데 대장에 없는 ID: ${ghosts.length ? ghosts.join(' ') : '없음'}`);
console.log(`  롤업에만 있고 등재표에 없는 ID: ${rollupOrphans.length ? rollupOrphans.join(' ') : '없음'}`);

console.log(bar('요약'));
const byRel = {};
for (const e of entries) byRel[e.relation] = (byRel[e.relation] ?? 0) + 1;
console.log(`  등재 ${entries.length}행 — ${Object.entries(byRel).map(([k, v]) => `${k} ${v}`).join(' / ')}`);
console.log(`  참조 없는 행: ${matrix.filter((r) => r.refs.length === 0).length}`);
console.log(`  깃발 붙은 행: ${flagged.length}`);
console.log(`\n  ※ 참조가 있다고 검증이 있는 것은 아니다 — 참조는 대장 문자열 확인일 뿐이고,`);
console.log(`     주변 테스트가 그 동작을 실제로 재는지는 사람이 읽어 판정한다.`);
console.log('');

process.exit(flagged.length > 0 ? 1 : 0);
