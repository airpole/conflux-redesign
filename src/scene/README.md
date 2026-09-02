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

credits의 표시 값은 `ui-design.md` §2.8.4가 승인한 placeholder 그대로다 —
실제 project staff·크레딧이 아니다. `Project Staff`와 `Music`/`Chart`/`Jacket`은
서로 다른 종류의 목록이라(수작업 유지 vs library 스캔 dedupe) placeholder
이름 계열도 분리했다(`[Staff N]` vs `[Placeholder N]`) — 처음엔 겹쳐 썼다가
테스트로 드러나 `ui-design.md` §2.8.4도 함께 정정했다.

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
스냅샷 출처). 오버레이의 픽셀 배치는 ui-design.md가 아직 정의하지 않아
결정 필요 항목이다 — settings 화면과 같은 기존 토큰으로 최소 기능
목록형 UI만 뒀다(자세한 이유는 `scene-song-select.ts` 헤더).

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
