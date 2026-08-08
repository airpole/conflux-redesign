import { defineConfig } from 'vite';

// 빌드 프로필은 mode로 고른다. `--mode internal`이 아닌 모든 빌드는 public이다.
// → _plan/architecture.md §4 (기본값이 public인 이유: 잊었을 때의 결과가 비대칭)
//
// 문자열로 **치환**하는 것이 핵심이다. `FEATURES.editor`가 상수 false로 접히면
// 그 조건 안의 동적 import()가 통째로 번들에서 빠진다 — public 빌드의 editor 코드
// 제거(M6-2)가 이 치환에 의존한다.
export default defineConfig(({ mode }) => ({
  define: {
    'import.meta.env.VITE_BUILD_PROFILE': JSON.stringify(
      mode === 'internal' ? 'internal' : 'public',
    ),
  },
}));
