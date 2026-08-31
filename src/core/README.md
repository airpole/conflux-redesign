# core — 순수 로직·계산

파일 접두사 `core-*`. 브라우저 API를 **하나도** 쓰지 않는다. Node 하네스에서 import해 돈다.

전역 상태를 import하지 않고 활성 chart를 인자로 받는다. 캐싱이 필요하면 호출측이 메모이즈한다.

정의·의존 규칙 → `_plan/architecture.md` §1·§2

`core-records.ts`는 M3-7 범위다([[records]], [[settings]] §2). 기록 스키마
(`ChartRecord`)·병합 규칙(`mergeRecord` — bestJudgments/bestState/maxCombo
독립 갱신)·no-record gate(`isNoRecord`)의 순수 계산만 담는다. score·accuracy·
rank는 저장 필드가 아니라 `deriveRecordSummary`의 파생값이다 —
`core-gauge.ts`의 가중치(`SCORE_WEIGHT`/`ACCURACY_WEIGHT`)와 `weighted`를
그대로 재사용해 공식을 두 곳에 두지 않는다. store I/O는 `game-records.ts`
(game 레이어) 몫이다.

`mergeRecord`의 "이번 판 vs 저장된 판" score 비교는 **비대칭**이다
(D-2026-069) — 이번 판은 `RecordCandidate.score`(실제 `PlayResult.score`,
진짜 chart `totalUnits` 기준)를 그대로 쓰고, 저장된 판은 `deriveScore`
(그 기록의 `bestJudgments` 합만 분모로 쓰는 자기완결 근사, chart를 다시
읽을 수 없으므로 유일한 선택지)로 다시 계산한다. `deriveScore`를 "이번
판"에도 썼다면(자기완결 공식을 양쪽에 균일 적용) 미완주 판이 판정된
몫만으로 만점에 가까운 값을 받아 완주 판보다 높게 나올 수 있다는 문제가
있었다 — 실측(core-records.test.ts)으로 확인.
