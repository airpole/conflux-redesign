# laneEvents — 레인 구분선 변형

> shape가 플레이필드 바깥 경계(Blue·Red)를 움직이듯, laneEvents는 안쪽 구분선 3개를 움직인다. 순수 시각 연출, 판정과 무관.
> 근거·결정 배경은 → [[rationale#laneEvents 설계 근거]]
> 태그: 전체 `[신규]`
> 구 `lineEvents`(`lines:[25,25,25,25]` 4칸 폭 단일 덩어리)는 편집 UI·렌더·게임 적용이 모두 미구현이고 실데이터도 균등 init 1개뿐이었다 → 보존·마이그레이션 대상 아님. laneEvents는 균등 기본(`lineNum 1/2/3` = `targetPos 0.25/0.5/0.75`)에서 출발하는 백지 설계. behavior-preserving의 예외이며 근거는 이 [신규] 태그 자체. (실측 → [[EXTRACTED_FACTS]] §9)

---

## 1. 개념

```
Blue │ 1 │ 2 │ 3 │ Red
 (L1)  (L2) (L3) (L4)
```

- **Blue / Red** = 바깥 경계. `shape`가 관할.
- **1 / 2 / 3** = 안쪽 구분선. `laneEvents`가 관할.
- 구분선이 움직이면 레인 폭이 시각적으로 변한다. 입력·판정에는 영향 없다 (노트는 자기 lane 키로 친다).
- init: 1·2·3은 Blue~Red를 균등 분할 (상대 0.25 / 0.5 / 0.75).

---

## 2. 데이터 모델

```
laneEvent = {
  startTick,
  duration,    // duration 공통 규칙: 0=step 점프, >0=easing 보간
  lineNum,     // ∈ {1,2,3} — 어느 구분선
  targetPos,   // 0~1 상대비율 (0=Blue, 1=Red)
  easing,      // shape와 동일: Linear / In-Sine / Out-Sine (null=anchor, 보간 안 함). Step·Arc는 입력 라벨 → [[shape]] §5
}
```

`chart.laneEvents` = 이 객체들의 배열.

shape 이벤트와 동형이다. 차이는 선택자 하나뿐: shape는 `isBlue`, laneEvents는 `lineNum`. 평가·캐시·편집 도구를 공유한다.

---

## 3. 좌표계 — 상대 단일 (전체비율)

`targetPos`는 0~1 상대비율. 0 = 그 tick의 Blue 경계, 1 = Red 경계.

```
화면 위치 = lerp(blueAt(tick), redAt(tick), targetPos)
```

경계가 움직이면 구분선도 비율을 유지한 채 함께 스케일된다. 비율이라 경계를 넘지 않는다.

### 렌더 경계 케이스
- **최소 간격**: 구분선이 Blue/Red 경계나 다른 구분선과 같은 위치(`==`)가 되어도, 렌더는 최소 간격을 두어 완전히 겹쳐 그리지 않는다. 다닥다닥 붙되 분간은 되게(스케치 1→4 단계).
- **`Blue == Red` (레인 폭 0)**: 바깥 경계가 한 점으로 모이면 모든 선이 하나로 수렴한다. 이때는 **하나의 선만** 그리고 내부 구분선 1·2·3은 나타나지 않는다(최소 간격 규칙의 예외). 데이터(targetPos)는 그대로 유지되며 경계가 다시 벌어지면 복원된다.

---

## 4. 구속 (Constraint)

순서 불변: `Blue ≤ 1 ≤ 2 ≤ 3 ≤ Red`. 겹침(`==`) 허용, 역전 금지.

- **코어 (`laneLayoutAt`)**: 역전값이 들어와도 그냥 계산. 무결성 검증 없음.
- **에디터 입력 단계**: 드래그로 이웃을 넘기면 놓는 순간 직전 유효 상태로 롤백.

판정 코어는 laneEvents를 모른다. laneEvents를 아는 건 render와 editor뿐.

---

## 5. 편집 (Editor)

별도 탭이 아니다. 평소엔 shape 편집대로 동작하고, 필요할 때 구분선을 만져 laneEvent를 만든다. 같은 타임라인·드래그·easing을 공유하고 lineNum만 추가된다. easing은 shape와 100% 동일(저장 3종 + Arc 입력모드) → [[shape]] §5.

- **스냅 그리드**: 노트 분박 그리드 시스템을 공유한다([[glossary]] `gridDivisor`). 기본 32분, 드롭다운·직접 입력으로 임의 V 분할([[timing]] §6). 나누는 방식은 노트와 동일하고 적용 축(가로 위치)만 다르다. (데이터는 상대 소수, 입력만 격자에 붙음)
- **symmetry**: 대칭축은 **구분선 쌍(1-2 / 2-3 / 1-3) 중 선택**하고, 축 위치 = 그 쌍의 **init 위치 중점**(init을 옮겼으면 따라간다). 데칼코마니처럼 반대편에 대칭 이벤트를 생성한다: `targetPos′ = 2×축 − targetPos`, lineNum은 쌍의 반대편. 한 입력으로 대칭 다중 이벤트를 만들지만, 데이터 단위는 여전히 "구분선 하나당 이벤트 하나".
- **init 이동**: shape의 init점을 옮길 수 있는 것처럼, 구분선의 init 위치(기본 균등 0.25/0.5/0.75)도 차트별로 옮길 수 있다.

---

## 6. 평가 (Core)

**chain 평가 알고리즘은 [[shape]] §4가 단일 출처다.** laneEvents는 같은 알고리즘을 쓰고, 다른 점은 둘뿐이다:

- **선택자**: shape는 `isBlue`로 Blue·Red 두 체인, lane은 `lineNum`으로 구분선 1·2·3 세 체인을 가른다.
- **반환·좌표계**: `laneLayoutAt(tick)` → `{ line1, line2, line3 }` (각 0~1 상대). px 변환은 render가 경계와 lerp.

나머지(anchor=`easing===null`로 값 못박기 / 보간 이벤트 정렬·순회 / `duration===0` 점프 / easing 보간)는 shape §4와 동일하다. anchor가 없으면 init 균등(0.25/0.5/0.75) fallback.

---

## 7. 결정 완료 / 잔여

확정:
- [x] 스냅: gridDivisor 공유 — 기본 32분, 임의 V ([[timing]] §6)
- [x] easing: shape와 100% 동일(저장 3종 + Arc 입력모드)
- [x] symmetry: 쌍 선택(1-2/2-3/1-3), 축 = 쌍의 init 위치 중점
- [x] 절대 입력 보조: 1차 구현에 안 넣음
- [x] 최소 간격 렌더 + `Blue==Red`면 단일선·구분선 숨김
- [x] init 위치 차트별 이동 가능 (shape init처럼)

잔여:
- [ ] 최소 간격의 구체 px 값 (render/playfield 추출 시)
- [ ] init 이동의 편집 UI (shape init 편집과 동일 인터랙션 재사용 가정)
