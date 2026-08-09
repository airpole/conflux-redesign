# constants — 튜닝 수치 단일 출처

> 게이지 증감 / 판정창 / rank 임계 등 "얼마"에 해당하는 값을 한곳에 모은다.
> "무엇"(정의)은 각 문서, "얼마"(수치)는 여기. 코드 `constants.js`에 대응.
> 분류 기준: **로직 계산에 쓰이는 수치 = constants / 순수 표시 값 = [[theme]] / 취향·환경 값 = [[settings]]**. 근거 → [[rationale#constants와 settings의 분류 기준]]
> 출처: `constants.js` 정밀 추출. 별도 태그가 없으면 `[보존]` (값이 틀리면 회귀).
> 용어: [[glossary]] / 근거: [[rationale]]

---

## 1. 판정창 (ms, |diff| 기준)

| 판정 | 창 | 비고 |
|---|---|---|
| SYNC | ≤ 25 | |
| PERFECT | ≤ 50 | |
| GOOD | ≤ 100 | 이 밖은 MISS |
| WIDE SYNC | ≤ 100 | wide 노트는 SYNC만, ±100 |
| `HOLD_RELEASE_GRACE_MS` | 50 | hold tail release grace. 한때 폐기했다가 **복원** `[번복]` — 근거 → [[rationale#hold release grace를 50ms로 되돌린 이유]] |

- hold tail 분류 임계는 GOOD 창(100ms)이 아니라 `HOLD_RELEASE_GRACE_MS`(50) 단일 값이다([[judge]] §7). SYNC/PERFECT/GOOD/WIDE SYNC 판정창 자체는 이번 개편으로 바뀌지 않는다.
- 판정 로직은 [[judge]], 여기는 값만.

## 2. 게이지 증감 (`GAUGE_DELTA`)

start: `normal` 0 / `hard` 100. 둘 다 상한 100(`gaugeMax`).
`normal` 클리어 임계 `NORMAL_CLEAR_PCT` = 75.

| 판정 | normal | hard |
|---|---|---|
| SYNC | +1.0 ×a | +0.15 |
| PERFECT | +1.0 ×a | +0.15 |
| GOOD | +0.5 ×a | 0 |
| MISS | **−2.0** (절대) | **−5.0** |

- **normal**: 양수 delta만 `×a` 스케일. `a = GAUGE_NORMAL_TOTAL_GAIN / 총콤보`, **`GAUGE_NORMAL_TOTAL_GAIN = 150`** `[보존]`. 세션 시작 시 1회 계산. 콤보 수 = tap 1, hold 2(head+tail). 올-SYNC면 잠재 회복 +150%인데 100 상한이라 초과분 폐기 → 75% 클리어는 대략 SYNC의 절반 분량. **손실은 절대값**(차트 길이 무관, 후살 비용 일정).
- **hard**: 전 항목 절대 퍼센트, 저게이지 자비 없음. MISS −5.0 → 20연속 MISS면 풀바 소진. 중간 릴리즈도 MISS와 동일 −5.0 `[수정 — 구 −2.5]`, tail 성공도 SYNC와 동일 +0.15 `[수정 — 구 +0.1]`.
- 판정은 SYNC/PERFECT/GOOD/MISS **4종 단일 축** — hold tail도 **게이지 델타까지 완전 통합** `[수정]`: tail 성공 = SYNC 델타, tail MISS(head 성공 후) = MISS 델타 1회([[judge]] §7). 구 코드의 게이지 피드는 6종 kind였고 **hard에만** tail 특례(TAIL_OK +0.1 / TAIL_MISS −2.5)가 있었다 — normal은 구에서도 동일 값이라 실변경은 hard뿐. 근거 → [[rationale#hold tail의 게이지 특례를 폐기한 이유]].
- **Hold head MISS는 MISS 델타를 즉시 2회 적용**한다(normal·hard 게이지 모두) `[번복]` — head 판정 단위 1개 + tail 판정 단위 1개가 함께 종결되기 때문이다. 이후 원래 tail 시각에 중복 delta를 적용하지 않는다. 판정 단위·회계 계약 → [[judge]] §8, [[gauge]] §5.
- gaugeMode 정의·terminate·cascade는 [[gauge]]. 여기는 normal/hard 증감 값만.

## 3. rank 임계 (`RANK_TABLE`, 백만점제, 높음→낮음 첫 도달)

| rank | 점수 |
|---|---|
| U | 1,000,000 |
| S+ | 995,000 |
| S | 985,000 |
| A+ | 970,000 |
| A | 950,000 |
| B | 900,000 |
| C | 800,000 |
| D | 700,000 |
| E | 500,000 |
| F | 0 |

- 점수 = (SYNC+tail성공 + PERFECT + GOOD×0.5) / 총콤보 × 1,000,000.
- accuracy(%) = (SYNC+tail성공 + PERFECT×0.7 + GOOD×0.3) / 총콤보 × 100. 점수와 **별개 지표**다 (가중이 다름: 점수는 PERFECT 풀·GOOD 0.5, accuracy는 PERFECT 0.7·GOOD 0.3). `computeResult`가 score·rank·state와 함께 반환. `[보존]`
- rank는 state와 독립 축([[glossary]]). result 화면이 이 중 무엇을 어떻게 표시하는지(레이아웃)는 core 밖 — scene/render 소관.

## 4. 스크롤 속도 범위 (`SCROLL_SPEED_*`)

| 상수 | 값 |
|---|---|
| `SCROLL_VIEW_MS` | 2000 |
| `SCROLL_SPEED_MIN` | 1.0 |
| `SCROLL_SPEED_MAX` | 10.0 |
| `SCROLL_SPEED_STEP` | 0.1 |

- `SCROLL_VIEW_MS`는 판정선까지 한 화면이 담는 시간이다 — `visMs = SCROLL_VIEW_MS / scrollSpeed`([[timing]] §3).
- 나머지는 `[보존]` (구 `SPEED_MIN/MAX/STEP`). scrollSpeed의 현재값은 취향([[settings]])이지만, 허용 범위·스텝은 `visMs = SCROLL_VIEW_MS / scrollSpeed`([[timing]] §3) 로직의 경계 조건이라 여기 둔다 — 머리말 분류 기준. 정의·절대분리는 [[glossary]].

## 5. song-credit 연출 (`CREDIT_*`) `[신규]`

| 상수 | 값 |
|---|---|
| `CREDIT_FADE_IN_MS` | 500 |
| `CREDIT_HOLD_MS` | 4000 |
| `CREDIT_FADE_OUT_MS` | 500 |

- 합 5000ms 고정 — song-credit scene 총 표시 시간([[scene]] §6). 입력·skip 없음이므로 로직 경계값이라 여기 둔다.

## 6. textEvent fade (`TEXT_FADE_MS`) `[수정]`

| 상수 | 값 |
|---|---|
| `TEXT_FADE_MS` | 300 |

- 등장·퇴장 fade에 **같은 값**을 쓴다. 구 `transition`·`mode` 필드 폐기의 귀결로 고정값 하나에 수렴했다([[data-model]] §8). 표시 스타일·배치는 [[theme]] §3.

---

## 7. song-select `[신규]`

| 상수 | 값 |
|---|---|
| `SLOTS_PER_ROW` | 5 |
| `PREVIEW_DELAY_MS` | 400 |
| `PREVIEW_LOOP_MS` | 15000 |
| `PREVIEW_FADE_OUT_MS` | 5000 |

- 정의·동작은 [[song-select]] §3·§10.
- `PREVIEW_DELAY_MS`는 커서가 멈춘 뒤 preview 재생을 시작하기까지의 대기다.
- fade in은 없다. `PREVIEW_FADE_OUT_MS`는 루프 구간의 마지막 구간에 적용한다.

---

## 8. 로딩 표시 `[신규]`

| 상수 | 값 |
|---|---|
| `LOADING_INDICATOR_DELAY_MS` | 300 |

비동기 작업이 이 시간을 넘기면 로딩 표시를 낸다. 적용 지점은 각 scene 문서.

---

## 9. 곡 종료 `[수정]`

| 상수 | 값 |
|---|---|
| `SONG_END_TAIL_MS` | 3000 |

`contentEndMs` 이후 이 시간이 지나면 판이 끝난다. 정의는 [[timing]] §9.
