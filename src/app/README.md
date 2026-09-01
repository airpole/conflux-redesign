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
단순한 방어로 고른 것, 결정 필요 항목으로 별도 보고). `onSelect`(Enter)는
아직 목적지가 없어(`song-credit`, M4-5) 콘솔 로그만 남긴다.
