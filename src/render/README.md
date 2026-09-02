# render — 캔버스 드로잉

파일 접두사 `render-*`. core 지오메트리를 받아 env가 만든 캔버스에 **칠하기만** 한다. 상태를 바꾸지 않는다.

표현 값(색·draw order·치수)의 단일 출처는 `render/theme.md`.

정의 → `_plan/architecture.md` §1

`render-layout`(순수 기하)·`render-theme`(표현 값 상수)·`render-playfield`(shape 경계·
lane 구분선·note·판정선 idle 트랙)가 M2-2 범위다. canvas API는 `DrawContext`로 함수
인자 주입 — env-*와 같은 이유로 jsdom 없이 mock 계약 테스트가 성립한다.

M2-4 범위: `drawCombo`·`drawJudgmentText`·`drawFastSlow`·hit effect
(`computeHitEffectVisual`+`drawHitEffect`). render는 game보다 아래층이라
`game-judge-display.ts`를 import하지 않는다 — 구조가 같은 값(judgment·atMs
등)만 인자로 받는다. hit effect는 판정선 위쪽 반원 하나로 단순화했다(원본은
위/아래를 note 쪽에 따라 가르고 Hold는 tail까지 지속하는 별도 애니메이션).

M2-5: `drawGaugeBar` — 라이브 게이지 바(판정선 겸용). `drawPlayfield`가 그린
idle 트랙(`drawJudgeTrack`) 위에 덧그린다. `hard`는 항상 빨강, `normal`은
`NORMAL_CLEAR_PCT`(75%) 미만 초록 → 이상 하늘색 반전(`render/theme.md` §1
gauge, `GAUGE_COLOR`).

overlap 기반 노트 채색(`noteColor`/`noteHeadColorAt`)과 `noteSkin` 전환,
score 표시는 아직 없다.

M4.5-1(D-2026-090)이 M2 이후 미뤄뒀던 HUD 나머지를 채웠다 — jacket 배경
(`drawJacketBackground`, `drawPlayfield`에 `jacket` 선택 인자로 끼워 넣음,
`DrawContext.drawImage` 신설)·key 빔(`drawKeyBeams`)·마디선/step 선
(`drawMeasureLines`, 이제까지 안 쓰이던 `SHAPE_STEP_LINE`도 함께 씀)·
sudden 커버(`drawSuddenCover`)·text event(`computeActiveTextEvents`+
`drawTextEvent`, 3분할 컬럼/lane1~4)·카운터·퍼센트(`drawCounterPercent`)·
곡정보 띠(`drawSongInfoStrip`)·canvas pause 아이콘(`drawPauseIcon`+
`pauseIconHitTest`, 클릭 판정은 순수 함수로 분리해 scene 층에서 hit-test만
가져다 쓴다). 전부 `render/theme.md`가 원본에서 실측해 둔 값 그대로다 —
새 디자인이 아니라 뒤늦은 배선(`scene/ui-design.md` §2.10 참조). 판정
텍스트에 지속시간(`HUD_TEXT.judgmentFlashMs`)이 새로 생겼고, 카운터·퍼센트
행이 판정 텍스트와 FAST/SLOW 사이에 끼어들며 `drawJudgmentText`가
`nowMs`를 받게 됐다(신호는 FAST/SLOW와 같은 패턴) — 자세한 이유는
DECISION_LOG D-2026-090.
