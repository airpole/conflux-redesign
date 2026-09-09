# INDEX-SPEC — 문서 헤딩 트리 (depth ≤ 3)

> 기계 생성물. `node tools/review/dossier.mjs`. 손으로 고치지 마라.

| | |
|---|---|
| 기준 커밋 | `6f4214e79ada390aedb5b3ab17bf1de90db6c15c` |
| 브랜치 | `claude/astra-6-code-review-orchestration-rnhyvm` |
| raw base | `https://raw.githubusercontent.com/airpole/conflux-redesign/claude/astra-6-code-review-orchestration-rnhyvm` |
| 생성 시각 | 2026-09-05T05:27:34.297Z |

원문이 필요하면 **raw base + `/` + 파일 경로**로 URL 을 만들어 직접 fetch 해라.
예: `https://raw.githubusercontent.com/airpole/conflux-redesign/claude/astra-6-code-review-orchestration-rnhyvm/core/timing.md`

각 정의가 **어느 문서 어느 절에 사는지**의 색인이다. single-source 위반 후보를 여기서 좁혀라.
`DECISION_LOG.md` 는 `DOSSIER.md` §2 가 대신한다.

---

### `CLAUDE.md`

- L1 Claude Code Instructions — Conflux Redesign
  - L5 1. 역할
  - L15 2. Source of Truth
  - L28 3. 작업 시작 전
  - L42 4. 범위 규칙
  - L50 5. 자율적으로 수행 가능한 변경
  - L64 6. 사전 승인이 필요한 변경
  - L81 7. 문서 작업 원칙
  - L91 8. 코드 작업 원칙
  - L100 9. 검증
  - L114 10. 완료 보고
  - L143 11. 커밋 규칙
  - L152 12. 금지 사항

### `DESIGN_PRINCIPLES.md`

- L1 DESIGN PRINCIPLES
  - L10 1. Behavior and User Experience First
  - L19 2. Prefer the Simplest Understandable Structure
  - L30 3. Reduce Concepts Before Adding Them
  - L39 4. Keep One Source and One Name
  - L48 5. Let the Specification Lead
  - L57 6. Make Structure Follow Behavior
  - L66 7. Optimize for Long-Term Change
  - L75 Decision Priority

### `PROJECT-OPERATING-GUIDELINE.md`

- L1 Conflux Redesign Project Operating Guideline
  - L3 목적
  - L13 1. Source of Truth
  - L27 2. Session Startup Protocol
  - L57 3. Design Philosophy
    - L63 Observed
    - L67 Intended
    - L71 Designed
  - L79 4. Decision Process
  - L99 5. Convergent Discussion Model: C → B → A
    - L103 C — Recommendation First
    - L116 B — Focused Issue Set
    - L122 A — Single Deep Question
  - L130 6. Topic Classification
    - L134 Direct Dependency
    - L138 Change Tracking
    - L142 Deferred Topic
  - L150 7. Question Protocol
    - L154 반드시 사용자에게 물어야 하는 항목
    - L163 Design Steward가 자율적으로 처리할 항목
  - L188 8. Progress Visibility
  - L203 9. Scope Rule
    - L207 Discussion Scope
    - L211 Change Scope
  - L226 10. Design Review
    - L230 Behavioral Review
    - L236 Structural Review
    - L243 Implementation Review
  - L252 11. Closure Judgment
    - L258 Design Complete
    - L267 Design Incomplete
    - L271 Out of Current Scope
  - L279 12. Role Separation
    - L281 User — Product Owner
    - L288 Design Steward — 설계 담당 AI (현재 Claude)
    - L301 Claude Code — Implementer
  - L315 13. Claude Code Authority
  - L343 14. Deliverable Declaration
  - L367 15. Definition of Good Design
  - L384 16. Working Principle
  - L398 17. Session Completion

### `README.md`

- L1 Conflux — 재설계 명세 (Spec)
  - L8 이 레포의 원칙
  - L20 문서 지도
    - L22 Project governance
    - L33 `core/`
    - L47 `render/`, `scene/`, `editor/`
    - L58 `_meta/`
    - L68 `_plan/`·받침 문서
  - L80 확정된 핵심 결정
    - L82 데이터 구조
    - L89 판정 / gauge
    - L96 shape / lane / grid
    - L102 파일 / 영속
  - L117 아키텍처 방향
  - L129 작업 방식
  - L138 진행 상태
    - L140 Current Focus
    - L147 Completed
    - L496 Deferred
    - L504 다음 후보

### `REVIEW_CHECKLIST.md`

- L1 REVIEW CHECKLIST
  - L5 Severity
  - L15 1. Behavior
  - L24 2. Simplicity
  - L34 3. Single Source and Vocabulary
  - L43 4. Responsibility and Dependencies
  - L52 5. Specification Completeness
  - L61 6. Implementation Readiness
  - L71 Closure Gate
  - L85 Review Output
- L88 Review: <document>
  - L94 🔴 Must Fix
  - L97 🟡 Needs Decision
  - L100 Improvements Applied
  - L103 Closure Gate

### `_extracted/EXTRACTED_FACTS.md`

- L1 현황 추출 (EXTRACTED FACTS)
  - L11 1. 시간 해상도 / 채널
  - L24 2. 판정창 (Judgment Windows, ms)
  - L42 3. 게이지 (Gauge) — gauge.js / constants.js 실측
    - L44 공식
    - L52 Normal 게이지 (회복형, 길이 무관)
    - L67 Hard 게이지 (생존형)
  - L86 4. 클리어 마크 / 락 / 랭크
    - L88 클리어 마크 락 (`LOCK_TIERS`)
    - L95 랭크 (백만점제, `RANK_TABLE`, 높음→낮음 첫 도달)
    - L109 기록 적격성 (recordEligible)
  - L114 5. 색상 (Colors) — constants.js 실측
    - L119 노트 렌더
    - L130 게이지 / 상태
    - L142 Shape 에디터 선
  - L155 6. 입력 / 키 바인딩 — constants.js 실측 (GitHub 최신)
    - L157 레인 키 (`DEFAULT_KEYS`, 6키)
    - L169 액션 키 (`DEFAULT_ACTION_KEYS`, 비레인)
  - L178 7. 배속 (SPEED / 배속) vs Pitch — 절대 혼동 금지
  - L190 8. 리드인 / 타이밍 상수
    - L200 8.1 LN tail 처리 — `play-input.js` `handlePlayKeyUp` 실측
  - L223 9. 차트 데이터 모델 (state.js의 `D`)
    - L237 shapeEvents 필드
    - L243 lineEvents 필드 (⚠️ 핵심 미완성 영역)
    - L248 shape 위치 스냅
  - L253 10. Scene 시스템 — 인프라만 존재 (scene-manager.js 실측)
    - L255 구현된 것
    - L262 존재하는 씬 파일
    - L270 없는 씬 (구 코드에 파일 부재)
  - L279 11. 아키텍처 부채 현황 (재구현 시 청산 대상)
    - L288 의존성 레이어 (현재)
  - L306 12. M2-2 렌더 레이아웃 전수 (`_plan/build-order.md` §3 M2-2 항목)
    - L310 12.1 playfield 사각형 (`gw`/`gh`/`gx`/`gy`)
    - L322 12.2 판정선 Y (`jY`)
    - L332 12.3 lane 구분선 굵기 · shape 경계 굵기 · 색
    - L346 12.4 shape 좌표 → canvas px 매핑
    - L359 12.5 콤보/판정/카운터/정확도 블록 (`drawUnifiedHUD`)
    - L371 12.6 게이지 바 위치 · 75% 색 반전
    - L382 12.7 히트 이펙트 반지름 · sudden lane cover
    - L388 12.8 판정 텍스트(FAST/SLOW) 위치
    - L392 12.9 lane 최소 간격 px — 원본에 대응물 없음 (`없음`) → 제한 없음으로 확정 (D-2026-048)
  - L398 13. M5-3 전 게이트 — 히트 반경·드래그 임계 (`editor-editing.md` §8 잔여)
    - L402 13.1 note 클릭 히트 반경
    - L412 13.2 클릭↔드래그 판별 임계값
    - L426 13.3 확정값
  - L433 14. viewMs 기본값·zoom 범위 파생 (D-2026-098) — 실측이 아니라 해석적 결정
    - L442 14.1 유도
    - L456 14.2 기준 tempo 선택 — 120bpm
    - L468 14.3 확정값 (120bpm 기준)
  - L482 15. M5-4 前 게이트 — shape 보조 툴("normalize") 계승 여부, 히트 반경·드래그 임계 (D-2026-099)
    - L484 15.1 "normalize" 보조 툴은 존재하지 않는다
    - L532 15.2 shape 편집 히트 반경·드래그 임계 재실측
    - L548 15.3 확정값
  - L559 부록: 온라인에서 추가 추출 필요한 placeholder 목록

### `_extracted/timing-verification.md`

- L1 timing 재설계 검증 기록
  - L9 1. 현재 로직이 실제로 하는 일
  - L27 2. 검증: 단순화 재설계안 vs 현재
    - L42 bpmAt 음수-tick 차이 (무해)
  - L50 3. 결론 (timing.md에 반영)

### `_meta/cfx.md`

- L1 cfx — chart 파일·.cfx 배포 포맷 단일 출처
  - L9 1. 두 층 구조 `[번복]`
  - L23 2. chart `.json` — 독립 작업 문서 `[번복]`
  - L36 3. songId — song의 UUID `[번복]`
  - L47 4. chart identity
  - L70 5. difficulty·subtitle
  - L81 6. init과 Representative Chart `[번복]`
  - L101 7. asset 참조 `[번복]`
  - L119 8. `.cfx` — 평탄 ZIP `[번복]`
    - L139 `.cfx` 파일명 `[번복]`
  - L151 9. 패키징 입력·후보 선택 `[신규]`
  - L171 10. 패키징 검증
  - L194 11. 패키징 상태 전이
  - L211 12. `.cfx` loader
    - L213 12.1 구조 검증
    - L227 12.2 decode 규칙
  - L243 13. `.cfx`를 에디터에서 열기
  - L255 14. library·records 경계
  - L264 15. 구 포맷 비호환
  - L270 16. 결정 완료 / 잔여

### `_meta/manual-qa.md`

- L1 manual-qa — 자동 검증 밖 항목의 사람 확인 목록
  - L24 QA-1 — Hold 동시 소유 (Wide Hold 소유권 이양)
  - L69 QA-2 — mid-start crossing-Hold 시드
  - L98 QA-3 — pause/Resume 정지 카운트다운 재개
  - L132 항목 추가 시 형식
  - L135 QA-N — <제목>

### `_meta/persistence.md`

- L1 persistence — 영속성 단일 출처
  - L9 1. 스토어 5분리 `[수정]`
    - L19 settings와 viewState의 구분
    - L30 쓰기 실패 `[신규]`
  - L36 2. 파일 저장 모델과 정본 `[번복]`
  - L45 3. 단축키 `[번복]`
  - L57 4. version 저장 `[번복]`
    - L69 신규 chart 첫 저장
  - L78 5. dirty와 세션 전환 `[신규]`
  - L116 6. workspace — dirty 전용 복구 슬롯 `[번복]`
  - L147 7. 새 song과 init `[번복]`
  - L166 8. 새 난이도 `[번복]`
  - L196 9. editor 진입·열기
    - L207 chart JSON
    - L214 `.cfx`
  - L228 10. chart JSON asset — 열기·누락 처리 `[번복]`
  - L259 11. `.cfx` 패키징 UX `[신규]`
  - L277 12. game library — editor와 분리
    - L288 같은 songId reimport
    - L302 삭제
  - L308 13. records 경계
  - L320 14. 결정 완료 / 잔여

### `_meta/records.md`

- L1 records — 플레이 기록 단일 출처
  - L10 1. 저장 단위 — chart당 1개
    - L21 내용 변경과 기록 (D-2026-017)
  - L30 2. 스키마 `[번복]` (D-2026-070)
  - L50 3. 갱신 규칙 `[번복]` (D-2026-070)
  - L64 4. 기록 초기화 `[신규]` (D-2026-017)
  - L76 5. no-record
  - L88 6. 소비처
  - L96 7. 결정 완료 / 잔여

### `_meta/settings.md`

- L1 settings — 플레이어 설정 단일 출처
  - L9 1. 성격 — chart 데이터가 아니다 `[번복 반영]`
  - L19 2. category
    - L21 PLAY — input·audio sync
    - L29 SOUND `[신규]` (M3.5-2, D-2026-075)
    - L63 VISUAL
    - L74 GAUGE
    - L78 OPTION — quick per-play changes
  - L98 3. editor settings — chart data가 아닌 editing aid
  - L108 4. 기본값과 병합 (`DEFAULT_SETTINGS`) `[신규]`
    - L140 병합 `[수정]`
  - L154 5. 결정 완료 / 잔여

### `_plan/architecture.md`

- L1 architecture — 레이어·의존 단일 출처
  - L9 1. 레이어 8층
    - L30 1.1 `format` 신설 이유 (D-2026-085, M4-3)
    - L55 env로 개명한 이유 (구 plat)
    - L58 경계 예시 (env vs render vs 위층)
    - L75 env 내부 세분 `[신규]`
  - L94 2. core는 데이터를 인자로 받는다 (현재와의 차이)
  - L107 3. 호스트 seam — play 엔진은 호스트를 모른다 [보존]
  - L132 4. 빌드 게이트 — 형제 축을 켜고 끈다
    - L136 플래그
    - L146 빌드 프로필
    - L157 코드 제거 `[번복]`
    - L165 읽는 위치
  - L171 5. scene은 두 그래프를 담는 메커니즘
  - L184 6. 결정 완료 / 잔여

### `_plan/build-order.md`

- L1 build-order — 재구현 순서와 gate
  - L8 0. 읽는 법
    - L16 레포 배치
  - L30 1. 원본 대조 회귀
    - L34 core 골든 테스트
    - L69 수동 대조 시나리오
    - L75 env 계약 검사 (M2-1) `[신규]` (D-2026-047)
  - L91 2. gate 목록
  - L119 3. 실측 gate
    - L123 M1 진입 전
    - L128 M2-2 전 — **해소** (`_extracted/EXTRACTED_FACTS.md` §12)
    - L136 M5-3 전 — **해소** (`_extracted/EXTRACTED_FACTS.md` §13)
    - L142 M5-1 이후(notes/shapes 실 렌더) 전 — **해소** (`_extracted/EXTRACTED_FACTS.md` §14)
    - L149 M5-4 전 — **해소** (`_extracted/EXTRACTED_FACTS.md` §15)
    - L155 M5-6 전
  - L163 4. M1 — core + 테스트 하네스
  - L185 5. M2 — minimal play
  - L221 6. M3 — persistence + `.cfx`
  - L259 6.5. M3.5 — ui-design 전체
  - L294 7. M4 — game graph
  - L314 7.5. M4.5 — gameplay HUD·pause overlay 디자인
  - L350 7.6. M4.6 — quick options overlay 디자인
  - L390 8. M5 — editor
  - L553 8.5. M5.5 — editor UI 디자인
  - L592 9. M6 — cleanup
  - L697 10. 결정 완료 / 잔여

### `_rationale/rationale.md`

- L1 설계 근거 (Rationale)
  - L7 판정·gauge
    - L9 judgment을 threshold table로 둔 이유
    - L12 gaugeMode를 단일 축 6종으로 둔 이유
    - L15 state를 성적으로 산출하고 모드로 산출하지 않는 이유 `[보존]`
    - L18 terminate를 게이지 0이 아니라 `forceEnded`로 표현한 이유 `[번복]`
    - L21 gauge를 2값 병렬 + tier 단일 구조로 통일한 이유
    - L24 cascade의 hard 탈락을 래칫으로 둔 이유
    - L27 cascade result 막대를 최종 티어 기준으로 바꾼 이유 `[번복]`
    - L30 state에서 P를 F로 흡수한 이유
    - L33 hold tail 특례를 폐기한 이유
    - L36 hold release 임계를 원본과 같은 150ms로 되돌린 이유 `[번복]`
    - L43 후보 순서를 단일 결정론 규칙으로 둔 이유
    - L46 Normal Hold를 lane 익명 수요로 둔 이유
    - L49 WideHold를 단일 소유·원자적 이양으로 둔 이유
    - L52 전체 6키 global conflict를 별도 스코프로 둔 이유
    - L55 Hold head MISS를 2단위로 확정한 이유
    - L58 영속 note ID를 도입하지 않은 이유
  - L63 공통 duration·grid
    - L65 duration 규칙을 공통으로 올린 이유
    - L68 subdivision을 time signature와 분리한 이유
    - L71 gridDivisor를 분음표 표기로 바꾼 이유
    - L74 laneGridDivisor를 분리한 이유
    - L77 sub 격자 통일의 대가와 처분 (D-2026-045)
  - L85 shape·lane
    - L87 shape 좌표를 -8~+8로 저장하는 이유
    - L90 init fallback을 -2/+2로 둔 이유
    - L93 Step·Arc를 input label로만 둔 이유
    - L96 anchor/transition type을 나누지 않은 이유
    - L99 isBlue를 chain identity로 둔 이유
    - L102 lane data를 unconstrained로 둔 이유
    - L105 laneEvents와 shape workflow를 공유하는 이유
  - L110 domain·render 분리
    - L112 input과 render를 분리하는 이유
    - L115 overlap/conflict를 derived domain으로 둔 이유
    - L118 overlap과 conflict 검출을 sweep-line n-way로 확장한 이유
    - L121 활성을 구간 표기가 아니라 점으로 정의한 이유
    - L124 초과 수를 검출 쪽이 함께 내는 이유
    - L127 conflict 삭제가 reverse insertion order인 이유
  - L132 settings·theme·scene
    - L134 measureLabelOffset을 editor setting으로 옮긴 이유 `[번복]`
    - L137 jacketBrightness를 global setting으로 둔 이유
    - L140 credit 값만 저장하는 이유
    - L143 cmod·hidden을 폐기한 이유
    - L146 song-select 이름을 유지하는 이유 `[번복 반영]`
    - L149 scene graph를 통일한 이유
    - L152 play mode와 gameplay scene을 가른 이유
    - L155 song-credit과 credits를 가른 이유
    - L158 overlay를 scene-owned로 둔 이유
    - L161 quick options를 공유하는 이유
    - L164 quick options 배치를 host 소유로 둔 이유
    - L167 settings를 category별 4 scene으로 나눈 이유
    - L170 theme를 별도 source로 둔 이유
    - L173 judge line raise 때 HUD strip도 이동하는 이유
    - L176 H와 F state color를 분리한 이유
  - L181 records·settings
    - L183 no-record gate를 하나로 수렴한 이유
    - L186 state P를 F로 흡수한 이유
    - L189 records를 별도 문서로 둔 이유
    - L192 automatic chartId migration을 제거한 이유 `[번복]`
    - L195 기록을 identity에 유지하고 수동 초기화로 돌린 이유 `[번복 반영 — 구 fingerprint 보류]`
    - L198 기록 초기화를 internal 빌드로 게이트한 이유
    - L201 다운그레이드 reimport를 confirm 후 허용한 이유
    - L204 서버 기반 기록을 보류한 이유
    - L207 constants와 settings의 분류 기준
  - L212 architecture
    - L214 plat을 env로 개명한 이유
    - L217 architecture를 layer source로 둔 이유
    - L220 core가 global data 대신 active chart를 받는 이유 `[번복 반영]`
    - L223 gameplay를 test의 restriction으로 보는 이유
  - L228 persistence·cfx
    - L230 store를 4분리한 이유
    - L233 chart JSON과 `.cfx` 두 층을 유지한 이유
    - L236 independent chart ownership으로 번복한 이유 `[번복]`
    - L239 persisted song container를 없앤 이유 `[번복]`
    - L242 explicit asset file reference가 필요한 이유 `[번복]`
    - L245 flat ZIP + global file-name uniqueness를 선택한 이유
    - L248 same-name identical asset만 합치는 이유
    - L251 user-selected packaging을 기본으로 둔 이유
    - L254 re-scan이 latest recommendation으로 돌아가는 이유
    - L257 Representative Chart가 display default만 제공하는 이유
    - L260 packaging을 non-destructive로 둔 이유
    - L263 whole-package rejection을 선택한 이유
    - L266 decode validation을 layer별로 나눈 이유
    - L269 library를 editor workspace와 분리한 이유
    - L272 debug dump를 폐기한 이유
    - L275 songId를 UUID로 둔 이유
    - L278 legacy converter를 탑재하지 않는 이유
    - L281 Ctrl+S를 version-gated 저장으로 바꾼 이유 `[번복]`
    - L284 Ctrl+E·derive·duplicate-as-new-song을 제거한 이유 `[번복]`
    - L287 workspace를 dirty 전용 복구 슬롯으로 좁힌 이유 `[번복]`
    - L290 세션 전환 시 Save New Version/Discard/Cancel 세 선택지를 둔 이유 `[신규]`
    - L293 새 난이도에 Start Blank/Use Current Chart 두 모드를 둔 이유 `[번복]`
    - L296 `.cfx`에서 init을 필수로 바꾼 이유 `[번복]`
    - L299 `.cfx` 파일명에 version을 넣은 이유 `[번복]`
    - L302 music 없을 때 편집·저장은 허용하고 패키징만 막는 이유
    - L305 jacket 기본을 순수 검정이 아닌 암색으로 둔 이유
    - L308 범용 jacket·미리듣기 기능을 이번 범위에 넣지 않은 이유
  - L313 editor
    - L315 meta scene을 Tab cycle에서 뺀 이유
    - L318 vertical axis를 time-proportional로 둔 이유
    - L321 editor-origin play를 no-record로 둔 이유
    - L324 symmetry axis를 dynamic snapshot으로 둔 이유
    - L327 chart structure edit를 undo 밖에 둔 이유
    - L330 붙여넣기를 스크롤 기준으로 두고 충돌을 조용히 스킵하는 이유
    - L333 mirror만 서브모드 필터의 예외로 둔 이유
    - L336 mirror axis를 0으로 고정한 이유
    - L339 editor를 single-chart session으로 둔 이유
  - L344 text event
    - L346 transition·mode를 폐기한 이유
  - L351 결정 상태
    - L375 하위 폴더 구조와 폴더 우선 진입을 기각한 이유 (D-2026-016 해소)
    - L385 pause를 카운트다운 재개로 바꾸고 기록을 유지한 이유 (D-2026-022)
    - L388 gauge 서술에서 lock 묶음말을 제거한 이유 (D-2026-022)
  - L404 song-select 목록 모델 (D-2026-025)
    - L406 왜 row = song, slot = chart인가
    - L412 왜 slot에 state 램프를 넣는가
    - L416 왜 preview를 지연 재생하는가
    - L420 왜 정렬 변경 시 커서를 유지하는가
    - L424 왜 category는 탭이고 groupBy 축이 아닌가
  - L430 records 스키마 (D-2026-026)
  - L438 chartId 5 = Phase (D-2026-027)
  - L444 viewState (D-2026-028)
  - L450 탭 백그라운드 auto-pause (D-2026-029)
  - L456 곡 종료 (D-2026-030)
    - L458 왜 tail을 3000ms 하나로 통일했나
    - L462 왜 musicEndMs에서 offset을 빼나
    - L466 왜 종료 조건에서 5000ms 하한을 뺐나
    - L470 왜 chartEndMs에 laneEvent를 포함했나
    - L474 왜 autoplay는 result를 거치지 않나
  - L480 updatedAt과 lane 매핑 승격 (D-2026-031)
    - L482 왜 updatedAt을 chart JSON 필드로 두었나
    - L486 왜 ISO 8601 문자열인가
    - L490 왜 import·패키징이 값을 덮지 않나
    - L494 왜 lane 매핑을 settings로 승격했나
  - L500 build-order (D-2026-032)
    - L502 왜 milestone 아래 step을 두었나
    - L506 왜 step 경계를 소프트하게 두었나
    - L510 왜 M3와 M4를 뒤집었나
    - L514 왜 완료 기준을 동작 문장으로 썼나
    - L518 왜 회귀를 두 층으로 나눴나
  - L524 M1 진입 gate (D-2026-033)
    - L526 왜 구현 코드를 명세 레포 안에 두나
    - L530 왜 플래그를 2개로 묶어 두나
    - L534 왜 빌드 프로필 기본값이 public인가
    - L538 왜 경로 차단이 아니라 코드 제거인가
    - L542 왜 레포는 안 가르고 빌드만 가르나
    - L546 왜 env를 6개로 가르나
    - L550 왜 골든 데이터를 소스 옆에 두지 않나
    - L554 왜 골든 입력을 합성 chart로 만드나
  - L560 골든 하네스 (D-2026-034)
    - L562 왜 스텁을 `audio.js` 하나로 끝냈나
    - L566 왜 허용 오차를 두 층으로 나눴나
    - L570 왜 골든 표에 원본 명칭을 쓰나
    - L574 왜 빈 표를 실패로 막나
    - L578 왜 합성 chart인가
  - L584 설계 대장 (D-2026-035)
    - L586 왜 골든을 판정자에서 관측자로 낮췄나
    - L592 왜 그래도 실패는 시키나
    - L598 왜 `미커버`까지 등재하나
    - L604 왜 judge 표를 통째로 격하하지 않았나
  - L612 chart 검증과 settings 기본값 (D-2026-036)
    - L614 왜 검증을 두 층으로 갈랐나
    - L622 왜 검증이 chart를 고치지 않나
    - L626 왜 `schemaVersion` 마이그레이션 체계를 지금 안 만드나
    - L630 왜 알 수 없는 키를 버리나
    - L634 왜 클램프가 아니라 되돌리나
    - L640 왜 `constants`를 골든으로 뜨나
  - L646 중간 시작·Resume (D-2026-040)
    - L648 왜 카운트다운 진입점이 시각을 받지 않나
    - L658 왜 시드 절차를 §6 재조정으로 접었나
    - L664 왜 anchor 근처 crossing Hold의 tail SYNC를 받아들이나
    - L672 왜 시드가 이벤트로 나가나
    - L678 왜 시드가 사전조건을 던지나
    - L684 왜 global 6키 conflict를 M1-8로 옮겼나
  - L694 체인 보간 (D-2026-043)
    - L696 왜 골든 shape 표를 통째로 다시 뽑았나
    - L706 왜 anchor를 "시작값 하나"로 두나
    - L716 왜 anchor 선택만 원본과 다르게 했나
    - L722 왜 같은 tick 정렬 규칙을 명문화했나
    - L726 왜 모르는 easing을 거부하지 않나
    - L732 왜 shape와 lane을 한 파일에 두나
    - L736 표를 고치는 조건

### `core/constants.md`

- L1 constants — 튜닝 수치 단일 출처
  - L11 1. 판정창 (ms, |diff| 기준)
  - L28 2. 게이지 증감 (`GAUGE_DELTA`)
  - L46 3. rank 임계 (`RANK_TABLE`, 백만점제, 높음→낮음 첫 도달)
  - L65 4. 스크롤 속도 범위 (`SCROLL_SPEED_*`)
  - L77 5. song-credit 연출 (`CREDIT_*`) `[신규]`
  - L87 6. textEvent fade (`TEXT_FADE_MS`) `[수정]`
  - L97 7. song-select `[신규]`
  - L112 8. 로딩 표시 `[신규]`
  - L122 9. 곡 종료 `[수정]`

### `core/data-model.md`

- L1 data-model — 데이터 구조 단일 출처
  - L8 1. 최상위 — 독립 chart
  - L45 2. metadata — chart 소유 `[번복]`
  - L68 3. timing·asset 참조 — chart 소유 `[번복]`
  - L85 4. chart identity·표시 필드
  - L109 5. note
    - L121 5.1 겹침 검출 — overlap / conflict (파생)
  - L182 6. shapeEvents
  - L196 7. laneEvents
  - L209 8. textEvents
  - L227 9. 런타임 상태 (저장 안 됨)
  - L250 10. 버전 / 교환
  - L258 11. 검증 `[신규]`
    - L262 structural — 이 파일이 chart인가
    - L274 domain — 값이 말이 되는가
    - L294 두 함수 모두 chart를 건드리지 않는다
  - L302 12. 결정 완료 / 잔여

### `core/gauge.md`

- L1 gauge — 게이지 / 클리어 / state
  - L9 1. gauge
  - L18 2. tier 사다리와 gaugeMode
  - L52 3. state
    - L74 state 종류 (7종)
  - L88 4. cascade
    - L99 검증 시나리오
  - L116 5. judgment 단위와 게이지 회계 `[번복]`
  - L134 6. 경계 — gauge가 다루지 않는 것

### `core/glossary.md`

- L1 Glossary — 개념 사전
  - L7 ⚠️ scrollSpeed 와 playbackRate — 절대 분리
  - L16 데이터 구조 (Chart / Song group) `[번복]`
  - L32 판정
  - L47 Note
    - L63 overlap / conflict / global conflict
  - L76 Lane / Shape
    - L78 5선 mental model
    - L88 용어
  - L100 Gauge / Result / Record
    - L110 identity
  - L123 Timing
  - L136 Scene
  - L149 Settings
  - L158 Build / Structure / File
  - L174 사용 규칙

### `core/judge.md`

- L1 judge — 입력 판정 / 노트 매칭
  - L10 1. 핵심 원칙 — 결정론적 후보 순서 `[번복]`
  - L38 2. 판정창 (window)
  - L56 3. lane 매칭·미러 (후보에서 제외되는 노트)
  - L70 4. 판정 확정 (commitJudgment)
  - L86 5. Runtime Hold 모델 — 익명 Normal 수요·Wide 단일 소유 `[번복]`
    - L102 Normal Hold — lane별 익명 수요
    - L118 Normal shortage
    - L122 WideHold — 단일 소유·원자적 이양
  - L136 6. Reconciliation — 수요 재조정 `[신규]`
  - L165 7. Hold tail 처리·release grace `[보존]`
  - L191 8. Hold head MISS — 2단위 회계 `[번복]`
  - L227 9. 이벤트 처리 `[신규]`
    - L231 `advanceJudgmentStateTo(nowMs)`
    - L241 `reconcileHeldCapacity(nowMs)`
    - L245 진입 경계
    - L249 카운트다운 등록 — 시간을 받지 않는 진입점 `[신규]`
    - L262 keydown
    - L271 keyup
  - L284 10. 중간 시작과 Resume `[번복]`
    - L288 중간 시작(mid-start)
    - L304 Pause Resume
  - L318 11. 입력과 렌더의 분리 (핵심 원칙)
  - L328 12. 무효 chart 런타임 폴백 `[신규]`
  - L344 13. 결정 완료 / 미해결

### `core/lane-events.md`

- L1 laneEvents — 레인 구분선 변형
  - L10 1. 개념
  - L24 2. 데이터 모델
  - L42 3. 좌표계 — 상대 단일 (전체비율)
    - L54 렌더 — 진실(shapes)과 투영(gameplay)
  - L61 4. 구속 (Constraint)
  - L69 5. 편집 (Editor)
  - L80 6. 평가 (Core)
  - L95 7. 결정 완료 / 잔여

### `core/naming.md`

- L1 명칭 규칙 (Naming Convention)
  - L9 0. 출처 태그 (모든 동작 서술에 부착)
  - L24 1. 식별자 짓기 원칙
  - L38 2. 함수 대응표 (현재 → 새 이름)
    - L40 타이밍 / 스크롤 (상세 → [[timing]])
    - L55 Shape / 지오메트리
    - L69 판정 / 입력
    - L92 게이지 / 결과
    - L103 겹침 검출 (상세 → [[data-model]] §5.1)
    - L112 노트 색/스킨
    - L120 커맨드 / 히스토리
  - L139 3. 상수 / 테이블 대응표
  - L164 4. 상태 객체 / 필드 대응표
  - L210 4.5 settings / scene 명칭
  - L262 5. 파일명 규칙 (접두사 = 레이어)
  - L284 6. 결정 완료 / 잔여

### `core/shape.md`

- L1 shape — 플레이필드 바깥 경계 변형
  - L10 1. 개념
  - L23 2. 데이터 모델
  - L41 3. 좌표계 — 외부단위 단일 (-8~+8)
  - L53 4. chain 평가 (Core) — `shapeGeometryAt(tick)`
    - L57 이벤트는 한 종류, easing이 동작을 가른다
    - L67 평가 절차
    - L90 init fallback
  - L102 5. easing
    - L119 Step — 입력 라벨 (저장값 아님)
    - L125 Arc — 입력 모드 (저장값 아님)
  - L140 6. 편집 (Editor)
  - L152 7. 렌더 경계 케이스
  - L159 8. 결정 완료 / 잔여

### `core/timing.md`

- L1 timing — 시간축 단일 출처
  - L8 0. 핵심 pattern — sorted events → accumulated segments → lookup
  - L20 1. tick
  - L27 2. tickToMs / msToTick
  - L42 3. scroll — ms 등속
  - L57 4. tickToMeasure / measureToTick
  - L77 5. sub = gridDivisor cell
  - L89 6. gridDivisor
  - L102 7. getMinTick
  - L114 8. leadIn / offset
  - L123 9. song end
  - L141 10. cache
  - L151 11. 태그 요약
  - L175 12. 미해결

### `editor/editor-commands.md`

- L1 editor-commands — 커맨드·히스토리 계약
  - L8 1. Command
  - L16 2. scope 분할 stack
  - L29 3. onDispatch listener
  - L33 4. drag command
  - L37 5. history baseline
  - L41 6. command 목록
  - L59 7. chart field 편집·파생
  - L76 8. 결정 완료 / 잔여

### `editor/editor-editing.md`

- L1 editor-editing — 편집 인터랙션·툴·단축키
  - L10 1. notes 탭
    - L12 툴 7종 (구 → 신)
    - L28 드래그 이동
    - L33 클립보드
    - L37 겹침 표시 — overlap / conflict / global conflict `[번복]`
  - L49 2. shapes 씬 — 서브모드 shape / lane
    - L55 shape 서브모드 툴
    - L68 lane 서브모드 툴 `[신규]`
    - L78 easing 선택 (shape·lane 공통)
  - L82 3. symmetry — `S` 토글 (shape·lane 공유) `[수정]`
  - L92 4. mirror — `Ctrl+F`, 선택 제자리 반전 `[수정]`
  - L102 5. 공통 모디파이어·전역 키
    - L116 test 씬 전용 키 (동작 정의 → [[editor-graph]] §5)
  - L126 6. 브라우저·입력 격리 `[신규]`
  - L135 7. Ctrl 계열
  - L149 8. 결정 완료 / 잔여

### `editor/editor-graph.md`

- L1 editor-graph — 에디터 씬 그래프
  - L8 1. graph — start + 형제 scene 4개 `[신규]`
  - L24 2. shared editorState
  - L31 3. vertical axis — time(ms) proportional `[수정]`
  - L39 4. meta scene — 독립 chart session `[번복]`
    - L43 chart identity·display
    - L52 chart-owned metadata·timing `[번복]`
    - L59 editor settings
    - L72 새 chart 파생
  - L82 5. test와 gameplay
  - L92 6. 결정 완료 / 잔여

### `render/theme.md`

- L1 theme — 표현 값 단일 출처
  - L10 1. 색
    - L12 노트 (Note)
    - L27 state (결과 상태)
    - L41 gauge (게이지 바)
    - L52 판정 피드백 (Fast / Slow)
    - L59 판정 색 (hit effect)
    - L68 shape / lane 편집선
    - L78 배경
  - L87 2. draw order (z-층)
  - L117 3. 치수 (dimension)
    - L121 플레이필드 박스
    - L130 판정선 · 게이지 바
    - L139 notes · lane
    - L148 키 빔 · 선
    - L157 sudden · hit effect
    - L165 text event `[보존]`
    - L174 HUD (drawUnifiedHUD)
  - L204 4. 폰트 · 텍스트 스타일
  - L224 5. 결정 완료 / 잔여

### `scene/scene.md`

- L1 scene — 화면 그래프
  - L9 1. scene · overlay · mode graph
  - L19 2. scene mechanism `[보존]`
  - L45 3. 공용 root + 세 graph
  - L77 4. mode-select
  - L89 5. song-select
    - L97 quick options
  - L118 6. song-credit
  - L138 7. credits `[신규]`
  - L148 8. build gate
  - L158 9. game transition graph
    - L201 result 표시
  - L209 10. overlay와 host
    - L211 overlay
    - L219 engine host seam
  - L231 11. 결정 완료 / 잔여

### `scene/song-select.md`

- L1 song-select — 곡 선택 화면
  - L9 1. 화면 구성
  - L23 2. category 탭 `[신규]`
  - L33 3. row와 slot `[신규]`
    - L35 slot
    - L45 slot의 표시값 `[수정]`
    - L60 한 화면의 slot 수와 페이지
    - L67 row의 단위
  - L80 4. groupBy와 folder `[신규]`
    - L82 축 목록
    - L96 동작
  - L108 5. sort `[신규]`
    - L110 축 목록
    - L118 방향
    - L124 groupBy와의 관계
    - L128 미플레이와 동값
  - L135 6. search `[신규]`
    - L137 매칭
    - L150 진입 `[수정]`
  - L159 7. 커서 이동 `[신규]`
    - L161 키
    - L174 상하 이동의 열 대응
    - L184 마우스
  - L192 8. 목록 옵션 조작 `[신규]`
  - L204 9. 정보 패널 `[신규]`
    - L206 표시 대상
    - L215 기록 표시
  - L233 10. preview music `[신규]`
  - L245 11. 빈 상태와 로딩 `[신규]`
  - L252 12. viewState `[신규]`
  - L270 13. 그 밖의 입력
  - L277 14. 결정 완료 / 잔여

### `scene/ui-design.md`

- L1 ui-design — tokens + result·song-select·settings·title·credits·gameplay 레이아웃
  - L12 1. 토큰
    - L14 1.1 표면 / 텍스트 / 괘선
    - L31 1.2 판정색 (파생의 뿌리)
    - L40 1.3 게이지
    - L50 1.4 클리어 상태 — 파생
    - L69 1.5 난이도 티어 — B G R W D
    - L83 1.6 랭크
    - L98 1.7 FAST / SLOW
    - L107 1.8 타이포
  - L124 2. 레이아웃
    - L144 2.1 [1] 성적
    - L153 2.2 [2] 기록
    - L170 2.3 [3] 판정 · 타이밍
    - L206 2.4 곡 열
  - L216 2.5 곡 선택 레이아웃 (M3.5-1)
    - L247 2.5.1 탭 · 검색 (상단 바)
    - L271 2.5.2 정렬 · 그룹 바
    - L288 2.5.3 목록 (우측, ~60%)
    - L320 2.5.4 정보 패널 (좌측, ~40%)
    - L333 2.5.5 하단 바
    - L341 2.5.6 `--cyan` 사용처
    - L357 2.5.7 미해결 / 확인 필요
    - L396 2.5.8 quick options overlay (M4.6)
  - L451 2.6 settings 레이아웃 (M3.5-2)
    - L464 2.6.1 scene 구조 — 4-scene, GAUGE는 OPTION에 병합
    - L485 2.6.2 상단 nav 바
    - L506 2.6.3 필드 표현 어휘 (4개 scene 공용)
    - L530 2.6.4 PLAY scene
    - L545 2.6.5 VISUAL scene
    - L561 2.6.6 SOUND scene (신규)
    - L580 2.6.7 OPTION scene (GAUGE + OPTION)
    - L620 2.6.8 재사용 토큰 vs 신규
  - L631 2.7 title 레이아웃 (M3.5-3)
    - L643 2.7.1 전경 — wordmark · tagline · 힌트
    - L669 2.7.2 배경 — wave field + bubble
    - L705 2.7.3 입력 — 클릭 포함 확정 (D-2026-078)
    - L717 2.7.4 재사용 토큰 vs 신규
    - L724 2.7.5 미해결 / 확인 필요
  - L739 2.8 credits 레이아웃 골격 (M3.5-4)
    - L756 2.8.1 구조 — role-category 섹션, song/chart 단위 아님
    - L799 2.8.2 heading·스크롤
    - L814 2.8.3 배경 — bubble만, `--cyan` 없음
    - L835 2.8.4 placeholder 콘텐츠 (골격 시연용, 실제 내용 아님)
    - L864 2.8.5 M4-2 前 게이트를 위한 의도 기록
    - L887 2.8.6 재사용 토큰 vs 신규
  - L895 2.9 mode-select 레이아웃 (M4-2 선행)
    - L906 2.9.1 구조 — 세로 목록, 확장 가능한 형태
    - L930 2.9.2 `Editor` 항목 가시성 — reflow, gap 없음
    - L942 2.9.3 배경 — 정적, 앰비언트 요소 없음
    - L953 2.9.4 재사용 토큰 vs 신규
  - L960 2.10 gameplay HUD·pause overlay (M4.5-1)
    - L972 2.10.1 canvas HUD — theme.md 실측값 그대로 확인
    - L987 2.10.2 새로 정한 네 자리
    - L1014 2.10.3 canvas vs DOM
  - L1025 3. 좌표 유도
  - L1040 4. 키 바인딩
  - L1070 5. 접근성 / 기타
  - L1081 6. scene.md §9 개정 필요 [계획]
    - L1098 6.1 `prevBest` — null 기준선 [계획]
    - L1105 6.2 `options.settled` — 필드 아닌 전달 경로 문제 [확인 완료]
    - L1117 6.3 `gaugeTrace` — 샘플링과 Cascade 범위 [계획]
    - L1135 6.4 `timingErrors` — MISS 처리 [계획]
  - L1150 7. 미해결 [보류]
  - L1177 8. 이관 메모
  - L1189 9. ESC — 결정됨 (D-2026-052)
  - L1216 10. editor — notes 편집 캔버스 (M5.5-1, D-2026-129)
    - L1224 10.1 canvas 안 — theme.md 값 재사용 확인 + 신규 격자 라벨
    - L1246 10.2 확인된 구현 격차 — conflict/selected/판정선 (조치 없음, 사용자 확인)
    - L1263 10.3 툴바 크롬 — 보류 (사용자 확인 대기)

### `src/app/README.md`

- L1 app — 부트스트랩·빌드 게이트

### `src/core/README.md`

- L1 core — 순수 로직·계산

### `src/edit/README.md`

- L1 edit — 에디터 인터랙션

### `src/env/README.md`

- L1 env — 브라우저 설비 래핑

### `src/format/README.md`

- L1 format — 파일 포맷 파싱·검증
  - L11 왜 신설했는가 (D-2026-085, M4-3)
  - L41 무엇이 여기 있고 무엇이 `edit/`에 남았는가

### `src/game/README.md`

- L1 game — 플레이 인터랙션

### `src/render/README.md`

- L1 render — 캔버스 드로잉

### `src/scene/README.md`

- L1 scene — 화면 그래프

### `tests/golden/DIVERGENCES.md`

- L1 설계 대장 — 재구현이 원본에서 벗어난 자리
  - L11 0. 규칙
    - L22 범위
    - L32 관계 표기
    - L43 이 대장이 담지 않는 것 — 이름
  - L53 1. timing
  - L83 2. gauge
    - L98 GA-1의 범위
    - L113 결과 산출은 이제 골든이 채점한다
  - L147 3. shape
    - L158 범위
    - L171 SH-3이 "easing 종류"가 아니게 된 이유
  - L185 4. data-model
    - L201 DM-3은 알고리즘 차이가 아니다
    - L217 LE-1이 `없음`인 이유
  - L235 5. judge
    - L251 JD-1을 골든이 목격하지 못한다
    - L279 tail release 임계는 어긋남이 아니다 — 오독이었다 (D-2026-039)
  - L294 6. settings
  - L313 7. 미커버 항목 — 스펙 테스트가 있어야 하는 자리
  - L362 8. M2 이후
  - L388 9. 유지

### `tools/audit/MUTATION_EQUIVALENTS.md`

- L1 동등 뮤턴트 대장

### `tools/golden/README.md`

- L1 골든 표 — 원본에서 뜬 기대값
  - L6 재생성
  - L14 이 표가 보는 것
  - L28 명칭
  - L34 허용 오차
  - L43 스텁
  - L52 빈 표 방어
  - L58 파일
  - L69 judge 표의 필드
