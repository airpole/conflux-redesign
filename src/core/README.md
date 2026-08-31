# core — 순수 로직·계산

파일 접두사 `core-*`. 브라우저 API를 **하나도** 쓰지 않는다. Node 하네스에서 import해 돈다.

전역 상태를 import하지 않고 활성 chart를 인자로 받는다. 캐싱이 필요하면 호출측이 메모이즈한다.

정의·의존 규칙 → `_plan/architecture.md` §1·§2

`core-records.ts`는 M3-7 범위다([[records]], [[settings]] §2). 기록 스키마
(`ChartRecord` — `bestJudgments`·`totalUnits`·`bestState`·`maxCombo`)·병합
규칙(`mergeRecord` — bestJudgments+totalUnits/bestState/maxCombo 독립
갱신)·no-record gate(`isNoRecord`)의 순수 계산만 담는다. score·accuracy·
rank는 저장 필드가 아니라 `deriveRecordSummary`의 파생값이다 —
`core-gauge.ts`의 가중치(`SCORE_WEIGHT`/`ACCURACY_WEIGHT`)와 `weighted`를
그대로 재사용해 공식을 두 곳에 두지 않는다. store I/O는 `game-records.ts`
(game 레이어) 몫이다.

**자기완결(self-contained) 근사식은 없다** (D-2026-070, records.md §2
개정 — D-2026-069를 대체). `ChartRecord`가 `bestJudgments`를 낸 그 판의
chart 실제 `totalUnits`를 함께 저장하므로, `deriveScore`/`deriveAccuracy`는
쓰기 시점("이번 판")이든 읽기 시점(과거 기록 재조회)이든 **항상** 진짜
분모로 계산한다 — `bestJudgments`의 합을 분모로 대신 쓰는 이전 방식은
미완주 판(예: 10단위 중 4단위만 SYNC로 치고 죽음)이 판정된 몫만으로
accuracy 100%가 나오면서 `bestState`(항상 `F`)와 모순되는 조합을 만들
수 있었다.

`totalUnits`는 **판정 단위 수**이지 note 수가 아니다 — Tap 1단위, Hold는
head+tail 2단위(`core-judge.ts` `unitsOf`, `core/judge.md` §8). Hold가
있는 chart는 `totalUnits`가 `notes.length`보다 크다 — 그래서 이 필드를
"note 수"라고 부르지 않는다. "unit" 계열 용어가 폐기됐다는 근거는
`core/naming.md`·`core/glossary.md`·DECISION_LOG 어디에서도 찾지 못했다
(D-2026-069가 이미 확인) — 오히려 현재의 의도된 단일 용어로 명시돼 있다.
