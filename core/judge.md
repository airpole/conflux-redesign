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

`diff = curMs − tickToMs(note.startTick)` (부호 있음), `abs = |diff|`

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

---

## 5. 판정 확정 (commitJudgment)

후보가 정해지면:

1. judgment 종류 계산 (§3). wide면 무조건 SYNC.
2. `hits`에 기록: `{headHit, headDiff, headType, headMs, isLN, tailDone(=tap이면 true), tailFailed:false, tailMs}`.
3. `combo++`, `maxCombo` 갱신.
4. judgment를 큐에 push (표시용).
5. **게이지 반영**: `applyGaugeChange(type)`가 terminate를 유발하면 `forceEnded` 플래그만 세운다. 실제 강제 종료는 play loop가 단일 지점에서 수행 — 모든 판정 경로가 한 곳으로 모이게.
6. **Fast/Slow**: normal head만, SYNC·MISS·wide·autoplay 제외하고 기록 (§glossary FAST/SLOW). `[보존]` (PERFECT/GOOD만 표시, diff<0 FAST / >0 SLOW. 순간 표시만이고 기록 안 됨 — feedFastSlow 실측.)
7. hit 이펙트 push (위치·색). **above/below(overlap 시각 분리)는 싣지 않는다** — render 소관. `[수정]`

`[보존]` (단 TAIL은 §6, overlap 분리는 §8에서 수정)

> **구 코드 [수정]**: 원래 commitJudgment가 같은 tick·lane에 이펙트가 있는지 검사해 `above=false`로 갈라 이펙트에 실어보냈다. 이는 judge가 렌더 관심사를 침범한 설계 미스다. 재구현에서 제거하고, overlap 시각 분리는 render가 스스로 판단한다(§8).

---

## 6. hold tail 처리

- **tail 성공** (`commitTailRelease`): hold를 끝까지 눌렀다. `tailDone=true`, `combo++`, 게이지 반영. 판정은 **SYNC로 통합**. `[수정]` (구 TAIL_OK 폐기)
- **중간 릴리즈** (`commitMidRelease`): head는 쳤으나 tail 전에 놓음. `tailDone=true, tailFailed=true`, `combo=0`, 판정은 **MISS로 통합**. `[수정]` (구 TAIL_MISS 폐기)

> 구 코드의 TAIL_OK/TAIL_MISS judgment 종류를 없애고 SYNC/MISS로 합쳤다. 함수(commitTailRelease/commitMidRelease)는 남되 별도 judgment kind를 만들지 않는다.

---

## 7. 중간 시작 시드 (seedPlayStateAt)

곡 중간부터 플레이하거나 resume할 때, `curMs` 이전의 모든 노트를 **SYNC로 autoplay된 것처럼** 시드한다. AP/FC 유효성을 보존(과거 노트를 안 친 것으로 두면 FC가 깨지므로). hold는 tail까지 과거면 combo를 2 올린다. `[보존]`

---

## 8. 입력과 렌더의 분리 (핵심 원칙)

judge는 **입력→판정만** 한다. render는 **보여주기만** 한다. 각자 하는 일이 확실해야 한다.

- 판정·매칭은 전부 **lane(데이터) 기준**. shape·laneEvents의 시각 변형은 judge에 영향 없다. judge 코어는 shape/laneEvents를 import하지 않는다. `[보존 / 설계]`
- **overlap 시각 분리는 render 소관.** `[수정]` render가 그릴 때 "이 lane의 이 tick에 다른 노트가 있나"를 스스로 확인하고, 있으면 overlap(above/below 분리, 금색)을 적용한다. judge는 overlap을 모르고 이펙트에 above를 싣지 않는다.
- 이 분리가 깨지면(judge가 렌더를 알거나 render가 판정을 하면) 설계 미스다. play-* 가 에디터에서 자라며 생긴 오염을 재구현에서 바로잡는다.

---

## 9. 결정 완료 / 미해결

확정:
- [x] overlap above/below는 render 소관 (judge에서 제거) — 입력/렌더 분리

미해결:
- [ ] 미러(laneMap)의 정확한 매핑 규칙 → 별도 문서화 필요 여부
- [ ] autoplay 경로에서 silent 처리 (hitsound 사전 스케줄) 상세
- [ ] playJudgQueue → 표시 레이어 연결 (render 쪽)
