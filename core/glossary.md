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
- **chart별**: notes·shapeEvents·laneEvents·textEvents·chartBy (난이도마다 자유).
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

> overlap/conflict는 노트 종류가 아니라 파생 속성이다. → [[#겹침 표시 — overlap / conflict]].

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

### 겹침 표시 — overlap / conflict

같은 lane(또는 Wide끼리)에서 두 노트의 활성 구간이 겹치는 것을 **하나의 검출기**가 잡는다. 결과는 그 lane의 **수용력(capacity)**으로 갈린다 — 둘 다 같은 검출, 색·의미만 다르다.

- **검출 (단일)** — 노트 타입이 아니라 **파생 속성**이다. notes에서 계산되는 한 패스(`noteOverlapMap`, notes 변하면 갱신)가 모든 lane·Wide에 같은 활성구간 규칙으로 돈다. 활성구간: Tap = `[t,t]`, Hold = `[head, head+dur)`. judge는 이 결과를 모른다(입력/렌더 분리) — render가 map을 읽어 색만 입힌다.
- **`overlap`** (L2·L3, **노란색**) — 두 키를 받는 lane이라 겹침이 **연주 가능**하다(동시치기). 두 노트를 merged/yellow/clipped로 갈라 노랗게 표시. "겹쳐 보이는 건 두 노트"라는 안내만 하면 되고 입력 매핑엔 영향 없다.
- **`conflict`** (L1·L4 + Wide-on-Wide, **빨간 테두리**) — 키가 하나뿐인 lane(L1·L4)이거나 전폭이 겹치는 Wide 두 장이라, 한 입력으로 둘을 칠 수 없다. 겹침이 **연주 불가** — 제작자가 하나를 지워야 한다. 흰 노트에 빨간 경고 테두리.
- 가로로 **다른** lane의 같은 타이밍 노트는 겹침이 아니다(각자 다른 키).

> 단일 검출 + capacity 분기. 구 `invalid`/`misplaced` 호칭은 `conflict`로 통일. 평가 알고리즘 상세·구현은 → [[data-model]] §5.1. 근거 → [[rationale]].

---

## Shape / 플레이필드 지오메트리

- **`shape`** (`shapeEvents`) — 플레이필드 전체의 곡률을 시간에 따라 변형하는 이벤트. Conflux의 핵심 메커니즘.
- **`isBlue`** — shape 체인 식별자. true=Blue 체인, false=Red 체인. 방향이 아니라 두 체인의 이름 — 두 경계는 교차할 수 있다(순서 구속 없음).
- **`easing`** — 변형의 보간 곡선. 저장값 3종(`Linear`/`In-Sine`/`Out-Sine`) + `null`. `null`인 이벤트는 **anchor** — 보간 없이 값을 못박는다(체인의 첫 anchor는 **init**이라 부름). `Step`(즉시 점프)·`Arc`(교번)는 저장 안 되는 **에디터 입력 라벨**. 평가·공식·입력모드 전체 → [[shape]] §4·§5.
- **`chain`** — shape·laneEvents가 공유하는 평가 메커니즘. 한 체인 = 한 선택자값(shape `isBlue`, lane `lineNum`)에 묶인 이벤트들의 시간축 사슬. anchor로 시작해 보간 이벤트로 흐른다. 단일 출처 → [[shape]] §4.
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

## 화면 / Scene

> 공용 루트 + 세 모드 그래프. 전환·overlay·호스트 상세는 → [[scene]]. 여기서는 색인만.

- **`mode-select`** (구 `modeselect`) — title 다음 공용 허브. play/editor/settings 모드로 갈린다. 모드 추가의 단일 확장 지점.
- **`song-select`** (구 `music-select`) — 곡(song)과 그 안의 난이도(chart)를 고르는 화면. Space로 빠른 옵션 패널 토글, Enter로 확정.
- **`song-credit`** — 곡 확정 후 gameplay 직전, 이 곡의 크레딧을 보여주는 **자동 인터스티셜** [신규]. 입력 없이 자동 전환, 되돌아갈 수 없다(replace로 들어가 Exit/Back은 건너뛴다). 표시 `Music by`/`Jacket by`/`Chart by` — 접미사는 표시 레이어, 저장은 값만(`musicBy`·`jacketBy`·`chartBy` → [[data-model]]).
- **`credits`** — 프로젝트 제작진(게임 개발자·엔진·디자인 등). 곡 단위 `song-credit`과 다른 화면.
- **`gameplay`** (구 play overlay) — 곡을 치는 scene. `play`는 **모드** 이름이라, scene은 gameplay로 분리. overlay→정식 scene 승격.
- **`result`** — 결과 화면(overlay→scene 승격). Retry/Back.
- **`test`** — editor 그래프 scene(구 editor play 탭). gameplay와 같은 엔진을 editor 호스트로 구동.
- **모드 그래프** — game(스택형)/editor(평면)/settings(평면). 셋은 형제 축 → [[scene]] §3.

## overlay

- **`overlay`** — 한 scene **위에** 그 scene을 살린 채 덮는 층. scene-manager를 안 거치고 엔진·하위 상태가 살아있다. 예: `pause`(gameplay 멈춤, Resume이 lead-in 3초 후 재개), text-event(캔버스 표시), 빠른 옵션 패널(song-select·test 공유). 새 레이어가 아니라 game+render 분담 → [[architecture]]. z-순서 → [[theme]].

## 설정 / Settings

- **`settings`** — 저장되는 곡 데이터와 별개로, 플레이어가 1회 정하는 영속 설정의 단일 객체. 정의·필드·소속 전체는 → [[settings]].
- **빠른 옵션 패널** — settings 값 중 판마다 바뀔 수 있는 5종(`scrollSpeed`·`gaugeMode`·`mirror`·`staticShape`·`autoplay`)만 빠르게 만지는 공유 UI. song-select·test가 같이 띄움. 값은 settings 한 곳 → [[scene]] §5.
- **`jacketBrightness`** — 자켓 배경 밝기(전역 설정). 곡별 값이 아니라 플레이어 취향이다. (구 곡별 `metadata.jacketBrightness`는 폐기, 구 전역 `bgBrightness`를 개명.)
- **`judgeLine`** 의 세로위치(`judgeLinePos`)·`sudden`(상단 커버)·`noteSkin`·`scrollSpeed`·`showFastSlow`(F/S) 등도 settings 소속. ([폐기] `cmod`·`hidden`.)

---

## 빌드 / 구조 (Build / Structure)

- **`build: editor`** — 내부 에디터 빌드. 개인 저작용.
- **`build: game-internal`** — 내부 게임 빌드. .cfx 파일을 실제 게임 UX로 테스트(localImport 허용).
- **`build: game-public`** — 공개 게임 빌드. 큐레이트된 곡만.
- **`core`** (`core-*`) — 순수 로직 레이어. DOM·캔버스·전역 상태를 모른다. Node 하네스에서 그대로 import 가능. 전역 D 대신 활성 보면을 인자로 받는다([[data-model]] §9).
- **레이어 7층** — `core → env → render → edit/game → scene → app`, import 위→아래 한 방향. 정의·의존 규칙·CTX seam·빌드 게이트 단일 출처 → [[architecture]]. 파일명 접두사 규칙 → [[naming]] §5.
- **`env`** (`env-*`, 구 `plat`) — 브라우저 설비 래핑 레이어. canvas 생성·DPR, WebAudio, IndexedDB, raw input 등 브라우저 API 직접 호출. core가 "환경 무관"이면 env는 "환경 의존".
- **`CTX`** — play 엔진의 호스트 주입 seam. 엔진은 editor/game 어느 호스트인지 모르고 CTX 한 객체(6필드+redrawIdle)만 본다. editor는 editorState 프록시, game은 자기 소유 → [[architecture]] §3.
- **`.cfx`** — 차트 교환 포맷. ZIP(fflate) 기반, content-hash로 에셋 ID를 만들어 자동 중복 제거.

---

## 사용 규칙

1. 새 코드에서 개념을 가리킬 때는 **이 사전의 영어 용어**를 쓴다. 사전에 없으면 먼저 여기 추가한다.
2. 한 개념에 두 이름을 두지 않는다. (예: 스크롤 속도를 어떤 곳은 speed, 어떤 곳은 scrollSpeed로 부르지 않는다.)
3. 사전이 코드와 어긋나면 **사전이 기준**이다. 코드를 고친다.
4. 설명·주석·문서 본문은 한국어로 쓰되, **개념을 가리키는 단어는 위 영어 용어 그대로** 박아 쓴다.
