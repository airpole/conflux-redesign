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

M5-1이 mode-select의 `editor` 목적지를 `editor-start`로 잇고, editor
scene 5개(`editor-start` + 형제 4개)를 등록했다 — settings와 같은 공유
패턴으로 `editorWorkspaceHandle`을 형제 4 scene이 공유한다
(`mountEditorWorkspaceIfNeeded`). `WorkspaceSession`(M3의
`edit-workspace.ts`)을 이 파일이 직접 들고 있다가(`editorSession`) start
scene의 세 경로(New Chart/Open Chart JSON/Continue Editing)가 성공하면
그 세션을 만들고 `editor-notes`로 전환한다. `Open Chart JSON`은 이
파일에서 처음으로 `env-file.ts`의 `FileOpenHost`를 실제 브라우저 API
(`showOpenFilePicker`)에 연결했다 — 그 타입이 DOM lib에 아직 없어
최소 duck-type으로 지역 선언했다(D-2026-062가 이미 "폴백은 범위 밖"이라고
정해 둔 자리를 그대로 따른다 — 미지원 브라우저는 취소로 처리). `Open
.cfx`는 이 확장으로도 못 연다(바이너리) — 결정 필요 항목으로 별도
보고했다. Back(Backspace/Esc)은 `edit-session-transition.ts`의
`resolveSessionTransition`을 그대로 호출하지만, 이 라운드엔 chart 편집
인터랙션이 없어(M5-2·M5-5 이후에야 생김) dirty가 실제로 true가 될 경로가
없다 — `saveNewVersion` 콜백은 저장 창 UI가 붙기 전까지의 자리표시자
(즉시 취소를 돌려줘 세션을 지키는 안전한 기본값)다.

M5-2가 `beginEditorSession()` 헬퍼를 더해 세 진입 경로(New Chart/Open
Chart JSON/Continue Editing)의 중복 배선을 하나로 모았다 — 세션을 만들
때마다 `edit-command.ts`의 `createCommandHistory()`도 함께 새로 만든다
(session 교체 시 history가 항상 빈 상태로 시작한다는 §5 "history
baseline"을 `resetBaseline()` 호출 없이 만족하는 가장 단순한 방법).
`editorCommandHistory.onDispatch(...)`가 `editorWorkspaceHandle?.update(...)`
를 부르도록 미리 구독해 뒀다 — §3 "active scene redraw"의 최소 배선으로,
지금은 notes/shapes/meta/test가 전부 M5-1의 껍데기라 실제로 dispatch될
command가 없지만 M5-3+이 command를 만들기 시작하면 바로 작동한다.

M5-3이 그 자리를 실제로 채웠다 — `mountEditorWorkspaceIfNeeded()`가
`EditorWorkspaceHandlers.mountNotes(container, chart)`를 넘긴다.
`scene-editor-notes.ts`의 `mountEditorNotesBody`를 그대로 감싸고,
`session: editorSession!`(진짜 `WorkspaceSession`)과
`dispatch: (command) => editorCommandHistory!.dispatch(command)`를
넘긴다 — 둘 다 이미 `beginEditorSession()`이 만들어 둔 것을 그대로 참조할
뿐 새 상태를 추가하지 않았다. `editor-start`를 거치지 않고는 `editor-notes`
에 닿을 방법이 없어(scene 그래프 구조상) `editorSession`/`editorCommandHistory`
가 항상 이미 만들어져 있다는 전제(non-null assertion)가 안전하다.

M5-4가 같은 자리에 `mountShapes(container, chart, view)`를 더했다 —
`scene-editor-shapes.ts`의 `mountEditorShapesBody`를 감싸고, `session`/
`dispatch`는 `mountNotes`와 똑같이 `editorSession!`/`editorCommandHistory!`를
그대로 참조한다. `view`(`EditorViewState`)는 이 파일이 만드는 게 아니라
`scene-editor-workspace.ts`가 한 번만 만들어 `mountNotes`/`mountShapes`
양쪽에 같은 참조로 넘겨주는 것을 그대로 받아 전달할 뿐이다 —
`editor-graph.md` §2 "scroll/zoom: notes·shapes 공유"를 그 참조 공유로
만족한다.

M5-5가 `mountMeta(container, chart)`를 더했다 — `session`/`dispatch`는
`mountShapes`와 같은 참조를 그대로 넘긴다. `view`는 받지 않는다(폼이라
공유 zoom 상태가 필요 없다). 새로 더한 건 `notifyChanged: () =>
editorWorkspaceHandle?.update(editorSession!.chart)` 하나뿐이다 — meta의
identity/metadata/asset 필드 편집은 command가 아니라 `session.updateChart()`
직접 호출이라(`editor-commands.md` §7) 기존 `editorCommandHistory.onDispatch`
구독이 이 경로를 못 본다. 그래서 그 경로 전용으로 이 콜백을 만들어
`editorWorkspaceHandle`을 명시적으로 새로고침한다 — tempo/timeSignature
편집은 여전히 command라 `mountNotes`/`mountShapes`와 같은 dispatch
구독만으로 충분하다.
