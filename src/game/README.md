# game — 플레이 인터랙션

파일 접두사 `game-*`. `edit`과 **형제 축**이며 서로를 모른다.

play 엔진은 호스트를 모르고 `CTX` 하나만 본다 → `_plan/architecture.md` §3

정의 → `_plan/architecture.md` §1

`game-ctx.ts`(CTX 타입)·`game-engine.ts`(lead-in→곡 종료 시계)가 M2-3 범위다.
`curMs`는 항상 wall-clock 기준이고(`env-audio.getPositionMs()`를 매 프레임
재동기화에 안 쓴다, 원본 `play.js` `playLoop` 보존), 엔진이 매 프레임 쓰는
CTX 필드는 `sharedMs` 하나뿐이다.

`game-judge-input.ts`(env-input → `judgeKeyDown`/`judgeKeyUp` 결선)·
`game-judge-autoplay.ts`(입력 없이 정확한 타이밍에 자동 판정)·
`game-judge-display.ts`(콤보 제외 판정 표시 상태 — 콤보는 `JudgeState.combo`가
이미 갖고 있어 중복 회계를 안 만든다)·`game-session.ts`(위 전부를 한 세션으로
묶는 host 배선)가 M2-4다.

`game-judge-input.ts`가 받는 `KeyEvent.timestampMs`는 **wall-clock**이다
(env-input) — judge가 받는 `rawMs`는 chart-relative ms라 `game-engine.ts`의
`wallClockToChartMs`(엔진 시계와 같은 식)로 변환한 뒤 넘긴다. 처음엔 이
변환 없이 잘못 넘겨 lead-in 직후 keydown이 이미 지난 노트로 오판되는 버그가
있었다 — `game-session.test.ts`가 그 경계를 잡는다.

autoplay는 원본 `play.js`의 autoplay(스케줄러가 `applyJudgment`/
`applyTailSuccess`를 입력 우회로 직접 호출)와 같은 경로를 쓴다 —
`core-judge.ts`의 `commitJudgment`·`closeTail`을 물리 키 없이 직접 부른다
(closeTail을 이 목적으로 export함, 사용자 확인: "원본과 같은 경로로 가기").
`commitJudgment(..., entry.startMs)`로 불러 `diff`가 항상 0이다 — autoplay는
판정 오차가 없다.

mid-start·Resume·gauge·HUD·히트음 스케줄링(env-audio lookahead)은 M2-5.
