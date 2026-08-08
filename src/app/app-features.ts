/**
 * 빌드 프로필과 기능 플래그.
 *
 * 정의의 단일 출처는 `_plan/architecture.md` §4다. 여기는 그 구현이며,
 * `FEATURES`를 읽는 곳은 scene 등록과 진입점에 한정한다 — `core`·`render`가
 * 플래그를 읽으면 같은 함수가 빌드마다 다르게 동작해 골든 테스트가 무엇을
 * 검증하는지 불분명해진다.
 *
 * 플래그는 스펙이 "이 빌드에선 보이지 않는다"고 말한 자리에만 생긴다. 지금은 둘뿐이다.
 */

/** `'internal'`이 **아닌** 모든 값은 `'public'`으로 떨어진다. 미지정·오타 포함. */
export const BUILD_PROFILE =
  import.meta.env.VITE_BUILD_PROFILE === 'internal' ? 'internal' : 'public';

export const FEATURES = {
  /** 에디터로 가는 모든 경로. public 빌드에서는 코드가 번들에서 제거된다. */
  editor: BUILD_PROFILE === 'internal',
  /** 기록 초기화 진입점 노출 → `_meta/records.md` §4 */
  recordReset: BUILD_PROFILE === 'internal',
} as const;

export type Features = typeof FEATURES;
