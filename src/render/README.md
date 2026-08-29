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

overlap 기반 노트 채색(`noteColor`/`noteHeadColorAt`)과 `noteSkin` 전환,
카운터·정확도·score·게이지 채색·sudden·key 빔·곡정보 띠·text event는 아직
없다(M2-5·M2-6).
