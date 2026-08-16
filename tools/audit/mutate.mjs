#!/usr/bin/env node
// 뮤테이션 서베이 — src/core 전체. 경계(<↔<=, >↔>=), 등호(===↔!==),
// Math.max↔min, "+ 1"↔"- 1", 부호 반전(음수 상수)을 우선한다.
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const FILES = process.argv[2] ? [process.argv[2]] : [
  'src/core/core-timing.ts',
  'src/core/core-judge.ts',
  'src/core/core-gauge.ts',
  'src/core/core-shape.ts',
  'src/core/core-overlap.ts',
  'src/core/core-settings.ts',
  'src/core/core-validate.ts',
];

const OPS = [
  { re: / <= /g, sub: ' < ', tag: '<=→<' },
  { re: / < /g, sub: ' <= ', tag: '<→<=' },
  { re: / >= /g, sub: ' > ', tag: '>=→>' },
  { re: / > /g, sub: ' >= ', tag: '>→>=' },
  { re: / === /g, sub: ' !== ', tag: '===→!==' },
  { re: / !== /g, sub: ' === ', tag: '!==→===' },
  { re: /Math\.max/g, sub: 'Math.min', tag: 'max→min' },
  { re: /Math\.min/g, sub: 'Math.max', tag: 'min→max' },
  { re: / \+ 1\b/g, sub: ' - 1', tag: '+1→-1' },
  { re: / - 1\b/g, sub: ' + 1', tag: '-1→+1' },
];

function isCode(line) {
  const t = line.trim();
  return !(t.startsWith('*') || t.startsWith('//') || t.startsWith('/*'));
}

const results = [];
let total = 0;

for (const file of FILES) {
  const original = readFileSync(file, 'utf8');
  const lines = original.split('\n');

  const mutants = [];
  const MIN = Number(process.env.MUT_MIN ?? 0);
  const MAX = Number(process.env.MUT_MAX ?? 1e9);
  for (let li = 0; li < lines.length; li++) {
    if (li + 1 < MIN || li + 1 > MAX) continue;
    if (!isCode(lines[li])) continue;
    for (const op of OPS) {
      let m;
      op.re.lastIndex = 0;
      while ((m = op.re.exec(lines[li])) !== null) {
        mutants.push({ li, col: m.index, len: m[0].length, sub: op.sub, tag: op.tag });
      }
    }
  }

  for (const mu of mutants) {
    total++;
    const mutatedLine =
      lines[mu.li].slice(0, mu.col) + mu.sub + lines[mu.li].slice(mu.col + mu.len);
    const mutated = [...lines.slice(0, mu.li), mutatedLine, ...lines.slice(mu.li + 1)].join('\n');
    writeFileSync(file, mutated);
    let killed = false;
    try {
      execSync('npx vitest run --silent 2>/dev/null', { stdio: 'pipe', timeout: 120000 });
    } catch {
      killed = true;
    }
    writeFileSync(file, original);
    if (!killed) {
      results.push({ file, line: mu.li + 1, tag: mu.tag, code: lines[mu.li].trim() });
      console.log(`SURVIVED ${file}:${mu.li + 1} [${mu.tag}] ${lines[mu.li].trim()}`);
    }
  }
  console.error(`done ${file} (${mutants.length} mutants)`);
}

console.log(`\nTOTAL ${total} mutants, ${results.length} survived`);
writeFileSync('/home/claude/survivors-' + (process.argv[2] || 'all').replace(/[\/.]/g, '_') + '.json', JSON.stringify(results, null, 2));
