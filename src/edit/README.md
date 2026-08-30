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

`edit-cfx-package`는 M3-4 범위다([[cfx]] §4·§7~§11). 입력 선택 후 `songId`별
그룹화(`groupBySongId`)·`chartId`별 최고 version 추천(`recommendCandidates`,
동률은 자동 선택하지 않고 충돌 표시)·전체 검증(`validatePackageGroup`, §10
체크리스트 전부)·빌드(`buildCfxPackage`, `env-file.createZipArchive` 사용)·
저장 오케스트레이션(`packageAndSaveCfx`)을 제공한다. chart JSON 구조 검증은
`edit-chart-open`(M3-2)이 이미 했다고 전제하고 다시 하지 않는다 — 후보로
들어오는 것은 항상 `Chart`(파싱·structural 검증을 통과한 타입)다.

`edit-cfx-load`는 M3-5 범위다([[cfx]] §12·§15). `env-file.readZipArchive`로
`.cfx` bytes를 풀고, `.json` 항목은 `edit-chart-open`으로, 전체 구조는
`edit-cfx-package`의 `validatePackageGroup`으로 검증한다 — `.cfx`는 "이미
충돌이 해소된 최종 배포물"이라 §12.1 체크리스트가 §10과 같아서 재사용했다.
손상(ZIP 자체·CRC·malformed JSON·미지원 schemaVersion·구조 위반) 중 하나라도
있으면 부분 로드 없이 전체를 거부한다. game/library import가 요구하는 playable
music 실제 decode 검증(§12.2)은 여기 없다 — "로드"가 아니라 "등록 가부"의
정책이라 M3-6 소관이다.
