# gauge — 게이지 / 클리어 / state

> 곡을 어떤 방식으로 도전하고(gaugeMode), 어떻게 끝냈는가(state)를 정의한다.
> "무엇"만 담는다. "왜"(직교 3축 → 단일 축 평탄화)는 → [[rationale#gaugeMode를 단일 축 6종으로 둔 이유]]
> 수치(증감·임계)는 → [[constants]] §2. 짝 문서: [[glossary]] (색인), [[judge]] (판정 종류).

---

## 1. gauge

- **`gauge`** (`playState.gauge = {hardPct, normalPct}`, 각 0~100) — 생명력 막대. 두 게이지는 **모든 모드에서 병렬 누적**된다(단일 코드 경로 — cascade가 특별해지지 않게). 시작값(`normal` 0 / `hard` 100)과 증감은 **게이지의 성질이지 모드의 성질이 아니다** — `as`/`ap`/`fc` 모드에서도 값은 그대로 쌓이며 표시만 100 고정이다. 어느 값을 결과로 보느냐는 `tier`가 정한다(§2). `[수정 — 구 단일 gaugeValue]` 필드 구조 → [[data-model]] §9, 근거 → [[rationale#gauge를 2값 병렬 + tier 단일 구조로 통일한 이유]].
- **`forceEnded`** (`playState.forceEnded`) — 단일 모드에서 `tier`가 탈락해 판이 중도 종료됐다. terminate가 남기는 유일한 흔적이다 `[번복 — 구안은 "terminate = 게이지를 즉시 0으로"]`: 두 게이지 값은 result 막대와 score가 함께 쓰는 회계라 종료가 그 값을 밟으면 어긋난다. 막대가 그 순간 비는 것은 표시 규칙 → [[theme]].

증감 수치(normal/hard delta, `×a` 스케일, 클리어 75%)는 [[constants]] §2.

---

## 2. tier 사다리와 gaugeMode

**`tier`** (`playState.tier`) — 현재 살아있는 최고 단계 `[신규]`. 사다리는 엄격 → 관대 한 줄이다.

| tier | 탈락 조건 |
|---|---|
| `as` | SYNC 외 판정 |
| `ap` | PERFECT 미만 판정 (GOOD·MISS) |
| `fc` | MISS |
| `hard` | `hardPct`가 0에 닿음 |
| `normal` | 플레이 중 탈락 없음 (곡 끝의 `normalPct` 판정은 §3) |

탈락은 **비가역(래칫)**이다. 한 번 내려간 단계로는 값이 회복돼도 돌아오지 않는다.

**`gaugeMode`** = 플레이 모드(무슨 도전인가). 모드가 정하는 것은 두 가지뿐이다 — **어느 tier에서 시작하는가**와 **탈락하면 무엇이 일어나는가**.

| gaugeMode | 시작 tier | 탈락 시 |
|---|---|---|
| `normal` | `normal` | — (탈락 조건 없음) |
| `hard` | `hard` | terminate |
| `fc` | `fc` | terminate |
| `ap` | `ap` | terminate |
| `as` | `as` | terminate |
| `cascade` | `as` | 한 칸 강등 (§4) |

- **terminate** = `forceEnded`를 세우고 판을 끝낸다(§1). 최종 state는 `F`(§3).
- 단일 모드에서 `tier`는 시작값에 고정되고 terminate 시점의 값으로 얼어붙는다 — 실패를 `tier`와 `forceEnded` 두 곳에 적지 않는다.
- `as`/`ap`/`fc` 모드는 게이지가 결과에 관여하지 않는다 (탈락이 유일한 실패 경로). 막대는 100 고정으로 해당 색만 표시 → [[theme]]. 이 모드들에서 `hard` 단계는 시작 tier보다 아래라 닿지 않는다.
- 탈락 조건이 가리키는 판정 종류(SYNC/PERFECT/GOOD/MISS)의 정의는 [[judge]] 소관. 여기는 어느 판정이 어느 단계를 깨는지만 둔다.
- 저장값은 소문자 mode, 표시·state는 대문자 `FC`/`AP`/`AS`.
- 이 두 표가 `GAUGE_MODE_TABLE`의 단일 출처다 → [[naming]] §3.

---

## 3. state

**`state`** = 곡을 끝낸 결과(어떻게 끝냈는가). **고른 모드가 아니라 성적이 정한다** `[보존]` — 어느 게이지로 쳤든 `FC`/`AP`/`AS`는 달성할 수 있다. 모드는 위험(terminate)을 바꿀 뿐 도달 가능한 마크를 좁히지 않는다.

산출은 위에서부터 처음 맞는 줄 하나다.

| # | 조건 | state |
|---|---|---|
| 1 | `forceEnded` | `F` |
| 2 | MISS·GOOD·PERFECT 모두 0 | `AS` |
| 3 | MISS·GOOD 0 | `AP` |
| 4 | MISS 0 | `FC` |
| 5 | `tier` == `hard` | `H` |
| 6 | `normalPct` ≥ `NORMAL_CLEAR_PCT` | `C` |
| 7 | 그 외 | `F` |

- 5번 줄이 `H`와 `C`를 가르는 유일한 자리다. `normal` 모드는 `tier`가 `normal`이라 6·7로, `hard` 모드는 `tier`가 `hard`라 5로 떨어지고, `as`/`ap`/`fc` 모드는 생존 자체가 MISS 0을 뜻해 2~4에서 끝난다. **cascade만 `tier`가 실제로 움직인다** — 그래서 cascade가 별도 산출 경로를 갖지 않는다.
- 판정이 하나도 없는 판(빈 chart)은 2번 줄에 걸려 `AS`다 `[보존]`.
- 카운트는 **판정 단위**로 센다(§5). Hold head MISS는 2단위지만 "MISS 0"의 판별은 달라지지 않는다.

### state 종류 (7종)

곡을 끝낸 결과는 다음 7종 중 하나. best 기록은 이 우선순위로 갱신된다 (왼쪽이 상위):

`AS` > `AP` > `FC` > `H` > `C` > `F` > `N`

- `AS` All Sync / `AP` All Perfect / `FC` Full Combo / `H` hard clear / `C` normal clear(≥75%) — 위 표의 산출물.
- `F` **Fail** — 클리어 못 한 모든 판(게이지 미달로 끝까지 갔든, terminate로 중도 종료됐든 하나로). 기록은 남는다(친 곡).
- `N` **Not played** — 아예 안 친 곡(기록 없음). 그래서 `N`이 우선순위 맨 아래 — 한 번이라도 친 `F`가 안 친 `N`보다 상위다. 산출 표는 `N`을 내지 않는다 ([[records]] 소관).

`[수정]` — 구 코드는 "끝까지 쳤지만 미달"을 `P`(played, record exists)로, "중도 강제종료"를 `F`로 갈랐고 best 우선순위도 `…C > P > N > F`였다. 재설계는 유저 관점에서 "클리어 실패는 하나"라 보고 **`P`를 `F`에 흡수**, F를 N 위로 올려 `…C > F > N`으로 단일화한다. 근거 → [[rationale#state에서 P를 F로 흡수한 이유]]. (안 친 노트는 전부 MISS 처리되므로 미달 판도 실제 플레이 결과다.)

---

## 4. cascade

한 플레이가 도달한 **최고 상태**를 보여주는 모드. 곡을 끝내는 대신, 깨진 조건만큼 한 단계씩 관대한 tier로 내려가며 끝까지 간다. cascade는 더 유리한 게 아니라 — 같은 플레이를 각 모드로 했을 때와 **동일한 결과**가 나오도록 설계된다.

사다리·탈락 조건·래칫은 §2와 같고 state 산출도 §3과 같다. cascade가 더하는 것은 **탈락이 terminate 대신 강등**이라는 한 줄뿐이다.

- 게이지 2종은 곡 내내 병렬로 누적되므로(§1), 강등은 "어느 게이지를 결과로 보느냐"가 내려가는 것이지 전환 순간 새로 시작하는 게 아니다. `hardPct`가 0에 닿을 때 `normalPct`는 그동안 따로 쌓여 이미 거기 있다.
- 그래서 `hard`·`normal` 단계는 일반 `hard`·`normal` 모드와 **완전히 동일한 규칙**을 탄다([[constants]] §2). "cascade로 `H` 클리어 = `hard`로 클리어"가 성립한다.
- 래칫(§2)이 그 동치를 지킨다 — `hard` 모드였다면 0에 닿은 순간 죽은 판이므로, 값이 회복돼도 `H`로 복귀하지 않는다. 근거 → [[rationale#cascade의 hard 탈락을 래칫으로 둔 이유]].
- **result 게이지 막대는 최종 생존 tier 기준**으로 표시한다 `[번복 — 구안은 "항상 hard 값"]`: `as`/`ap`/`fc` 종결 → 100 고정 + 해당 색, `hard` 종결 → hard 값·색, `normal` 종결 → normal 값·색. 플레이 중 막대도 같은 규칙(살아있는 최고 tier)을 따른다 → [[theme]]. 근거 → [[rationale#cascade result 막대를 최종 티어 기준으로 바꾼 이유]].

### 검증 시나리오

cascade는 `[수정]`이라 대조할 구 구현이 없다(설계 대장 GA-4). 재구현 검증은 아래 표가 기준이다.

| # | 판정 시퀀스 (요약) | tier 추이 | 최종 state |
|---|---|---|---|
| 1 | 전 노트 SYNC | `as` 생존 | `AS` |
| 2 | PERFECT 1개, 나머지 SYNC | `as` 탈락 → `ap` 생존 | `AP` |
| 3 | GOOD 1개, MISS 없음 | `as`·`ap` 탈락 → `fc` 생존 | `FC` |
| 4 | MISS 1개, hard 게이지 끝까지 >0 | `fc`까지 탈락 → `hard` 생존 | `H` |
| 5 | 연속 MISS로 hard 0 도달, 이후 전 SYNC 회복, 곡 끝 normal ≥75% | hard 탈락(래칫 — 회복해도 복귀 없음) → `normal` | `C` |
| 6 | 5와 같되 곡 끝 normal <75% | normal 미달 | `F` |

`[수정]` — 구 코드 cascade는 `as`/`ap`/`fc` tier만 한 칸 내리고 그 아래는 단일 게이지 하나였다. 실제 매핑이 `gaugeType: 'normal'`이라 **원본 cascade는 `H`를 낼 수 없었다**(코드 주석의 `AS→AP→FC→Hard→Normal`은 사실과 달랐다). 이를 게이지 2종을 병렬 평가하는 최고-상태 모델로 재정의한다. 근거 → [[rationale#gaugeMode를 단일 축 6종으로 둔 이유]].

---

## 5. judgment 단위와 게이지 회계 `[번복]`

gauge는 [[judge]]의 **판정 단위** 하나마다 delta를 적용한다(D-2026-024). Hold 재설계로 판정 단위와 delta 적용 횟수가 분리됐으므로 여기서 회계 계약만 명시한다 — Hold 상태 기계 전체는 중복 정의하지 않는다.

- Tap head MISS: MISS delta 1회.
- **Hold head MISS: MISS delta 즉시 2회**(normal·hard 게이지 모두) — head 단위 + tail 단위가 함께 종결되기 때문이다. 이후 원래 tail 시각에 중복 delta를 적용하지 않는다.
- Hold head 성공 + tail MISS: MISS delta 1회.
- Hold head 성공 + tail SYNC: SYNC delta 1회(head는 delta 없음, tail 확정 시 1회).
- combo reset 횟수는 게이지 delta 횟수와 무관하다 — combo는 몇 번 0이 되든 1회 리셋이지만 게이지는 여전히 2단위를 반영한다.

Hold head MISS 1회는 MISS에 민감한 모든 단계(§2의 `fc`/`ap`/`as`)를 깨뜨리기에 충분하다 — 그럼에도 게이지 회계는 별개로 **두 delta 모두** 적용한다(탈락 판정과 게이지 수치 적용은 서로 다른 관심사).

**score·accuracy도 같은 단위를 쓴다**(설계 대장 GA-5). 세 값 모두 `가중치 × 단위 수`의 같은 누산이며 가중치만 다르다 — 게이지는 [[constants]] §2의 delta, score·accuracy는 §3의 가중치. 그래서 누산기는 하나이며, 판정 개수는 상태가 아니라 이 누산기가 든다([[data-model]] §9).

수치는 [[constants]] §2·§3, 판정 단위·이벤트 처리 정의는 [[judge]] §7~§9.

---

## 6. 경계 — gauge가 다루지 않는 것

- **증감 수치·점수 산식**: [[constants]] §2·§3. 여기는 동작만.
- **판정 종류 정의** (SYNC/PERFECT/GOOD/MISS): [[judge]]. 여기는 어느 판정이 어느 단계를 깨는지만.
- **rank** (점수 등급): state와 **독립 축**. [[glossary#Gauge / Result / Record]] 색인 + [[constants]] §3. gauge 생사와 무관하므로 여기서 정의하지 않는다.
- **`N` 판정과 best 갱신**: [[records]]. 여기는 한 판의 결과까지.
- **state·게이지 색**: render 속성 → [[theme]].
