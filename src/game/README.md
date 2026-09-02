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

M2-7: `game-visibility.ts`(`attachAutoPause`)·`game-pause-keys.ts`
(`attachPauseKeys`)가 붙었다 — 둘 다 `session.pause()`(멱등, 이미 pause
상태거나 끝난 세션엔 아무 일도 안 함)를 호출만 하는 얇은 이벤트 배선이다.
전자는 `visibilitychange`의 `document.hidden`만 보고 `blur`는 무시한다
(`scene.md` §9). 후자는 Escape/Backspace `keydown`에서 `preventDefault()`
후 pause한다 — 전체화면 중 Esc는 브라우저에 예약돼 있어(D-2026-052)
Backspace가 실제 대체키다.

**M4-5가 실제 host를 붙였다** — pause overlay UI·`env-audio.decode()` 배선·
`game-records.ts` 실제 호출은 `src/scene/scene-gameplay.ts`가 맡는다(아래
참조와 `src/scene/README.md`). quick options 패널 UI는 여전히 없다
(M4-7 범위).

`game-records.ts`는 M3-7 범위다([[records]]). `core-records.ts`의 순수
병합·no-record gate를 `env-storage`의 `records` store(M3-1, key=
`songId:chartId`)에 잇는다 — `saveRecordIfEligible`이 init(`chartId 0`)과
no-record 조건을 걸러 store를 건드리지 않는다. `game-session.ts`의
`finalize`에서 실제로 이 함수를 부르는 배선(M4-5, `app-main.ts`의
`onGameplayFinished`)이 붙었다 — no-record 4조건 중 `midStart`·
`editorOrigin`은 song-select에서 들어오는 이 진입 경로에서 항상 `false`다
(mid-start·editor test host가 아니다 — 그 host들은 여전히 없다, M5).

`game-settings.ts`는 M4-5 범위다([[settings]]). `env-storage`의 `settings`
store(M3-1, `edit-workspace.ts`의 고정 key 패턴을 따라 key=`'current'`)에서
`readSettings`로만 읽는다 — settings 4 scene(M4-6, 실제 값을 바꾸는 UI)이
아직 없어 `writeSettings`는 두지 않았다. `core-settings.ts`의 순수
`mergeSettings`를 그대로 재사용한다(`game-viewstate.ts`와 같은 패턴).

`game-song-select.ts`의 `loadPlayableChart`는 M4-5 범위다 — `loadSongSelectRows`와
같은 decode 경로(`format-cfx-load.ts`)로 songId+chartId 하나의 chart
전체(notes 포함)와 음원 bytes를 얻는다. gameplay 진입([[scene]] §5)에
쓰인다.

`game-song-select.ts`는 M4-3 범위다([[song-select]]). `env-storage`의
`library` store를 `format/format-cfx-load.ts`의 `loadCfxPackage`로 decode해
`core-song-select.ts`가 먹는 `SongChartInput[]`으로 바꾸고, `game-records.ts`의
`readRecord`로 각 chart의 기록을 붙인다. library entry 원시 읽기(`storage.keys`/
`storage.read`)는 `edit-cfx-library.ts`의 래퍼를 거치지 않고 `StorageEnv`를
직접 부른다 — 그 래퍼들은 한 줄짜리 pass-through라 옮길 실익이 없었다(D-2026-085).
`.cfx` decode 로직 자체가 `edit`↔`game` 형제 제약(`architecture.md` §1)에
걸려 있었던 문제는 `format/` 신설로 풀었다 — 자세한 경위는 `src/format/README.md`.
M4-4가 `loadPreviewAsset`을 더했다 — 커서가 멈춘 chart 하나의 음원 bytes+
`previewStartMs`만 그때 다시 읽어 decode한다(`loadSongSelectRows`는 row를
만들고 나면 asset bytes를 들고 있지 않는다 — 모든 곡 음원을 한꺼번에
메모리에 올리지 않으려는 것).

`game-viewstate.ts`는 M4-4 범위다([[song-select]] §12). `env-storage`의
`viewState` store(M3-1, `edit-workspace.ts`의 고정 key 패턴을 따라 key=
`'song-select'`)에 `category`/`groupBy`/`sortKey`/`sortDir`/`recordCellMode`/
`lastSelected`(이 6개만 — 검색어·folder 접힘·페이지 인덱스는 영속 안 함,
§12)를 잇는다. `SongSelectViewState`/`RecordCellMode`/`CursorTarget` 타입은
여기서 재정의하지 않고 `core-song-select.ts`에서 그대로 가져온다(단일
출처). 병합 규칙(알 수 없는 키 폐기, 필드 단위 기본값 복귀)은 `settings.md`
§4 원칙을 유추 적용한 것이지 §12에 직접 명시된 건 아니다 — 필요하면
재검토.

`game-song-preview.ts`는 M4-4 범위다([[song-select]] §10). 커서가 멈춘 뒤
`PREVIEW_DELAY_MS` 지나야 재생 시작(그 전에 커서가 다시 움직이면 취소),
`metadata.previewStartMs`부터 재생, `PREVIEW_LOOP_MS`마다 루프, 마지막
`PREVIEW_FADE_OUT_MS` 동안 fade out. `AudioEnv.setVolume`이 즉시 값을
바꾸는 API라(램프 예약 API 없음) fade는 짧은 간격(`FADE_STEP_MS=100ms`)
마다 volume을 계단식으로 낮추는 근사다 — 매끄러운 WebAudio 램프가
필요해지면 `env-audio.ts`에 램프 API를 추가하는 별도 작업(결정 필요
항목으로 보고).
