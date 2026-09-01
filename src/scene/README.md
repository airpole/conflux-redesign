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

**데이터 로딩은 이 파일에 없다** — `game → edit` import가 아키텍처상
금지 방향이라(`architecture.md` §1 "edit=에디터, game=플레이. 둘은
서로를 모른다") library `.cfx` decode 로직(`edit-cfx-load.ts`/
`edit-cfx-package.ts`)이 전부 `edit/`에 있는 지금 상태로는 game 레이어에서
가져올 수 없다. `game-song-select.ts`를 만들어 시도했다가 `import/no-restricted-paths`
에 걸려 되돌렸다 — 별도로 보고하고 결정을 기다린다(D-2026-084).
