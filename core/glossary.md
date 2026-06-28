# Glossary — 개념 사전

> **위치**: 새 설계 볼트 1급 문서. 용어는 영어로 단일하게 고정하고, 설명은 한국어로 쓴다.
> **목적**: 각 개념을 영어 이름 하나로 못박는다. 한 개념에 두 이름을 두지 않는다.
> **짝 문서**: [[naming]]

---

## ⚠️ scrollSpeed 와 playbackRate — 절대 분리

가장 자주 혼동되는 두 개념. 영어 이름으로 영원히 갈라둔다.

- **`scrollSpeed`** — 노트가 떨어지는 스크롤 속도. 오디오와 완전히 무관하다. 0.1 단위로 조절, 범위 1.0~10.0. 화면에서 노트가 빠르게/느리게 흐르는 것만 바꾼다.
- **`playbackRate`** — 오디오 재생 속도. 바꾸면 음정이 변한다. **항상 1.0 고정.**

→ `scrollSpeed`를 오디오에 곱하거나 `playbackRate`를 노트 위치 계산에 쓰면 즉시 버그다. 이 둘은 코드 어디에서도 서로 닿지 않는다.

---

## 데이터 구조 (Song / Chart)

최상위는 **song**(곡)이고, 그 안에 **chart**(난이도별 보면) 배열이 들어가는 2층 구조다. 전체 스키마는 → [[data-model]].

- **`song`** — 곡 하나. 오디오·메타·타이밍 등 **곡 공통** 정보 + chart 배열.
- **`chart`** — 칠 수 있는 보면 하나 = 난이도 하나. song에 N개.
- **`difficulty`** = 난이도 **명칭**(문자열, `Trace`/`Drift`/`Surge`…). **`level`** = 난이도 **수치**(숫자). 다른 개념.
- **곡 공통**: metadata·tempos·timeSignatures·audioFile·offset (오디오가 하나이므로 난이도와 무관, 분기 차단).
- **chart별**: notes·shapeEvents·laneEvents·textEvents·charter (난이도마다 자유).
- 런타임은 **한 번에 한 chart**만 다룬다. 코어에는 song 전체가 아니라 활성 보면을 펼쳐 넘긴다.



- **`judgment`** — 키 입력 타이밍 `abs(diff_ms)`를 임계로 자른 결과. normal과 wide는 임계 테이블만 다르다.

| `abs(diff_ms)` | ≤ 25 | ≤ 50 | ≤ 100 | > 100 |
|---|---|---|---|---|
| **normal** (`isWide=false`) | `SYNC` | `PERFECT` | `GOOD` | `MISS` |
| **wide** (`isWide=true`) | `SYNC` | `SYNC` | `SYNC` | `MISS` |

- **`window`** (`WINDOW_*_MS`) — 위 임계값. SYNC 25 / PERFECT 50 / GOOD 100.
- **`judgeLine`** — 노트를 쳐야 하는 기준 가로선. 위로만 올릴 수 있다(raise-only). 올리면 아래 HUD(게이지·곡명 등)도 따라 올라간다.
- **`FAST` / `SLOW`** — 판정 종류가 아니라 `diff`의 **부호**로, 두 층위로 쓰인다.
  - **순간 표시** (`flashTiming`) — 판정 당시 'FAST'/'SLOW'를 화면에 잠깐 깜빡인다. 기록 안 됨.
  - **누적 카운트** (`fastCount` / `slowCount`) — 세션 동안 누적해 **result에 표시**한다.
  - 카운트 조건: **SYNC 바깥 ~ MISS 안쪽 구간의 normal 노트만** (즉 PERFECT·GOOD). SYNC는 정타라 제외, MISS는 미입력이라 제외, wide·autoplay도 제외. 예: PERFECT +43ms → "FAST" 깜빡 + `fastCount` +1.
- hold의 tail은 별도 판정 없이 성공=`SYNC`, 중간 릴리즈=`MISS`로 통합.

## 노트 (Note)

노트는 **4종류**다. 두 개의 독립 축(`isWide` × `duration`)의 조합으로 표현된다.

| | `duration == 0` (tap) | `duration > 0` (hold) |
|---|---|---|
| **`isWide == false`** | `Tap` | `Hold` |
| **`isWide == true`** | `WideTap` | `WideHold` |

- **`isWide`** — false면 자기 레인 키로만 치는 일반 노트. true면 아무 키로나 칠 수 있고, 판정은 SYNC 아니면 MISS만 나온다.
- **`tap`** (`duration == 0`) — 한번 누르면 끝. head만 가진다.
- **`hold`** (`duration > 0`) — 누르고 있어야 한다. head와 tail을 가진다.
- **`tail`** — hold의 끝. 릴리즈 타이밍이 판정 대상. (성공=SYNC, 중간 릴리즈=MISS로 통합)

> note 데이터 구조(`{startTick, duration, lane, isWide}`)는 → [[data-model]] §5.

> **`duration` 공통 규칙** — note·shape·laneEvents 모두 동일하다. `duration == 0`이면 즉시(노트는 tap, 변형은 step 점프), `duration > 0`이면 지속(노트는 hold, 변형은 easing 보간). 이 규칙은 여기서 한 번만 정의하고 각 문서에서 반복하지 않는다.

> overlap은 노트 종류가 아니다. → [[#오버랩 표시 Overlap]] 참조 (렌더링 현상).

---

## 레인 (Lane)

- **`lane`** (1~4) — 노트가 사는 곳이자 화면의 세로 통로. 데이터 필드도 `note.lane`. (구 `channel`은 폐기 — 같은 1~4 값을 두 단어로 부를 이유가 없다.)
- **`key`** (1~6) — 사람이 누르는 물리 입력. `LANE_OF_KEY`로 lane에 매핑: key1→1, key2→2, key3→3, key4→2, key5→3, key6→4.
- L2·L3는 각각 두 키(2+4, 3+5)를 받으므로 한 lane에 노트가 둘 공존할 수 있다(동시치기). L1·L4는 단일 키.
- 입력 처리는 항상 lane 기준이며, shape·laneEvents의 시각 변형과 무관하다.

### 5선 멘탈모델

플레이필드는 5개 선으로 늘어선다. **이름일 뿐 데이터 필드가 아니다** (데이터는 shape의 `isBlue`, lane의 `lineNum`을 따로 쓴다):

```
Blue · 1 · 2 · 3 · Red
(shape)  (laneEvents)  (shape)
```

- **Blue / Red** = 두 바깥 경계(shape). 식별자일 뿐 순서 고정이 아니다 — 교차 가능.
- **1 · 2 · 3** = 안쪽 구분선(laneEvents).

shape와 laneEvents를 데이터로 병합하지 않는다(좌표계·역할이 다름). 양 끝을 0/4 같은 숫자로 부르지 않는 건 순서 압박을 없애기 위함 — B/R 식별자는 교차해도 무방하다.

### 오버랩 표시 (Overlap)

- **`overlap`** — 노트 타입이 아니라 **렌더링 현상**이다. **render가 판단한다**: 그릴 때 같은 lane의 같은 tick에 다른 노트가 있는지 확인하고, 있으면 above/below로 갈라 금색으로 그린다. judge는 overlap을 모른다(입력/렌더 분리). L2 또는 L3에서만 발생.
- 가로로 서로 다른 lane의 같은 타이밍 노트가 나오는 것은 overlap이 **아니다**.
- L1·L4에 두 입력을 요구하는 노트가 들어가면 잘못된 데이터이므로 **빨갛게 경고**.
- 게임 튜토리얼에서 "겹쳐 보이는 건 두 노트"라는 설명만 하면 되고, 입력 매핑에는 영향 없다.

---

## Shape / 플레이필드 지오메트리

- **`shape`** (`shapeEvents`) — 플레이필드 전체의 곡률을 시간에 따라 변형하는 이벤트. Conflux의 핵심 메커니즘.
- **`isBlue`** — shape 체인 식별자. true=Blue 체인, false=Red 체인. 방향이 아니라 두 체인의 이름 — 두 경계는 교차할 수 있다(순서 구속 없음).
- **`easing`** — 변형의 보간 곡선. 저장값 3종(`Linear`/`In-Sine`/`Out-Sine`) + `null`(체인 init). 공식·Arc 입력모드 전체는 → [[shape]] §5.
- **`targetPos`** — 변형이 도달할 목표 위치(외부단위 -8~+8, 0.25 스텝).
- **`laneEvents`** (현재 코드의 `lineEvents`를 개명·확장) — Blue/Red 경계 **안쪽의 구분선 3개(1·2·3)**를 시간에 따라 움직이는 이벤트. shape가 바깥 경계를 움직이듯, laneEvents는 내부 구분선을 움직인다. **순수 시각 연출이며 판정과 무관**. 데이터·구속·좌표계 전체는 → [[lane-events]] 참조.
- **`textEvents`** (`[{startTick, ...텍스트/위치}]`) — 특정 tick에 화면에 텍스트를 띄우는 연출 이벤트. 게임·에디터 양쪽에서 렌더된다(game-render, notes-render). 특수 연출·튜토리얼용이라 일반 차트엔 드물다. chart별 데이터. (구체 필드는 편집 UI 설계 시 확정)

---

## 게이지 / 결과 (Gauge / Result)

- **`gauge` / `gaugeMode` / `state` / `Cascade` / terminate** — 게이지·클리어·종료·강등 정의 일체는 → [[gauge]]. (수치는 [[constants]] §2.)
- **`combo`** — GOOD 이상으로 연속 처리한 노트 수. MISS면 0으로 초기화.

### rank — state와 독립된 두 번째 기록 축

곡을 끝내면 **rank**(점수 등급)와 **state**([[gauge]])가 **따로** 기록된다. 서로 영향 없다.

- **`rank`** — 점수(백만점 기준) 등급. U / S+ / S / A+ / A / B / C / D / E / F. 임계·점수식 → [[constants]] §3.

---

## 타이밍 (Timing)

> 변환·스크롤·세그먼트 상세는 → [[timing]]. 여기서는 개념만.

- **`tick`** — 차트의 시간 단위. 1박 = 1920 tick(TPB).
- **`leadIn`** (`LEAD_IN_MS`) — 곡이 시작되기 전 비어 있는 스크롤 구간.
- **`offset`** (`metadata.offset`, ms) — 오디오 싱크 보정. 음악 시작 위치에만 더해진다(`startAudio(startMs + offset)`). 양수면 음악을 트랙 안으로 더 들어가 시작 → 음악이 노트보다 늦을 때 당겨준다. **곡 공통**이며 난이도별로 갈리지 않는다(음원이 하나이므로). leadIn(시작 전 빈 구간)과는 별개.
- **`scroll`** — 노트는 **시간 등속**으로 흐른다(ms 공간 선형). BPM은 노트 간격만 바꾸고 낙하 속도는 일정. "가변속"은 `tickToMs`의 BPM 누적 부산물. 진행도 정의·`scrollProgressAt` → [[timing]] §3.
- **`gridDivisor`** — 노트 배치용 분박 그리드. "1박을 N등분"(박자 독립, 기본 8). 마디 표기 sub·lane 스냅도 이 N을 공유한다. 입력 위계·틱 반올림 등 상세 → [[timing]] §6.
- **`scrollSpeed`** — (위 절대분리 항목 참조.) `visMs = SCROLL_VIEW_MS / scrollSpeed` → [[timing]] §3.

---

## 빌드 / 구조 (Build / Structure)

- **`build: editor`** — 내부 에디터 빌드. 개인 저작용.
- **`build: game-internal`** — 내부 게임 빌드. .cfx 파일을 실제 게임 UX로 테스트(localImport 허용).
- **`build: game-public`** — 공개 게임 빌드. 큐레이트된 곡만.
- **`core`** (`core-*`) — 순수 로직 레이어. DOM·캔버스·전역 상태를 모른다. Node 하네스에서 그대로 import 가능.
- **`.cfx`** — 차트 교환 포맷. ZIP(fflate) 기반, content-hash로 에셋 ID를 만들어 자동 중복 제거.

---

## 사용 규칙

1. 새 코드에서 개념을 가리킬 때는 **이 사전의 영어 용어**를 쓴다. 사전에 없으면 먼저 여기 추가한다.
2. 한 개념에 두 이름을 두지 않는다. (예: 스크롤 속도를 어떤 곳은 speed, 어떤 곳은 scrollSpeed로 부르지 않는다.)
3. 사전이 코드와 어긋나면 **사전이 기준**이다. 코드를 고친다.
4. 설명·주석·문서 본문은 한국어로 쓰되, **개념을 가리키는 단어는 위 영어 용어 그대로** 박아 쓴다.
