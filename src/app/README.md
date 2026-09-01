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
렌더한다 — axis(category/groupBy/sortKey/sortDir) 조작 UI는 아직 없어
기본값(`All`/`none`/`default`/`asc`)으로 고정돼 있다(M4-4 범위).
