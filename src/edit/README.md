# edit — 에디터 인터랙션

파일 접두사 `edit-*`. `game`과 **형제 축**이며 서로를 모른다 — 린트가 이 방향을 막는다.

정의 → `_plan/architecture.md` §1

`edit-chart-open`/`edit-chart-save`는 M3-2 범위다([[persistence]] §4). 둘 다 순수
로직만 담고 실제 파일 I/O는 `env-file`에 위임한다(호출측이 주입) — `env-file`의
계약대로 취소는 정상 흐름, 쓰기 실패는 던진다.

`edit-workspace`/`edit-session-transition`은 M3-3 범위다([[persistence]] §5·§6).
`edit-workspace`는 `env-storage`의 `workspace` store에 dirty 전용 복구 슬롯 하나를
읽고/쓰고/지우며, autosave debounce(30초, 타이머는 주입)와 "파일 저장 성공 시에만
dirty 해제 + workspace 삭제"를 구현한다. `edit-session-transition`은 세션 전환
confirm(Save New Version/Discard/Cancel)의 **결정**만 담는다 — 실제 다이얼로그
UI는 아직 없는 scene 층(M4/M5)의 몫이다. asset(music/jacket) 재연결 자체(파일
선택 UI)는 M3-3 범위 밖 — Blob은 호출측이 이미 갖고 있다고 가정한다.

`edit-cfx-package`는 M3-4 범위였다([[cfx]] §4·§7~§11) — **M4-3(D-2026-085)에서
읽기/검증 부분(`groupBySongId`·`validatePackageGroup`과 `CandidateChart`/
`AssetFile` 등 타입)이 `format/format-cfx-package.ts`로 옮겨갔다.** `game`
(song-select)도 같은 구조 검증이 필요해졌는데 `edit`↔`game`은 서로 import를
못 하기 때문이다 — 자세한 경위는 `src/format/README.md`. 이 파일에는 이제
**쓰기(editor 전용)** 만 남았다: `chartId`별 최고 version 추천
(`recommendCandidates`, 동률은 자동 선택하지 않고 충돌 표시)·`.cfx` 기본
파일명(`suggestCfxFileName`)·빌드(`buildCfxPackage`, `env-file.createZipArchive`
사용, `format`의 `validatePackageGroup`을 그대로 불러 검증)·저장 오케스트레이션
(`packageAndSaveCfx`). `game`은 `.cfx`를 패키징하지 않으므로 이 파일을 import할
이유가 없다.

`edit-cfx-load`는 M3-5 범위였지만 **전체가 `format/format-cfx-load.ts`로
옮겨갔다**(D-2026-085) — `loadCfxPackage`(`.cfx` bytes → chart 집합+asset)는
editor의 "`.cfx` 열기"뿐 아니라 game의 library 읽기도 똑같이 필요한 파일
포맷 계약이었다. `edit-chart-open`도 같은 이유로 `format-chart-open.ts`로
옮겼다.

`edit-cfx-library`는 M3-6 범위다([[persistence]] §12, D-2026-018). library
store(`env-storage`, key=`songId`, value=`.cfx` blob 통째)의 원시 CRUD와,
`loadCfxPackage`(이제 `format/`) 위에 §12.2가 요구하는 playable music decode
게이트를 더한 `validateCfxForImport`(하나라도 실패하면 전체 거부, jacket
decode 실패는 경고만)를 제공한다. 같은 songId reimport는 비교
(`compareReimport`, init 제외, added/removed/upgraded/downgraded)와 실행
(`commitLibraryRegistration`, blob 전체 교체·부분 병합 없음·다운그레이드도
그대로 허용)을 나눈다 — 확인 UI는 scene 층(M4/M5)의 몫이라 여기 없다.
records 고아 기록 정책은 건드리지 않는다(M3-7 소관). **이 파일은 `format/`으로
옮기지 않았다** — `game-song-select.ts`(M4-3)가 필요한 건 원시 `read`/`keys`
호출뿐이고 그건 `StorageEnv`(env 타입)를 직접 불러 해결했다. 쓰기·import
검증 워크플로까지 옮길 이유가 없어 최소 범위로만 움직였다.
