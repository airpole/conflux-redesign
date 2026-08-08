import { readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * 파일명 접두사 = 레이어 (`core/naming.md` §5).
 *
 * 린트가 아니라 테스트가 맡는다 — ESLint는 import 방향을 보고, 이건 파일 배치를 본다.
 * 폴더가 안 보이는 자리(에디터 탭·검색 결과·스택 트레이스)에서 접두사가 값을 하므로
 * 폴더와의 중복을 감수하고 유지한다.
 */
const LAYERS = ['core', 'env', 'render', 'edit', 'game', 'scene', 'app'] as const;
const SRC = fileURLToPath(new URL('../../src/', import.meta.url));

describe('레이어 배치', () => {
  it.each(LAYERS)('%s 폴더가 존재하고 책임 README를 갖는다', (layer) => {
    expect(existsSync(`${SRC}${layer}`)).toBe(true);
    expect(existsSync(`${SRC}${layer}/README.md`)).toBe(true);
  });

  it.each(LAYERS)('%s 폴더의 모든 TypeScript 파일이 레이어 접두사를 갖는다', (layer) => {
    const offenders = readdirSync(`${SRC}${layer}`)
      .filter((name) => name.endsWith('.ts'))
      .filter((name) => !name.startsWith(`${layer}-`));

    expect(offenders, `${layer}/ 접두사 위반`).toEqual([]);
  });

  it('src 최상위에는 레이어 폴더만 있다', () => {
    const entries = readdirSync(SRC, { withFileTypes: true });
    const unexpected = entries
      .filter((e) => !(e.isDirectory() && (LAYERS as readonly string[]).includes(e.name)))
      .map((e) => e.name);

    expect(unexpected).toEqual([]);
  });
});
