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
(env-input) — judge가 받는 `rawMs`는 chart-relative ms라 `EngineSession.
toChartMs`(호출측이 넘긴다)로 변환한 뒤 넘긴다. 처음엔 세션을 연 시점의
`startNowMs`만으로 고정 계산했는데, pause·Resume이 시계 기준점을 다시 잡는
걸 반영 못 해 재개 이후 값이 어긋나는 문제가 있었다 — 그래서 독립 함수가
아니라 엔진이 매번 "지금 기준점"으로 계산하는 세션 메서드다.

autoplay는 원본 `play.js`의 autoplay(스케줄러가 `applyJudgment`/
`applyTailSuccess`를 입력 우회로 직접 호출)와 같은 경로를 쓴다 —
`core-judge.ts`의 `commitJudgment`·`closeTail`을 물리 키 없이 직접 부른다
(closeTail을 이 목적으로 export함, 사용자 확인: "원본과 같은 경로로 가기").
`commitJudgment(..., entry.startMs)`로 불러 `diff`가 항상 0이다 — autoplay는
판정 오차가 없다.

M2-5: `game-engine.ts`에 pause/resume이 붙었다 — pause는 그 시점 값(anchor)에
`ctx.sharedMs`를 얼리고, resume은 `RESUME_LEAD_MS` 카운트다운(chart 시간
정지) 뒤 **같은 anchor에서 되감기 없이** 이어 흐른다(`judge.md` §10 "Pause
Resume"). `paused` 동안은 `game-judge-input.ts`가 `judgeKeyDown`/`Up` 대신
`registerKeyDown`/`Up`(시각을 안 받는 등록 진입점, `judge.md` §9)만 부른다.
`game-session.ts`에 `core-gauge.ts`(게이지·clear/fail) 배선이 붙었다 —
`applyGaugeChange`를 판정 이벤트마다 먹이고, `forceEnded`가 뜨면(terminate
모드 사망) 그 프레임 끝에서 `computeResult`로 `result`를 확정하고 세션을
멈춘다. 자연 종료(songEnd)도 같은 `finalize`를 거친다.

`game-session.ts`는 판정 성공(tap/hold-head, MISS·tail 닫힘 제외)마다
`env-audio.playHitSound`를 즉시 호출한다(D-2026-050, `hitSound: HitSoundSource
| null` 옵션 — null이면 무음). 원본은 manual(즉시)과 autoplay(150ms lookahead
스케줄러)를 따로 뒀지만, 이 세션은 두 경로가 이미 같은 `applyEvents`를 공유해서
(사용자 확인: "원본과 같은 경로로 가기") 별도 스케줄러 없이 양쪽 다 즉시
재생으로 단순화했다 — autoplay 히트음이 최대 한 프레임(~16ms) 늦을 수 있다.

**아직 없는 것**: pause overlay UI(scene/render, 이 파일들은 상태 기계만 다룸),
quick options 패널 UI(scene/render — `core-quick-options.ts`에 조작 로직은
이미 있다).
