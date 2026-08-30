# env — 브라우저 설비 래핑

파일 접두사 `env-*`. 브라우저 API를 **직접 호출**하는 유일한 층이다.

실패 모드를 기준으로 6파일로 가른다: `env-audio` / `env-canvas` / `env-time` / `env-input` / `env-storage` / `env-file`.

정의 → `_plan/architecture.md` §1

`env-audio`·`env-canvas`·`env-time`·`env-input` 4파일이 M2-1 범위다(D-2026-047).
브라우저 API는 함수 인자로 주입받는다(예: `env-audio`의 `createContext: () => AudioContext`,
`env-time`의 `TimeLoopHost`) — 전역 `window`/`document`를 직접 읽지 않으므로 jsdom 없이
Node에서 mock으로 계약을 검사한다. `env-file`은 M3-2 이후(파일 열기/저장 창)에서 쓰이므로
아직 없다.

`env-storage`는 M3-1 범위다([[persistence]] §1). `workspace/library/records/settings/viewState`
다섯 store를 IndexedDB object store 다섯 개로 분리해 독립적으로 읽고 쓴다(Blob을 담아야 하는
store가 있어 `localStorage`는 쓸 수 없다). 쓰기/삭제 실패는 던지지 않고(편집을 막지 않음)
store별 `failed` 상태로 남는다 — 다음 쓰기가 곧 재시도이고, 성공하면 상태가 풀린다. 실제
"지속 표시" UI(토스트 등)는 이 층의 소관이 아니다 — 호출측(scene/app)이 `onWriteStatusChange`를
구독해 그린다.

`env-audio`의 히트음(`createHitBuffer`/`playHitSound`)은 asset 파일이 아니라 원본이
절차적으로 합성하던 소리를 그대로 옮긴 것이다(D-2026-050) — 25ms 지수 감쇠 버퍼를 매
판정마다 새로 만들어 재생하는 fire-and-forget이다.
