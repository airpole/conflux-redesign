# 동등 뮤턴트 대장

생존 뮤턴트는 (a) 테스트를 추가해 죽이거나 (b) 여기 사유와 함께 등재한다.
등재 사유는 "값이 같아지는 이유" 한 문장이어야 한다. 도달 불능도 사유가 된다.

| 자리 | 뮤테이션 | 동등 사유 |
|---|---|---|
| core-gauge.ts `tierBelow` | `-1→+1` | normal tier는 탈락 조건이 없어 사다리 바닥 아래로 내려가는 호출이 도달 불능 |
| core-gauge.ts `resetGauge` unitScale | `>→>=` | totalUnits 0이면 판정 이벤트 자체가 없어 unitScale이 읽히지 않음 |
| core-gauge.ts `applyGaugeChange` | `>→>=` | delta 0은 스케일 여부와 무관하게 0 |
| core-judge.ts `commitJudgment` fastSlow | `<→<=` | diff 0은 |diff|≤25라 항상 SYNC로 걸러져 분기 도달 불능 |
| core-judge.ts `buildJudgeNotes` tailMs | `>→>=` | duration 0이면 양쪽 다 startMs |
| core-shape.ts `applyEasing` clamp | `<→<=`, `>→>=` | 경계값 0·1에서 clamp 결과 동일 |
| core-shape.ts `chainValueAt` | `<=→<` (duration) | duration<0이면 다음 분기(tick≥end)가 같은 값을 확정 |
| core-timing.ts `segmentAt` 루프 | `>=→>` | i=0 미검사여도 found 초기값이 segments[0] |
| core-timing.ts `tickToMeasure` | `<→<=` (tick<0) | tick 0은 양 분기가 같은 "1"을 냄 |
| core-timing.ts `measureToTick` | `<=→<` (measure≤0) | measure 0은 외삽 식과 루프 식이 같은 값 |
| core-timing.ts `measureToTick` 루프 | `<→<=` | 마지막 세그먼트가 Infinity 마디라 항상 루프 안에서 반환 |
| core-overlap.ts `endOf` | `>→>=` | duration 0이면 양쪽 다 startTick |
| core-overlap.ts overlaps (첫 <) | <→<= | 정렬 뒤 hold끼리는 a.startTick === b.end가 성립할 수 없다(b.duration>0) — 도달 불능 |
