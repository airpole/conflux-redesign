/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * 빌드 시 `vite.config.ts`가 문자열로 **치환**한다.
   * 치환이라 상수 폴딩이 성립하고, 그래야 public 빌드에서 editor 청크가 제거된다.
   */
  readonly VITE_BUILD_PROFILE: 'public' | 'internal';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
