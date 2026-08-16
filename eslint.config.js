import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';

// 레이어 7층. import는 위→아래 한 방향만.
// 정의의 단일 출처는 _plan/architecture.md §1 — 여기는 그 규칙의 기계 표현이다.
const LAYERS = ['core', 'env', 'render', 'edit', 'game', 'scene', 'app'];

// edit와 game은 형제 축이며 서로를 모른다 (architecture §1).
const SIBLINGS = { edit: ['game'], game: ['edit'] };

// 각 레이어가 import해선 안 되는 대상 = 자기보다 위층 전부 + 형제.
const zones = LAYERS.flatMap((layer, i) => {
  // `edit`·`game`은 배열 순서상 한쪽이 이미 "위층"으로 걸리므로 중복이 생긴다. Set으로 접는다.
  const forbidden = [...new Set([...LAYERS.slice(i + 1), ...(SIBLINGS[layer] ?? [])])].filter(
    (t) => t !== layer,
  );
  return forbidden.map((target) => ({
    target: `./src/${layer}`,
    from: `./src/${target}`,
    message: `레이어 위반: ${layer}는 ${target}을 import할 수 없다 (import은 위→아래 한 방향, _plan/architecture.md §1).`,
  }));
});

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'tools/golden/**', 'tools/audit/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
    plugins: { import: importPlugin },
    settings: {
      'import/resolver': { typescript: { project: './tsconfig.json' } },
    },
    rules: {
      'import/no-restricted-paths': ['error', { zones }],
      // 파일명 접두사 = 레이어 (core/naming.md §5). 폴더가 안 보이는 자리
      // (에디터 탭·검색 결과·스택 트레이스)에서 접두사가 값을 한다.
      // 접두사 검사는 lint 규칙이 아니라 tests/support/layout.test.ts가 맡는다.
    },
  },
);
