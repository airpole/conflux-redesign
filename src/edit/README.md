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

`edit-chart-init`은 M5-1 범위다([[persistence]] §7). `createInitChart(songId,
now)`가 새 song 생성 결과인 init chart(`chartId 0`·`difficulty 'init'`)를
만든다 — songId만 호출측(start scene)이 받고 나머지 필드는
`core-chart-fixture.ts`의 `makeChart()`가 이미 검증 통과로 확인해 둔 최소값
(bpm 120·4/4·level 1)을 그대로 재사용했다(새 product 결정이 아니다).
`edit-workspace.ts`/`edit-session-transition.ts`는 M3-3 때 이미 완성돼 있던
그대로 M5-1이 처음 실제로 쓰기 시작했다 — scene 층(start + notes/shapes/
meta/test 형제 4개, `src/scene/scene-editor-*.ts`)이 `createWorkspaceSession`/
`resolveSessionTransition`을 그대로 호출한다. 실제 다이얼로그 UI(세션 전환
confirm)는 M5-1에도 아직 없다 — chart 편집 인터랙션 자체가 없어(command
layer는 M5-2, chart field 편집은 M5-5) dirty가 실제로 true가 될 경로가
이번 라운드엔 없기 때문이다.

`edit-command`는 M5-2 범위다([[editor-commands]] §1~§5). `Command = { name,
apply(), undo(), invalidates[] }`의 scope 3분할(notes/textEvents→n,
shapeEvents/laneEvents→s, tempos/timeSignatures→m)·깊이 60 stack·
dispatch/undo/redo·`onDispatch` listener·history baseline(`resetBaseline`)
을 구현한 chart-agnostic 엔진이다 — 실제 chart 배열을 어떻게 바꿀지는
이 파일이 모른다(§6의 구체 command 목록은 그 배열을 실제로 편집하는
M5-3~M5-5·M5-7이 만든다). "cache invalidate" 단계는 `core-timing.ts`/
`core-shape.ts`가 이미 캐시 없이 매번 chart에서 다시 계산하는 설계라
`onDispatch` listener가 `invalidates`를 실어 나르는 것으로 충분하다고
보고 새 캐시 객체를 만들지 않았다. `app-main.ts`가 매 `WorkspaceSession`
생성마다 새 `CommandHistory`도 함께 만들어 `resetBaseline()`을 굳이
호출하지 않고도 §5 "session 교체 시 모든 scope stack을 비운다"를
만족한다 — `resetBaseline()`은 엔진 계약 자체의 단위 테스트를 위해
API로는 남겨 뒀다. chart field 편집(§7, `WorkspaceSession.updateChart`)이
이 엔진을 전혀 거치지 않는다는 것도 통합 테스트로 확인했다.

`edit-notes-commands`는 M5-3 범위다([[editor-commands]] §6 중 note 관련
6개 — Add/Delete/Move/Mirror/SetDuration/ReplaceNotes). `edit-command.ts`
엔진에 꽂는 첫 실제 command다 — 전부 snapshot 기반(apply/undo가 `notes`
배열 전체를 이후/이전 스냅샷으로 교체)이라 배열 위치 추정 없이 항상
정확히 원래 배열로 되돌아간다. mirror는 `core-judge.ts`의 기존
`MIRROR_LANE_MAP`(1↔4, 2↔3)을 그대로 쓴다 — wide note는 제외(핸드 개념이
없다). `NotesSessionLike`(`chart`/`updateChart`만 있는 최소 shape)로
`WorkspaceSession`을 직접 받는다 — 별도 어댑터가 없다.

`edit-shape-commands`는 M5-4 범위다([[editor-commands]] §6 중
Add/DeleteShapeEvents·Add/DeleteLaneEvents 4개, D-2026-099). notes와 같은
snapshot 패턴이지만, 추가·삭제 뒤 **chain normalize**를 한 번 더 거친다
(`normalizeShapeEvents`/`normalizeLaneEvents`) — §6 "shape/lane command는
apply·undo 양쪽에서 chain normalize"가 이미 확정해 둔 요구사항의 구현이다.
원본 `shape.js`의 `normalizeShapeChain`과 같은 알고리즘(보간 이벤트를
dest tick 오름차순으로 훑어 `startTick`/`duration`을 다시 세운다)이지만,
**배열 순서는 바꾸지 않는다** — 선택(`Set<number>` 인덱스)이 배열
위치에 의존하므로 원소 자리는 그대로 두고 값만 갈아치운다. `MirrorShapeEvents`·
`ApplyShapeOps`는 여전히 범위 밖이다(`scene-editor-shapes.ts`가 여러
이벤트를 배열로 한 번에 넘기는 `Add*` 호출로 "한 undo = 여러 op"를 이미
표현하므로 별도 `ApplyShapeOps` 타입이 필요 없었다).

M5-4 후속(D-2026-100)이 `MutateShapeEvents`/`MutateLaneEvents`(기존 점
드래그 재배치)를 더했다 — **`targetPos`만 바꾸고 tick(`startTick`/
`duration`)은 그대로 둔다**(`editor-editing.md` §2 "dot 드래그 = 위치
수정", 원본 `shape-input.js`의 `dragDot` 분기도 위치만 갱신). anchor
(`easing===null`)도 위치는 옮길 수 있다 — `deleteShapeEventsCommand`의
anchor 삭제 방지와는 다른 규칙이다. normalize는 여기서도 apply/undo
양쪽에 걸지만, dest(=startTick+duration)가 안 바뀌므로 사실상 값에
변화가 없다(§6 규칙과의 일관성을 위해 그대로 유지).

M5-4 후속(D-2026-101)이 `mutateShapeEventCommand`(단수)를
**`mutateShapeEventsCommand`(복수, index/targetPos 쌍 배열)로
일반화했다** — composite dot(center/pinch로 놓인, 같은 tick의 Blue+Red
쌍) 드래그가 두 점을 한 undo 단위로 함께 옮기기 때문이다(`AddShapeEvents`가
이미 "여러 개 → 한 undo"인 것과 같은 패턴). 단일 점 드래그도 원소
하나짜리 배열로 같은 함수를 쓴다 — 별도 단수 버전을 남기지 않았다.
lane은 composite pair 개념이 없어 `mutateLaneEventCommand`(단수)를
그대로 뒀다.

`edit-meta-commands`는 M5-5 범위다([[editor-commands]] §6 중
Add/Delete/EditTempo·Add/Delete/EditTimeSignature 6개, D-2026-102).
notes/shape와 같은 snapshot 패턴이지만 **chain normalize가 없다** —
`timing.md` §0 "핵심 pattern"이 "startTick 정렬"을 평가 시점(tick→ms
변환)의 첫 단계로 두고 있어, 저장 배열 자체가 정렬돼 있을 필요가 없다
(notes/shapeEvents와 같은 전제). 빈 배열 방지도 이 파일이 하지 않는다 —
`tempos`/`timeSignatures`가 비면 안 된다는 규칙은 domain 검증(보고 전용,
`core-validate.ts`) 대상이라 마지막 한 줄 삭제 방지는 `scene-editor-meta.ts`
가 막는다(shape의 anchor 삭제 방지와 같은 위치 — command 계층이 아니라
scene 계층). metadata·chart identity(chartId/difficulty/subtitle/level/
chartBy)·asset(musicFile/jacketFile) 필드 편집은 `editor-commands.md`
§7대로 command가 **아니다** — 이 파일에는 그 경로가 없고,
`scene-editor-meta.ts`가 `session.updateChart()`를 직접 부른다.

`edit-text-commands`는 M5-7 범위다([[editor-commands]] §6의
AddTextEvents/DeleteTextEvents/EditTextEvent 3개, D-2026-105). notes/
shape/meta와 같은 snapshot 패턴이고 `invalidates: ['textEvents']`라
scope는 `editor-commands.md` §2 "notes, textEvents | n" 그대로 notes와
같다 — 원본이 text 툴을 notes 탭 안에 두고 선택·클립보드를 note와 함께
다루는 것과 같은 이유다. 실제 T 툴·편집 모달은 `scene-editor-notes.ts`가
갖는다(별도 tab이 아니다) — 이 파일에는 command 3개뿐이다.
