# architecture — 레이어·의존 단일 출처

> 재구현 시의 레이어 모델·의존 방향·호스트 seam·빌드 게이트를 정의한다.
> **레이어 정의의 단일 출처는 이 문서다.** README는 요약, [[naming]] §5는 파일명 접두사 규칙(정의는 여기 참조).
> 근거는 [[rationale]]. 화면 그래프 흐름은 [[scene]].

---

## 1. 레이어 8층

import은 **위→아래 한 방향만**. 아래는 위를 모른다.

```
core ─→ env ─→ { render, format } ─→ edit / game ─→ scene ─→ app
```

`render`와 `format`은 같은 깊이다 — 둘 다 `env`/`core` 위, `edit`/`game`
아래에 있고 서로를 모른다(서로를 참조할 이유도 없다).

| 레이어 | 책임 | 기준(이 레이어인가?) |
|---|---|---|
| **core** | 순수 로직·계산 (tick↔ms, shape 기하, 판정, 게이지) | 브라우저 API를 **하나도** 안 쓴다. Node 하네스에서 import해 돈다. `env`를 import하지 않는다(그 아래 뭔가를 import하는 게 아니라, foundation이라 애초에 어떤 위층도 import 안 함). |
| **env** | 브라우저 설비 래핑 (구 `plat`) | 브라우저 API를 **직접 호출**한다 — `<canvas>` 생성·리사이즈·DPR, WebAudio 노드·오디오 로드/재생, IndexedDB, raw 키/포인터 입력. |
| **render** | 캔버스에 매 프레임 그리기 | core 지오메트리를 받아 env가 만든 캔버스에 **칠하기만** 한다. 상태를 안 바꾼다. |
| **format** `[신규]` | 파일 포맷 파싱·검증 (`.cfx`, chart JSON) | 브라우저 API를 직접 안 쓰지만(env와 같은 기준), `env`(예: `env-file`의 ZIP 함수)는 호출할 수 있다는 점이 `core`와 다르다. `edit`/`game` 형제가 **둘 다** 읽어야 하는 포맷 계약이 여기 온다 — 한쪽만 쓰면 그 축에 그냥 둔다. → §1.1 |
| **edit / game** | 인터랙션 (형제 축) | 사용자 동작 → 상태 변경 → render 호출. edit=에디터, game=플레이. 둘은 **서로를 모른다**. |
| **scene** | 화면 그래프 (전환·스택·mount) | edit/game을 **mount하는 컨테이너**. 어느 scene이 보이는지만 관리. → [[scene]] |
| **app** | 부트스트랩·빌드별 진입점·config·빌드 게이트 | 무엇을 켜고(§4) 무엇을 최상위에 붙일지 결정. |

### 1.1 `format` 신설 이유 (D-2026-085, M4-3)

`.cfx`/chart JSON 파싱·검증(`loadCfxPackage`·`groupBySongId`·
`validatePackageGroup`·`openChartJson`)은 M3 때 전부 `edit/`에 있었다 —
M3 자체가 "persistence + `.cfx`"로 스코프됐던 편의상의 배치였지, 이
로직이 editor 전용이라는 결정은 아니었다. M4-3에서 song-select(`game`)도
library의 `.cfx`를 읽으려면 같은 decode·검증이 필요하다는 게 드러났는데,
`edit`↔`game`은 서로 import 금지다.

세 대안을 검토하고 기각했다:

1. **`game`에 복제** — `.cfx` 구조 검증(§10 체크리스트)은 spec-critical한
   알고리즘이다. 두 벌을 두면 `cfx.md`가 바뀔 때 몰래 어긋날 위험이 생긴다.
2. **`core`로 내림** — `core-quick-options.ts`의 "edit·game 둘 다 쓰는 순수
   로직은 core로" 선례를 따르는 안. 이 로직은 `env-file`의 ZIP 함수를
   호출해야 해서, core로 내리면 core가 env를 import하게 돼 core 자신의
   "어떤 위층도 import 안 함" 규율을 core를 위해 깨는 셈이라 기각.
3. **ESLint 예외 목록** — `game`이 이 파일들만 예외로 import. 규칙이
   단순해야 한다는 전제를 깨고, 다음 유사 사례마다 예외가 늘어난다.

대신 이 로직을 **재분류**했다 — `edit/`에 있었던 게 애초에 착오였다는
평가다. `env`(브라우저 API를 직접 호출하지 않아 정의상 안 맞고 6파일도
이미 실패 모드 기준으로 꽉 참)도 `render`(그리기 전용, 무관한 책임)도
맞는 자리가 아니라 새 층을 만들었다. 상세 — `src/format/README.md`.

### env로 개명한 이유 (구 plat)
`plat`(platform 줄임)은 뜻이 안 와닿았다. **core ↔ env** 대비가 레이어 본질을 그대로 드러낸다 — core는 "환경 무관(Node도 됨)", env는 "환경 의존(브라우저 없으면 못 돎)". canvas·audio·IndexedDB·input을 하나로 아우르는 추상도도 맞고(`browser`보다 미래 안전, `io`보다 넓음), `host`는 CTX seam(§3)이 다른 뜻으로 점유해 충돌하므로 피했다. → [[rationale]].

### 경계 예시 (env vs render vs 위층)

| 일 | 레이어 |
|---|---|
| `<canvas>` 만들고 리사이즈·DPR 보정 | **env** |
| 그 캔버스에 노트를 매 프레임 그림 | **render** |
| WebAudio 노드 생성·오디오 로드·재생 | **env** |
| "이 노트 칠 때 효과음 울려라" 판단 | **game** |
| 키보드 raw `keydown` 수신 | **env** |
| 그 키를 lane으로 매핑·판정 | **core**‡ |
| IndexedDB에 차트 저장 | **env** |
| tick↔ms, shape 기하 계산 | **core** |

‡ 판정 **계산**은 core, 입력을 받아 언제 판정을 부를지의 **호출 순서**는 game. 한 줄에 둘이 걸쳐 보이지만 레이어는 갈린다(계산 core / 오케스트레이션 game).

핵심 가름선은 **"브라우저 API를 직접 호출하느냐"**(→ env)와 **"매 프레임 그리느냐"**(→ render)다.

### env 내부 세분 `[신규]`

env는 파일 6개로 가른다. 가름의 기준은 **실패 모드**다 — 오디오 컨텍스트 suspended, 저장소 quota 초과, 사용자의 파일 선택 취소는 서로 다르게 실패하고 서로 다른 복구를 요구한다.

| 파일 | 소관 |
|---|---|
| `env-audio` | AudioContext, decode, 재생·정지·position, 볼륨, 히트음 재생 |
| `env-canvas` | canvas 획득, resize·DPR, fullscreen |
| `env-time` | rAF loop, `performance.now`, `frameCap` |
| `env-input` | keydown/keyup + timestamp, focus·visibility, `preventDefault` 정책 |
| `env-storage` | store 영속과 쓰기 실패 신호 → [[persistence]] §1 |
| `env-file` | 파일 열기·저장 창, blob 읽기·쓰기, ZIP 인코딩·디코딩 |

- `env-time`은 `env-canvas`와 별개다. `frameCap`은 렌더 주기 정책이고 canvas는 표면 관리이며, engine loop는 canvas를 몰라도 time이 필요하다.
- `env-file`은 `env-storage`와 별개다. 전자는 사용자 상호작용(취소 가능)이고 후자는 조용한 영속이다.
- ZIP 인코딩·디코딩은 `env-file` 소관이다. 바이트 변환 자체는 순수하지만 `.cfx` 입출력 경로에서만 쓰이고 외부 라이브러리에 묶여 있어, core를 무의존으로 유지하는 쪽을 택했다.

---

## 2. core는 데이터를 인자로 받는다 (현재와의 차이)

**현재 코드는 이 규율을 아직 안 지킨다** — 폴더가 없고(전부 플랫), `timing.js`·`shape.js` 같은 코어 후보가 전역 `D`(state.js)를 직접 import한다. 그래서 레이어 규율은 [보존]이 아니라 **[수정]**(재구현에서 신설)이다. (core로 승격되는 현재 파일 전체 목록 → [[naming]] §5.)

재구현 규율:
- core 함수는 전역 상태를 import하지 않는다. **활성 보면(active chart)을 펼쳐 인자로 받는다** → 이미 [[data-model]] §9가 정의한 "song 전체가 아니라 활성 chart를 넘긴다"가 이 전환의 씨앗.
- 같은 이유로 core는 캐시 전역(`cache.js`)에도 안 묶인다. 캐싱이 필요하면 호출측(env/game)이 메모이즈.
- 이로써 core는 Node 하네스에서 단위 테스트 가능 — timing/shape/judge/gauge를 브라우저 없이 검증.

> 이건 "동작 보존 재작성"의 예외가 아니다. **동작(수치·알고리즘)은 보존**하되, **의존 구조만 재배선**한다. 결과 픽셀·판정은 같고, 누가 누구를 import하는지가 달라진다.

---

## 3. 호스트 seam — play 엔진은 호스트를 모른다 [보존]

play 엔진(game 레이어)은 editor 안에서도, 독립 game scene에서도 **똑같이** 돈다. 둘을 가르는 건 단일 컨텍스트 객체 **`CTX`** 하나뿐이다. (실측: 현재 코드 `play-context.js`에 이미 완성형으로 구현 — 이 절은 그 동작의 [보존].)

- 엔진이 실제로 만지던 정본 seam은 **데이터 5개 + 훅 1개**다 (구 코드 마이그레이션 맵 = 엔진이 `ES.*`에서 직접 읽던 필드. 소스 주석 "the fields it touched were 6"의 6번째가 이 훅):

  | CTX 필드 | 접근 | 뜻 |
  |---|---|---|
  | `sharedMs` | r/w | 현재 재생 위치(ms). **엔진이 쓰는 유일한 필드** |
  | `contentEndMs` | r | 곡 내용이 끝나는 chart time(ms). 진행 표시 분모. 정의 [[timing]] §9 `[수정]` |
  | `hitVol` | r | 히트음 볼륨 0..1 |
  | `pvSpd` | r | 스크롤 속도 ([[glossary]] scrollSpeed) |
  | `nThk` | r | 노트 두께 |
  | `redrawIdle()` | 훅 | 세션 종료 후 idle 프레임을 **다시 그릴지 호스트가 판단**(editor는 `test` 활성일 때만 — 구 `ES.activeTab==='play'` 체크를 추상화한 것). |

- **호스트 추가 주입**: `judgeLinePos`(판정선 위치, [[settings]])는 위 정본 seam에 **없다** — 엔진이 원래 만지던 필드가 아니라 두 호스트 빌더가 CTX에 얹어 보내는 값이다(fallback `8/9`, 없어도 엔진은 돈다). 엔진 필수 계약과 층이 달라 여기 별도로 둔다.

- **editor 호스트**: `CTX`가 `editorState`를 **getter로 프록시**. `CTX.sharedMs` 쓰기 = 에디터 플레이헤드 이동(동작 그대로). 라이브 뷰라 스냅샷 아님.
- **game 호스트**: `CTX`가 **자기 객체를 소유**. song-select가 `contentEndMs`·플레이 옵션을 채워 만든다. 쓰기가 에디터로 새지 않는다.
- 호스트 주입은 play 진입 시 **1회**(`setPlayContext`). 엔진은 다음 프레임부터 새 객체를 읽는다. 엔진 코드는 안 바뀐다.

> 이 seam이 "아래는 위를 모른다"의 구체형이다. game 레이어가 자기를 부른 게 editor인지 scene인지 모른 채 CTX만 본다. → [[scene]] §10.

---

## 4. 빌드 게이트 — 형제 축을 켜고 끈다

edit와 game은 형제다. 빌드별로 한쪽만 켤 수 있다.

### 플래그

| 플래그 | 소관 |
|---|---|
| `FEATURES.editor` | 에디터로 가는 모든 경로 — mode-select의 Editor 진입, title의 개발 단축키, editor scene 등록 |
| `FEATURES.recordReset` | 기록 초기화 진입점 노출 → [[records]] §4 |

- 목록은 이 둘뿐이다 `[신규]`. 플래그는 **스펙이 "이 빌드에선 보이지 않는다"고 말한 자리**에만 생긴다. 스펙이 요구하지 않는 플래그를 미리 만들면 켜지지 않는 분기가 코드에 남는다.
- `START_SCENE`은 플래그가 아니라 부팅 scene을 정하는 상수다 `[보존]`. 정상값은 `title`이고, 개발 중 `editor`로 두면 진입 클릭을 건너뛴다. 기능을 여닫지 않으므로 `FEATURES`에 넣지 않는다.

### 빌드 프로필

```
VITE_BUILD_PROFILE = 'public' | 'internal'

public (기본):  editor = false, recordReset = false
internal:       editor = true,  recordReset = true
```

기본값이 `public`이다 `[신규]`. **잊었을 때의 결과가 비대칭**이기 때문이다 — 개발 빌드를 잊으면 에디터가 안 떠서 즉시 알아차리고 다시 빌드하면 되지만, 공개 빌드를 잊으면 에디터가 나가고 되돌릴 수 없다.

### 코드 제거 `[번복]`

public 빌드는 경로만 막는 것이 아니라 **editor 코드를 번들에 넣지 않는다**. 원본은 플래그로 경로만 잠그고 코드는 그대로 배포했으나(구 `config.js`), 번들을 뜯으면 에디터 로직이 드러난다.

- `VITE_BUILD_PROFILE`은 빌드 시 문자열로 치환된다. editor 진입이 그 상수에 걸린 조건 안에서만 동적 `import()`되면 public 빌드에서 해당 청크가 통째로 제거된다.
- §5의 lazy mount가 이미 그 구조다. "다운로드를 미룬다"에서 "번들에 넣지 않는다"로 승급한다.
- 검증은 빌드 산출물에서 한다 → [[build-order]] M6-2.

### 읽는 위치

`FEATURES`는 `app-*`가 소유하고, 읽는 곳은 **scene 등록과 진입점에 한정**한다 `[신규]`. `core`·`render`가 플래그를 읽으면 같은 함수가 빌드마다 다르게 동작해 골든 테스트가 무엇을 검증하는지 불분명해진다. 차단은 한 곳에서만 일어나야 어디를 막았는지 셀 수 있다.

---

## 5. scene은 두 그래프를 담는 메커니즘

scene-manager(register/goScene/goBack/replace/lazy-mount)는 **메커니즘 하나**고, 그 위에 **두 개의 독립 그래프**가 얹힌다:

- **game 그래프** — **스택형**(goBack이 드릴다운을 되감음). 노드 시퀀스·전환 규칙의 단일 출처 → [[scene]] §3 (여기 재나열하지 않는다 — 개명 시 두 곳이 어긋나는 걸 막는다).
- **editor 그래프** — `notes ↔ shapes ↔ test ↔ meta`. **평면형**(자유 전환, goBack보다 직접 이동이 자연스러움). [수정]: 현재 코드는 editor를 1 scene + 내부 탭(`tab-nav.js`)으로 두지만, 재설계에선 탭 개념을 폐기하고 **editor도 scene 그래프**로 통일한다 — scene-manager 재사용, 탭 전용 코드 제거, 무거운 play 엔진(`test` scene)의 lazy mount 이득.

두 그래프는 **형제 축**이고 최상위에서 빌드 게이트(§4)로 분기한다. 한 트리에 섞지 않는다(game↔editor 경계가 흐려지고 scene이 비대해짐).

> **이 문서는 두 그래프가 "분리된 채 같은 메커니즘을 공유한다"까지만 못박는다.** game 그래프의 구체 전환은 [[scene]]이, **editor 그래프의 구체 전환은 [[editor-graph]]**가 소유한다 (scene.md가 game 그래프를 갖는 것과 대칭).

---

## 6. 결정 완료 / 잔여

확정:
- [x] 레이어 8층 `core/env/render/format/edit/game/scene/app`, import 위→아래 한 방향 — `format`은 D-2026-085(M4-3)로 신설, `render`와 같은 깊이
- [x] `plat`→`env` 개명 (단일 출처 = 이 문서)
- [x] env vs render 가름선 = "브라우저 API 직접 호출" vs "매 프레임 그리기"
- [x] core는 전역 D를 import하지 않고 활성 보면을 인자로 받는다 [수정] (동작 보존, 의존 재배선)
- [x] CTX 호스트 seam [보존] (엔진 정본 5데이터+redrawIdle 훅, judgeLinePos는 호스트 추가 주입, editor 프록시 / game 소유)
- [x] 빌드 게이트 = 플래그 + lazy mount + public 빌드 코드 제거
- [x] scene = game·editor 두 그래프를 담는 메커니즘, 형제 축

잔여:
- [x] editor 그래프의 구체 전환 규칙 → [[editor-graph]] 확정
- [x] `FEATURES` = `editor`·`recordReset` 2개, 프로필 기본값 `public`, public 빌드는 코드 제거 `[번복]` (D-2026-033)
- [x] env 내부 세분 6파일 — 가름 기준은 실패 모드 (D-2026-033)
- [x] core 테스트 하네스·골든 절차 → [[build-order]] §1 (D-2026-033)
