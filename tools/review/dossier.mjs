// dossier.mjs — 외부 검토용 색인 생성기
//
// 원문을 요약하지 않는다. 기계적으로 추출한 색인만 만든다.
// 검토자는 색인에서 볼 자리를 고르고, 원문은 raw URL 로 직접 가져간다.
//
//   node tools/review/dossier.mjs [ref]
//
// ref 를 생략하면 현재 브랜치 이름을 raw base 에 쓴다.
//
// 산출물
//   _review/DOSSIER.md      표지·인벤토리·결정 색인·레이어·표지 grep·대장 전문
//   _review/INDEX-SPEC.md   문서 헤딩 트리
//   _review/INDEX-CODE.md   구현 export 색인·테스트 인벤토리

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const OUT = join(ROOT, '_review');
const REPO = 'airpole/conflux-redesign';

const git = (cmd) => execSync(`git ${cmd}`, { cwd: ROOT }).toString().trim();
const sha = git('rev-parse HEAD');
const branch = git('rev-parse --abbrev-ref HEAD');
const ref = process.argv[2] ?? branch;
const RAW = `https://raw.githubusercontent.com/${REPO}/${ref}`;

const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '_review']);

function walk(dir, out = []) {
  for (const name of readdirSync(join(ROOT, dir))) {
    if (SKIP_DIRS.has(name)) continue;
    const p = dir === '.' ? name : `${dir}/${name}`;
    if (statSync(join(ROOT, p)).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const ALL = walk('.').sort();
const DOCS = ALL.filter((p) => p.endsWith('.md'));
const IMPL = ALL.filter((p) => p.startsWith('src/') && p.endsWith('.ts') && !p.endsWith('.test.ts'));
const UNIT = ALL.filter((p) => p.endsWith('.test.ts'));
const FIXTURES = ALL.filter((p) => p.startsWith('tests/') && !p.endsWith('.test.ts'));

const lineCount = (p) => read(p).split('\n').length;
const bytes = (p) => statSync(join(ROOT, p)).size;
const kb = (n) => `${(n / 1024).toFixed(1)}KB`;
const total = (list) => list.reduce((s, p) => s + bytes(p), 0);
const esc = (s) => s.replace(/\|/g, '\\|');
const short = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s) || '—';

// ─────────────────────────────────────────────── 파일 인벤토리

function inventory() {
  const docRows = DOCS.map((p) => `| \`${p}\` | ${lineCount(p)} | ${kb(bytes(p))} |`).join('\n');
  return `## 1. 파일 인벤토리

### 1.1 문서 ${DOCS.length}개 — ${kb(total(DOCS))}

| 파일 | 줄 | 크기 |
|---|---:|---:|
${docRows}

### 1.2 그 밖

| 묶음 | 파일 수 | 크기 | 목록 |
|---|---:|---:|---|
| 구현 (\`src/**/*.ts\`, 테스트 제외) | ${IMPL.length} | ${kb(total(IMPL))} | \`INDEX-CODE.md\` §1 |
| 단위 테스트 (\`*.test.ts\`) | ${UNIT.length} | ${kb(total(UNIT))} | \`INDEX-CODE.md\` §2 |
| 골든·지원 (\`tests/**\`) | ${FIXTURES.length} | ${kb(total(FIXTURES))} | \`INDEX-CODE.md\` §3 |
`;
}

// ─────────────────────────────────────────────── DECISION_LOG 색인

function decisions() {
  const srcLines = read('DECISION_LOG.md').split('\n');
  const heads = [];
  srcLines.forEach((l, i) => {
    const m = /^### (D-\d{4}-\d{3}) — (.+)$/.exec(l);
    if (m) heads.push({ id: m[1], title: m[2], line: i + 1 });
  });

  const field = (body, key) => {
    const m = new RegExp(`^- \\*\\*${key}:?\\*\\*\\s*(.*)$`, 'm').exec(body);
    return m ? esc(m[1].trim()) : '';
  };

  const entries = heads.map((h, i) => {
    const end = i + 1 < heads.length ? heads[i + 1].line - 1 : srcLines.length;
    const body = srcLines.slice(h.line, end).join('\n');
    return {
      ...h,
      status: field(body, 'Status') || '—',
      defined: field(body, 'Defined in'),
      affects: field(body, 'Affects'),
      supersedes: field(body, 'Supersedes'),
      supersededBy: field(body, 'Superseded by'),
    };
  });

  const table = entries
    .map(
      (e) =>
        `| ${e.id} | L${e.line} | ${short(e.title, 36)} | ${short(e.status, 52)} | ${short(e.defined, 40)} | ${short(e.affects, 30)} | ${short(e.supersedes, 24)} | ${short(e.supersededBy, 16)} |`,
    )
    .join('\n');

  const bucket = (s) =>
    /Deferred/.test(s) ? 'Deferred 포함' : /Superseded/.test(s) ? 'Superseded' : /Accepted/.test(s) ? 'Accepted' : '기타';
  const byStatus = {};
  for (const e of entries) (byStatus[bucket(e.status)] ??= []).push(e.id);
  const counts = Object.entries(byStatus)
    .map(([k, v]) => `- **${k}** ${v.length}건 — ${v.join(', ')}`)
    .join('\n');

  const claims = new Map(); // 대상 ID → [{ by, text }]
  for (const e of entries) {
    // `None (…)` 은 "대체하지 않는다"는 선언이다 — 괄호 안에 언급된 ID 는 지목이 아니다.
    if (/^None\b/.test(e.supersedes)) continue;
    for (const m of e.supersedes.matchAll(/D-\d{4}-\d{3}/g)) {
      if (!claims.has(m[0])) claims.set(m[0], []);
      claims.get(m[0]).push({ by: e.id, text: e.supersedes });
    }
  }
  const inconsistent = entries
    .filter((e) => claims.has(e.id) && !/Superseded/.test(e.status))
    .flatMap((e) =>
      claims
        .get(e.id)
        .map((c) => `| ${e.id} | ${short(e.status, 52)} | ${c.by} | ${short(c.text, 90)} |`),
    );

  return `## 2. DECISION_LOG 색인 (${entries.length}건)

원문에서 \`Decision\` 본문과 \`Rationale\`·\`Commit\` 을 뺀 필드만 뽑았다. 본문은 \`DECISION_LOG.md\` 의 해당 줄.
문서 끝 \`D-YYYY-NNN\` 은 서식 템플릿이라 제외했다.

### 2.1 Status 분포

${counts}

### 2.2 기계 점검 — Supersedes 역참조 불일치 후보

다른 결정이 \`Supersedes\` 로 지목했는데 정작 본인 Status 가 \`Superseded\` 가 아닌 항목이다.

**부분 대체는 정상이다** — 한 결정의 일부만 갈아치웠다면 대상은 Accepted 로 남는 게 맞다.
그래서 이건 결함 목록이 아니라 **판정 대기 후보**다. 지목 문구를 함께 실었으니 전체/부분 여부를 직접 판정해라.

${
  inconsistent.length
    ? `| 대상 | 대상 Status | 지목한 결정 | 지목 문구 (Supersedes) |\n|---|---|---|---|\n${inconsistent.join('\n')}`
    : '- 발견 없음 (선언된 supersede 대상이 모두 Superseded 상태다)'
}

> 이 점검은 Status 필드만 본다. **대체된 정의가 spec 본문에 아직 살아있는지는 확인하지 않는다** — 그 대조가 검토자의 몫이다.

### 2.3 전체 표

\`L\` 은 \`DECISION_LOG.md\` 의 줄 번호다.

| ID | L | 제목 | Status | Defined in | Affects | Supersedes | Superseded by |
|---|---|---|---|---|---|---|---|
${table}
`;
}

// ─────────────────────────────────────────────── 레이어 import 매트릭스

const RANK = { core: 0, env: 1, render: 2, format: 2, edit: 3, game: 3, scene: 4, app: 5 };

function layers() {
  const matrix = {};
  const violations = [];
  for (const p of IMPL) {
    const from = p.split('/')[1];
    if (!(from in RANK)) continue;
    read(p)
      .split('\n')
      .forEach((l, i) => {
        const m = /from\s+'([^']+)'/.exec(l);
        if (!m || !m[1].startsWith('.')) return;
        const to = relative(ROOT, resolve(join(ROOT, dirname(p)), m[1])).split('/')[1];
        if (!(to in RANK) || to === from) return;
        matrix[`${from} → ${to}`] = (matrix[`${from} → ${to}`] ?? 0) + 1;
        if (RANK[to] >= RANK[from]) violations.push(`- \`${p}\` L${i + 1} — **${from} → ${to}** (\`${m[1]}\`)`);
      });
  }
  const rows = Object.entries(matrix)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `| ${k} | ${v} |`)
    .join('\n');

  return `## 3. 레이어 import 매트릭스

규율은 \`_plan/architecture.md\` §1 — \`core → env → { render, format } → edit / game → scene → app\`, 위→아래 한 방향.
\`render\`↔\`format\`, \`edit\`↔\`game\` 은 각각 동급 형제라 서로를 모른다.
아래는 실제 상대경로 import 문에서 기계적으로 센 것이다 (레이어 내부 import 은 제외).

| 방향 | 건수 |
|---|---:|
${rows}

### 위반 후보 (아래 레이어가 위를 참조 / 동급 형제 상호 참조)

${violations.length ? violations.join('\n') : '- 발견 없음'}
`;
}

// ─────────────────────────────────────────────── 미해결 표지

function markers() {
  const pat = /TODO|FIXME|미정|추후|보류/;
  const hits = [];
  for (const p of ALL) {
    if (!/\.(ts|md|mjs)$/.test(p) || p === 'DECISION_LOG.md') continue;
    read(p)
      .split('\n')
      .forEach((l, i) => {
        if (pat.test(l)) hits.push(`| \`${p}\` | L${i + 1} | ${esc(l.trim().slice(0, 140))} |`);
      });
  }
  return `## 4. 미해결 표지 grep

\`TODO|FIXME|미정|추후|보류\` — 산문 속 일반 용례도 섞여 있다. 필터가 아니라 원자료다.
\`DECISION_LOG.md\` 는 §2 가 대신하므로 제외했다.

| 파일 | 줄 | 내용 |
|---|---|---|
${hits.join('\n')}
`;
}

// ─────────────────────────────────────────────── 전문 첨부

const VERBATIM = ['tests/golden/DIVERGENCES.md', 'tools/audit/MUTATION_EQUIVALENTS.md', 'core/constants.md'];

function verbatim() {
  return VERBATIM.map((p, i) => `## ${5 + i}. 전문 — \`${p}\`\n\n${read(p)}`).join('\n\n---\n\n');
}

// ─────────────────────────────────────────────── 곁가지 색인

function specIndex() {
  const out = [];
  for (const p of DOCS) {
    if (p === 'DECISION_LOG.md') continue;
    const hs = [];
    read(p)
      .split('\n')
      .forEach((l, i) => {
        const m = /^(#{1,3}) (.+)$/.exec(l);
        if (m) hs.push(`${'  '.repeat(m[1].length - 1)}- L${i + 1} ${m[2]}`);
      });
    if (hs.length) out.push(`### \`${p}\`\n\n${hs.join('\n')}`);
  }
  return out.join('\n\n');
}

function codeIndex() {
  const exp = IMPL.map((p) => {
    const es = [];
    read(p)
      .split('\n')
      .forEach((l, i) => {
        if (/^export /.test(l)) es.push(`- L${i + 1} \`${l.replace(/\s*\{\s*$/, '').trim()}\``);
      });
    return `### \`${p}\` — ${lineCount(p)}줄\n\n${es.length ? es.join('\n') : '- (export 없음)'}`;
  }).join('\n\n');

  const tests = UNIT.map((p) => {
    const src = read(p);
    const ds = [...src.matchAll(/describe\(\s*['"`]([^'"`]+)/g)].map((m) => m[1]);
    const n = (src.match(/\b(it|test)\(/g) ?? []).length;
    return `| \`${p}\` | ${n} | ${esc(ds.join(' / ')) || '—'} |`;
  }).join('\n');

  const fixtures = FIXTURES.map((p) => `| \`${p}\` | ${kb(bytes(p))} |`).join('\n');

  return `## 1. 구현 export 색인

본문은 없다. 시그니처만이다.

${exp}

---

## 2. 단위 테스트 인벤토리

| 파일 | 케이스 수 | describe |
|---|---:|---|
${tests}

---

## 3. 골든·지원 파일

| 파일 | 크기 |
|---|---:|
${fixtures}
`;
}

// ─────────────────────────────────────────────── 조립

const stamp = `| | |
|---|---|
| 기준 커밋 | \`${sha}\` |
| 브랜치 | \`${branch}\` |
| raw base | \`${RAW}\` |
| 생성 시각 | ${new Date().toISOString()} |

원문이 필요하면 **raw base + \`/\` + 파일 경로**로 URL 을 만들어 직접 fetch 해라.
예: \`${RAW}/core/timing.md\``;

const dossier = `# Conflux 외부 검토 DOSSIER

> **기계 생성물이다.** \`node tools/review/dossier.mjs\` 로 다시 만들 수 있다.
> 손으로 고치지 마라 — 다음 생성에서 지워진다.

${stamp}

## 이 문서의 성격

요약이 아니라 **색인**이다. 판단이 개입한 압축을 거치지 않았다 — 필드 추출, 헤딩 수집,
시그니처 수집, grep 뿐이다. 그래서 여기 없는 것은 "중요하지 않다고 판단된 것"이 아니라
**원문에만 있는 것**이다.

원문 전체는 문서 ${kb(total(DOCS))} + 구현 ${kb(total(IMPL))} 라 한 번에 넣을 수 없다.
색인으로 볼 자리를 좁힌 뒤 **필요한 파일만 raw URL 로 가져가라.**
색인만으로 단정할 수 없는 자리는 단정하지 말고, 어떤 파일이 필요한지 지목해라.

곁가지 색인 두 개가 따로 있다. 필요할 때 fetch 해라.

- \`${RAW}/_review/INDEX-SPEC.md\` — 문서 헤딩 트리 (정의가 어디 사는지)
- \`${RAW}/_review/INDEX-CODE.md\` — 구현 export 시그니처·테스트 인벤토리

## 목차

1. 파일 인벤토리
2. DECISION_LOG 색인
3. 레이어 import 매트릭스
4. 미해결 표지 grep
5. 전문 — \`tests/golden/DIVERGENCES.md\`
6. 전문 — \`tools/audit/MUTATION_EQUIVALENTS.md\`
7. 전문 — \`core/constants.md\`

---

${[inventory(), decisions(), layers(), markers()].join('\n---\n\n')}
---

${verbatim()}
`;

const specDoc = `# INDEX-SPEC — 문서 헤딩 트리 (depth ≤ 3)

> 기계 생성물. \`node tools/review/dossier.mjs\`. 손으로 고치지 마라.

${stamp}

각 정의가 **어느 문서 어느 절에 사는지**의 색인이다. single-source 위반 후보를 여기서 좁혀라.
\`DECISION_LOG.md\` 는 \`DOSSIER.md\` §2 가 대신한다.

---

${specIndex()}
`;

const codeDoc = `# INDEX-CODE — 구현 시그니처·테스트 인벤토리

> 기계 생성물. \`node tools/review/dossier.mjs\`. 손으로 고치지 마라.

${stamp}

스펙↔구현 대조는 여기서 시작한다. 본문이 필요한 파일은 raw URL 로 가져가라.

---

${codeIndex()}
`;

for (const [name, body] of [
  ['DOSSIER.md', dossier],
  ['INDEX-SPEC.md', specDoc],
  ['INDEX-CODE.md', codeDoc],
]) {
  writeFileSync(join(OUT, name), body);
  console.log(`_review/${name} — ${kb(Buffer.byteLength(body))}, ${body.split('\n').length}줄`);
}
