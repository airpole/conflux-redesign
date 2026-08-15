# 설계 대장 — 재구현이 원본에서 벗어난 자리

> 골든 표(`tests/golden/*.json`)는 원본 `conflux-editor`의 관측 자료다.
> 재구현은 원본을 따라가는 게 목적이 아니라 **더 나은 설계로 다시 짓는 것**이므로,
> 표와 어긋나는 자리가 생긴다. 이 문서가 그 자리를 전부 모은다.
>
> 예외를 관리하는 문서가 아니라 **재설계가 무엇을 바꿨는지 한 장에서 보는 문서**다.

---

## 0. 규칙

**대장에 없는 차이는 실패다.** 등재된 차이는 통과하고, 등재되지 않은 불일치는
테스트를 실패시킨다. 골든 표의 값어치는 "원본을 따르게 하는 것"이 아니라
**몰랐던 차이를 드러내는 것**에 있다 — 원본을 잘못 읽었거나, 스펙에 적히지 않은
동작을 건드렸을 때 그것이 질문으로 떠오르게 하는 장치다.

등재는 가볍다. 한 줄과 근거 링크면 된다. 설계의 방향을 바꾸는 큰 결정만
`DECISION_LOG`로 승격한다 — 개선할 때마다 결정 사이클을 돌려야 한다면
그 마찰이 개선 자체를 억누른다.

### 범위

이 대장이 **행 단위로** 담는 것은 **골든 표가 존재하는 영역**(core / M1)이다. 대조할
관측 자료가 있어야 "어긋남"을 말할 수 있기 때문이다.

M2 이후 영역(render·scene·persistence·`.cfx`·editor)의 차이는 각 문서의 태그와
`DECISION_LOG`가 갖는다 — 원본에 브라우저 앱 형태로만 존재하거나 대응물 자체가
없어 자동 대조가 성립하지 않는다. 그 영역은 milestone별 **수동 대조 시나리오**가
맡으며, 시나리오가 만들어지는 시점에 이 대장도 해당 절을 늘린다(§7).

### 관계 표기

| 표기 | 뜻 | 무엇이 검증하나 |
|---|---|---|
| `어긋남` | 골든 표에 대응 케이스가 있고 값이 다르다 | 대장이 차이를 명시하고, 그 외의 불일치는 실패 |
| `미커버` | 원본에 대응물이 있으나 골든이 뽑지 않았다 | **스펙 테스트가 반드시 있어야 한다** |
| `없음` | 원본에 대응물 자체가 없다 | 스펙만이 판정한다 |

`미커버`가 이 표에서 가장 중요한 표기다. 골든도 안 걸고 대장에도 없으면
아무 검증 없이 통과한다 — 검증 공백은 어긋남보다 위험하다.

### 이 대장이 담지 않는 것 — 이름

대장은 **동작**의 차이를 담는다. 구현이 [[naming]] §3의 이름을 벗어난 것은 동작
차이가 아니라 명세 위반이므로 여기 오르지 않고, 골든도 잡지 못한다. M1-4에서
그런 이탈 두 건(`WINDOW_*_MS`·`DEFAULT_LANE_KEYS`)이 M1-2부터 살아 있던 것이
드러났다 — 그 부류는 `src/core/core-naming.test.ts`가 `naming` §3을 파싱해
대조한다(D-2026-038).

---

## 1. timing

골든 198건 중 값이 어긋나는 케이스는 없다. 다만 `getBPMAt` 30건과 `getTimeSig`
30건은 **대응 함수가 없다** — `timing` §2가 unused `bpmAt`을 만들지 않기 때문이다.
이 60건은 세그먼트 조회(`tempoSegmentAt`·`measureSegmentAt`)로 채점한다. 값이 나오는
자리가 이미 있으므로 공개 API를 늘리지 않고도 검증이 유지된다(D-2026-037).

`tickToMeasure` 30건은 인자가 전부 박 정렬이라 `sub`가 0이다 — TM-7의 차이를
골든이 짚지 못한다. `getGridLines`는 골든이 아예 뽑지 않았다(TM-9).

| ID | 자리 | 원본 | 재설계 | 관계 | 근거 |
|---|---|---|---|---|---|
| TM-1 | 곡 끝 tail | 차트가 길면 `+4000ms`, 음악이 길면 `+2000ms` | `SONG_END_TAIL_MS = 3000` 단일 | 미커버 | D-2026-030 |
| TM-2 | `musicEndMs` | raw audio duration (offset 미보정) | `musicDurationMs − offset` | 미커버 | D-2026-030 |
| TM-3 | `chartEndMs` | note·textEvent·shapeEvent만 (`lineEvents` 누락) | 전 event 종류 | 미커버 | D-2026-030 |
| TM-4 | 5000ms 하한 | `totalMs`가 종료 판정과 seek 분모를 겸함 | 종료에서 제거, timeline 소관 | 미커버 | D-2026-030 |
| TM-5 | leadIn | 시작·Resume 구분 없음 | Resume은 leadIn 미적용 (되감기 없는 카운트다운 재개) | 미커버 | D-2026-022 |
| TM-6 | grid 분리 | note grid와 lane 수평 스냅이 같은 축 | `gridDivisor`와 `laneGridDivisor` 분리, 공유하지 않음 | 미커버 | `timing` §6 |
| TM-7 | `sub` 분할 | 박 하나를 **고정 16분할** (`round(subTick/(tpbUnit/16))`) | 온음표를 `gridDivisor` 등분 — 표기와 snap이 같은 격자 | 미커버 | D-2026-037 |
| TM-8 | `gridDivisor` 목록·기본 | `GDIVS` 상단 64, 기본 `ES.nGD = 2` | 상단 `96·128·192·256` 추가, 기본 8 | **어긋남** | D-2026-037 |
| TM-10 | `measureToTick` 마디 0 | 빈 값 폴백이 `0`까지 먹어 `"0"`이 마디 1로 떨어진다 — 왕복이 깨진다 | 마디 0을 그대로 읽는다. 빈 문자열만 1로 폴백 | 미커버 | D-2026-037 |
| TM-9 | `getGridLines` | `{tick, isMeasure, measureNum, beatInMeasure, isPreRoll}` | 같은 기술자 유지(px 없음). 골든이 뽑지 않아 스펙만이 판정 | 미커버 | D-2026-037 |

**TM-1~4는 원본에 대응 함수가 있다**(`getChartEndMs`·`updateTotalMs`). 골든이
뽑지 않았을 뿐이다. 지금은 스펙 테스트로 검증하되, 의심이 들면 추출 대상에
추가할 수 있다.

---

## 2. gauge

| ID | 자리 | 원본 | 재설계 | 관계 | 근거 |
|---|---|---|---|---|---|
| GA-1 | hold tail 게이지 델타 | hard에 tail 특례 (`TAIL_OK +0.1` / `TAIL_MISS −2.5`) | tail 성공 = SYNC 델타, tail MISS = MISS 델타 1회 | **어긋남** | `constants` §2 |
| GA-2 | Hold head MISS 회계 | MISS 델타 1회 | 즉시 2회 (head 단위 + tail 단위) | 미커버 | D-2026-024 |
| GA-3 | state `P` | "끝까지 쳤으나 미달" = `P`, best 순위 `C > P > N > F` | `P`를 `F`에 흡수, `C > F > N` | 미커버 | `gauge` §3 |
| GA-4 | cascade | `as/ap/fc` 티어만 한 칸 강등, 게이지는 단일·연속 | 게이지 2종 병렬 평가, 최고 생존 티어 | 없음 | `gauge` §4 |
| GA-5 | judgment 단위 회계 | kind 6종 피드, 단위 개념이 암묵적 | 판정 단위를 명시적으로 정의하고 score·accuracy·게이지가 같은 단위를 쓴다 | 미커버 | `gauge` §5 |
| GA-6 | state 산출 | `computeState`가 판정 카운트만 본다 — 고른 모드는 `H`/`C`만 가른다 | 같은 규칙 유지 `[보존]`. 어느 게이지로 쳐도 `FC`/`AP`/`AS`가 나온다. `tier`가 `gaugeType` 자리를 대신한다 | 미커버 | `gauge` §3 |
| GA-7 | score·accuracy·rank 산출 | `computeResult`가 `playHitMap`을 재순회해 센다 | 같은 산식 `[보존]`. 카운트는 판정 이벤트 누산기(`counts`) 하나에서 온다 | 미커버 | `constants` §3 |
| GA-8 | `as` 모드 terminate | `lockTarget: 'as'` + `lockMode: 'terminate'` | gaugeMode `as` — 규칙 동일 `[보존]` | 미커버 | `gauge` §2 |

> `HOLD_RELEASE_GRACE_MS = 50`은 대장에 오르지 않는다. 재설계 과정에서 한 번
> 폐기했다가 `[번복]`으로 복원한 값이라 **최종 상태가 원본과 같다** — 원본 대비
> 차이가 아니다. 대장은 재설계 내부의 번복이 아니라 **원본과의 차이**를 담는다.

### GA-1의 범위

**`gaugeType: 'hard'`이면서 `TAIL_OK`/`TAIL_MISS`를 포함한 시퀀스만** 어긋난다.
`normal`은 구 코드에서도 tail 델타가 SYNC/MISS와 같은 값이었으므로 `[보존]`이며,
골든이 계속 채점한다 — 스펙의 "normal은 실변경 없음"이라는 주장 자체가
골든으로 검증된다.

어긋나는 골든 케이스: `gaugeType='hard'` × `sequence ∈ {mixed, tailOnly}`
(lockTarget 3종 × 2시퀀스 = 6건).

GA-4는 원본에 병렬 평가 모델이 없어 대조할 값이 없다. `gauge` §4의 검증
시나리오 6종이 기준이다. 원본의 6단 사다리는 `settings.js gaugeToLock`이
cascade를 `gaugeType: 'normal'`로 매핑하므로 **`H`를 낼 수 없었다** — 코드
주석의 `AS→AP→FC→Hard→Normal`은 실제 매핑과 달랐다(D-2026-041).

### GA-6~8이 미커버인 이유

`tools/golden/extract-gauge.mjs`는 `gaugeOnJudgment`와 `evaluateEnd`만 뽑고
**`computeState`·`computeResult`를 뽑지 않는다.** 그래서 state 산출(GA-6)과
score·accuracy·rank 산출(GA-7)은 셋 다 `[보존]`이면서도 골든이 닿지 않는다 —
값이 같다는 주장 자체를 확인하는 것이 스펙 테스트뿐이다. 추출기의 `lockTarget`
축도 `none`/`fc`/`ap` 셋이라 `as` 모드(GA-8)가 빠져 있다.

세 건 다 원본에 대응 함수가 있으므로, 의심이 들면 추출 대상에 추가할 수 있다.
`computeResult`는 원본 `PS.playHitMap`을 합성해야 뽑히므로 값이 싸지 않다.

---

## 3. shape

| ID | 자리 | 원본 | 재설계 | 관계 | 근거 |
|---|---|---|---|---|---|
| SH-1 | 좌표계 | 내부 0~64 저장 + `posToExt = 내부/4−8` 표시 변환 + `sp2f = 내부/64` render 변환 | 외부단위 -8~+8 단일 (저장=표시=입력) | **어긋남** | `shape` §3 |
| SH-2 | init fallback | 비대칭 (Blue 0 / Red +2) | 대칭 (-2 / +2) | **어긋남** | `shape` §4 |
| SH-3 | 모르는 easing | 조용히 `Linear`로 떨어뜨리고 끝 | 같은 값으로 흘리되 domain 검증이 **보고**한다 | 미커버 | `shape` §5 |
| SH-4 | symmetry 축 기본값 | (한때 "기본 0 고정"으로 바꾸려다 `[번복]`) 동적 중심 | 스냅 tick 시점의 체인 평균 + 드래그 −8~+8 | 미커버 | `shape` §6 |
| SH-5 | `Arc` 곡선 | `ease()`에 네 번째 가지가 있다 (`sin(tπ)` — 올라갔다 제자리로) | 없다. `Arc`는 저장되지 않는 입력 호칭이고 저장값은 3종 + `null`뿐이다 | 없음 | `shape` §5 |
| SH-6 | anchor가 여럿일 때 | 배열에 **먼저 적힌** anchor가 시작값이 된다 | **가장 이른 tick**의 anchor가 시작값이 된다 | **어긋남** | `shape` §4 |

### 범위

- **SH-1**: `getShape`·`sp2f` 골든 값이 전부 구 좌표계 단위다. 값 자체가 아니라
  **단위가 다르다** — 재구현 값에 `내부 = (외부+8)×4`를 적용하면 일치해야 한다.
  변환이 성립하는지를 보는 것이 이 항목의 검증이다.
- **SH-2**: `noAnchor` fixture의 `getShapeInit`·`getShape` 5건.
- **SH-3**: 골든은 `Nonsense` 3건으로 **값이 Linear로 떨어지는 것까지만** 잰다.
  보고가 나오는지는 원본에 대응물이 없어 `core-validate.test.ts`가 판정한다.
- **SH-5**: `ease` 골든 `Arc` 7건은 대조 상대가 없다. 저장 경로(`shape-input.js`)가
  L/R·C·P 세 갈래 전부에서 `resolveArcEasing`을 거치므로 실제 차트에 `Arc`가
  남지 않는다는 것이 실측이다 — 재설계는 그 사실을 타입으로 굳혔다.
- **SH-6**: `anchorOrder` fixture 2건.

### SH-3이 "easing 종류"가 아니게 된 이유

이 행은 원래 `원본 Linear/In/Out/InOut 4종 → 재설계 3종`으로 적혀 있었고 관계도
**어긋남**이었다. 원본을 직접 읽어 보니 그런 이름은 없다 — 원본 `ease()`의 가지는
`Linear`/`In-Sine`/`Out-Sine`/`Arc`이고, 재설계가 저장하는 세 이름은 **원본과
글자까지 같다**(D-2026-043).

`In`/`Out`/`InOut`은 골든 추출기가 넘기던 인자였고, 원본은 목록에 없는 이름을
예외 없이 Linear로 떨어뜨리므로 28건이 전부 같은 값으로 나왔다. 대장이 그 인자
목록을 원본의 명세로 읽은 것이다. 표를 다시 뽑아 세 곡선이 실제로 갈리는 것을
확인했고(`ease` 21건 일치), 남은 차이인 폴백 보고를 이 ID가 잇는다.

---

## 4. data-model

DM-1·DM-2·DM-4·DM-5는 골든 표가 없는 영역이지만 **core 계산이고 M1 범위**라 여기
담는다 — 스펙 테스트가 검증한다. DM-3·DM-6은 M1-8에서 `overlap.json`이 생겨
대조 대상이 됐다.

| ID | 자리 | 원본 | 재설계 | 관계 | 근거 |
|---|---|---|---|---|---|
| DM-1 | 저장 단위 | 전역 `D` 하나, song 단위 암묵 | 독립 chart가 canonical, song은 같은 `songId`의 파생 그룹 | 미커버 | `data-model` §1 |
| DM-2 | metadata·timing·asset 소유 | 전역에 흩어짐 | 전부 chart 소유 | 미커버 | `data-model` §2·§3 |
| DM-3 | lane 2·3 3겹 이상 | pairwise라 conflict를 **검출하지 못한다** — 동일구간이면 한 장만 남기고 나머지를 `hidden`으로 숨긴다 | 동시 활성 수가 capacity를 넘으면 그 순간 활성인 노트 전체가 conflict | 어긋남 | `data-model` §5.1 |
| DM-4 | lane 데이터 구속 | 저장 시점에 구속 | 데이터 무구속(`targetPos` 실수, 역전·초과 허용), 구속은 gameplay 투영이 담당 | 미커버 | `lane-events` |
| DM-5 | 검증 | 층 구분 없음 — 잘못된 값은 런타임까지 그대로 감 | structural(거부) / domain(보고) 2층, 무mutate, `schemaVersion` 불일치 거부 | 미커버 | `data-model` §11 |
| DM-6 | conflict와 overlap이 겨룰 때 | 겨루는 자리가 없다 — lane 2·3은 overlap만, lane 1·4·Wide는 conflict만 낸다 | conflict가 세부 분류를 덮는다. group에 든 노트는 `hidden`이어도 conflict로 보인다 | 없음 | `data-model` §5.1 |
| LE-1 | 구분선 데이터 모델 | `lineEvents` — 구분선 넷의 폭을 한 덩어리로 든다(`lines: [25,25,25,25]`). 편집 UI·렌더·게임 적용이 모두 미구현이고 실데이터도 균등 init 1개뿐이었다 | `laneEvents` — 구분선 1·2·3이 각각 독립 체인이고 shape와 같은 알고리즘을 탄다 | 없음 | `lane-events` §2·§6 |

### DM-3은 알고리즘 차이가 아니다

처음 이 항목은 `순회 기반 → sweep-line, O(n log n)` / `미커버`로 등재돼 있었다.
**M1-8에서 원본을 직접 돌려 보니 바뀌는 것은 계산 방식이 아니라 검출되는 집합
자체였다.** 2겹 결과는 원본과 완전히 같고, 갈리는 것은 3겹 이상뿐이다.

원본은 노트를 두 장씩 짝지어 비교하므로 "이 순간 세 장이 동시에 활성"이라는 사실을
계산하지 않는다. lane 2에 Hold를 계단으로 세 장 겹치면 `clipped`·`yellow`·`yellow`가
나오고 conflict가 아니며, 같은 tick에 Tap 네 장이면 `merged` 한 장에 `hidden` 세
장이다 — **화면에 한 장만 보이는데 네 번 쳐야 한다.** 채보를 만드는 사람이 그것을
알아챌 방법이 없다.

계산 방식(pairwise → sweep) 자체는 2겹 결과가 같으므로 대장 행이 아니라
`data-model` §5.1의 `[수정]` 태그가 담는다 — 관계 세 표기 중 어디에도 들어가지
않는 자리다.

### LE-1이 `없음`인 이유

`lineEvents`와 `laneEvents`는 이름만 다른 같은 것이 아니다. 원본은 구분선 넷의
**폭**을 한 배열로 들었고 재설계는 구분선 셋의 **위치**를 각각의 체인으로 든다 —
개수도, 무엇을 재는지도, 몇 덩어리인지도 다르다. 골든 `getLines` 값을 재설계
값으로 옮기는 변환이 성립하지 않으므로 대조 상대가 없다.

이 자리가 `없음`인 것은 `lane-events` 문서 전체가 `[신규]`인 것과 같은 사실이다.
M1-9에서 `shape.json`을 다시 뽑을 때 `getLines`·`getLinesInit` 11건을 표에서 뺐다 —
대조할 수 없는 값을 표에 두면 "확인했다"는 착각만 남는다(D-2026-043).

DM-6이 `없음`인 것도 같은 조사에서 나왔다. 원본은 풀마다 낼 수 있는 표시 종류가
갈려 있어(lane 2·3 = overlap 계열, lane 1·4·Wide = `invalid`) **두 종류가 한 노트를
두고 겨루는 상황 자체가 생기지 않는다.** 우선순위 규칙은 3겹 검출(DM-3)과 global
6키(JD-5)가 생기면서 비로소 필요해진 재설계 고유 규칙이다.

---

## 5. judge

후보 순서가 D-2026-024에서 통째로 `[번복]`됐다. 골든 2,700건의 지위가
케이스마다 다르므로 용도를 가른다.

| ID | 자리 | 원본 | 재설계 | 관계 | 근거 |
|---|---|---|---|---|---|
| JD-1 | 후보 선택 | normal·wide **분리 풀**, 각 풀에서 earliest-tick | 단일 풀 — earliest-tick → same-tick normal 우선 → hold 우선 → 이른 tail 우선 | 미커버 | D-2026-024 |
| JD-2 | Hold 소유 | key-owned (`holds` 맵) | key-demand — Normal 익명 수요, Wide 단일 소유·원자적 이양 | 미커버 | D-2026-024 |
| JD-3 | hit 이펙트 | `commitJudgment`가 `above/below`를 계산해 실어보냄 | judge는 싣지 않음, render 소관 | 없음 | `judge` §4 |
| JD-4 | overlap/conflict | judge 안 | domain 파생 속성(`noteOverlapMap`) | 없음 | `judge` §11 |
| JD-5 | global 6키 conflict | 없음 — 풀끼리 서로 보지 않는다 | 검사 지점마다 `D1+D2+D3+D4+W <= 6` | 없음 | D-2026-024 |
| JD-6 | Hold tail 처리 | tail 자동완료는 **autoplay에서만**, 수동은 keyup 전까지 미확정 | 항상 `tailMs`에 자동완료, `[head, tail)` 반개구간, 같은 tick이면 tail 먼저 | 미커버 | `judge` §7 |
| JD-7 | 중간 시작·Resume | crossing Hold 처리 미정의 | mid-start crossing-Hold 시드·anchor 규칙, Resume은 비-재시드 | 미커버 | `judge` §10 |
| JD-8 | visualOffset | 렌더 시점 보정 | 입력 타임스탬프 보정으로 배선 | 미커버 | `judge` §1 |

### JD-1을 골든이 목격하지 못한다

처음 이 항목은 `어긋남`으로 등재됐고 `holdOverlap`·`sixKeySaturation` 두 fixture가
갈린다고 적혀 있었다. **실측하니 어긋나는 케이스가 0건이다** — 2,700건이 전부
새 규칙에서도 원본과 같은 노트를 고른다(M1-4).

구·신 규칙이 갈리는 조건은 하나뿐이다: **같은 판정창 안에서 wide가 lane-매칭
normal보다 이른 tick에 있을 때.** 구 규칙은 분리 풀에서 `bestNormal ?? bestWide`로
normal을 집고, 새 규칙은 earliest-tick으로 wide를 집는다. 그런데 여섯 fixture를
통틀어 wide는 `holdOverlap` tick 1920의 **하나뿐이고, 그것이 그 fixture의 가장 늦은
노트다** — 뒤에 오는 normal이 없다.

같은 tick에서는 두 규칙이 일치한다. 구 규칙의 normal 우선과 새 규칙의 `same-tick
normal 우선`이 같은 답을 내기 때문이다. `holdOverlap` tick 1920에서 key 1·3·5가
wide를 집는 것도 분리 풀의 귀결이 아니라 **lane 불일치**의 귀결이다 — 그 tick의
normal은 lane 2와 lane 4뿐이라 lane 1·3 키의 후보가 되지 못한다. 새 규칙에서도
같은 답이 나온다.

따라서 D-2026-024가 `[번복]`한 후보 순서 규칙 전체가 **골든 검증 밖**에 있다.
`core-judge.test.ts`의 §1 스펙 테스트가 유일한 판정자다 — 이른 wide 대 늦은
normal, same-tick normal 우선, hold 우선, 이른 tail 우선을 각각 건다.

> 골든 표에 `noteChannel`·`noteIsWide`를 남기는 결정 자체는 유효하다. 지금은
> 목격하지 못하지만, 원본 fixture에 늦은 normal이 추가되는 순간 이 두 필드가
> 없으면 "어느 쪽을 골랐는가"가 표에서 사라진다.

---

### tail release 임계는 어긋남이 아니다 — 오독이었다 (D-2026-039)

M1-5에서 원본 keyup 경로를 처음 직접 읽었다. `play-input.js`가 쓰는 임계는
`tailMs − JUDGE_GOOD − LN_RELEASE_GRACE_MS` = **150ms**이고,
`LN_RELEASE_GRACE_MS`(50)는 관용 폭 전체가 아니라 GOOD 창 위의 추가분이었다
([[EXTRACTED_FACTS]] §8.1).

D-2026-024가 상수 파일만 읽고 임계를 50으로 적어, 관용 폭이 원본의 1/3로 좁아진 채
스펙에 남아 있었다. **이 자리는 대장에 오르지 않는다** — 원본과 같은 150으로 정정했으므로
어긋남이 아니다. 여기 적는 이유는 골든이 keyup 경로를 뽑지 않아 이런 좁힘이 자동으로는
영원히 드러나지 않기 때문이다. `core-judge.test.ts`가 임계 = `WINDOW_GOOD_MS +
HOLD_RELEASE_GRACE_MS`를 직접 건다.

---

## 6. settings

골든 표 `constants.json`이 원본 `settings.js`의 `DEFAULT_SETTINGS`를 통째로 담는다.
기본값은 대부분 `[보존]`이고 어긋나는 자리는 하나뿐이다. 병합 규칙은 원본에
대응 코드가 있으나 골든이 동작으로 뽑지 않았다.

| ID | 자리 | 원본 | 재설계 | 관계 | 근거 |
|---|---|---|---|---|---|
| ST-1 | `volMusic` 기본값 | `0.7` | `1.0` — 음악은 감쇠 없이 출발하고 크기는 master로 잡는다 | **어긋남** | `settings` §4 |
| ST-2 | 알 수 없는 키 | `{...DEFAULT, ...saved}` — 그대로 남는다 | 버린다. 폐기된 설정이 저장본에 살아남지 않는다 | 미커버 | `settings` §4 |
| ST-3 | 허용 밖 값 | 검사 없이 통과 | 필드 단위로 기본값 복귀, 객체 전체는 유지 | 미커버 | `settings` §4 |
| ST-4 | `cmod` | 기본값에 있음 | 폐기 — 기본값에 없다 | **어긋남** | `settings` §2 |
| ST-5 | 키 배치의 거처 | `PS`(런타임 상태) — settings 객체 밖 | settings 영속 필드 `keyBindings`. rebinding이 영속하고 병합 검사를 받는다 | 미커버 | `settings` §4 |

`sudden`의 허용 범위 `0~90`은 대장에 오르지 않는다 — 원본 값을 그대로 명문화한
것이라 차이가 아니다. 스펙에 없던 것을 채운 것은 **누락 보완**이지 어긋남이 아니다.

---

## 7. 미커버 항목 — 스펙 테스트가 있어야 하는 자리

위 표에서 `미커버`로 표시된 것을 모은다. **여기가 재설계의 실체다** — 원본에
대조할 것이 없거나 골든이 닿지 않아, 오직 스펙만이 옳고 그름을 말한다.

| ID | 무엇을 | 어느 step에서 |
|---|---|---|
| DM-1·DM-2 | chart가 canonical 저장 단위, metadata·timing·asset 소유 | M1-2 |
| DM-4 | lane 데이터 무구속 | M1-2 |
| DM-5 | 검증 2층 (structural 거부 / domain 보고) | M1-2 |
| ST-2·ST-3 | settings 병합 — 알 수 없는 키 폐기, 필드 단위 되돌림 | M1-2 |
| ST-5 | 키 배치가 settings 영속 필드 | M1-2 |
| TM-1~4 | 곡 끝 4값 (`chartEndMs`·`musicEndMs`·`contentEndMs`·`songEndMs`) | M1-3 |
| TM-6 | `gridDivisor`와 `laneGridDivisor` 분리 | M1-3 |
| TM-7 | `sub` 분할이 `gridDivisor`를 탄다 | M1-3 |
| TM-9 | grid line 기술자 (px 없음, 박 단위 간격) | M1-3 |
| TM-10 | `measureToTick` 마디 0 왕복 | M1-3 |
| JD-8 | visualOffset = 입력 타임스탬프 보정 | M1-4 |
| JD-1 | 후보 순서 단일 풀 (골든이 갈리는 케이스 0건) | M1-4 |
| JD-3·JD-4 | judge 관심사 분리 (이펙트·overlap 검출이 judge 밖) | M1-4 |
| GA-2·GA-5 | Hold head MISS 2단위, 판정 단위 회계 통일 (`core-judge.test.ts` §8) | M1-5 |
| JD-2 | key-demand Hold 모델 (`core-judge.test.ts` §5·§6) | M1-5 |
| JD-6 | tail 자동완료·반개구간·같은 tick 순서 (`core-judge.test.ts` §7) | M1-5 |
| JD-7 | mid-start 시드·anchor, Resume 비-재시드 (`core-judge.test.ts` §9·§10) | M1-6 |
| GA-3 | state `P→F` 흡수와 best 순위 | M1-7 |
| GA-4 | cascade 병렬 평가 (`gauge` §4 시나리오 6종) | M1-7 |
| GA-6·GA-7 | state 산출 표와 score·accuracy·rank 산식 (`core-gauge.test.ts`) | M1-7 |
| GA-8 | `as` 모드 terminate | M1-7 |
| DM-3 | lane 2·3 3겹 이상 conflict 검출 (`core-overlap.test.ts` §3) | M1-8 |
| DM-6 | conflict가 세부 분류를 덮는 우선순위 (`core-overlap.test.ts` §5) | M1-8 |
| JD-5 | global 6키 conflict (같은 검사 지점, `core-overlap.test.ts` §4) | M1-8 |
| TM-5 | Resume leadIn 미적용 | M2-5 |
| SH-3 | 모르는 easing 폴백 보고 (`core-validate.test.ts`) | M1-9 |
| SH-4 | symmetry 축 동적 스냅샷 | M5-4 |

**27행이다**(ID로는 35건). M1의 9개 step 중 8개가 스펙 테스트를 요구한다 — 골든만으로 통과할
수 있는 step은 거의 없다.

DM-3은 M1-8에서 `overlap.json`이 생기며 `미커버` → `어긋남`이 됐다. 위 표에 남는 이유는
관계가 바뀌어도 **의도한 차이라는 사실**은 그대로이기 때문이다 — 롤업은 담당 step의
소재를 가리키고, 검증 방식은 관계 칸이 갖는다.

JD-5(global 6키)는 원래 M1-6에 있었으나 M1-8로 옮겼다(D-2026-040). global 부등식은
별도 패스가 아니라 DM-3과 **같은 검사 지점 위에서** 풀별 활성 수를 합산한 것이고, 검출은
judge 밖(`data-model` §5.1)이라 judge step에 둘 자리가 없었다. TM-5(Resume leadIn
미적용)는 core에 확인할 대상이 없어 — `leadIn`은 상수 하나이고 "Resume에 적용하지
않는다"는 play loop의 성질이다 — 배선이 서는 M2-5로 옮겼다.

---

## 8. M2 이후

`render`·`scene`·`persistence`·`.cfx`·`editor` 영역의 차이는 여기 행으로 담지
않는다(§0 범위). 대조할 골든 표가 없고, 원본에 대응물이 없거나 브라우저 앱
형태로만 존재해 자동 대조가 성립하지 않는다.

전수 대조 결과 그 영역의 `[수정]`/`[번복]`은 다음과 같이 분포한다:

| 문서 | 수정 | 번복 |
|---|---|---|
| `song-select` | 10 | 0 |
| `editor-editing` | 5 | 6 |
| `persistence` | 1 | 12 |
| `cfx` | 0 | 12 |
| `editor-graph` | 1 | 8 |
| `records` | 0 | 5 |
| `scene` | 3 | 1 |

`song-select`의 10건이 전부 `[수정]`이고 `[번복]`이 0인 것은 이 화면이 사실상
신규 설계이기 때문이다(원본에 곡 선택 화면이 없다). 반대로 `cfx`·`persistence`의
`[번복]`이 많은 것은 데이터 소유 구조를 chart 중심으로 뒤집은 여파다.

각 milestone의 **수동 대조 시나리오**를 작성할 때 해당 절을 이 대장에 추가한다.

---

## 9. 유지

- 새 차이가 나면 여기에 한 줄 추가한다. 등재 없이는 테스트가 통과하지 않는다.
- 골든 표를 재생성해도 이 문서는 자동으로 갱신되지 않는다 — 원본이 바뀌어
  차이가 사라지거나 새로 생기면 사람이 반영한다.
- `[수정]`/`[번복]` 태그가 스펙 문서에 추가되면 여기에도 대응 행이 있어야 한다.
  둘의 개수가 어긋나면 어느 한쪽이 빠진 것이다.
