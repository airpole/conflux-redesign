# app — 부트스트랩·빌드 게이트

파일 접두사 `app-*`. 무엇을 켜고 무엇을 최상위에 붙일지 결정한다.

`FEATURES`를 소유하는 유일한 층이다 → `_plan/architecture.md` §4

정의 → `_plan/architecture.md` §1

`app-main.ts`는 M4-1(scene-manager)·M4-2(title/mode-select/credits)·
M4-3(song-select)이 만든 scene 모듈을 조립해 실제로 부팅한다 — 각 scene의
`mountXxxScene()` 호출을 `Scene.mount()` 클로저 안으로 미뤄 lazy mount
계약을 지킨다. `FEATURES.editor`로 mode-select의 `Editor` 항목 노출 여부를
결정해 넘긴다(scene 레이어는 `FEATURES`를 모른다). song-select는 `Play`
선택 시 `game-song-select.ts`의 `loadSongSelectRows`로 실제 library를 읽어
렌더한다.

M4-4가 song-select의 실제 인터랙션 배선을 더했다 — `game-viewstate.ts`로
axis 상태(category/groupBy/sortKey/sortDir/recordCellMode/lastSelected)를
`onEnter`에서 읽고 카테고리 변경·커서 이동·기록 칸 토글마다 다시 쓴다.
`onCursorChange`마다 `game-song-preview.ts`의 `createPreviewController`
(`env-audio.ts`의 실제 `AudioEnv`로 생성)에 `onCursorSettle`을 걸어 preview를
재생하고, `onBack`/`onExit`에서 `stop()`한다. `onResetRecord`는
`FEATURES.recordReset`이 켜졌을 때만 핸들러를 넘긴다(꺼지면 핸들러 자체가
없어 `scene-song-select.ts`가 버튼을 안 그린다) — 확정은 `confirm()`으로
막는다(스펙에 별도 확인 인터랙션이 없어 되돌릴 수 없는 동작에 대한 가장
단순한 방어로 고른 것, 결정 필요 항목으로 별도 보고).

M4-5가 `onSelect`(Enter) 이후의 전체 경로를 이었다 — song-select →
`enterSongCredit`(chart+음원 로드, `LOADING_INDICATOR_DELAY_MS` 넘으면
`scene-loading.ts`) → `song-credit`(5초 fade, `scene-song-credit.ts`) →
`goScene('gameplay', 'replace')`(`scene-gameplay.ts`가 실제 판을 돌린다) →
`onGameplayFinished`가 `game-records.ts`의 `saveRecordIfEligible`로 기록을
갱신하고, `settings.autoplay`면 `goBack()`으로 곧장 song-select(§9 "autoplay는
result 없이"), 아니면 `goScene('result', 'replace')`로 `scene-result.ts`
(M2-6)를 띄운다. Retry는 다시 `goScene('gameplay', 'replace')`, Back은
`goBack()`으로 song-select — `song-credit → gameplay`의 replace 관례를
`gameplay → result`에도 확장했다(Retry 반복에 스택이 안 자라게, 스펙이
명시하지 않은 확장이라 결정 필요 항목으로 보고). `result` scene은 다른
scene과 달리 `mount()`가 비어 있고 매 `onEnter()`마다 `mountResultScene`을
새로 만든다 — 그 함수가 생성 시점에 view를 통째로 받는 계약이라(M2-6)
lazy-mount-once와 안 맞기 때문이다.

`game-settings.ts`의 `readSettings`로 매 판 시작 시 실제 player settings를
읽는다.

M4-6이 mode-select의 `settings` 목적지를 `settings-play`로 잇고, 네
`settings-*` scene(`scene-settings.ts`)을 등록했다 — 하나의 `settingsHandle`을
네 scene의 `mount()`가 공유한다(처음 mount되는 scene에서만 실제로
`mountSettingsScene`을 호출, `mountSettingsIfNeeded`). 각 scene의 `onEnter`는
`readSettings`로 최신 저장값을 다시 읽어 `update()`한 뒤 `show(category)`를
부른다(재진입마다 다른 곳에서 저장한 값을 반영). `SettingsHandlers.onChange`는
필드 커밋마다 `writeSettings`로 전체 settings를 즉시 저장하고,
`onCategoryChange`는 `goScene('settings-<category>')`, `onBack`은
`goScene('mode-select')`로 배선했다.

M4-7이 song-select의 quick options 오버레이를 잇는 `onQuickOptionsChange`
핸들러를 더했다 — row가 Enter로 확정될 때마다 `writeSettings(storage,
settings)`로 즉시 저장한다(M4-6의 `SettingsHandlers.onChange`와 같은
즉시-커밋 패턴). `refreshSongSelect`가 이제 `loadSongSelectRows`와
`readSettings`를 병렬로 읽어 `songSelectHandle.update(rows, view, settings)`
세 번째 인자로 함께 넘긴다 — 오버레이가 여는 순간의 값 스냅샷 출처다.
no-record 게이트 로직 자체(`isNoRecord`, `saveRecordIfEligible` 호출)는
M4-5가 이미 완성해 뒀다 — `enterSongCredit`이 매 진입마다 `readSettings`로
최신값을 읽으므로 quick options로 바꾼 `autoplay`/`staticShape`는 별도
배선 없이 다음 판부터 그 게이트에 반영된다.
