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
- 안 친 곡은 state `N` (Not played).
- state 색은 정의가 아니라 render 속성 → [[theme]].

---

## 3. terminate 조건의 출처

terminate 임계(SYNC 외 / PERFECT 미만 / MISS)가 가리키는 판정 종류는 [[judge]] 소관. 여기서는 "어느 판정이 terminate를 일으키는가"만 표(§2)에 둔다.

---

## 4. cascade

깨질 때 곡을 끝내는 대신 한 단계 관대한 모드로 **강등**하고 계속하는 모드.

- 출발은 `as`.
- break 조건은 §2 표와 같다 (SYNC 외 → `as` 깨짐, PERFECT 미만 → `ap` 깨짐, MISS → `fc` 깨짐).
- 깨질 때마다 `as → ap → fc → hard → normal` 순으로 한 칸 내려간다.
- `hard`·`normal` 구간부터는 그 게이지 동작을 그대로 따른다 (`hard`는 0에서 fail, `normal`은 끝에 <75%면 fail).
- 곡을 끝낸 시점의 **현재 티어가 곧 state**다. `normal`까지 내려가 75% 미달이면 `F`.

[수정] — 구 코드의 cascade(`fc → bare gauge` 단일 단계)를 게이지 본체 2종까지 잇는 사슬로 재정의. 근거 → [[rationale#gaugeMode를 단일 축 6종으로 둔 이유]].

---

## 5. 경계 — gauge가 다루지 않는 것

- **증감 수치**: [[constants]] §2. 여기는 동작만.
- **판정 종류 정의** (SYNC/PERFECT/GOOD/MISS): [[judge]]. 여기는 어느 판정이 terminate를 부르는지만.
- **rank** (점수 등급): state와 **독립 축**. [[glossary#게이지 / 결과]] 색인 + [[constants]] §3. gauge 생사와 무관하므로 여기서 정의하지 않는다.
- **state 색**: render 속성 → [[theme]].
