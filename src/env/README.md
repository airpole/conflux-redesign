# env — 브라우저 설비 래핑

파일 접두사 `env-*`. 브라우저 API를 **직접 호출**하는 유일한 층이다.

실패 모드를 기준으로 6파일로 가른다: `env-audio` / `env-canvas` / `env-time` / `env-input` / `env-storage` / `env-file`.

정의 → `_plan/architecture.md` §1

`env-audio`·`env-canvas`·`env-time`·`env-input` 4파일이 M2-1 범위다(D-2026-047).
브라우저 API는 함수 인자로 주입받는다(예: `env-audio`의 `createContext: () => AudioContext`,
`env-time`의 `TimeLoopHost`) — 전역 `window`/`document`를 직접 읽지 않으므로 jsdom 없이
Node에서 mock으로 계약을 검사한다.

`env-file`은 M3-2 범위다([[persistence]] §4·§9). `env-storage`와 달리 사용자
상호작용(취소 가능)이라 실패 모드가 다르다 — 취소는 정상 흐름(`cancelled`)이고
실제 읽기/쓰기 실패는 던진다. File System Access API 모양(`showOpenFilePicker`/
`showSaveFilePicker`)으로 호스트를 추상화했다. 실제 브라우저 미지원 시 폴백은
아직 결정하지 않았다 — Deferred 항목.

`createZipArchive`는 M3-4 범위다([[cfx]] §8, `architecture.md` §1: "ZIP
인코딩·디코딩은 env-file 소관"). store(무압축) 방식만 쓰는 의존성 없는 ZIP
writer다 — 이 레포가 런타임 의존성 0을 유지하는 것과 같은 이유. `unzip`·
Python `zipfile`로 실제 왕복 검증을 했다(테스트 자체는 손으로 짠 ZIP 리더로
한다 — `env-file.test.ts`). `saveFile`의 `contents`는 `.cfx`(binary) 저장을
위해 `string | Uint8Array`로 넓혔다.

`env-storage`는 M3-1 범위다([[persistence]] §1). `workspace/library/records/settings/viewState`
다섯 store를 IndexedDB object store 다섯 개로 분리해 독립적으로 읽고 쓴다(Blob을 담아야 하는
store가 있어 `localStorage`는 쓸 수 없다). 쓰기/삭제 실패는 던지지 않고(편집을 막지 않음)
store별 `failed` 상태로 남는다 — 다음 쓰기가 곧 재시도이고, 성공하면 상태가 풀린다. 실제
"지속 표시" UI(토스트 등)는 이 층의 소관이 아니다 — 호출측(scene/app)이 `onWriteStatusChange`를
구독해 그린다.

`env-audio`의 히트음(`createHitBuffer`/`playHitSound`)은 asset 파일이 아니라 원본이
절차적으로 합성하던 소리를 그대로 옮긴 것이다(D-2026-050) — 25ms 지수 감쇠 버퍼를 매
판정마다 새로 만들어 재생하는 fire-and-forget이다.
