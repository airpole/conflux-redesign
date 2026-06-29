# architecture — 레이어·의존 단일 출처

> 재구현 시의 레이어 모델·의존 방향·호스트 seam·빌드 게이트를 정의한다.
> **레이어 정의의 단일 출처는 이 문서다.** README는 요약, [[naming]] §5는 파일명 접두사 규칙(정의는 여기 참조).
> 근거는 [[rationale]]. 화면 그래프 흐름은 [[scene]].

---

## 1. 레이어 7층

import은 **위→아래 한 방향만**. 아래는 위를 모른다.

```
core ─→ env ─→ render ─→ edit / game ─→ scene ─→ app
```

| 레이어 | 책임 | 기준(이 레이어인가?) |
|---|---|---|
| **core** | 순수 로직·계산 (tick↔ms, shape 기하, 판정, 게이지) | 브라우저 API를 **하나도** 안 쓴다. Node 하네스에서 import해 돈다. |
| **env** | 브라우저 설비 래핑 (구 `plat`) | 브라우저 API를 **직접 호출**한다 — `<canvas>` 생성·리사이즈·DPR, WebAudio 노드·오디오 로드/재생, IndexedDB, raw 키/포인터 입력. |
| **render** | 캔버스에 매 프레임 그리기 | core 지오메트리를 받아 env가 만든 캔버스에 **칠하기만** 한다. 상태를 안 바꾼다. |
| **edit / game** | 인터랙션 (형제 축) | 사용자 동작 → 상태 변경 → render 호출. edit=에디터, game=플레이. 둘은 **서로를 모른다**. |
| **scene** | 화면 그래프 (전환·스택·mount) | edit/game을 **mount하는 컨테이너**. 어느 scene이 보이는지만 관리. → [[scene]] |
| **app** | 부트스트랩·빌드별 진입점·config·빌드 게이트 | 무엇을 켜고(§4) 무엇을 최상위에 붙일지 결정. |

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
| 그 키를 lane으로 매핑·판정 | **core** (흐름은 game) |
| IndexedDB에 차트 저장 | **env** |
| tick↔ms, shape 기하 계산 | **core** |

핵심 가름선은 **"브라우저 API를 직접 호출하느냐"**(→ env)와 **"매 프레임 그리느냐"**(→ render)다.

---

## 2. core는 데이터를 인자로 받는다 (현재와의 차이)

**현재 코드는 이 규율을 아직 안 지킨다** — 폴더가 없고(전부 플랫), `timing.js`·`shape.js` 같은 코어 후보가 전역 `D`(state.js)를 직접 import한다. 그래서 레이어 규율은 [보존]이 아니라 **[수정]**(재구현에서 신설)이다.

재구현 규율:
- core 함수는 전역 상태를 import하지 않는다. **활성 보면(active chart)을 펼쳐 인자로 받는다** → 이미 [[data-model]] §9가 정의한 "song 전체가 아니라 활성 chart를 넘긴다"가 이 전환의 씨앗.
- 같은 이유로 core는 캐시 전역(`cache.js`)에도 안 묶인다. 캐싱이 필요하면 호출측(env/game)이 메모이즈.
- 이로써 core는 Node 하네스에서 단위 테스트 가능 — timing/shape/judge/gauge를 브라우저 없이 검증.

> 이건 "동작 보존 재작성"의 예외가 아니다. **동작(수치·알고리즘)은 보존**하되, **의존 구조만 재배선**한다. 결과 픽셀·판정은 같고, 누가 누구를 import하는지가 달라진다.

---

## 3. 호스트 seam — play 엔진은 호스트를 모른다 [보존]

play 엔진(game 레이어)은 editor 안에서도, 독립 game scene에서도 **똑같이** 돈다. 둘을 가르는 건 단일 컨텍스트 객체 **`CTX`** 하나뿐이다. (실측: 현재 코드 `play-context.js`에 이미 완성형으로 구현 — 이 절은 그 동작의 [보존].)

- 엔진이 만지는 필드는 **6개 + 훅 1개**뿐:

  | CTX 필드 | 접근 | 뜻 |
  |---|---|---|
  | `sharedMs` | r/w | 현재 재생 위치(ms) |
  | `totalMs` | r | 곡 전체 길이(ms) |
  | `hitVol` | r | 히트음 볼륨 0..1 |
  | `pvSpd` | r | 스크롤 속도 ([[glossary]] scrollSpeed) |
  | `nThk` | r | 노트 두께 |
  | `judgeLinePos` | r | 판정선 위치 ([[settings]]) |
  | `redrawIdle()` | 훅 | 세션 종료 후 호스트가 idle 프레임 다시 그림 |

- **editor 호스트**: `CTX`가 `editorState`를 **getter로 프록시**. `CTX.sharedMs` 쓰기 = 에디터 플레이헤드 이동(동작 그대로). 라이브 뷰라 스냅샷 아님.
- **game 호스트**: `CTX`가 **자기 객체를 소유**. song-select가 곡 길이·플레이 옵션을 채워 만든다. 쓰기가 에디터로 새지 않는다.
- 호스트 주입은 play 진입 시 **1회**(`setPlayContext`). 엔진은 다음 프레임부터 새 객체를 읽는다. 엔진 코드는 안 바뀐다.

> 이 seam이 "아래는 위를 모른다"의 구체형이다. game 레이어가 자기를 부른 게 editor인지 scene인지 모른 채 CTX만 본다. → [[scene]] §9.

---

## 4. 빌드 게이트 — 형제 축을 켜고 끈다

edit와 game은 형제다. 빌드별로 한쪽만 켤 수 있다.

- **게이트 = 플래그**(`FEATURES.editor` 등). 코드를 빼는 게 아니라 **플래그만 여닫는다**.
- scene **lazy mount**(→ [[scene]] §2·§7)와 맞물려, 꺼진 축의 scene은 `mount()`도 안 돌아 비용(DOM·메모리)을 안 낸다. game 전용 빌드는 editor scene을 한 번도 mount하지 않는다.
- app 레이어가 어떤 게이트로 부팅할지 정한다.

---

## 5. scene은 두 그래프를 담는 메커니즘

scene-manager(register/goScene/goBack/replace/lazy-mount)는 **메커니즘 하나**고, 그 위에 **두 개의 독립 그래프**가 얹힌다:

- **game 그래프** — `title → mode-select → song-select → song-credit → gameplay → result`. **스택형**(goBack이 드릴다운을 되감음). 정의·전환 규칙 → [[scene]].
- **editor 그래프** — `notes ↔ shapes ↔ test ↔ meta`. **평면형**(자유 전환, goBack보다 직접 이동이 자연스러움). [수정]: 현재 코드는 editor를 1 scene + 내부 탭(`tab-nav.js`)으로 두지만, 재설계에선 탭 개념을 폐기하고 **editor도 scene 그래프**로 통일한다 — scene-manager 재사용, 탭 전용 코드 제거, 무거운 play 엔진(`test` scene)의 lazy mount 이득.

두 그래프는 **형제 축**이고 최상위에서 빌드 게이트(§4)로 분기한다. 한 트리에 섞지 않는다(game↔editor 경계가 흐려지고 scene이 비대해짐).

> **이 문서는 두 그래프가 "분리된 채 같은 메커니즘을 공유한다"까지만 못박는다.** game 그래프의 구체 전환은 [[scene]]이, **editor 그래프의 구체 전환은 향후 editor 문서**가 소유한다 (scene.md가 game 그래프를 갖는 것과 대칭).

---

## 6. 결정 완료 / 잔여

확정:
- [x] 레이어 7층 `core/env/render/edit/game/scene/app`, import 위→아래 한 방향
- [x] `plat`→`env` 개명 (단일 출처 = 이 문서)
- [x] env vs render 가름선 = "브라우저 API 직접 호출" vs "매 프레임 그리기"
- [x] core는 전역 D를 import하지 않고 활성 보면을 인자로 받는다 [수정] (동작 보존, 의존 재배선)
- [x] CTX 호스트 seam [보존] (6필드+redrawIdle, editor 프록시 / game 소유)
- [x] 빌드 게이트 = 플래그 + lazy mount
- [x] scene = game·editor 두 그래프를 담는 메커니즘, 형제 축

잔여:
- [ ] editor 그래프의 구체 전환 규칙 (→ 향후 editor 문서)
- [ ] `FEATURES` 플래그의 정확한 목록·기본값 (app 레이어 설계 시)
- [ ] env 내부 세분(audio/storage/canvas/input)을 파일로 어떻게 가를지
- [ ] core 단위 테스트 하네스 형태 (Node import 경로)
