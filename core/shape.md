# shape — 플레이필드 바깥 경계 변형

> 플레이필드의 두 바깥 경계(Blue·Red)를 시간에 따라 움직여 곡률을 만든다. Conflux의 핵심 메커니즘. 순수 시각이며 판정과 무관.
> 안쪽 구분선(1·2·3)은 → [[lane-events]]. shape와 동형(선택자만 다름).
> 근거·결정 배경은 → [[rationale#shape 설계 근거]]
> 태그: 구조 `[보존]` / 좌표계 외부단위 통일 `[수정]` / init 대칭 `[수정]` / Arc 입력모드 `[수정]`

---

## 1. 개념

```
Blue │ 1 │ 2 │ 3 │ Red
(shape)              (shape)
```

- **Blue / Red** = 두 바깥 경계. 각각 독립된 시간축 체인.
- 경계가 움직이면 플레이필드 전체가 휘어 보인다. 입력·판정에는 영향 없다 (노트는 자기 lane 키로 친다).
- **`isBlue`는 방향이 아니라 체인 식별자다.** Blue·Red는 두 체인의 이름일 뿐, 어느 쪽이 시각적으로 왼쪽인지는 tick마다 다를 수 있다 — 두 경계는 교차할 수 있다. 순서 구속이 없다.

---

## 2. 데이터 모델

```
shapeEvent = {
  startTick,
  duration,    // duration 공통 규칙: 0=step 점프, >0=easing 보간
  isBlue,      // true=Blue 체인, false=Red 체인 (식별자, 방향 아님)
  targetPos,   // 도달 위치 (외부단위 -8~+8, 0.25 스텝)
  easing,      // Linear / In-Sine / Out-Sine (null=anchor, 보간 안 함 — §4)
}
```

`chart.shapeEvents` = 이 객체들의 배열.

laneEvent와 동형이다. 차이는 선택자(`isBlue` ↔ `lineNum`)와 좌표계(shape 외부단위 -8~+8 ↔ lane 상대 0~1)뿐. 평가·캐시·편집 도구를 공유한다. 하나의 객체로 병합하지는 않는다(좌표계가 다름).

---

## 3. 좌표계 — 외부단위 단일 (-8~+8)

`targetPos`는 외부단위 -8~+8. 저장·표시·입력이 모두 같은 단위다(변환 없음). 스냅·clamp도 이 단위에서 한다.

- **clamp**: [-8, +8]. 범위 밖 입력은 잘린다.
- **스냅 단계**: 외부단위 `[1, 0.5, 0.25]` 3단계. 최소 0.25.
- **render 변환**: 화면 px는 render가 경계를 폭에 매핑해 칠한다(`shapePosToField`). shape는 위치값까지만 관할.

> 저장을 외부단위로 통일. 표시·입력과 저장 단위가 일치해 변환 로직이 사라진다. (구 코드는 내부 0~64 저장 + `posToExt = 내부/4−8` 표시 변환 + `sp2f = 내부/64` render 변환을 거쳤다. 외부단위 통일로 `shapePosToField`는 외부단위 → 필드좌표 매핑 하나만 남는다.)

---

## 4. chain 평가 (Core) — `shapeGeometryAt(tick)`

> **이 절이 chain 평가의 단일 출처다.** laneEvents도 같은 알고리즘을 쓰며(선택자·좌표계만 다름) → [[lane-events]]는 이 절을 참조한다.

### 이벤트는 한 종류, easing이 동작을 가른다

`shapeEvent`는 한 종류의 객체다(§2). 동작은 `easing` 값으로 갈린다:

- **`easing === null`** = **anchor**. 체인의 **시작값** 하나다. `targetPos`만 쓰고 `startTick`도 `duration`도 보지 않는다 — 그래서 시작값은 곡 시작 전(음수 tick)에도 유효하고, pre-roll 구간의 모양이 tick 0에서 튀지 않는다.
  - anchor를 `init`이라 부른다(호칭일 뿐 별도 타입이 아니다).
  - **체인당 anchor는 하나다.** 둘 이상이면 **가장 이른 `startTick`**의 것이 시작값이 되고 나머지는 화면에 아무 흔적을 남기지 않는다 — 조용히 사라지는 데이터이므로 domain 검증이 보고한다([[data-model]] §11). 원본은 배열에 먼저 적힌 것을 골랐다 `[수정]`(설계 대장 SH-6).
  - anchor는 **체인 한가운데에서 값을 다시 세우지 않는다.** 중간 anchor는 아무 일도 하지 않는다 `[보존]`.
- **`easing !== null`** = **보간 이벤트**. 직전값(from)에서 자기 `targetPos`(to)까지 `duration` 동안 `easing` 곡선으로 흐른다. from은 자기가 들지 않고 직전 문맥에서 상속한다.

### 평가 절차

Blue·Red 두 체인을 각각 독립 평가한다.

```
shapeGeometryAt(tick) → { blue, red }
```

각 체인:
1. **초기값** = 그 체인 anchor의 `targetPos`. anchor가 없으면 init fallback.
2. 보간 이벤트(`easing !== null`)들을 **`startTick` 오름차순**으로 정렬. `startTick`이 같으면 **`duration === 0`이 먼저** 선다 `[보존]`.
3. 순회하며:
   - `tick < startTick` → 현재값 유지하고 **종료**.
   - `duration === 0` → 즉시 목표값으로 점프하고 **계속 순회**. *(에디터 입력 라벨 "Step", §5)*
   - `tick >= startTick + duration` (이미 끝남) → 목표값 확정, 다음으로.
   - 진행 중 → 목표값까지 곡선을 타고 **종료**. `t = (tick − startTick) / duration`, [0,1] clamp.

- shape가 없어도 동작한다. 보간 이벤트가 없으면 anchor(또는 fallback) 값으로 고정.

> **같은 tick 순서가 값을 바꾼다.** tick T에 `duration 0 → 32`와 `duration T → 64`가 함께 있으면, 즉시 점프가 먼저여야 보간이 32에서 출발한다(T+T/2에서 48). 순서를 정하지 않으면 정렬이 배열 순서에 기대게 되어 같은 chart가 다른 모양을 낸다.
>
> **진행 중인 이벤트를 만나면 거기서 끝낸다.** 이벤트가 겹쳐 있으면 바깥 것이 끝날 때까지 안쪽 것이 값을 내지 못하고, 바깥이 끝난 뒤 안쪽 목표값으로 되돌아간다 `[보존]`.

### init fallback

체인에 anchor가 하나도 없을 때만 쓰는 기본 기하. 대칭:

```
Blue = -2,  Red = +2   (폭 4, 중앙 0 대칭)
```

> 차트엔 보통 첫 이벤트로 init(첫 anchor)을 둔다. fallback은 그게 없을 때의 안전값. 구 코드는 비대칭(Blue 0 / Red +2)이었으나 대칭으로 수정.

---

## 5. easing

저장되는 easing은 **3종 + null**.

| easing | 공식 (`e`, t∈[0,1]) |
|---|---|
| `Linear` | `t` |
| `In-Sine` | `1 − cos(t·π/2)` |
| `Out-Sine` | `sin(t·π/2)` |
| `null` | (보간 안 함 — anchor, §4. duration 무시) |

보간: `결과 = from + (to − from) · e`.

**목록 밖 easing은 `Linear`로 흐른다** `[보존]`. 원본도 그렇다. 다만 원본은 그것으로 끝이고, 여기서는 domain 검증이 같은 값을 **보고**한다 `[수정]` — 모양은 같되 "이 이벤트의 easing이 이상하다"가 뜬다. 거부하지 않는 것은 편집 중 chart가 잠깐 domain-invalid하기 때문이다([[data-model]] §11). 설계 대장 SH-3.

> 원본 `ease()`에는 네 번째 가지 `Arc`(`sin(t·π)` — 올라갔다 제자리로 돌아옴)가 있지만, 저장 경로가 전부 아래 `resolveArcEasing`을 거치므로 실제 차트에 남지 않는다(실측). 재설계는 그 사실을 타입으로 굳혀 가지 자체를 두지 않는다 — 설계 대장 SH-5(`없음`).

### Step — 입력 라벨 (저장값 아님)

`Step`은 별도 easing 값이 아니다. **에디터 입력 라벨**일 뿐이다. 사용자가 "즉시 점프"를 찍으면 에디터는 `Step`으로 보여주되, 저장은 `{easing: 'Linear', duration: 0}`으로 한다. 평가는 §4대로 `duration === 0`을 점프로 처리하므로 결과가 같다.

> 구 코드엔 `easing: 'Step'`이 따로 있었으나 폐기됐고, zero-duration Linear가 그 자리를 대신한다(실측: shape.js 주석 "Step easing removed, duration=0 covers it"). 데이터는 3종 + null로 깨끗하게 두고, "Step"은 저장 안 되는 입력 호칭으로만 둔다 — Arc와 같은 패턴.

### Arc — 입력 모드 (저장값 아님)

`Arc`도 데이터에 저장되지 않는다. 에디터에서 편하게 찍기 위한 입력 모드다. 'Arc'로 이벤트를 찍으면 직전 동색 보간 이벤트를 보고 **Out-Sine / In-Sine 중 하나를 골라 그 결과를 저장**한다(교번). 'Arc' 문자열은 차트에 남지 않는다.

선택 규칙 (`resolveArcEasing`):
- 직전 동색 보간 이벤트 = `dest(= startTick + duration)`가 `tick`보다 작은 것 중 dest 최대.
- 직전이 없거나 / Linear / duration=0(Step) / In-Sine → **Out-Sine**.
- 직전이 Out-Sine → **In-Sine**.

→ Out→In→Out… 교번이 "Arc"가 만드는 무늬다. 평가기(§4 `ease`)는 3종만 처리하면 된다.

> **저장 안 되는 입력 호칭 정리**: `Step`(=Linear+duration0)·`Arc`(=교번 Sine)는 에디터 라벨이고, 저장값은 늘 `Linear`/`In-Sine`/`Out-Sine`/`null` 넷뿐이다. laneEvents도 동일하다 (easing·Step·Arc 입력모드 100% 공유).

---

## 6. 편집 (Editor)

shape 탭에서 두 체인(Blue·Red)을 raw로 보여주고 직접 편집한다. lane-events와 같은 타임라인·드래그·easing을 공유하고 선택자(isBlue)만 다르다.

- **스냅**: 시간축은 노트 분박 그리드 공유([[glossary]] `gridDivisor`). 위치축은 §3 스냅(0.25/0.5/1).
- **symmetry**: 대칭축 기준으로 반대편 이벤트를 생성: `targetPos′ = 2×축 − targetPos`, `isBlue → !isBlue`. **축 기본값 = 배치 지점에서 grid 스냅 기준 가장 가까운 tick 시점의 체인 평균 위치**(Blue·Red 평균 = shape 중심), 드래그로 −8~+8 조절(§3 위치 스냅 단계 공유). (`[번복]`: 이전 "기본 0 고정"을 되돌림 — 구 코드의 동적 중심 실측 계승, → [[rationale#symmetry 축 기본값을 동적 스냅샷으로 되돌린 이유]].) 입력 UI(S 토글)는 [[editor-editing]] §3. 선택물 제자리 mirror(축 0 고정)는 별개 기능 → [[editor-editing]] §4.
- **init 이동**: init 위치(기본 -2/+2)도 차트별로 옮길 수 있다.

판정 코어는 shape를 모른다. shape를 아는 건 render와 editor뿐.

---

## 7. 렌더 경계 케이스

- **`Blue == Red` (폭 0)**: 두 경계가 한 점으로 모이면 하나의 선으로 수렴한다. 안쪽 구분선 1·2·3도 그 점에 모인다 → [[lane-events]] 동일 규칙.
- **교차 (`Blue`와 `Red` 위치 역전)**: 허용된다. isBlue가 식별자일 뿐이므로 시각적 좌우가 바뀌어도 정상. render는 두 색을 위치 순서와 무관하게 칠한다.

---

## 8. 결정 완료 / 잔여

확정:
- [x] 좌표계 외부단위 -8~+8 단일 (저장=표시=입력)
- [x] init fallback 대칭 -2/+2
- [x] easing 저장 3종(Linear/In-Sine/Out-Sine) + null
- [x] Arc = 입력 모드(교번 저장), 데이터에 안 남음
- [x] isBlue = 체인 식별자, 순서·교차 자유
- [x] lane-events와 easing·Arc 동일
- [x] chain 평가 단일 출처를 §4로 확정 (이벤트 1종, easing null=anchor / 첫 anchor=init 호칭, lane은 이 절 참조)
- [x] anchor = 체인의 시작값 하나. tick을 보지 않고, 중간 anchor는 무일, 여럿이면 가장 이른 tick (D-2026-043)
- [x] 같은 tick 정렬 = `duration 0` 먼저. 진행 중 이벤트에서 순회 종료 (D-2026-043)
- [x] 목록 밖 easing = Linear로 흐르되 domain 검증이 보고 (D-2026-043)
- [x] Step = 저장 안 되는 입력 라벨(=Linear+duration0). 데이터 easing은 3종+null 유지
- [x] symmetry 축: 스냅 tick 시점 체인 평균 기본값 + 드래그 −8~+8 조절 ([번복]: 기본 0 고정 폐기)
- [x] shape/lane 배치 툴·편집 인터랙션 → [[editor-editing]] §2 확정 (구 L/R/C/P = 현 Q/W/E/R)

잔여:
- (없음)

확정(추가):
- [x] render 폭 매핑·선 굵기 구체 수치 — `_extracted/EXTRACTED_FACTS.md` §12.3·§12.4 (M2-2 gate 실측, D-2026-046)
- [x] normalize 등 원본 shape 보조 툴의 계승 여부 — **닫힘**(D-2026-099): 원본에 "normalize"라는 이름의 사용자 노출 툴/버튼은 없다 — 유일한 "normalize"는 `shape.js`의 `normalizeShapeChain()`, 매 편집 커맨드 apply/undo마다 자동으로 도는 내부 배열 정합화 함수였다. 이건 `editor-commands.md` §6이 이미 "chain normalize"로 확정해 둔 요구사항이라 별도 계승 여부 결정 대상이 아니었다 — `edit-shape-commands.ts`가 구현했다. 근거 `_extracted/EXTRACTED_FACTS.md` §15.
