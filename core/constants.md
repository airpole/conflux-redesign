# constants — 튜닝 수치 단일 출처

> 게이지 증감 / 판정창 / rank 임계 등 "얼마"에 해당하는 값을 한곳에 모은다.
> "무엇"(정의)은 각 문서, "얼마"(수치)는 여기. 코드 `constants.js`에 대응.
> 출처: `constants.js` 정밀 추출. 전부 `[보존]` (값이 틀리면 회귀).
> 용어: [[glossary]] / 근거: [[rationale]]

---

## 1. 판정창 (ms, |diff| 기준)

| 판정 | 창 | 비고 |
|---|---|---|
| SYNC | ≤ 25 | |
| PERFECT | ≤ 50 | |
| GOOD | ≤ 100 | 이 밖은 MISS |
| WIDE SYNC | ≤ 100 | wide 노트는 SYNC만, ±100 |

- LN 릴리즈 유예 `LN_RELEASE_GRACE_MS` = 50.
- 판정 로직은 [[judge]], 여기는 값만.

## 2. 게이지 증감 (`GAUGE_DELTA`)

start: `normal` 0 / `hard` 100. 둘 다 상한 100(`gaugeMax`).
`normal` 클리어 임계 `NORMAL_CLEAR_PCT` = 75.

| 판정 | normal | hard |
|---|---|---|
| SYNC | +1.0 ×a | +0.15 |
| PERFECT | +1.0 ×a | +0.15 |
| GOOD | +0.5 ×a | 0 |
| tail 성공 | +1.0 ×a | +0.1 |
| MISS | **−2.0** (절대) | **−5.0** |
| 중간 릴리즈 | **−2.0** (절대) | −2.5 |

- **normal**: 양수 delta만 `×a` 스케일. `a = GAUGE_NORMAL_TOTAL_GAIN / 총콤보`, 세션 시작 시 1회 계산. 콤보 수 = tap 1, hold 2(head+tail). 올-SYNC면 잠재 회복 +150%인데 100 상한이라 초과분 폐기 → 75% 클리어는 대략 SYNC의 절반 분량. **손실은 절대값**(차트 길이 무관, 후살 비용 일정).
- **hard**: 전 항목 절대 퍼센트, 저게이지 자비 없음. MISS −5.0 → 20연속 MISS면 풀바 소진.
- 판정 종류는 SYNC/PERFECT/GOOD/MISS 4종 + tail 성공/중간 릴리즈가 각각 SYNC/MISS로 통합됨([[judge]] §6, [[glossary]]). 구 코드 TAIL_OK/TAIL_MISS는 폐기.
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
- rank는 state와 독립 축([[glossary]]).
