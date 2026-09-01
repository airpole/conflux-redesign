# core — 순수 로직·계산

파일 접두사 `core-*`. 브라우저 API를 **하나도** 쓰지 않는다. Node 하네스에서 import해 돈다.

전역 상태를 import하지 않고 활성 chart를 인자로 받는다. 캐싱이 필요하면 호출측이 메모이즈한다.

정의·의존 규칙 → `_plan/architecture.md` §1·§2

`core-i18n.ts`는 **real per-locale content**(이해가 목적인 에러/안내 문장 등)만
다루는 최소 조회 테이블이다 — 짧은 UI 라벨(버튼·필드·nav·판정/state/tier/rank
이름·고유명사)은 locale과 무관한 canonical English를 화면 코드에 직접 쓰고 이
테이블을 거치지 않는다(`ui-design.md` §2.5/§2.6이 그 구분의 단일 출처).
plural rule·RTL 같은 전체 i18n 런타임은 없다 — 지금 번역 대상 표면이 그 정도로
작다. locale 감지(브라우저 locale)는 env 레이어 몫이며 여기는 아직 배선하지
않는다.

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

`core-song-select.ts`는 M4-3 범위다([[song-select]] §1~§5, `ui-design.md`
§2.5). row/slot 구성(Representative Chart의 title/musicBy를 row 대표값으로
— [[cfx]] §6), category 필터, sort 9축 전부를 구현한다. **groupBy는 3축뿐이다**
(`none`/`updated`/`title`, song 공통 축) — `level`/`difficulty`/`state`/`rank`
(chart 분기 축)는 "기록 없는 chart가 그 축의 folder에 들어가는지"가 스펙에
없어 결정 필요 항목으로 미뤘다(D-2026-084). `chartId 6+`(추가 chart)도
cursor·페이지 상태가 있어야 의미가 생겨 M4-4로 미룬다 — 고정 슬롯 1~5만
채운다.

M4-4가 여기에 커서(`CursorTarget`/`CursorPosition`/`locateCursor`/
`cursorTarget`/`moveCursorHorizontal`/`moveCursorVertical`)와 검색
(`matchesSearch`/`filterBySearch`, NFC+대소문자 무시, 공백 분리 AND,
`title`/`musicBy`/`subtitle` 대상)을 더했다([[song-select]] §6·§7).
`SongSelectViewState`/`RecordCellMode`/`CursorTarget`은 여기가 단일 출처다
— `game-viewstate.ts`·`scene-song-select.ts` 둘 다 여기서 import한다
(처음엔 각자 로컬 정의를 뒀다가 타입 불일치가 나 여기로 모았다). 커서는
`{songId, chartId}`로 식별한다(row/slot 좌표가 아니다) — 정렬·필터가
바뀌어도 같은 chart를 계속 가리키게 하려는 것이며, 가리키던 chart가
사라지면 `locateCursor`가 첫 항목으로 대체한다(§8 fallback). column
affinity(같은 열 → 더 낮은 열 → 더 높은 열, 직전 열은 기억하지 않음)는
`moveCursorVertical`에 그대로 구현했다(§7).
