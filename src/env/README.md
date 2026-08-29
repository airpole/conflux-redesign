# env — 브라우저 설비 래핑

파일 접두사 `env-*`. 브라우저 API를 **직접 호출**하는 유일한 층이다.

실패 모드를 기준으로 6파일로 가른다: `env-audio` / `env-canvas` / `env-time` / `env-input` / `env-storage` / `env-file`.

정의 → `_plan/architecture.md` §1

`env-audio`·`env-canvas`·`env-time`·`env-input` 4파일이 M2-1 범위다(D-2026-047).
브라우저 API는 함수 인자로 주입받는다(예: `env-audio`의 `createContext: () => AudioContext`,
`env-time`의 `TimeLoopHost`) — 전역 `window`/`document`를 직접 읽지 않으므로 jsdom 없이
Node에서 mock으로 계약을 검사한다. `env-storage`·`env-file`은 M3에서 쓰이므로 아직 없다.

`env-audio`의 히트음(`createHitBuffer`/`playHitSound`)은 asset 파일이 아니라 원본이
절차적으로 합성하던 소리를 그대로 옮긴 것이다(D-2026-050) — 25ms 지수 감쇠 버퍼를 매
판정마다 새로 만들어 재생하는 fire-and-forget이다.
