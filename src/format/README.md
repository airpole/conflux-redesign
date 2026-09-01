# format — 파일 포맷 파싱·검증

파일 접두사 `format-*`. 브라우저 API를 **직접 호출하지 않는다**(env의 기준과 같다) —
다만 `env`(예: `env-file`의 ZIP 함수)를 호출할 수 있다는 점이 `core`와 다르다.
`core`는 `env`를 아예 import하지 않는다(architecture.md §1의 단방향 의존 — core가
foundation이라 그 위 어떤 층도 import하지 않는다).

레이어 순서: `core → env → { render, format } → edit / game → scene → app`. `render`와
같은 깊이다 — 둘 다 `env`/`core` 위, `edit`/`game` 아래에 있고 서로를 모른다.

## 왜 신설했는가 (D-2026-085, M4-3)

`.cfx`/chart JSON 파싱·검증 로직(`loadCfxPackage`·`groupBySongId`·
`validatePackageGroup`·`openChartJson`)은 M3 때 전부 `edit/`에 있었다 — M3
자체가 "persistence + `.cfx`"로 스코프됐던 편의상의 배치였지, 이 로직이
editor 전용이라는 결정은 아니었다. M4-3에서 song-select(`game` 레이어)도
library의 `.cfx`를 읽으려면 정확히 같은 decode·검증이 필요하다는 게
드러났다 — 그런데 `edit`↔`game`은 서로 import가 금지된 형제 축이다
(`architecture.md` §1, 실제로 lint가 막는다).

세 가지를 검토했다:

1. **`game`에 복제** — `.cfx` 구조 검증(§10 체크리스트)은 작은 유틸이 아니라
   spec-critical한 알고리즘이다. 두 벌을 만들면 `cfx.md`가 나중에 바뀔 때
   두 구현이 몰래 어긋날 위험이 생긴다 — 기각.
2. **`core`로 내림** — `core-quick-options.ts`가 세운 "edit·game 둘 다 쓰는
   순수 로직은 core로 내린다" 선례를 따르는 안. 하지만 이 로직은
   `env-file`의 ZIP 함수를 호출해야 해서, core로 내리면 core가 env를
   import하게 돼 "core는 어떤 위층도 import하지 않는다"는 더 근본적인
   규율을 깬다 — core 자신을 위한 예외라 무게가 더 크다고 판단해 기각.
3. **ESLint 예외 목록** — `game`이 이 파일들만 예외로 import하게 허용.
   규칙이 단순해야 한다는 전제(폴더 이름만 보고 방향을 판단할 수 있어야
   함)를 깨고, 다음 유사 사례마다 예외가 늘어난다 — 기각.

대신 이 로직을 **재분류**했다 — `edit/`에 있었던 게애초에 착오였다는
평가다. `.cfx` bytes → chart 집합·검증은 파일 포맷 계약이지 editor의
소유물이 아니다. `env`(브라우저 API를 직접 호출하지 않아 정의상 안 맞음,
6파일도 실패 모드 기준으로 이미 꽉 참)도, `render`(그리기 전용, 무관한
책임)도 맞는 자리가 아니라 새 층을 만들었다.

## 무엇이 여기 있고 무엇이 `edit/`에 남았는가

**읽기/검증(공유)** — 여기:
- `format-chart-open.ts`: `openChartJson` — chart JSON 파싱+구조/domain 검증.
- `format-cfx-package.ts`: `CandidateChart`/`AssetFile`/`SongGroup` 타입,
  `groupBySongId`, `validatePackageGroup`(§10 체크리스트).
- `format-cfx-load.ts`: `loadCfxPackage` — `.cfx` bytes를 chart 집합+asset으로.

**쓰기(editor 전용)** — `edit/edit-cfx-package.ts`에 남음:
`recommendCandidates`(버전 충돌 선택 UI 로직), `suggestCfxFileName`,
`buildCfxPackage`, `packageAndSaveCfx` — 새 `.cfx`를 **만드는** 건 editor만
한다. `game`은 패키징을 하지 않으므로 이쪽을 import할 이유가 없다.

`edit-cfx-library.ts`(library store read/write, import 검증 워크플로)는
`edit/`에 그대로 남았다 — `game-song-select.ts`가 필요한 건 `StorageEnv`의
원시 `read`/`keys` 호출뿐이라(둘 다 `env` 타입, 이미 game이 자유롭게 쓸 수
있음) 옮길 이유가 없었다. 최소 범위로만 옮겼다.
