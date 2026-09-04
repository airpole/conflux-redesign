# scene — 화면 그래프

파일 접두사 `scene-*`. edit/game을 mount하는 컨테이너. 어느 scene이 보이는지만 관리한다.

메커니즘 하나 위에 game 그래프(`scene/scene.md`)와 editor 그래프(`editor/editor-graph.md`) 둘이 얹힌다.

정의 → `_plan/architecture.md` §1·§5

`scene-manager.ts`는 M4-1 범위다([[scene]] §2). 단일 스택 하나로 `goScene`/
`goScene(id, 'replace')`/`goBack`/`resetSceneStack`/lazy mount를 구현한다 —
game이 "stack형", editor/settings가 "평면형"이라는 §2의 구분에 맞춰 엔진을
축별로 가르지 않는다. 두 형태 다 같은 스택 mechanism으로 설명되고, editor/
settings 축은 실제로 형제 scene 사이를 `goScene(id)`로 직접 건너뛸 뿐이라
스택이 깊어질 일이 없어 "평면형"처럼 보이는 것뿐이다.

FEATURES 기반 build gate 필터링은 이 모듈이 하지 않는다 — `architecture.md`
§1의 단방향 의존(`scene → app`, app이 위)을 지키려면 scene 레이어가 app의
`FEATURES`를 import할 수 없다. `createSceneManager`는 **이미 걸러진 scene
목록**을 받으므로, 꺼진 축의 scene은 그 목록에 없어 `mount()`가 호출될
방법이 구조적으로 없다. 실제 필터링 호출(어떤 scene을 넘길지 결정)은
app 레이어(`app-main.ts`) 몫이다.

`scene-title.ts`/`scene-mode-select.ts`/`scene-credits.ts`는 M4-2 범위다
([[ui-design]] §2.7·§2.9·§2.8, [[scene]] §3·§4·§7). 셋 다 `mountXxxScene(target,
...): { show(), hide() }` 형태를 쓴다 — `scene-manager.ts`의 lazy-mount 계약과
맞물려, 실제 DOM 생성(`mountXxxScene` 호출)은 `Scene.mount()` 클로저 안으로
미루고 입력 리스너는 `show()`/`hide()`에서 붙였다 뗀다(화면에 없을 때 입력에
반응하면 안 되므로). `scene-result.ts`의 카운트업 연출과 같은 이유로 title의
wave/bubble/pulse, credits의 bubble 배경 애니메이션은 이번 범위에 없다 —
데이터·입력 계약이 핵심이고 순수 시각 효과는 Deferred다. `app-main.ts`가
세 scene을 조립해 실제로 부팅한다 — `play`/`editor`/`settings` mode-select
선택은 목적지 scene이 아직 없어(M4-3·M4-5·M4-6) 콘솔 로그만 남기고 가짜
scene으로 억지 연결하지 않는다.

credits의 표시 값은 `ui-design.md` §2.8.4가 승인한 placeholder 그대로였다 —
실제 project staff·크레딧이 아니다. `Project Staff`와 `Music`/`Chart`/`Jacket`은
서로 다른 종류의 목록이라(수작업 유지 vs library 스캔 dedupe) placeholder
이름 계열도 분리했다(`[Staff N]` vs `[Placeholder N]`) — 처음엔 겹쳐 썼다가
테스트로 드러나 `ui-design.md` §2.8.4도 함께 정정했다.

**M6-1이 §2.8.5 게이트를 실제로 배선했다**(D-2026-107) — `Music`/`Chart`/
`Jacket` 세 섹션은 이제 `scene-credits.ts`의 `update(roleNames)`로 받는
실제 library 스캔 결과(`game-credits.ts`의 `loadCreditsRoleNames`,
`musicBy`/`chartBy`/`jacketBy`를 필드별 dedupe, song/chart로 안 묶음)를
그린다 — host가 song-select의 row 재로딩과 같은 관례로 매 `onEnter`마다
다시 스캔해 넘긴다. 목록이 비면 그 섹션을 숨긴다(이 라운드의 결정,
§2.8.5가 열어 둔 자리). `Project Staff`는 확정됐다 — 1인 개발이라
모든 역할이 같은 이름(`airpole`)이다(D-2026-118, `scene/scene.md` §11).

`scene-song-select.ts`는 M4-3 범위다([[ui-design]] §2.5). `core-song-select.ts`가
낸 `SongRow[]`를 받아 렌더만 한다 — row+slot(tier 색 박스+state 색 바),
category 탭(클릭 전환), groupBy folder 헤더(count+진척), sortKey/sortDir을
바꾸면 목록이 재구성되는 것까지가 이번 범위다. **정렬·그룹 바는 표시만
한다** — 클릭해 overlay를 여는 인터랙션은 아직 안 닫힌 M4-3 前 게이트
("목록 옵션 overlay 진입 키")가 막고 있다. cursor·검색·preview·정보
패널·하단 키 힌트 바는 커서가 있어야 의미가 생겨 M4-4로 미룬다.

**데이터 로딩은 이 파일에 없다** — `game/game-song-select.ts`가 맡는다.
처음 시도했을 땐 `game → edit` import가 아키텍처상 금지 방향이라(당시
`.cfx` decode 로직이 전부 `edit/`에 있었다) `import/no-restricted-paths`에
걸려 되돌렸다 — 그 로직을 `format/`(D-2026-085, M4-3)으로 재분류해 문제를
풀었다. `app-main.ts`가 `game-song-select.ts`의 `loadSongSelectRows`로 얻은
row를 `update()`에 넘겨 실제로 부팅한다.

M4-4가 커서 이동(방향키, 클릭)·하이라이트, 검색(타이핑 즉시 시작,
idle/typing/no-results 3상태 — 검색 중엔 folder 헤더 없이 평평한 목록),
정보 패널(§2.5.4, jacket·title/artist·2×2 기록 격자, BPM·곡 길이는 M4-3
前 게이트가 아직 안 닫혀 빈 칸), 기록 초기화 버튼(`onResetRecord`가
있을 때만 노출, §13 `FEATURES.recordReset` 게이팅)을 더했다. 정렬·그룹
바는 여전히 표시만 한다("목록 옵션 overlay 진입 키" 게이트가 아직
그대로다). 아코디언(folder 접힘/펼침)·PageUp/PageDown/Home/End는 이후
"M4-4 후속" 문단에서 닫혔다 — 아래 참조. 가속 스크롤만 결정 필요 항목으로
계속 미룬다(`scene-song-select.ts` 헤더 주석 참조).

`SongSelectViewState`/`CursorTarget`은 `core-song-select.ts`에서 그대로
가져와 재수출한다(로컬 재정의 아님) — 처음엔 이 파일이 자체 정의를 뒀다가
`game-viewstate.ts`/`app-main.ts`와 타입이 어긋나 `core-song-select.ts`로
모았다.

**M4-4 후속(같은 스프린트)**: folder 아코디언(§4)·`PageUp`/`PageDown`/
`Home`/`End`(§7)·기록 격자 judge 모드(§9)를 더했다. 아코디언은 새 입력
어휘를 만들지 않고 커서가 folder 헤더 정지점에 있을 때 기존 `Enter`(선택
확정 역할)와 기존 클릭 입력을 재사용해 펼침/접힘을 토글한다 — 펼치면
다른 folder는 자동으로 접힌다(한 번에 하나, §4). 접힘 상태는 scene 내부
상태일 뿐 영속하지 않는다. `PageUp`/`PageDown`의 "한 화면 단위"는 실제
viewport 측정이 없어 `PAGE_STOP_COUNT`(고정 근사값) — 결정 필요 항목으로
별도 보고, 실제 DOM 측정 기반 페이지 크기가 필요해지면 갱신한다.

**M4-7이 quick options 오버레이를 더했다**([[scene]] §5·§10, 로직은
`core-quick-options.ts`가 이미 갖고 있던 것을 그대로 쓴다). `Space`로 열고
Esc/Space로 닫는다 — 열려 있는 동안은 `onKeyDown`이 오버레이 전용
핸들러로만 가고 검색·커서 이동 등 나머지 scene 입력은 전혀 처리하지
않는다(§10 "열림 중 scene 입력 차단"). 5필드(scrollSpeed/gaugeMode/mirror/
staticShape/autoplay)를 나열해 ↑↓=row 이동·←→=한 칸 step·휠=위/아래 한
칸씩 step·클릭=즉시 점프·Enter=지금 row의 draft 확정으로 구현했다. row가
Enter로 확정될 때마다 `handlers.onQuickOptionsChange(settings)`가 그
즉시 불려([[settings]] D-2026-022 "즉시 영속 필드") `app-main.ts`가
`writeSettings`로 잇는다(D-2026-092) — no-record OR 4조건 자체는 M4-5가
이미 완성해 뒀고, 이 경로는 그 게이트에 걸리는 두 필드(autoplay/
staticShape)를 바꿀 수 있는 새 입구일 뿐이다. `SongSelectSceneHandle.update()`
에 세 번째 인자 `settings: Settings`가 추가됐다(오버레이가 여는 순간의
스냅샷 출처).

**M4.6이 배치·위젯·닫기 동작을 정식으로 확정했다**(`ui-design.md` §2.5.8,
D-2026-093 — M4-7의 placeholder를 대체). 중앙 dimmed modal, scrollSpeed는
네이티브 `<input type=range>`(settings의 slider와 동일 컴포넌트)로
클릭·드래그가 실제로 그 값으로 점프하고, gaugeMode는 segmented control
(`.segment-group`/`.segment-btn`, settings의 select와 동일)로 각 모드가
독립 클릭 타겟이다. mirror/staticShape/autoplay는 M4-7의 toggle-switch
클릭 토글 그대로다. **닫을 때(Esc/Space)의 동작이 뒤집혔다** — M4-7은
미확정 draft를 버렸지만(D-2026-092), 이제는 지금 row의 draft를 Enter를
누른 것처럼 그 자리에서 확정한다(`closeQuickOptionsOverlay`가 기존
`commitQuickOptionsRow`를 그대로 재사용 — core 로직 변경 없음). row
이동(↑/↓) 시 미확정 draft를 버리는 규칙은 바뀌지 않았다.

`scene-song-credit.ts`는 M4-5 범위다([[scene]] §6). fade-in → 유지 →
fade-out(수치는 `CREDIT_*`, 합이 5초) 뒤 `onDone`을 정확히 한 번 부르고
끝난다 — 입력·클릭 리스너를 아예 안 붙인다(§6 "입력·skip·back 없음").
텍스트 3줄(`Music by`/`Jacket by`/`Chart by`)만 다루고 화면 레이아웃은
ui-design 범위 밖이라 최소 골격만 뒀다.

`scene-gameplay.ts`는 M4-5 범위다([[scene]] §9·§10). canvas·`env-audio`
(호출측이 주입하는 `AudioEnv`)·`env-input`(이 파일이 처음 만드는 DOM
`KeyboardHost` 구현)·`game-session.ts`를 한 데 묶어 실제 판을 돌린다.
매 프레임 `session.advance()` 뒤 `drawPlayfield`+판정 표시+게이지 바를
그리고, `session.result`가 생기면 `onFinished`를 정확히 한 번 부른다.
pause overlay(Resume/Retry/Exit 세 버튼)는 이 scene이 소유한다(§10
"gameplay-owned interactive DOM overlay") — `game-visibility.ts`/
`game-pause-keys.ts`의 기존 pause 배선을 그대로 쓴다(`attachAutoPause`에
`settings.pauseOnBlur`를 넘긴다 — D-2026-089, 아래 game/README.md 참조).
정확한 HUD·pause overlay 픽셀 디자인은 ui-design이 아직 gameplay를 다루지
않아 결정 필요 항목이다(파일 헤더 참조, `build-order.md` M4.5로 별도
확정 예정) — 최소 기능 레이아웃만 뒀다. hitVol/음악 volume을
`volMaster`×`volEffect`/`volMaster`×`volMusic`로 조합한 것도 같은 이유로
결정 필요 항목(`_meta/settings.md` §2가 스스로 "정의된 적 없다"고 명시) —
세션 시작 시 1회 계산이며 플레이 중 실시간으로 다시 안 바뀐다(설정 화면
자체가 gameplay 중 도달 불가능하므로 충분하다).

M4.5-1(D-2026-090)이 HUD를 마저 채웠다 — `ui-design.md` §2.10이 확정한
자리대로 jacket 배경·key 빔·마디선/step 선·sudden 커버·text event·카운터/
퍼센트·곡정보 띠·canvas pause 아이콘까지 매 프레임 그린다(render 함수는
`render-playfield.ts`, 자세한 목록은 그 README). canvas pause 아이콘은
`canvas`에 붙인 `click` 리스너 하나가 `pauseIconHitTest`로 hit-test해
`session.pause()`를 부른다 — `attachPauseKeys`(키보드)와 별개 경로이지만
둘 다 멱등이라 부딪히지 않는다. `GameplayStartInput`에 `jacket`
(`{image, width, height} | null`) 필드가 새로 생겼다 — `app-main.ts`가
`game-song-select.ts`의 `PlayableChart.jacketBytes`를 `createImageBitmap`
으로 decode해 채운다. pause overlay(Resume/Retry/Exit)의 DOM 색은
`scene-result.css`의 기존 토큰을 그대로 재사용한다(`scene-gameplay.css`).

`scene-settings.ts`는 M4-6 범위다([[scene]] §3, `ui-design.md` §2.6). settings
4 scene(`settings-play`/`-visual`/`-sound`/`-option`)이 DOM host 하나를
공유한다 — `mountSettingsScene()`은 처음 mount되는 scene에서만 실제로
호출되고(`app-main.ts`), 나머지 셋은 `show(category)`만 부른다. `Tab`/
`Shift+Tab`은 §2.6.2가 정한 대로 네 category 전부를 순환한다(`PLAY →
VISUAL → SOUND → OPTION → PLAY`, editor의 `meta` 제외 순환과 다르다).
필드 위젯은 네이티브 DOM 컨트롤(`<input type=range>`/`type=number`/버튼)을
그대로 쓴다 — M4-6 前 게이트였던 "volume slider interaction unit"과
"key rebinding capture-flow"는 이 세션이 확정했다(D-2026-091): slider는
필드별 `step` 값 하나로, key-rebind는 idle→capturing→즉시 커밋(충돌 시
거부, `core-settings.ts`의 `conflictingLaneKey`)로 구현했다. Backspace/Esc는
다른 mode-select 자식 scene과 같은 통일 Back 키로 `onBack`을 부른다(D-2026-052
관례의 확장 — 결정 필요 항목, 자세한 이유는 파일 헤더).

`scene-editor-start.ts`/`scene-editor-workspace.ts`는 M5-1 범위다
([[editor-graph]] §1·§2·§9). editor 진입은 `editor-start`(New Chart/Open
Chart JSON/Open .cfx/Continue Editing 4개 경로)를 한 번 거친 뒤 형제 4
scene(`editor-notes`/`-shapes`/`-meta`/`-test`)으로 들어간다. 형제 4개는
settings와 같은 "하나의 host, 여러 scene id" 패턴으로 `mountEditorWorkspaceScene()`
을 공유한다 — `editorState`(scroll/zoom·selection)가 notes·shapes 사이에
공유된다는 §2 요구와도 맞는다. **Tab 순환이 settings와 다르다** — §1
"notes → shapes → test → notes"(meta 제외, meta는 click 진입만)를 그대로
구현했다. `.cfx` 열기(이 chart를 편집 세션으로 여는 것)는 여전히 disabled다 —
chart 선택 UI(`persistence.md` §9)가 아직 없다. **binary open 자체는
M5-8이 닫았다**(D-2026-062, `env-file.ts`의 `pickFiles`/`pickBinaryFiles`)
— 그 능력으로 이 화면에 "Package .cfx"/"Import .cfx" 버튼 2개가 붙었다
(D-2026-106, M5 자체 Exit 기준을 닫는 마지막 두 연결 고리 — 자세한 근거는
`scene-editor-start.ts` 헤더와 `src/app/README.md`). 세션 자체(`WorkspaceSession`)는 새로 만들지 않고 M3의
`edit-workspace.ts`를 그대로 쓴다 — 자세한 배선은 `src/edit/README.md`·
`src/app/README.md`. notes/shapes/meta/test 4 scene은 이번 라운드엔
chart identity만 보여주는 껍데기였다 — 실제 편집 UI는 M5-3~M5-6이 채웠다.

**M5-3이 `EditorCategoryController` delegation을 `scene-editor-workspace.ts`에
더하고**, notes에 첫 실제 내용(`scene-editor-notes.ts`)을 붙였다.
category가 `onKeyDown(event): boolean`을 구현하면 workspace 자신의
Tab/Backspace/Escape 처리보다 **먼저** 그 키를 받는다 — notes 탭 자체
단축키(Q/W/E/R/D/Ctrl+C/V/F, `Esc` 취소 계단)가 전역 뒤로가기보다 먼저
자기 것부터 챙길 수 있게 하는 자리다. chart가 command dispatch로 바뀔
때는(`editorCommandHistory.onDispatch` → `update(chart)`) body를 통째로
다시 만들지 않고 controller의 가벼운 `update()`만 부른다 — 매 편집마다
선택 툴·선택 상태가 초기화되지 않게 하려는 목적이다(전체 remount는
category 전환(`show()`) 때만 일어난다).

`scene-editor-notes.ts`는 `editor-commands.md` §6의 note command 6개
(`edit-notes-commands.ts`, M5-3)와 이미 있던 core 모듈(`core-overlap.ts`의
overlap/conflict 검출, `core-judge.ts`의 mirror lane map)을 그대로 이어
붙인 캔버스다 — 배치(Q tap/W hold/E wideTap/R wideHold, hold는 2클릭)·
드래그 이동(가로 히스테리시스 포함, drag-end 1-command)·삭제(D/Delete)·
복사/붙여넣기(Ctrl+C/V)·mirror(Ctrl+F)를 구현했다. 히트 반경 15px·드래그
임계 4px는 D-2026-096의 실측값을 그대로 쓴다. `viewMs`(canvas에 보이는
시간 폭)는 D-2026-098로 확정됐다 — 원본 `edZm`(tick/beat 비례)을
`viewMs = 960000/(edZm×bpm)`으로 환산(120bpm을 기준 tempo로 선택, 측정값이
아니라 해석적 결정)해 기본 8000ms·범위 [1000ms, 32000ms]로 옮겼고, Z(축소
×1.35)/X(확대 ÷1.35) 줌 키를 배선했다.
lane 2·3 배치-시점 자동 치환·사각 선택(`A` 드래그)·note 우선순위 등
6가지는 의도적으로 단순화했다 — 전부 결정 필요 항목으로 D-2026-097에
기록했다.

**M5-7이 같은 파일에 text 툴(`T`)을 채웠다**(`edit-text-commands.ts`,
D-2026-105) — 2클릭(시작→끝)으로 tick 범위를 잡은 뒤 content textarea·
position select가 있는 편집 모달을 연다(`transition`/`mode`는
`data-model.md` §8이 이미 폐기). **클릭 자체는 모달을 안 연다** — notes에
이미 있던 "클릭=선택, Shift+클릭=토글" 모델을 text event에도 적용해
(`editor-editing.md` §1 "선택에 textEvents가 포함되면 함께 복사·붙여넣기")
별도 `textSelection`으로 관리하고, **더블클릭이 기존 이벤트의 편집
모달을 연다**(원본 `text-events.js`의 click=모달과 다른 해석적 결정).
모달이 열린 동안은 이 파일의 단축키를 전부 끈다(`Escape`만 취소로
처리) — textarea 네이티브 입력·Ctrl+C/V는 그대로 통과한다. delete/copy-
paste는 note와 textEvent를 각각 별도 dispatch로 처리한다(결정 필요
항목). 재생 시 fade 표시는 이미 M4.5-1이 구현해 뒀다 — `scene-gameplay.ts`
가 이미 `computeActiveTextEvents`/`drawTextEvent`를 호출하고 있어 이번
라운드는 편집 쪽만 채웠다.

**`scene-editor-save.ts`는 M5-8 범위다**(D-2026-106, `editor-editing.md`
§7 "Ctrl+S = 저장 창 매번 표시"). version 숫자 입력(제안값 프리필)·파일명
표시(읽기전용)·Save/Cancel뿐인 얇은 폼이다 — 실제 파일 쓰기·
`WorkspaceSession` 갱신은 `app-main.ts`가 한다(자세한 배선은
`src/app/README.md`).

**M5-4가 같은 delegation 자리에 `scene-editor-shapes.ts`를 붙였다**
(D-2026-099) — shape/lane 서브모드(`T` 전환), Q/W/E/R 배치(shape:
Blue/center/Red/pinch, lane: line1~3 그룹+간격유지/pinch 전환), symmetry(`S`,
동적 스냅샷 축), easing 선택(`1234`=Arc/In/Out/Linear)까지 구현했다.
command는 `edit-shape-commands.ts`의 4개(Add/DeleteShapeEvents,
Add/DeleteLaneEvents) — apply/undo 양쪽에서 chain normalize한다
(`editor-commands.md` §6 확정 요구사항, 원본 `normalizeShapeChain` 재구현이지만
배열 순서는 안 바꾼다). `viewMs`/`scrollMs`는 notes와 공유하도록
`scene-editor-view.ts`로 옮겼다(`editor-graph.md` §2 "scroll/zoom 공유" —
`scene-editor-workspace.ts`가 한 번 만들어 양쪽에 같은 참조로 넘긴다).
히트 반경 35px(zoom 무관 고정)는 D-2026-099 실측값이다. Ctrl+F mirror·
클립보드·symmetry 축 수동 조절·`laneGridDivisor` 드롭다운 등은 이번
라운드 범위 밖(결정 필요 항목) — 자세한 목록은 `scene-editor-shapes.ts` 헤더.

**M5-4 후속(D-2026-100)이 기존 점 드래그 재배치를 더했다** —
`MutateShapeEvents`/`MutateLaneEvents`(`edit-shape-commands.ts`). 클릭 대상이
기존 점이면 즉시 선택하지 않고 드래그 임계(3px, D-2026-099)로 click-vs-drag를
가른다(`scene-editor-notes.ts`의 판별 패턴과 동일). **위치만 바꾸고 tick은
그대로 둔다** — `editor-editing.md` §2 "dot 드래그 = 위치 수정"과 원본
`shape-input.js`의 `dragDot` 분기(둘 다 `targetPos`만 갱신) 재확인 결과다.
symmetry는 드래그에 적용되지 않는다 — 원본 드래그 분기 어디에도 `sMirror`
참조가 없다(배치에만 적용).

**M5-4 후속(D-2026-101)이 composite dot(같은 tick의 Blue+Red 쌍) 드래그를
마저 채웠다** — `findShapeHitAt`이 원본 `findDotAt`(`shape-input.js`)의
그룹핑 규칙을 재확인해 그대로 옮겼다: `pinch` 후보는 Blue·Red가 둘 다
있고 위치 차이 0.5 미만·둘 다 non-anchor일 때만, `center` 후보는 한쪽만
있어도(half-pair) 생긴다(히트 지점은 evaluated 경계 중점). 드래그하면
`pinch`는 둘 다 커서 위치로, `center`는 드래그 시작 시점 폭을 유지한 채
커서를 중심으로 움직인다 — 두 점이 있으면 `mutateShapeEventsCommand`
(단수에서 복수로 일반화, `edit-shape-commands.ts`)가 한 undo로 묶는다.

**M5-5가 `scene-editor-meta.ts`를 같은 delegation 자리에 붙였다**
(D-2026-102) — notes/shapes와 달리 canvas가 아니라 폼이라
`EditorWorkspaceHandlers.mountMeta(container, chart)`는 공유 `view`를
받지 않는다. identity(songId 읽기전용·chartId 자동규칙·difficulty·
subtitle·level·chartBy)·metadata 6필드·tempo/timeSignature 목록(마지막
줄 삭제 방지)·asset(music/jacket) 교체를 구현했다. identity/metadata/
asset 필드는 `editor-commands.md` §7대로 command가 아니라
`session.updateChart()` 직접 호출이라 기존 `editorCommandHistory.onDispatch`
구독이 안 걸린다 — 그래서 `EditorMetaApi.notifyChanged()`라는 새 콜백을
더해 `app-main.ts`가 그 경로만 `editorWorkspaceHandle.update()`를
명시적으로 부르게 했다(tempo/timeSignature는 command라 기존 구독으로
충분). asset 교체는 `env-file.ts`의 텍스트 전용 `FileOpenHost`를
재사용하지 않고 표준 `<input type=file accept="audio/*|image/*">`를
직접 만들어 썼다(바이너리라 다른 표면이 필요했다). "새 난이도" 파생·
`measureLabelOffset`(player 전역 설정, chart 데이터 아님)은 M5-5 Exit
기준 밖이라 범위 밖으로 뒀다 — 자세한 근거는 `scene-editor-meta.ts` 헤더.

**M5-6이 `scene-editor-test.ts`를 마지막 delegation 자리에 붙였다**
(D-2026-103/104). "현재 위치"는 새 상태를 만들지 않고 notes/shapes와
공유하는 `EditorViewState.scrollMs`를 그대로 재생 시작점으로 쓴다(사용자
확인) — idle static preview·embedded quick options 패널(`core-quick-
options.ts`, song-select overlay와 같은 로직·모달 아닌 상시 배치)·seek
bar·Space(idle 전용, lead-in 없는 즉시재생 — `game-engine.ts`의 mid-start
확장, D-2026-103)·Enter(host `app-main.ts`의 `enterGameplayFromEditorTest`에
위임, `scene-gameplay.ts`를 3초 lead-in·editor-origin으로 push)·Esc(즉시재생
세션 중단)를 구현했다. gameplay 종료 후 `onGameplayFinished`가
`editorOrigin`이면 result 없이 `goBack()`으로 test scene에 복귀한다
([[scene]] §9). **새 draggable scrollbar**(`scene-editor-view.ts`의
`mountEditorScrollbar`, `scrollMs`를 우측 세로 트랙으로 시각화·드래그-seek)
를 notes/shapes/test 셋 다에 붙였다 — 원본에는 대응 요소가 없는 완전히 새
UI다(실측 확인). Enter가 quick options 확정과 gameplay 진입 둘 다에 겹치는
문제는 "미확정 draft가 있을 때만 quick options가 삼킨다"로 절충했다(해석적
결정). 자세한 근거·남은 결정 필요 항목은 `scene-editor-test.ts` 헤더와
`_plan/build-order.md` M5-6 참조.
