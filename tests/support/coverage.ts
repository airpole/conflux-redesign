/**
 * 대장 ID 태그 수집기.
 *
 * 설계 대장의 `미커버`는 "골든이 닿지 않으니 **스펙 테스트가 유일한 판정자**"라는
 * 뜻이다. 그런데 그 판정자가 실재하는지 검사하는 장치가 없었다 —
 * `expect(ledgerEntry('DM-4').relation).toBe('미커버')`는 대장의 글자만 확인하므로,
 * 그 describe 안의 테스트를 **전부 지워도 통과한다.** 링크지 가드가 아니었다.
 *
 * 그래서 연결을 제목으로 옮긴다. `describe('[DM-5] …')`처럼 테스트 제목 앞머리에
 * ID를 달면, 테스트를 지울 때 태그도 함께 사라진다 — 주석이나 별도 목록과 달리
 * **뒤에 남을 수 없는 자리**다(D-2026-044).
 *
 * 이 파일이 검사하는 것은 2층까지다: 담당 테스트가 **실재하는가**. 그 테스트가
 * 실제로 그 동작을 판별하는가(3층)는 기계가 알 수 없고, 사람이 리뷰에서 본다.
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const ROOTS = ['src', 'tests'];

/** `[DM-5]`·`[GA-6]` 형태. 제목 어디에 있어도 센다. */
const TAG_PATTERN = /\[([A-Z]{2}-\d+)\]/g;

/**
 * `describe('…')`·`it('…')`의 첫 인자 문자열.
 *
 * 제목만 본다 — 본문의 문자열이나 주석은 태그로 세지 않는다. 주석은 테스트를
 * 지워도 남을 수 있어서 애초에 이 장치를 만든 이유와 어긋난다.
 */
const TITLE_PATTERN = /\b(?:describe|it|test)\s*(?:\.\w+)?\s*\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;

function testFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      testFiles(full, out);
    } else if (entry.name.endsWith('.test.ts')) {
      out.push(full);
    }
  }
  return out;
}

export interface TagSite {
  readonly id: string;
  /** 레포 루트 기준 경로. */
  readonly file: string;
  readonly title: string;
}

let cached: readonly TagSite[] | undefined;

function collect(): readonly TagSite[] {
  const sites: TagSite[] = [];

  for (const root of ROOTS) {
    for (const file of testFiles(path.join(ROOT, root))) {
      const source = readFileSync(file, 'utf8');
      const relative = path.relative(ROOT, file);

      for (const [, , title] of source.matchAll(TITLE_PATTERN)) {
        for (const [, id] of (title ?? '').matchAll(TAG_PATTERN)) {
          sites.push({ id: id as string, file: relative, title: title as string });
        }
      }
    }
  }
  return sites;
}

/** 테스트 제목에 달린 태그 전부. */
export function tagSites(): readonly TagSite[] {
  cached ??= collect();
  return cached;
}

/** 태그된 ID → 그 태그가 달린 테스트 파일들. */
export function taggedIds(): ReadonlyMap<string, readonly string[]> {
  const map = new Map<string, string[]>();
  for (const site of tagSites()) {
    const files = map.get(site.id) ?? [];
    if (!files.includes(site.file)) files.push(site.file);
    map.set(site.id, files);
  }
  return map;
}
