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
app 레이어(`app-main.ts`) 몫이며, title/mode-select/credits 등 실제 root
graph scene 모듈이 아직 없어(M4-2 범위) 그 배선 자체는 이번 step에 없다.
