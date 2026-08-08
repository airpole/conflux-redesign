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

---

## 1. timing

골든 198건은 전부 `[보존]` 영역이다(`t2ms`·`ms2t`·`getBPMAt`·`getTimeSig`·
`tickToMeasure`·`getMinTick`). 어긋나는 케이스가 없다.

| ID | 자리 | 원본 | 재설계 | 관계 | 근거 |
|---|---|---|---|---|---|
| TM-1 | 곡 끝 tail | 차트가 길면 `+4000ms`, 음악이 길면 `+2000ms` | `SONG_END_TAIL_MS = 3000` 단일 | 미커버 | D-2026-030 |
| TM-2 | `musicEndMs` | raw audio duration (offset 미보정) | `musicDurationMs − offset` | 미커버 | D-2026-030 |
| TM-3 | `chartEndMs` | note·textEvent·shapeEvent만 (`lineEvents` 누락) | 전 event 종류 | 미커버 | D-2026-030 |
| TM-4 | 5000ms 하한 | `totalMs`가 종료 판정과 seek 분모를 겸함 | 종료에서 제거, timeline 소관 | 미커버 | D-2026-030 |
| TM-5 | leadIn | 시작·Resume 구분 없음 | Resume은 leadIn 미적용 (되감기 없는 카운트다운 재개) | 미커버 | D-2026-022 |
| TM-6 | grid 분리 | note grid와 lane 수평 스냅이 같은 축 | `gridDivisor`와 `laneGridDivisor` 분리, 공유하지 않음 | 미커버 | `timing` §6 |

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
시나리오 6종이 기준이다.

---

## 3. shape

| ID | 자리 | 원본 | 재설계 | 관계 | 근거 |
|---|---|---|---|---|---|
| SH-1 | 좌표계 | 내부 0~64 저장 + `posToExt = 내부/4−8` 표시 변환 + `sp2f = 내부/64` render 변환 | 외부단위 -8~+8 단일 (저장=표시=입력) | **어긋남** | `shape` §3 |
| SH-2 | init fallback | 비대칭 (Blue 0 / Red +2) | 대칭 (-2 / +2) | **어긋남** | `shape` §4 |
| SH-3 | easing 종류 | `Linear` / `In` / `Out` / `InOut` 4종 | `Linear` / `In-Sine` / `Out-Sine` 3종 + `null`=anchor | **어긋남** | `shape` §2 |
| SH-4 | symmetry 축 기본값 | (한때 "기본 0 고정"으로 바꾸려다 `[번복]`) 동적 중심 | 스냅 tick 시점의 체인 평균 + 드래그 −8~+8 | 미커버 | `shape` §6 |

### 범위

- **SH-1**: `getShape`·`getLines`·`sp2f` 골든 값이 전부 구 좌표계 단위다.
  값 자체가 아니라 **단위가 다르다** — 재구현 값에 `내부 = (외부+8)×4`를 적용하면
  일치해야 한다. 변환이 성립하는지를 보는 것이 이 항목의 검증이다.
- **SH-2**: `getShapeInit` 1건.
- **SH-3**: `ease` 골든 28건 중 `InOut` 7건은 **대응물 없음**으로 떨어진다.
  `In`/`Out` 14건은 이름만 바뀌었으므로(`In-Sine`/`Out-Sine`) 매핑 후 값이
  일치해야 한다. `Linear` 7건은 `[보존]`.

---

## 4. data-model

골든 표가 없는 영역이지만 **core 계산이고 M1 범위**라 여기 담는다. 전부 스펙
테스트가 검증한다.

| ID | 자리 | 원본 | 재설계 | 관계 | 근거 |
|---|---|---|---|---|---|
| DM-1 | 저장 단위 | 전역 `D` 하나, song 단위 암묵 | 독립 chart가 canonical, song은 같은 `songId`의 파생 그룹 | 미커버 | `data-model` §1 |
| DM-2 | metadata·timing·asset 소유 | 전역에 흩어짐 | 전부 chart 소유 | 미커버 | `data-model` §2·§3 |
| DM-3 | overlap 검출 | 순회 기반 | sweep-line, 풀별 동시 활성 집합, O(n log n) | 미커버 | `data-model` §5.1 |
| DM-4 | lane 데이터 구속 | 저장 시점에 구속 | 데이터 무구속(`targetPos` 실수, 역전·초과 허용), 구속은 gameplay 투영이 담당 | 미커버 | `lane-events` |

---

## 5. judge

후보 순서가 D-2026-024에서 통째로 `[번복]`됐다. 골든 2,700건의 지위가
케이스마다 다르므로 용도를 가른다.

| ID | 자리 | 원본 | 재설계 | 관계 | 근거 |
|---|---|---|---|---|---|
| JD-1 | 후보 선택 | normal·wide **분리 풀**, 각 풀에서 earliest-tick | 단일 풀 — earliest-tick → same-tick normal 우선 → hold 우선 → 이른 tail 우선 | **어긋남** | D-2026-024 |
| JD-2 | Hold 소유 | key-owned (`holds` 맵) | key-demand — Normal 익명 수요, Wide 단일 소유·원자적 이양 | 미커버 | D-2026-024 |
| JD-3 | hit 이펙트 | `commitJudgment`가 `above/below`를 계산해 실어보냄 | judge는 싣지 않음, render 소관 | 없음 | `judge` §4 |
| JD-4 | overlap/conflict | judge 안 | domain 파생 속성(`noteOverlapMap`) | 없음 | `judge` §11 |
| JD-5 | global 6키 conflict | 없음 | 매 tick 물리 키 총수요 검사 | 없음 | D-2026-024 |
| JD-6 | Hold tail 처리 | tail 판정이 head와 별개 축 | tail 자동완료, `[head, tail)` 반개구간, 같은 tick이면 tail 먼저 | 미커버 | `judge` §7 |
| JD-7 | 중간 시작·Resume | crossing Hold 처리 미정의 | mid-start crossing-Hold 시드·anchor 규칙, Resume은 비-재시드 | 미커버 | `judge` §10 |
| JD-8 | visualOffset | 렌더 시점 보정 | 입력 타임스탬프 보정으로 배선 | 미커버 | `judge` §1 |

### JD-1의 범위 — 표를 어떻게 가르나

**후보 경합이 일어나는 케이스만** 어긋남으로 뺀다. 경합 = 같은 판정창 안에
후보가 둘 이상 있고, 그중 normal과 wide가 섞인 경우다.

해당 fixture는 `holdOverlap`·`sixKeySaturation` 둘뿐이다. 나머지 4개
fixture(`plain`·`multiBpm`·`multiTimeSig`·`negativeTick`)는 후보가 하나뿐이라
규칙이 바뀌어도 결과가 같다 — **판정창 경계·lane 매칭·mirror 검증에 그대로 쓴다.**

구 규칙의 실제 동작은 `holdOverlap` tick 1920(wide ch1 + normal ch4 공존)에서
드러난다:

```
key1 → ch1 wide      key2 → ch2 normal
key3 → ch1 wide      key4 → ch2 normal
key5 → ch1 wide      key6 → ch4 normal
```

키 3·5가 wide를 집는 것이 분리 풀의 귀결이다. 새 규칙에서는 same-tick normal이
우선하므로 이 자리의 답이 달라진다.

> 골든 표에 `noteChannel`·`noteIsWide`를 남기는 이유가 이것이다. 한때 표 크기를
> 줄이려고 뺐다가 되살렸다 — 두 노트의 `startTick`이 같아서, 이 두 필드가 없으면
> "어느 쪽을 골랐는가"가 표에서 사라지고 JD-1의 검증 지점이 통째로 증발한다.

---

## 6. 미커버 항목 — 스펙 테스트가 있어야 하는 자리

위 표에서 `미커버`로 표시된 것을 모은다. **여기가 재설계의 실체다** — 원본에
대조할 것이 없거나 골든이 닿지 않아, 오직 스펙만이 옳고 그름을 말한다.

| ID | 무엇을 | 어느 step에서 |
|---|---|---|
| DM-1·DM-2 | chart가 canonical 저장 단위, metadata·timing·asset 소유 | M1-2 |
| DM-4 | lane 데이터 무구속 | M1-2 |
| TM-1~4 | 곡 끝 4값 (`chartEndMs`·`musicEndMs`·`contentEndMs`·`songEndMs`) | M1-3 |
| TM-6 | `gridDivisor`와 `laneGridDivisor` 분리 | M1-3 |
| JD-8 | visualOffset = 입력 타임스탬프 보정 | M1-4 |
| JD-3·JD-4 | judge 관심사 분리 (이펙트·overlap 검출이 judge 밖) | M1-4 |
| GA-2·GA-5 | Hold head MISS 2단위, 판정 단위 회계 통일 | M1-5 |
| JD-2 | key-demand Hold 모델 | M1-5 |
| JD-6 | tail 자동완료·반개구간·같은 tick 순서 | M1-5 |
| TM-5 | Resume leadIn 미적용 | M1-6 |
| JD-7 | mid-start 시드·anchor, Resume 비-재시드 | M1-6 |
| JD-5 | global 6키 conflict | M1-6 |
| GA-3 | state `P→F` 흡수와 best 순위 | M1-7 |
| GA-4 | cascade 병렬 평가 (`gauge` §4 시나리오 6종) | M1-7 |
| DM-3 | sweep-line overlap/conflict 검출 | M1-8 |
| SH-4 | symmetry 축 동적 스냅샷 | M5-4 |

**16행이다.** M1의 9개 step 중 7개가 스펙 테스트를 요구한다 — 골든만으로 통과할
수 있는 step은 거의 없다.

---

## 7. M2 이후

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

## 8. 유지

- 새 차이가 나면 여기에 한 줄 추가한다. 등재 없이는 테스트가 통과하지 않는다.
- 골든 표를 재생성해도 이 문서는 자동으로 갱신되지 않는다 — 원본이 바뀌어
  차이가 사라지거나 새로 생기면 사람이 반영한다.
- `[수정]`/`[번복]` 태그가 스펙 문서에 추가되면 여기에도 대응 행이 있어야 한다.
  둘의 개수가 어긋나면 어느 한쪽이 빠진 것이다.
