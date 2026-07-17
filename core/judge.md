# judge — 입력 판정 / 노트 매칭

> 키 입력을 어느 노트에 매칭하고 어떤 judgment를 주는가. 리듬게임의 핵심 로직.
> 출처: `play-judgment.js` 정밀 추출. 대부분 `[보존]` (틀리면 회귀), 일부 우리 결정 `[수정]`.
> 용어: [[glossary]] / 근거: [[rationale]]

---

## 1. 핵심 원칙 — normal과 wide는 별도 풀로 탐색

한 번의 키 입력에 대해 후보를 **두 풀로 나눠** 찾는다. 한 풀에 섞으면 안 된다.

- **normal 노트**: 자기 lane의 키로만 칠 수 있다.
- **wide 노트**: 아무 키로나 칠 수 있다.

wide와 normal이 같은 타이밍에 겹칠 때, lane 키는 **normal을 먼저** 가져가야 한다(normal은 그 키로만 칠 수 있으므로). 다른 키가 wide를 처리한다. **한 풀로 섞으면** wide가 먼저 선택되어 normal이 MISS로 버려지는 "입력 잡아먹힘(input eaten)" 버그가 난다. `[보존]`

```
best = bestNormal ?? bestWide      // normal이 타이브레이크에서 이긴다
```

---

## 2. 후보 선택 — earliest-tick

각 풀 안에서 판정창에 든 노트가 여럿이면, **절대 거리가 가장 가까운 게 아니라 `startTick`이 가장 작은(가장 오래된)** 노트를 집는다. 살짝 이른 입력이 오래된 미처리 노트를 건너뛰고 더 가까운 나중 노트를 훔치지 못하게. `[보존]`

---

## 3. 판정창 (window)

`diff = curMs − tickToMs(note.startTick) − visualOffset` (부호 있음), `abs = |diff|`

`visualOffset`은 플레이어 판정 시각 보정([[settings]] PLAY). `[보존]` — 구 코드는 press·release의 입력 타임스탬프(`curMs`)에서 차감하며, diff 공식에서 빼는 것과 동치라 배선 지점은 구현 자유. (`[번복]`: 이전 "미배선 → [수정]" 서술은 실측 오류 → [[rationale#visualOffset 미배선 서술을 번복한 이유]].)

| | 후보 자격 | judgment |
|---|---|---|
| normal | `abs ≤ WINDOW_GOOD_MS(100)` | `abs≤25 SYNC / ≤50 PERFECT / ≤100 GOOD` |
| wide | `abs ≤ WINDOW_WIDE_SYNC_MS(100)` | 항상 `SYNC` |

`[보존]` (창 수치 단일 출처 [[constants]] §1.)

---

## 4. 후보에서 제외되는 노트

탐색 루프에서 다음은 건너뛴다:

- 이미 hit 했거나(`hits`에 있음) 이미 miss 처리된 노트. `[보존]`
- **held-wide 제외**: 다른 키가 이미 지속 중인 wide 노트는 head로 재판정하지 않는다(콤보·점수 이중 카운트 방지). `[보존]`
- **lane 불일치**: normal은 노트의 (미러 매핑된) lane이 입력 lane과 다르면 제외. `[보존]`
  - 미러가 켜져 있으면 `laneMap[note.lane]`을, 아니면 `note.lane`을 기준으로 비교. 화면에서 미러된 노트와 시각적으로 정렬되는 키가 그 노트를 친다.
  - **laneMap 매핑 규칙** `[보존]`: `1↔4, 2↔3` 교환(고정). **wide는 map을 무시**한다(아무 키로 치므로). 미러는 shape 렌더도 좌우 반전하지만 그건 render 소관 — judge는 입력 매핑만 안다. mirror 옵션 소속은 [[settings]] §2.

---

## 5. 판정 확정 (commitJudgment)

후보가 정해지면:

1. judgment 종류 계산 (§3). wide면 무조건 SYNC. (tail은 §6.)
2. `hits`에 기록: `{headHit, headDiff, headType, headMs, isLN, tailDone(=tap이면 true), tailFailed:false, tailMs}`.
3. `combo++`, `maxCombo` 갱신.
4. judgment를 큐에 push (표시용).
5. **게이지 반영**: `applyGaugeChange(judgment)`(4종 — tail도 SYNC/MISS로 들어온다, §6)가 terminate를 유발하면 `forceEnded` 플래그만 세운다. 실제 강제 종료는 play loop가 단일 지점에서 수행 — 모든 판정 경로가 한 곳으로 모이게.
6. **Fast/Slow**: normal head만, SYNC·MISS·wide·autoplay 제외하고 `feedFastSlow(diff, ...)` 호출. `[보존]` (diff<0 FAST / >0 SLOW. 두 층위 — 순간 깜빡 `flashTiming` + 누적 `fastCount`/`slowCount`. 정의·층위·result 표시는 단일 출처 → [[glossary]] `FAST`/`SLOW`.)
7. hit 이펙트 push (위치·색). **above/below(overlap 시각 분리)는 싣지 않는다** — render 소관. `[수정]`

`[보존]` (단 TAIL은 §6, overlap 분리는 §8에서 수정)

> **구 코드 [수정]**: 원래 commitJudgment가 같은 tick·lane에 이펙트가 있는지 검사해 `above=false`로 갈라 이펙트에 실어보냈다. 이는 judge가 렌더 관심사를 침범한 설계 미스다. 재구현에서 제거하고, 겹침 검출은 domain(`noteOverlapMap`), 시각 분리는 render가 맡는다(§8).

---

## 6. hold tail 처리

- **tail 성공** (`commitTailRelease`): hold를 끝까지 눌렀다. `tailDone=true`, `combo++`, 게이지 반영. 판정은 **SYNC로 통합** — 게이지도 SYNC 델타 그대로. `[수정]` (구 TAIL_OK 폐기, hard 특례 +0.1 → +0.15)
- **중간 릴리즈** (`commitMidRelease`): head는 쳤으나 tail 전에 놓음. `tailDone=true, tailFailed=true`, `combo=0`, 판정은 **MISS로 통합** — 게이지도 MISS 델타 그대로. `[수정]` (구 TAIL_MISS 폐기, hard 특례 −2.5 → −5.0)

> 구 코드의 TAIL_OK/TAIL_MISS를 없애고 SYNC/MISS로 합쳤다 — 표시·카운트·terminate 판정뿐 아니라 **게이지 델타까지**(구 게이지 피드 `gaugeOnJudgment`는 6종 kind를 받았다). 함수(commitTailRelease/commitMidRelease)는 남되 별도 judgment kind를 만들지 않는다. "끝까지 누르면 SYNC, 중간에 떼면 MISS" 한 문장이 모든 층위를 관통한다. 수치 변화는 [[constants]] §2, 근거 → [[rationale#hold tail의 게이지 특례를 폐기한 이유]].

### 키 추적과 hold 이양 `[보존]`

hold는 **키 단위**로 추적한다: `holds[key] = note`(구 `playHoldState`), 눌린 키 집합은 `keysHeld`(구 `playKeyHeld`) — 이름 대응 [[naming]] §4, playState 소속 [[data-model]] §9.

- **keydown**: 판정된 노트가 hold면 `holds[key]`에 건다. **판정 없는 눌림**이고 그 키가 빈손이면 진행 중 hold를 **상속**한다(크로스 바인딩 복구): wide hold는 아무 키에서, normal hold는 같은 lane 키에서만. 2키 lane에서 tap을 노린 손가락이 LN head를 가로챘을 때, 실제로 lane을 누르고 있는 손가락이 LN을 이어받아 lift가 MISS로 새지 않게 한다.
- **keyup — 이양**: 놓은 키에 hold가 걸려 있고 조건 맞는 다른 눌린 키가 빈손이면 그 키로 **이양**하고 분류를 유예한다(wide → 아무 키 / normal → 같은 lane 키만).
- **keyup — 분류**: 이양할 곳이 없으면 tail을 분류한다: `curMs < tailMs − WINDOW_GOOD_MS`면 **중간 릴리즈**, 아니면 **tail 성공**(위 두 항목). `[수정 — 구 임계는 tailMs − 100 − 50 (추가 유예 LN_RELEASE_GRACE_MS). GOOD이 콤보가 이어지는 최소 판정이므로 tail도 GOOD 창(±100ms)을 그대로 따른다 — 특례 상수 폐기]` keyup의 `curMs`도 §3과 **동일한 보정 시계**(visualOffset 차감)를 쓴다 `[보존]` — keydown만 보정하는 구현은 오류다. 근거 → [[rationale#tail 릴리즈 유예를 폐기한 이유]].

---

## 7. 중간 시작 시드 (seedPlayStateAt)

곡 중간부터 플레이를 **시작**할 때(editor test 등), `curMs` 이전의 모든 노트를 **SYNC로 autoplay된 것처럼** 시드한다. pause→Resume은 playState를 유지한 채 같은 지점에서 재개하므로 재시드하지 않는다([[scene]] §9) `[수정]`. AP/FC 유효성을 보존(과거 노트를 안 친 것으로 두면 FC가 깨지므로). hold는 tail까지 과거면 combo를 2 올린다. `[보존]`

---

## 8. 입력과 렌더의 분리 (핵심 원칙)

judge는 **입력→판정만** 한다. render는 **보여주기만** 한다. 각자 하는 일이 확실해야 한다.

- 판정·매칭은 전부 **lane(데이터) 기준**. shape·laneEvents의 시각 변형은 judge에 영향 없다. judge 코어는 shape/laneEvents를 import하지 않는다. `[보존 / 설계]`
- **overlap/conflict는 judge 밖.** `[수정]` 겹침 **검출**(어느 노트끼리 겹쳤나, overlap이냐 conflict냐)은 notes에서 계산되는 파생 속성(domain, `noteOverlapMap` → [[data-model]] §5.1)이다. render는 그 map을 받아 **표시**(above/below 쌓임, 노랑/빨강)만 입힌다. judge는 검출도 표시도 모르고, 이펙트에 above를 싣지 않는다.
- 이 분리가 깨지면(judge가 렌더를 알거나, 판정이 검출/표시를 하면) 설계 미스다. play-* 가 에디터에서 자라며 생긴 오염을 재구현에서 바로잡는다.

---

## 9. 결정 완료 / 미해결

확정:
- [x] overlap/conflict는 judge 밖 — 검출=domain(`noteOverlapMap`), 표시=render. judge는 above를 안 실음

확정 (추가):
- [x] 미러 laneMap 매핑 규칙 — §4 명문화 (`1↔4, 2↔3`, wide 제외) `[보존]`
- [x] hold 키 추적·이양·크로스 바인딩 복구 — §6 명문화 `[보존]`
- [x] autoplay 히트음 — AudioContext에 **lookahead 150ms** 사전 스케줄(이진 탐색으로 창 내 노트만 순회), autoJudge는 silent로 판정만 반영(이중 재생 방지). 오케스트레이션 귀속은 game `[보존]`
- [x] visualOffset 배선 `[번복]` — "미배선"은 실측 오류, 입력 타임스탬프 보정으로 이미 배선됨 → §3

미해결:
- [ ] playJudgQueue → 표시 레이어 연결 (render 쪽)
