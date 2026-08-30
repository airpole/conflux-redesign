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
