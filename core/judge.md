# judge — 입력 판정 / 노트 매칭

> 키 입력을 어느 노트에 매칭하고 어떤 judgment를 주는가. 리듬게임의 핵심 로직.
> D-2026-024에서 key-owned Hold 모델을 key-demand 모델로 전면 재설계했다 `[번복]`.
> 출처: `play-judgment.js` 정밀 추출(§1~§4). 대부분 `[보존]`(틀리면 회귀), 일부 우리 결정 `[수정]`/`[번복]`.
> 용어: [[glossary]] / 근거: [[rationale]]

---

## 1. 핵심 원칙 — 결정론적 후보 순서 `[번복]`

한 번의 물리 keydown에 대해 판정창 안의 모든 미확정 후보를 모아 **하나의 순서**로 정확히 하나만 고른다. normal/wide를 별도 풀로 나눠 `bestNormal ?? bestWide`로 우선순위를 매기던 구 방식은 폐기한다.

```text
earliest startTick
→ 같은 startTick: normal이 wide보다 우선
→ 같은 풀·같은 startTick: hold가 tap보다 우선
→ 같은 startTick의 hold끼리: tail이 이른 쪽 우선
→ 판정에 관련된 속성이 모두 동일: 동등한 인스턴스 아무거나 소비
```

결론:

- 같은 ±100ms 창 안에서 **더 이른 wide가 더 늦은 normal을 이긴다** — startTick만으로 정렬하지, pool 우선순위로 정렬하지 않는다.
- normal과 wide의 head tick이 같으면 normal이 우선.
- 한 번의 keydown은 head를 **최대 하나만** 확정한다.
- 같은 tick의 normal + wide는 **서로 다른 두 번의 keydown**이 필요하다.
- lane 2·3의 hold+tap은 **두 물리 키 중 아무거나** 눌러둔 채로 성립한다(§5).
- 길이가 다른 같은 lane hold 둘도 **어느 손가락으로 짧은/긴 쪽을 놓아도** 성립한다.
- 판정에 필요한 속성이 완전히 같은 중복 노트는 서로 교환 가능하다 — **영속 note ID는 필요 없다.**

`visualOffset`은 플레이어 판정 시각 보정([[settings]] PLAY). 보정은 **judge 진입 경계에서 한 번만** 걸린다 `[번복]` — 바깥이 주는 raw 시각을 `toJudgeMs(rawMs, visualOffset)`로 바꾸고, 그 뒤 judge 내부의 모든 `nowMs`는 이미 보정된 값이다. 내부 함수는 `visualOffset`을 인자로 받지 않는다.

그래서 keydown과 keyup/tail 분류가 **같은 보정 시계**를 쓴다는 요구가 규율이 아니라 **호출 구조**가 된다 — 보정이 두 번 걸리거나 한쪽만 걸릴 자리가 없다. keydown만 보정하는 구현은 오류이며, 이 배선에서는 그것이 표현 불가능하다.

---

## 2. 판정창 (window)

`diff = nowMs − tickToMs(note.startTick)` (부호 있음), `abs = |diff|`

`nowMs`는 §1의 경계에서 이미 `visualOffset` 보정을 마친 시각이다 — 이 수식에서 다시 빼지 않는다.

| | 후보 자격 | judgment |
|---|---|---|
| normal | `abs ≤ WINDOW_GOOD_MS(100)` | `abs≤25 SYNC / ≤50 PERFECT / ≤100 GOOD` |
| wide | `abs ≤ WINDOW_WIDE_SYNC_MS(100)` | 항상 `SYNC` |

`[보존]` (창 수치 단일 출처 [[constants]] §1.)

- 경계는 포함이다(`abs == 100`이면 유효 후보). head는 `nowMs`가 마지막 유효 시각을 **지나야만** 만료된다.
- 만료된 head는 즉시 MISS로 처리한다 — tap 1단위, hold head는 2단위(§8).

---

## 3. lane 매칭·미러 (후보에서 제외되는 노트)

입력 key를 lane으로 바꾸는 `laneOf(key)`의 단일 출처는 [[settings]] §2의 `DEFAULT_LANE_KEYS` 표다. judge는 그 매핑을 읽기만 한다.

탐색에서 다음은 건너뛴다:

- 이미 hit 했거나 이미 miss 처리된 노트.
- **lane 불일치**: normal은 노트의 (미러 매핑된) lane이 입력 lane과 다르면 제외.
  - 미러가 켜져 있으면 `laneMap[note.lane]`을, 아니면 `note.lane`을 기준으로 비교. 화면에서 미러된 노트와 시각적으로 정렬되는 키가 그 노트를 친다.
  - **laneMap 매핑 규칙** `[보존]`: `1↔4, 2↔3` 교환(고정). **wide는 map을 무시**한다(아무 키로 치므로). 미러는 shape 렌더도 좌우 반전하지만 그건 render 소관 — judge는 입력 매핑만 안다. mirror 옵션 소속은 [[settings]] §2.
- 이미 활성 Hold(§5)로 등록된 노트는 head 후보 풀에 다시 나타나지 않는다 — head/tail이 서로 다른 판정 단위이므로 자연히 제외된다.

---

## 4. 판정 확정 (commitJudgment)

후보가 정해지면:

1. judgment 종류 계산 (§2). wide면 무조건 SYNC. (tail은 §7·§8.)
2. Tap이면 즉시 완결. Hold head면 활성 Hold로 등록(§5)만 하고 tail은 미확정 상태로 둔다.
3. `combo++`, `maxCombo` 갱신.
4. judgment를 판정 단위 표시(`part` = `tap`/`head`/`tail`)와 함께 내보낸다. 회계는 `part`가 아니라 단위 수(§8)를 쓰고, `part`는 **표시 규칙**의 입력이다 — 원본에서 tail 성공은 화면에 아무것도 띄우지 않고 중간 릴리즈만 MISS를 띄웠다([[EXTRACTED_FACTS]] §8.1). judge는 그 규칙을 알지 않고 어느 단위인지만 싣는다.
5. **게이지 반영**: `applyGaugeChange(judgment)`가 terminate를 유발하면 `forceEnded` 플래그만 세운다. 실제 강제 종료는 play loop가 단일 지점에서 수행 — 모든 판정 경로가 한 곳으로 모이게.
6. **Fast/Slow**: normal head만, SYNC·MISS·wide·autoplay 제외하고 `feedFastSlow(diff, ...)` 호출. `[보존]` (diff<0 FAST / >0 SLOW. 두 층위 — 순간 깜빡 `flashTiming` + 누적 `fastCount`/`slowCount`. 정의·층위·result 표시는 단일 출처 → [[glossary]] `FAST`/`SLOW`.)
7. hit 이펙트 push (위치·색). **above/below(overlap 시각 분리)는 싣지 않는다** — render 소관. `[수정]`

> **구 코드 [수정]**: 원래 commitJudgment가 같은 tick·lane에 이펙트가 있는지 검사해 `above=false`로 갈라 이펙트에 실어보냈다. 이는 judge가 렌더 관심사를 침범한 설계 미스다. 재구현에서 제거하고, 겹침 검출은 domain(`noteOverlapMap`), 시각 분리는 render가 맡는다(§11).

---

## 5. Runtime Hold 모델 — 익명 Normal 수요·Wide 단일 소유 `[번복]`

```text
keysHeld
keyPressSerial[key]
nextPressSerial

activeNormalHolds[lane]   // head-hit, tail-미확정 Normal Hold 목록 (lane 1~4)
activeWideHold             // 현재 활성 WideHold 하나 또는 null
wideOwnerKey                // activeWideHold를 담당하는 물리 key 또는 null
```

이미 `keysHeld`에 있는 키의 반복 keydown은 무시한다. 필드 소속 → [[data-model]] §9, 이름 대응 → [[naming]] §4.

구 `holds[key] = note`(키 소유 Hold) 모델과, keydown 시 진행 중 hold를 빈 키로 **상속(복사)**하던 크로스 바인딩 로직은 **폐기**한다. Normal Hold는 특정 물리 키가 아니라 **lane의 익명 수요**다.

### Normal Hold — lane별 익명 수요

```text
normalDemand(lane) = activeNormalHolds[lane].length
heldCount(lane)    = lane에 속한 keysHeld 개수
```

`heldCount(lane) >= normalDemand(lane)`인 동안 그 lane의 모든 Normal Hold가 유지된다. 이 규칙이 다음을 모두 허용한다:

- lane 2 hold + tap: key 2가 짧은 tap이고 key 4가 눌린 채 유지 / 또는 그 반대.
- 같은 lane에 길이가 다른 hold 둘이 있을 때 어느 손가락이 먼저 놓여도(짧은 쪽 tail) 성립.

lane 1·4는 키가 하나뿐이라 `normalDemand`가 항상 0 또는 1이다.

수요가 걸리는 lane은 §3의 **매칭 lane**이다 — 미러가 켜져 있으면 `laneMap[note.lane]`의 키가 그 Hold를 지탱한다. 노트를 친 손가락과 그 노트를 유지하는 손가락이 다를 수 없기 때문이다.

### Normal shortage

`heldCount(lane) < normalDemand(lane)`이 되면 tail이 이른 순으로 Hold를 해소해 불변식을 되살린다. 해소되는 각 Hold는 §7의 release grace 규칙을 따른다. tail이 완전히 같고 다른 속성도 같으면 어느 쪽을 먼저 해소해도 무방하다.

### WideHold — 단일 소유·원자적 이양

유효한 chart는 활성 WideHold를 **최대 1개**만 가질 수 있다. WideHold는 항상 정확히 하나의 owner 키를 갖거나 없다 — 중복 소유는 금지된다.

held key `key`가 WideHold의 owner로 **자격이 있으려면**, 그 key를 Wide에 내주고도 같은 lane의 Normal Hold 수요가 충족돼야 한다:

```text
heldCount(laneOf(key)) − 1 >= normalDemand(laneOf(key))
```

키를 추가로 누른다고 WideHold가 복사되거나 소유가 자동으로 바뀌지 않는다 — 현재 배정이 더 이상 유효하지 않을 때만 이양이 일어난다(§6). Normal 수요가 항상 Wide 소유보다 우선한다 — WideHold 소유를 지키려고 Normal Hold를 실패시키는 일은 없다.

---

## 6. Reconciliation — 수요 재조정 `[신규]`

`reconcileHeldCapacity(nowMs)`는 매 keydown/keyup 뒤 다음 순서로 실행된다:

1. 모든 lane의 Normal shortage를 held 키 전체로 해소한다.
2. 활성 WideHold가 없으면 `wideOwnerKey`를 비운다.
3. (Normal 수요를 만족시키고 남는) eligible Wide owner 후보 집합을 계산한다.
4. 현재 owner가 여전히 눌려 있고 자격이 있으면 **유지**한다.
5. 아니면 자격 있는 키 중 `keyPressSerial`이 **가장 큰**(가장 최근에 누른) 키로 **원자적으로 이양**한다.
6. 자격 있는 키가 없으면 §7의 release grace 규칙으로 WideHold의 tail을 즉시 해소한다.

Normal shortage 해소를 먼저 수행하고 나서 Wide 배정을 결정한다 — 현재 Wide 소유를 먼저 빼고 Normal shortage를 계산하지 않는다.

이 재조정 후 다음 불변식이 항상 성립한다:

```text
activeNormalHolds[lane].length <= heldCount(lane)
wideOwnerKey가 있으면:
  heldCount(laneOf(wideOwnerKey)) − 1 >= activeNormalHolds[laneOf(wideOwnerKey)].length
WideHold는 owner가 0개 또는 1개, 둘 이상 불가
만료·완료된 Hold head는 활성 Hold 목록에 다시 나타나지 않는다
완료·실패한 tail은 다시 판정되지 않는다
한 번의 물리 keydown은 head를 최대 1개만 확정한다
```

개발/테스트 빌드에서는 이 불변식을 실행 가능한 assertion으로 둔다.

---

## 7. Hold tail 처리·release grace `[보존]`

분류 임계 폭:

```text
HOLD_RELEASE_WINDOW_MS = WINDOW_GOOD_MS + HOLD_RELEASE_GRACE_MS = 150
```

값의 단일 출처는 [[constants]] §1이다. `HOLD_RELEASE_GRACE_MS`(50)는 관용 폭 **전체가 아니라** GOOD 창 위에 얹는 추가분이며, 원본도 두 값을 합해 썼다(`play-input.js` 실측 → [[EXTRACTED_FACTS]] §8.1). D-2026-024가 임계를 50으로 적은 것은 상수 파일만 읽고 사용처를 읽지 않은 오독이었고, D-2026-039에서 원본과 같은 150으로 정정한다. 근거 → [[rationale#hold release 임계를 원본과 같은 150ms로 되돌린 이유]].

- `nowMs >= tailMs − HOLD_RELEASE_WINDOW_MS`에 release: **tail SYNC**.
- 그보다 이르면: **tail MISS**.
- 필요한 held capacity가 `tailMs`까지 유지되면 tail은 `tailMs`에 **자동으로 SYNC 확정**된다.
- 자동 tail 완료는 그 Hold를 활성 수요에서 제거한다.
- 물리 키는 실제 keyup 전까지 `keysHeld`에 남는다.
- tail 완료는 같은 tick의 head에 대한 새 keydown을 만들어내지 않는다.

Hold 활성 구간은 논리적으로 `[head, tail)`이다. 같은 chart tick에서는:

1. 옛 tail이 먼저 끝나고,
2. 새 head는 새 keydown을 요구한다.

같은 키의 tail+head가 같은 tick에 겹치면 **떼었다 다시 눌러야** 한다. 계속 누르고 있으면 tail은 자동 완료되지만 Tap head는 맞지 않는다.

---

## 8. Hold head MISS — 2단위 회계 `[번복]`

Tap은 판정 단위 1개다. Hold는 **head AND tail** 2단위다.

| 결과 | MISS 단위 |
|---|---:|
| Tap head MISS | 1 |
| Hold head MISS | **2** |
| Hold head 성공, tail MISS | 1 |
| Hold head 성공, tail SYNC | 0 |

Hold head가 만료(§2)되면 tail은 더 이상 성공할 수 없으므로 **즉시 함께 MISS 확정**한다:

```text
head MISS
tail MISS 즉시 동반
MISS count +2
score/accuracy 2단위 손실
normal 게이지 MISS delta 2회
hard 게이지 MISS delta 2회
FC/AP/AS/cascade는 MISS로 반응
combo = 0 (1회만 리셋)
```

그 Hold는 그 자리에서 종결된다:

- 활성 Hold 목록(§5)에 추가하지 않는다;
- 나중에 tail을 다시 판정하지 않는다;
- 원래 tail 시각에 중복 MISS delta를 적용하지 않는다.

combo 리셋은 1회만 실행한다 — 0을 두 번 만들어도 의미가 늘지 않을 뿐, 페널티 자체를 줄이는 게 아니다. 화면 피드백은 head-MISS 이벤트 1개로 충분하다(회계는 2단위 그대로).

게이지 회계 계약은 [[gauge]] §5, 수치는 [[constants]] §2.

---

## 9. 이벤트 처리 `[신규]`

모든 입력 경로가 같은 두 연산을 공유한다.

### `advanceJudgmentStateTo(nowMs)`

결정론적 시간 순서로 처리한다:

1. `tailMs <= nowMs`인 활성 tail을 capacity 불변식이 유지된 경우에 한해 자동 완료한다.
2. 최종 유효 시각이 지난(`nowMs > deadlineMs`) 미확정 head를 만료시킨다.
3. Hold head 만료는 §8의 2단위 MISS를 즉시 커밋하고 그 Hold를 영구히 닫는다.

경계가 정확히 겹치는 순간에도 tail 완료와 유효한 head 매칭은 포함·결정론적으로 처리된다.

### `reconcileHeldCapacity(nowMs)`

§6과 동일. 매 keydown/keyup 뒤 호출한다.

### 진입 경계

play loop의 프레임 진행·keydown·keyup 셋만이 judge의 진입점이며, **셋 다 raw 시각과 `visualOffset`을 받는다**(§1). 보정을 지나지 않은 시각이 judge 안으로 들어올 자리가 없다.

### keydown

```text
advanceJudgmentStateTo(nowMs)
→ 새 held key·press serial 등록
→ 후보 매칭 후 head 최대 1개 확정 (§1·§4)
→ reconcileHeldCapacity(nowMs)
```

### keyup

```text
advanceJudgmentStateTo(nowMs)
→ keysHeld에서 키 제거
→ 그 키가 wideOwnerKey였으면 참조를 비움
→ reconcileHeldCapacity(nowMs)
```

blur·stuck-key 복구는 합성 release를 같은 keyup 경로로 흘려보낸다.

---

## 10. 중간 시작과 Resume `[번복]`

두 동작은 서로 다르다.

### 중간 시작(mid-start)

0이 아닌 위치에서 플레이를 **시작**할 때(editor test 등), 3초 lead-in/countdown 동안:

- lane keydown/up이 `keysHeld`·press serial을 갱신한다;
- chart head는 아직 판정하지 않는다.

anchor 시각에:

1. anchor 이전에 완전히 끝난 노트는 SYNC로 시드한다.
2. `headMs < anchorMs < tailMs`인 Hold는 head만 SYNC로 시드하고 활성 Hold 수요(§5)에 추가한다.
3. 현재 눌려 있는 매칭 lane 키로 Normal crossing-Hold 수요를 먼저 해소한다.
4. 남은 eligible held 키로 crossing WideHold를 배정한다(Normal이 먼저).
5. anchor에서 유지될 수 없는 crossing Hold는 tail MISS 1개를 받는다.
6. `headMs == anchorMs`인 노트는 미리 시드되지 않고 이미 눌려 있던 키로도 맞지 않는다 — 그 판정창 안에서 **새 keydown**이 필요하다.

anchor에서 끝나는 Hold는 두 단위 모두 과거로 시드된다. anchor에서 시작하는 Hold는 어느 단위도 시드되지 않는다. AP/FC 유효성은 보존된다(과거 노트를 안 친 것으로 두면 FC가 깨지므로).

### Pause Resume

pause는 기존 head/tail 결과와 활성 Hold 컬렉션을 **그대로 보존**한다 — 중간 시작 시드 루틴을 호출하지 않는다.

Resume 카운트다운 동안 lane 키 상태를 chart 시간 진행 없이 수집할 수 있다. 바뀌지 않은 pause anchor에서:

```text
reconcileHeldCapacity(anchorMs)
```

를 보존된 활성 Hold에 대해 실행한다. 되감기는 없으며 과거 노트를 다시 시드하지 않는다. 기록 적격성은 D-2026-022([[scene]] §9)를 그대로 따른다 — pause Resume은 mid-start가 아니다.

---

## 11. 입력과 렌더의 분리 (핵심 원칙)

judge는 **입력→판정만** 한다. render는 **보여주기만** 한다. 각자 하는 일이 확실해야 한다.

- 판정·매칭은 전부 **lane(데이터) 기준**. shape·laneEvents의 시각 변형은 judge에 영향 없다. judge 코어는 shape/laneEvents를 import하지 않는다. `[보존 / 설계]`
- **overlap/conflict는 judge 밖.** `[수정]` 겹침 **검출**(어느 노트끼리 겹쳤나, lane/wide 로컬 overlap·conflict인지, 전체 6키 global conflict인지)은 notes와 활성 Hold 상태에서 계산되는 파생 속성(domain, `noteOverlapMap` → [[data-model]] §5.1)이다. render는 그 map을 받아 **표시**(above/below 쌓임, 노랑/빨강, global 우선순위)만 입힌다. judge는 검출도 표시도 모르고, 이펙트에 above를 싣지 않는다.
- 이 분리가 깨지면(judge가 렌더를 알거나, 판정이 검출/표시를 하면) 설계 미스다.

---

## 12. 무효 chart 런타임 폴백 `[신규]`

검증이 우회되더라도:

- 한 번의 keydown은 head를 최대 하나만 확정한다;
- 후보 순서(§1)는 항상 결정론적이다;
- 초과 head는 MISS로 만료된다;
- Normal shortage는 이른 tail부터 해소한다;
- Wide shortage는 WideHold를 해소한다;
- 중복 Wide head도 같은 후보 순서를 쓰고 미해소분은 MISS된다;
- crash하거나 중복 Hold 소유를 만들지 않는다.

conflict가 있는 chart를 실행·기록할 수 있는지는 기존 conflict/play 정책([[data-model]] §5.1, [[editor-editing]] §1)을 그대로 따른다 — 이번 판정 개편이 별도의 실행 정책을 만들지 않는다.

---

## 13. 결정 완료 / 미해결

확정:
- [x] 후보 순서 단일화 — normal/wide 분리 풀 폐기, earliest-tick → same-tick normal 우선 → hold 우선 → 이른 tail 우선 `[번복]`
- [x] Normal Hold = lane 익명 수요, WideHold = 단일 소유·원자적 이양(Normal 우선) `[번복]`
- [x] tail release 임계 = `HOLD_RELEASE_WINDOW_MS`(GOOD 창 + grace = 150) — 원본 실측과 같다 `[보존]`(D-2026-039). tail 자동완료·`[head,tail)`·같은 tick 순서(tail 먼저)는 `[번복]`
- [x] Hold head MISS = 2단위 즉시 확정(score/accuracy/게이지 2회, combo reset 1회) `[번복]`
- [x] `advanceJudgmentStateTo`/`reconcileHeldCapacity` 공용 연산, keydown/keyup 처리 순서 `[신규]`
- [x] mid-start crossing-Hold 시드·anchor 규칙, pause Resume 비-재시드 `[번복]`
- [x] 전체 6키 global conflict는 domain 소관(§11) — 검출=domain, 표시=render
- [x] 미러 laneMap 매핑 규칙 — §3 (`1↔4, 2↔3`, wide 제외) `[보존]`
- [x] autoplay 히트음 — AudioContext에 **lookahead 150ms** 사전 스케줄(이진 탐색으로 창 내 노트만 순회), autoJudge는 silent로 판정만 반영(이중 재생 방지). 오케스트레이션 귀속은 game `[보존]`
- [x] visualOffset 배선 `[번복]` — 입력 타임스탬프 보정으로 배선됨 → §1
- [x] 영속 note ID 미도입 — 동등한 판정 신호는 서로 교환 가능

미해결:
- [ ] playJudgQueue → 표시 레이어 연결 (render 쪽)
