# gauge — 게이지 / 클리어 / state

> 곡을 어떤 방식으로 도전하고(gaugeMode), 어떻게 끝냈는가(state)를 정의한다.
> "무엇"만 담는다. "왜"(직교 3축 → 단일 축 평탄화)는 → [[rationale#gaugeMode를 단일 축 6종으로 둔 이유]]
> 수치(증감·임계)는 → [[constants]] §2. 짝 문서: [[glossary]] (색인), [[judge]] (판정 종류).

---

## 1. gauge

- **`gauge`** (`gaugePct`, 0~100) — 생명력 막대. 0이 되면 게임이 강제 종료되어 result로 간다.
- **terminate** = 별도 종료 경로가 아니라 **"게이지를 즉시 0으로"** 만드는 것. 거의 모든 실패가 이 한 경로를 탄다. (예외: `cascade`는 terminate 대신 강등 — §4.)

증감 수치(normal/hard delta, `×a` 스케일, 클리어 75%)는 [[constants]] §2.

---

## 2. gaugeMode → state (한 표)

**`gaugeMode`** = 플레이 모드(무슨 도전인가). 각 모드는 게이지 동작 + terminate 조건 + **성공 시 state**를 함께 정의한다.

**`state`** = 곡을 끝낸 결과(어떻게 끝냈는가). gaugeMode와 성공/실패로 결정된다.

| gaugeMode | start | recovery | terminateBelow | 성공 시 state | 실패 시 |
|---|---|---|---|---|---|
| `normal` | 0 | 있음 (끝에 ≥75%) | 없음 | `C` | `F` (끝에 <75%) |
| `hard` | 100 | 없음 | gauge 0 | `H` | `F` |
| `fc` | 100 고정 | — | MISS 발생 | `FC` | `F` |
| `ap` | 100 고정 | — | PERFECT 미만 | `AP` | `F` |
| `as` | 100 고정 | — | SYNC 외 판정 | `AS` | `F` |

- mode `fc`/`ap`/`as`는 게이지가 무의미하다 (terminate가 유일한 실패 경로). 막대는 100 고정으로 해당 색만 표시 → [[theme]]. (저장값은 소문자 mode, 표시·state는 대문자 `FC`/`AP`/`AS`.)
- `cascade`는 terminate가 아니라 **강등**으로 동작하므로 이 표에 넣지 않는다 (§4).
- state 색은 정의가 아니라 render 속성 → [[theme]].

### state 종류 (7종)

곡을 끝낸 결과는 다음 7종 중 하나. best 기록은 이 우선순위로 갱신된다 (왼쪽이 상위):

`AS` > `AP` > `FC` > `H` > `C` > `F` > `N`

- `AS` All Sync / `AP` All Perfect / `FC` Full Combo / `H` hard clear / `C` normal clear(≥75%) — 위 §2 "성공 시 state".
- `F` **Fail** — 클리어 못 한 모든 판(게이지 미달로 끝까지 갔든, terminate로 중도 종료됐든 하나로). 기록은 남는다(친 곡).
- `N` **Not played** — 아예 안 친 곡(기록 없음). 그래서 `N`이 우선순위 맨 아래 — 한 번이라도 친 `F`가 안 친 `N`보다 상위다.

`[수정]` — 구 코드는 "끝까지 쳤지만 미달"을 `P`(played, record exists)로, "중도 강제종료"를 `F`로 갈랐고 best 우선순위도 `…C > P > N > F`였다. 재설계는 유저 관점에서 "클리어 실패는 하나"라 보고 **`P`를 `F`에 흡수**, F를 N 위로 올려 `…C > F > N`으로 단일화한다. 근거 → [[rationale#state에서 P를 F로 흡수한 이유]]. (안 친 노트는 전부 MISS 처리되므로 미달 판도 실제 플레이 결과다.)

---

## 3. terminate 조건의 출처

terminate 임계(SYNC 외 / PERFECT 미만 / MISS)가 가리키는 판정 종류는 [[judge]] 소관. 여기서는 "어느 판정이 terminate를 일으키는가"만 표(§2)에 둔다.

---

## 4. cascade

한 플레이가 도달한 **최고 상태**를 보여주는 모드. 곡을 끝내는 대신, 깨진 조건만큼 한 단계씩 관대한 티어로 내려가며 끝까지 간다. cascade는 더 유리한 게 아니라 — 같은 플레이를 각 모드로 했을 때와 **동일한 결과**가 나오도록 설계된다(아래 동일 규칙 참조).

곡 시작부터 **모든 티어를 동시에 평가**한다: lock 3종(`as`/`ap`/`fc`)의 terminate 조건과 게이지 2종(`hard`/`normal`)을 병렬로 굴린다. 살아있는 **가장 높은 티어가 현재 state**.

- `as`/`ap`/`fc`: 각 terminate 조건(SYNC 외 / PERFECT 미만 / MISS)이 깨지면 그 티어가 떨어지고 한 칸 내려간다 (`as → ap → fc`). 강등 순서·조건은 §2 표와 같다.
- `fc`까지 깨지면 그 아래는 **`hard` 게이지**가 state를 가른다 (state `H`). `hard` 게이지가 0에 닿으면 `normal`로 내려간다.
- `normal` 게이지가 곡 끝에 75% 미만이면 `F`.
- **게이지 2종은 곡 내내 병렬로 누적**된다 — 강등은 "어느 게이지를 결과로 보느냐"가 내려가는 것이지, 전환 순간 새로 시작하는 게 아니다. `hard`가 0이 될 때 `normal` 값은 그동안 따로 쌓여 이미 거기 있다.
- `hard`·`normal` 게이지는 **일반 `hard`·`normal` 모드와 완전히 동일한 규칙**(delta·`×a` 스케일·75% 임계, [[constants]] §2). 그래야 "cascade로 H 클리어 = hard로 클리어"가 성립한다.
- **result 게이지 막대는 항상 `hard` 게이지 값**으로 표시한다 (lock 3종은 게이지가 무의미하므로 — §2). `as`/`ap`/`fc`가 끝까지 살아 결과가 `AS`/`AP`/`FC`여도 막대 자체는 hard 값.

[수정] — 구 코드 cascade는 lock 티어만 한 칸 내리고 게이지 본체는 단일·연속(`as → ap → fc → bare gauge`)이었다. 이를 **게이지 2종(hard·normal)을 병렬 평가하는 최고-상태 모델**로 재정의. 근거 → [[rationale#gaugeMode를 단일 축 6종으로 둔 이유]].

---

## 5. 경계 — gauge가 다루지 않는 것

- **증감 수치**: [[constants]] §2. 여기는 동작만.
- **판정 종류 정의** (SYNC/PERFECT/GOOD/MISS): [[judge]]. 여기는 어느 판정이 terminate를 부르는지만.
- **rank** (점수 등급): state와 **독립 축**. [[glossary#게이지 / 결과]] 색인 + [[constants]] §3. gauge 생사와 무관하므로 여기서 정의하지 않는다.
- **state 색**: render 속성 → [[theme]].
