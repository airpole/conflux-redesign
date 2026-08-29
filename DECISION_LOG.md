# DECISION LOG

이 문서는 Conflux의 중요한 설계 결정 상태를 찾기 위한 얇은 색인이다.

정의는 각 spec, 상세 근거는 `_rationale/`가 source of truth다. 이 문서는 정의나 이유를 복제하지 않는다.

## Scope

다음 결정만 기록한다.

- 기존 행동을 의식적으로 바꾼 결정
- 이전 결정을 번복한 결정
- 여러 spec 또는 레이어에 영향을 주는 결정
- 이후 다시 논쟁될 가능성이 높은 비직관적 결정

## Status

- **Accepted** — 현재 유효
- **Superseded** — 이후 결정으로 대체됨
- **Deferred** — 의도적으로 보류됨

## Decisions

### D-2026-001 — Independent chart ownership

- **Status:** Accepted
- **Decision:** canonical 저장 단위를 독립 chart로 바꾸고 metadata·timing·asset 참조를 chart가 소유한다.
- **Defined in:** `core/data-model.md`, `_meta/cfx.md`
- **Rationale:** `_rationale/rationale.md`
- **Affects:** data model, editor, package, scene
- **Supersedes:** 이전 `song ⊃ chart[]` 및 song-common data 결정
- **Commit:** this commit

### D-2026-002 — Derived song group

- **Status:** Accepted
- **Decision:** song은 persisted 객체가 아니라 같은 `songId` chart들의 파생 그룹이다.
- **Defined in:** `core/data-model.md`, `_meta/cfx.md`
- **Rationale:** `_rationale/rationale.md`
- **Affects:** library, song-select, package
- **Supersedes:** persisted song container
- **Commit:** this commit

### D-2026-003 — Representative Chart

- **Status:** Superseded
- **Decision:** init 우선·최저 playable chart fallback으로 Representative Chart를 정하고 표시 기본값만 제공한다.
- **Defined in:** `_meta/cfx.md`
- **Rationale:** `_rationale/rationale.md`
- **Affects:** package naming, song-select, preview, reimport
- **Supersedes:** init 무언 skip만 정의한 이전 역할
- **Superseded by:** D-2026-013
- **Commit:** this commit

### D-2026-004 — Explicit per-chart asset references

- **Status:** Accepted
- **Decision:** chart가 `musicFile`·`jacketFile`을 명시하고 flat `.cfx` root의 전역 파일명 충돌을 검증한다.
- **Defined in:** `core/data-model.md`, `_meta/cfx.md`
- **Rationale:** `_rationale/rationale.md`
- **Affects:** save, workspace, packager, loader
- **Supersedes:** suffix-based implicit package-wide asset discovery
- **Commit:** this commit

### D-2026-005 — User-selected packager input

- **Status:** Accepted
- **Decision:** chart JSON 직접 선택을 기본으로 하고 folder scan은 optional prefill로 제한한다.
- **Defined in:** `_meta/cfx.md`, `_meta/persistence.md`
- **Rationale:** `_rationale/rationale.md`
- **Affects:** editor packaging UX
- **Supersedes:** work-folder inference 중심 흐름
- **Commit:** this commit

### D-2026-006 — Remove automatic record migration

- **Status:** Accepted
- **Decision:** chartId rename/content comparison 기반 record migration을 제거하고 `.cfx`/library가 records를 이동하지 않는다.
- **Defined in:** `_meta/records.md`, `_meta/persistence.md`, `_meta/cfx.md`
- **Rationale:** `_rationale/rationale.md`
- **Affects:** reimport, records
- **Supersedes:** four-array rename detection
- **Commit:** this commit

### D-2026-007 — Modified-chart record linkage

- **Status:** Superseded
- **Decision:** 같은 chart identity에서 playable content가 바뀔 때의 fingerprint·record key·보존 UX를 후속 records/game-library review로 보류한다.
- **Defined in:** `_meta/records.md`
- **Rationale:** `_rationale/rationale.md`
- **Affects:** records, library
- **Supersedes:** None
- **Superseded by:** D-2026-017
- **Commit:** this commit

### D-2026-008 — Downgrade reimport policy

- **Status:** Superseded
- **Decision:** 보유 chart보다 낮은 version의 `.cfx` reimport를 허용할지 거부할지 persistence 후속 review로 보류한다.
- **Defined in:** `_meta/persistence.md`
- **Rationale:** `_rationale/rationale.md`
- **Affects:** library reimport
- **Supersedes:** None
- **Superseded by:** D-2026-018
- **Commit:** this commit

### D-2026-009 — Version-gated chart save

- **Status:** Accepted
- **Decision:** `Ctrl+S`는 현재 chart를 새 version JSON 파일로 저장하며, 저장 창을 매번 표시하고 현재보다 큰 version을 요구한다. 저장 성공 시에만 메모리 version을 확정한다.
- **Defined in:** `_meta/persistence.md`, `core/data-model.md`
- **Rationale:** `_rationale/rationale.md`
- **Affects:** editor save UX, chart version semantics
- **Supersedes:** Ctrl+S=workspace 즉시 저장
- **Commit:** this commit

### D-2026-010 — Remove Ctrl+E / derive / duplicate-as-new-song

- **Status:** Accepted
- **Decision:** chart export(`Ctrl+E`)와 derive(`Ctrl+Shift+S`, duplicate-as-new-song)를 에디터 기능에서 제거한다. 새 song은 새 chart(init) 만들기로만 시작한다.
- **Defined in:** `_meta/persistence.md`, `_meta/cfx.md`, `editor/editor-editing.md`, `editor/editor-graph.md`
- **Rationale:** `_rationale/rationale.md`
- **Affects:** editor shortcuts, new-song creation flow
- **Supersedes:** Ctrl+E=chart export, Ctrl+Shift+S=derive
- **Commit:** this commit

### D-2026-011 — Workspace as dirty-only recovery slot

- **Status:** Accepted
- **Decision:** workspace는 dirty 편집 작업만 저장하는 단일 복구 슬롯이다(`chart`+asset blob+`dirty`+`baseVersion`). clean이면 유지하지 않고, 저장 성공 시 삭제한다. `dirty`/`baseVersion`은 chart JSON·`.cfx` 스키마에 포함하지 않는다.
- **Defined in:** `_meta/persistence.md`
- **Rationale:** `_rationale/rationale.md`
- **Affects:** workspace autosave, session recovery, "이어서 편집" 진입 조건
- **Supersedes:** workspace=마지막 작업 chart 무조건 저장
- **Commit:** this commit

### D-2026-012 — Session-switch dirty confirm

- **Status:** Accepted
- **Decision:** dirty 상태에서 `Ctrl+O`·새 난이도 생성·editor 이탈 등으로 세션을 교체할 때 `Save New Version`/`Discard Changes`/`Cancel`을 확인한다. clean이면 확인 없이 전환한다.
- **Defined in:** `_meta/persistence.md`
- **Rationale:** `_rationale/rationale.md`
- **Affects:** editor session switching, history baseline
- **Supersedes:** None
- **Commit:** this commit

### D-2026-013 — init required for `.cfx` packaging

- **Status:** Accepted
- **Decision:** 선택한 `songId` 그룹에 init이 없으면 패키징을 차단한다. init은 그룹당 `.cfx`의 고정 Representative Chart이며 표시 기본값만 제공한다.
- **Defined in:** `_meta/cfx.md`
- **Rationale:** `_rationale/rationale.md`
- **Affects:** packaging validation, Representative Chart 정의
- **Supersedes:** D-2026-003
- **Commit:** this commit

### D-2026-014 — `.cfx` filename includes version

- **Status:** Accepted
- **Decision:** `.cfx` 기본 파일명은 `{init.title}_{init.musicBy}_v{init.version}.cfx`다. 각 playable chart version은 각 chart JSON 내부에 별도로 유지된다.
- **Defined in:** `_meta/cfx.md`
- **Rationale:** `_rationale/rationale.md`
- **Affects:** packaging output naming
- **Supersedes:** `.cfx` 파일명에 version 없음
- **Commit:** this commit

### D-2026-015 — New-difficulty Start Blank / Use Current Chart modes

- **Status:** Accepted
- **Decision:** 새 난이도는 init 또는 현재 playable chart에서 만들며, `Start Blank`(비플레이 필드만 초기값 복사)와 `Use Current Chart`(Notes/Shapes/Lanes/Text 배열을 사용자가 선택해 복사, 기본 전체 선택) 두 모드를 제공한다.
- **Defined in:** `_meta/persistence.md`, `editor/editor-commands.md`, `editor/editor-graph.md`
- **Rationale:** `_rationale/rationale.md`
- **Affects:** new-difficulty creation UX
- **Supersedes:** 단순 "시작값 복사 가능"만 정의한 이전 서술
- **Commit:** this commit

### D-2026-016 — `.cfx` internal ZIP layout vs. packaging entry point

- **Status:** Accepted
- **Decision:** meta-review 지시문의 하위 폴더 구조(`charts/`+`assets/music`·`assets/jacket`)와 폴더 우선 진입("작업 폴더 선택 후 자동 탐색")을 모두 기각하고 현행을 확정한다. `.cfx` 내부는 flat root + 전역 파일명 유일(D-2026-004 유지), 패키징 진입점은 chart JSON 직접 다중 선택 하나이며 폴더 스캔은 선택 목록 prefill 편의 기능이다(D-2026-005 유지).
- **Defined in:** `_meta/cfx.md` §8~§9
- **Rationale:** `_rationale/rationale.md`
- **Affects:** `.cfx` packaging structure, packaging entry UX
- **Supersedes:** None (D-2026-004·005 확정 유지)
- **Commit:** this commit

### D-2026-017 — Records follow chart identity; manual reset

- **Status:** Accepted
- **Decision:** 기록은 `songId:chartId` identity를 따라 유지되며 내용 변경을 판별하지 않는다. content fingerprint를 도입하지 않는다. 유저가 chart 단위 기록 초기화(confirm 필수, song-select 진입, `FEATURES.recordReset` game-internal 게이트)로 관리한다.
- **Defined in:** `_meta/records.md` §1·§4, `scene/scene.md` §5, `_plan/architecture.md` §4
- **Rationale:** `_rationale/rationale.md`
- **Affects:** records, song-select, build gate
- **Supersedes:** D-2026-007
- **Commit:** this commit

### D-2026-018 — Downgrade-inclusive reimport allowed after confirm

- **Status:** Accepted
- **Decision:** 같은 songId `.cfx` reimport는 blob 전체 교체이며 chart 단위 부분 병합이 없다. confirm UI(추가·삭제·upgrade·downgrade 표시)에서 사용자가 진행을 확정하면 다운그레이드가 포함되어도 허용한다. 자동 overwrite는 없다.
- **Defined in:** `_meta/persistence.md` §12
- **Rationale:** `_rationale/rationale.md`
- **Affects:** library reimport
- **Supersedes:** D-2026-008
- **Commit:** this commit

### D-2026-019 — Server-backed records

- **Status:** Deferred
- **Decision:** 조작 방지·전체 유저 기록 관리·리더보드는 로컬 records store로 성립하지 않으며 서버 제출·검증이 필요하다. 현행 records는 로컬 개인 best 계약으로 한정하고, 서버 기반 기록은 별도 설계 주제로 보류한다. 이번 결정(identity key·초기화·reimport)은 서버 도입과 충돌하지 않는다.
- **Defined in:** `_meta/records.md` (범위 한정 머리말)
- **Rationale:** `_rationale/rationale.md`
- **Affects:** records (미래)
- **Supersedes:** None
- **Commit:** this commit

### D-2026-020 — Scene remainder resolution

- **Status:** Accepted
- **Decision:** song-credit 연출을 fade 500/4000/500ms(`CREDIT_*`)로 확정, settings graph를 category별 4 scene(play/visual/gauge/option)으로 통일, credits를 root 소속 단일 scene(mode-select 진입, 내용은 placeholder)으로 신설, quick options 배치를 host 소유(song-select overlay / editor test embedded panel)로 확정.
- **Defined in:** `scene/scene.md` §3·§6·§7·§10, `core/constants.md` §5, `_meta/settings.md`
- **Rationale:** `_rationale/rationale.md`
- **Affects:** scene graph, settings UI, constants
- **Supersedes:** None
- **Commit:** this commit

### D-2026-021 — Live web distribution & `.cfx` protection

- **Status:** Deferred
- **Decision:** game-public의 곡 공급을 라이브 웹 서비스(관리자 `.cfx` 업로드 → 접속 유저 즉시 플레이)로 확장할지, `.cfx` 보호 수준(억지력 암호화 vs 서버 세션 제공 vs 평문), 공개 서비스의 기록 저장 위치(브라우저 로컬 vs 서버, D-2026-019 연계)를 별도 사이클에서 결정한다. 그 전까지 곡 공급 계약은 bundled 모델이 기준이다. 1차 추천 방향은 억지력 암호화.
- **Defined in:** `_meta/persistence.md` §12 (보류 각주)
- **Rationale:** Not required (pending)
- **Affects:** game-public 곡 공급, `.cfx` 포맷 보호 계층, records 저장 위치
- **Supersedes:** None (pending)
- **Commit:** this commit

### D-2026-022 — Walkthrough resolutions: pause resume, no-record boundary, option persistence, gauge wording

- **Status:** Accepted
- **Decision:** (a) pause Resume을 정지 카운트다운 재개(되감기 없음)로 바꾸고 pause 사용 판의 기록을 유지한다. (b) no-record의 mid-start를 "곡 처음이 아닌 지점에서 시작한 판"으로 좁혀 명문화한다(Resume 무관). (c) quick options 5종은 settings 영속 객체의 같은 필드를 수정하는 진입점이며 세션 한정 상태가 아니다. (d) gauge 서술에서 "lock" 묶음말을 제거하고 `tier`를 gauge 구성 값으로 격상해 어휘를 통합한다(필드명·저장 스키마 불변).
- **Defined in:** `scene/scene.md` §9, `_meta/settings.md` §2, `core/gauge.md` §1·§4, `core/judge.md` §6~§7
- **Rationale:** `_rationale/rationale.md`
- **Affects:** pause UX, no-record gate, quick options, gauge terminology
- **Supersedes:** None
- **Commit:** this commit

### D-2026-023 — Counter-inquiry pass: editor interaction confirmations

- **Status:** Accepted
- **Decision:** 근거 미기록 `[수정]`·`[신규]` 10건을 역질의로 재확인해 전부 현행 유지로 확정한다. 부수 변경 3건만 발생: (a) lane 서브모드 키 조합 오버로드에 대한 **상태 상시 표기**를 입력 전제로 명문화, (b) mirror 축 0 고정·클립보드 규칙·mirror 필터 예외의 근거를 rationale에 기록, (c) textEvent fade 수치를 `TEXT_FADE_MS`로 constants에 이관하고 data-model·theme는 링크 참조로 전환.
- **Defined in:** `editor/editor-editing.md` §2, `core/constants.md` §6, `core/data-model.md` §8, `render/theme.md` §3
- **Rationale:** `_rationale/rationale.md`
- **Affects:** editor interaction spec, constants single-source
- **Supersedes:** None
- **Commit:** this commit

### D-2026-024 — Key-demand judgment and global input capacity

- **Status:** Accepted
- **Decision:** Normal Hold를 lane별 익명 수요로 관리하고 WideHold를 Normal 수요 이후 남는 단일 key에 원자적으로 귀속·이양한다. head 후보는 earliest tick 후 same-tick Normal/Hold 우선으로 결정하며, Hold release grace 50ms, Hold head MISS 2단위 일괄 적용, crossing-Hold mid-start/Resume 복구, 전체 6키 global conflict 검사를 확정한다.
- **Defined in:** `core/judge.md`, `core/data-model.md`, `core/constants.md`, `core/gauge.md`
- **Rationale:** `_rationale/rationale.md`
- **Affects:** judgment, runtime play state, gauge accounting, editor conflict validation, mid-start/pause Resume
- **Amended:** tail release 임계 수치는 원본 오독이었다 — D-2026-039에서 `HOLD_RELEASE_WINDOW_MS`(GOOD 창 + grace = 150ms)로 정정했다. 나머지 결정은 유효하다.
- **Supersedes:** None (replaces prior unlogged spec text)
- **Commit:** this commit

## Entry Template

### D-2026-025 — song-select 3축 목록 모델

- **Status:** Accepted
- **Decision:** song-select를 category 탭 / groupBy folder / sortKey·sortDir 세 축으로 재설계하고, 목록 항목을 song row + chart slot 모델로 정의한다. `scene.md §5`는 전용 문서로 분리한다.
- **Defined in:** `scene/song-select.md`
- **Rationale:** `_rationale/rationale.md`
- **Affects:** scene, records, persistence, data-model, cfx, constants
- **Supersedes:** None
- **Commit:** `5e3d4de`

### D-2026-026 — records 스키마를 판정 분포 기반으로 전환

- **Status:** Accepted
- **Decision:** record를 `bestJudgments`·`bestState`·`maxCombo` 3필드로 바꾸고 score·rank·accuracy는 파생으로 돌린다. `playCount`는 제거한다.
- **Defined in:** `_meta/records.md`
- **Rationale:** `_rationale/rationale.md`
- **Affects:** records, song-select, result
- **Supersedes:** None
- **Commit:** `5e3d4de`

### D-2026-027 — chartId 5 = Phase 고정 슬롯

- **Status:** Accepted
- **Decision:** 고정 대응 슬롯을 `1~4`에서 `1~5`로 확장해 Phase를 정규 난이도로 편입하고, subtitle이 있는 추가 chart는 `6+`에 둔다.
- **Defined in:** `_meta/cfx.md` §4
- **Rationale:** `_rationale/rationale.md`
- **Affects:** cfx, data-model, song-select
- **Supersedes:** None
- **Commit:** `5e3d4de`

### D-2026-028 — viewState store 신설

- **Status:** Accepted
- **Decision:** 화면 상태를 settings에 섞지 않고 `viewState` store로 분리해 스토어를 5분리한다. 쓰기 실패는 조용히 삼키지 않는다.
- **Defined in:** `_meta/persistence.md` §1
- **Rationale:** `_rationale/rationale.md`
- **Affects:** persistence, song-select, settings
- **Supersedes:** None
- **Commit:** `5e3d4de`

### D-2026-029 — 스펙 공백 7건 일괄 확정

- **Status:** Accepted
- **Decision:** song-select 목록 UX·preview 재생·탭 백그라운드 auto-pause·로딩 표시 임계·단축키 preventDefault·text input focus 격리·저장 실패 표시를 확정한다.
- **Defined in:** `scene/song-select.md`, `scene/scene.md`, `editor/editor-editing.md`, `_meta/persistence.md`, `core/constants.md`
- **Rationale:** `_rationale/rationale.md`
- **Affects:** scene, editor, persistence, constants, data-model
- **Supersedes:** None
- **Commit:** `5e3d4de`

### D-2026-030 — 곡 종료 시각 정의

- **Status:** Accepted
- **Decision:** 플레이 종료를 `songEndMs = max(chartEndMs, musicEndMs) + SONG_END_TAIL_MS(3000)`로 정의하고, 진행 표시 분모 `contentEndMs`와 분리한다. autoplay 판은 result 없이 song-select로 복귀한다.
- **Defined in:** `core/timing.md` §9, `core/constants.md` §9, `scene/scene.md` §9
- **Rationale:** `_rationale/rationale.md`
- **Affects:** timing, constants, scene, architecture, editor-graph
- **Supersedes:** None
- **Commit:** `f8a3caa`

### D-2026-031 — updatedAt 신설과 lane 매핑 승격

- **Status:** Accepted
- **Decision:** `updatedAt`을 chart JSON 필드(ISO 8601 UTC)로 신설해 생성 시각으로 초기화하고 에디터 저장 성공 시에만 갱신하며, import·패키징은 값을 계승한다. `laneOf(key)` 매핑을 EXTRACTED_FACTS에서 `settings` §2 `DEFAULT_LANE_KEYS` 표로 승격한다.
- **Defined in:** `core/data-model.md` §1·§4, `_meta/settings.md` §2
- **Rationale:** `_rationale/rationale.md`
- **Affects:** data-model, settings, judge, cfx, persistence, song-select, glossary
- **Supersedes:** None
- **Commit:** `6876890`

### D-2026-032 — build-order 신설과 M3/M4 순서 반전

- **Status:** Accepted
- **Decision:** milestone 6단계 아래 step을 두는 2단 build-order를 신설한다. step 경계는 소프트하되 gate 경계는 하드다. 완료 기준은 관찰 가능한 동작 문장이고, 회귀는 core 골든 테스트 + milestone별 수동 대조 시나리오다. M3=persistence, M4=game graph로 순서를 뒤집고 D-2026-021을 M3 진입 조건으로 옮긴다.
- **Defined in:** `_plan/build-order.md`
- **Rationale:** `_rationale/rationale.md`
- **Affects:** build-order, architecture, shape, README
- **Supersedes:** None
- **Commit:** `03a2a01`

### D-2026-033 — M1 진입 gate 해소

- **Status:** Accepted
- **Decision:** 구현 코드는 명세 레포 안(`src/`·`tests/golden/`·`tools/golden/`)에 둔다. `FEATURES`는 `editor`·`recordReset` 2개, 빌드 프로필 기본값은 `public`이며 public 빌드는 경로 차단이 아니라 **코드 제거**다(`[번복]`). `FEATURES`를 읽는 곳은 scene 등록·진입점에 한정한다. env는 실패 모드를 기준으로 6파일로 가른다. 골든 테스트는 소스 옆에 두고 기대값은 원본을 Node에서 실행하는 추출 스크립트로 재생성 가능하게 만들며, 입력은 합성 chart로 구성한다.
- **Defined in:** `_plan/architecture.md` §1·§4, `_plan/build-order.md` §0·§1
- **Rationale:** `_rationale/rationale.md`
- **Affects:** architecture, build-order, README
- **Supersedes:** None (구 `config.js`의 "코드는 배포하고 경로만 잠근다"를 `[번복]`)
- **Commit:** `7ce477e`

### D-2026-034 — 골든 하네스와 M1 실측 gate

- **Status:** Accepted
- **Decision:** 원본 core 모듈은 `audio.js` 하나만 스텁으로 대체하고 나머지는 원본 그대로 Node에서 실행한다. 골든 비교의 허용 오차는 정수형 완전 일치·실수형 상대 오차 `1e-9`. 표는 원본 명칭으로 기록하고 재설계 명칭 매핑은 테스트가 갖는다. 추출 스크립트는 표가 비거나 기대값이 전부 `null`이면 실패로 종료한다. 입력은 합성 chart 6종(다중 BPM·다중 박자·경계 tick·음수 tick·Hold 중첩·6키 포화).
- **Defined in:** `tools/golden/README.md`, `_plan/build-order.md` §1
- **Rationale:** `_rationale/rationale.md`
- **Affects:** build-order, README, tools/golden, tests/golden
- **Supersedes:** None
- **Commit:** `070c9f6`

### D-2026-035 — 설계 대장과 골든의 역할

- **Status:** Accepted
- **Decision:** 골든 표를 판정자가 아닌 관측자로 둔다. 의도한 차이는 설계 대장(`tests/golden/DIVERGENCES.md`)에 등재하고, **대장에 없는 차이는 실패**시킨다. 대장은 어긋남뿐 아니라 `미커버`(원본에 대응물이 있으나 골든 미추출)·`없음`(원본에 대응물 자체가 없음)도 담아 검증 공백을 드러낸다. 등재는 한 줄 + 근거 링크로 가볍게 두고 큰 결정만 `DECISION_LOG`로 승격한다. judge 표는 후보 경합이 일어나는 fixture 2종만 어긋남으로 빼고 나머지는 `[보존]` 검증에 계속 쓴다. 대장의 행 단위 범위는 골든 표가 존재하는 core/M1이며, M2 이후는 수동 대조 시나리오 작성 시점에 확장한다.
- **Defined in:** `tests/golden/DIVERGENCES.md`, `_plan/build-order.md` §1
- **Rationale:** `_rationale/rationale.md`
- **Affects:** build-order, tools/golden, tests/golden, README
- **Supersedes:** None
- **Commit:** `070c9f6`

### D-2026-036 — chart 검증 2층과 settings 기본값

- **Status:** Accepted
- **Decision:** chart 검증을 두 층으로 가른다 — structural(필수 필드·타입·`schemaVersion`)은 **로드를 거부**하고, domain(값 범위·논리)은 거부하지 않고 **보고**한다. 두 함수 모두 chart를 mutate하지 않는다. `schemaVersion`이 현재 판과 다르면 상·하위를 가리지 않고 거부하며 마이그레이션 체계는 실제로 판을 올릴 때 설계한다. settings 기본값 19필드를 원본에서 실측해 `settings` §4 표로 승격했고, 병합은 **알 수 없는 키를 버리고 허용 밖 값은 필드 단위로 기본값으로 되돌린다**(클램프 아님). `volMusic`만 `[수정]`(0.7 → 1.0)이고 나머지는 `[보존]`이다. `constants`·`DEFAULT_SETTINGS`를 골든 표 `constants.json`으로 뽑아 구현과 대조한다.
- **Defined in:** `core/data-model.md` §11, `_meta/settings.md` §4, `_plan/build-order.md` §3
- **Rationale:** `_rationale/rationale.md`
- **Affects:** data-model, settings, build-order, tests/golden, tools/golden, src/core, README
- **Supersedes:** None
- **Commit:** `14b8397`

### D-2026-037 — timing API 형태와 격자 축

- **Status:** Accepted
- **Decision:** 캐시와 invalidation을 폐기하고 `buildTimeline(chart)`가 만든 파생 객체를 전 함수가 인자로 받는다 — chart가 바뀌면 다시 만든다. `bpmAt`은 만들지 않되 골든 60건(`getBPMAt`·`getTimeSig`)은 **세그먼트 조회로 채점**해 검증 공백을 남기지 않는다. `gridDivisor` 목록 상단에 `96·128·192·256`을 추가하고(전부 `7680/V` 정수) 기본값을 **8**로 올렸다 `[수정 — 구 2]`. `sub` 분할은 `gridDivisor` 격자를 쓰고 격자 밖 tick은 반올림 근사한다. `labelOffset`·`gridDivisor`는 caller 주입이며, `gridLines`는 px를 모르는 기술자 목록을 **박 단위**로 반환한다. `songEndOf`가 4값을 한 객체로 돌려준다. 원본에서 `measureToTick("0")`이 마디 1로 떨어지던 왕복 붕괴를 바로잡았다.
- **Defined in:** `core/timing.md` §2·§4·§5·§6·§10, `core/constants.md` §4
- **Rationale:** Not required
- **Affects:** timing, constants, glossary, tests/golden, src/core, README
- **Supersedes:** None
- **Commit:** `73743dd`

### D-2026-038 — judge 기본 구현 형태, 명칭 대응표 가드, JD-1 재분류

- **Status:** Accepted
- **Decision:** `commitJudgment`은 게이지·render를 호출하지 않고 `JudgmentEvent[]`를 **반환만** 한다 — M1-7 게이지는 judge를 열지 않는다. 노트 정체성은 chart·timeline에서만 나오는 불변 파생 표의 **인덱스**이고 진행 상태는 `JudgeState`의 나란한 배열에 산다. `visualOffset`은 `toJudgeMs`로 **진입 경계에서 한 번만** 걸려 내부 함수가 인자로 받지 않으므로, keydown만 보정하는 오류가 표현 불가능해졌다 `[번복]`. mirror는 표에 굽지 않고 후보 필터 시점에 읽는다. M1-4의 만료는 Tap 1단위까지이며 Hold head 2단위는 M1-5다. **구현이 `naming` §3을 이탈한 두 자리를 명세 쪽으로 바로잡았다** — `JUDGE_*_MS` → `WINDOW_*_MS`, `LANE_KEYS` → `DEFAULT_LANE_KEYS`. 이름은 골든도 설계 대장도 잡지 못하므로 `naming` §3을 파싱해 구현과 대조하는 가드 테스트를 신설했다. **JD-1을 `어긋남`에서 `미커버`로 재분류했다** — 골든 2,700건 중 어긋나는 케이스가 0건이다.
- **Defined in:** `core/judge.md` §1·§2, `core/constants.md` §1, `core/naming.md` §3, `tests/golden/DIVERGENCES.md` §5·§7
- **Rationale:** Not required
- **Affects:** judge, constants, naming, settings, tests/golden, src/core, README
- **Supersedes:** None
- **Commit:** `8d5100d`

### D-2026-039 — Hold 소유 구현, tail release 임계 정정, `naming` §4 가드

- **Status:** Accepted
- **Decision:** Normal Hold를 lane 익명 수요로, WideHold를 자격 있는 키 중 최근 press serial로 원자 이양하는 단일 소유로 구현했다. `reconcileHeldCapacity`가 Normal shortage를 먼저 해소하고 Wide 배정을 정하며, §6 불변식은 `heldCapacityViolations`가 문장으로 확인한다. **tail release 임계를 원본 실측대로 정정했다** `[보존]` — 원본은 `tailMs − JUDGE_GOOD − LN_RELEASE_GRACE_MS`(150ms)를 썼고 `HOLD_RELEASE_GRACE_MS`(50)는 GOOD 창 위의 추가분이다. D-2026-024가 상수 파일만 읽어 50으로 적은 것을 정정하고, 두 상수의 합에 `HOLD_RELEASE_WINDOW_MS` 이름을 준다. Hold head MISS는 `units: 2` 이벤트 하나로 즉시 확정하고 combo는 1회만 리셋한다. tail은 `tailMs`에 자동 완료되며 사건 시각이 호출 시점이 아니라 `tailMs`다. `judged` 이벤트에 `part`(`tap`/`head`/`tail`)를 실어 표시 규칙(tail 성공은 무표시)을 render가 재현할 수 있게 한다. **누적 카운터를 judge에서 제거했다** — `hits`를 `naming` §4의 뜻(note별 판정 상태)으로 되돌리고 `misses`·`fastCount`·`slowCount`는 `JudgmentEvent`를 받는 쪽이 센다. 프레임 진행 진입점 `judgeAdvance`를 신설해 세 진입점이 모두 `visualOffset` 경계를 지난다. 명칭 가드 테스트를 `naming` §4 상태 필드까지 넓혔다.
- **Defined in:** `core/judge.md` §4·§5·§7·§9·§13, `core/constants.md` §1, `core/naming.md` §3·§4, `_extracted/EXTRACTED_FACTS.md` §8.1, `tests/golden/DIVERGENCES.md` §5·§7
- **Rationale:** `_rationale/rationale.md#hold-release-임계를-원본과-같은-150ms로-되돌린-이유`
- **Affects:** judge, constants, naming, rationale, EXTRACTED_FACTS, tests/golden, src/core, README
- **Supersedes:** None (D-2026-024의 tail 임계 수치를 정정)
- **Commit:** `12c1afd`

### D-2026-040 — 중간 시작 시드, 카운트다운 등록 진입점, global conflict 재배치

- **Status:** Accepted
- **Decision:** 중간 시작·pause Resume의 카운트다운은 **시각을 인자로 받지 않는** 등록 진입점 `registerKeyDown`/`registerKeyUp`이 맡는다 `[신규]` — 시간이 흐르지 않는다는 사실이 시그니처에 있으므로 카운트다운 중 keyup이 tail을 자동 완료시킬 자리가 없다. 판정 경로도 자기 등록 단계에서 이 둘을 그대로 쓴다. `seedPlayStateAt(anchorMs)`는 `startMs < anchorMs`인 노트를 SYNC로 시드하고(`tailMs <= anchorMs`면 tail까지) crossing Hold는 head만 시드한 뒤, **배정·해소를 `reconcileHeldCapacity`에 그대로 넘긴다** — `judge` §10의 시드 전용 배정 3단계를 삭제했다(§6과 같은 말이었다). 그 귀결로 tail 분류 규칙은 §7 하나만 남고, anchor에서 `HOLD_RELEASE_WINDOW_MS` 안쪽인 crossing Hold는 잡고 있지 않아도 tail SYNC가 된다. 시드 판정은 다른 판정과 **같은 `JudgmentEvent` 열**로 나가 게이지·score·combo가 별도 시드 경로를 갖지 않는다. `seedPlayStateAt`은 확정된 판정·활성 Hold가 있는 state에서 **던진다** — Resume 오배선이 조용히 통과하지 않는다. **global 6키 conflict(JD-5)를 M1-6에서 M1-8로 옮겼다** — `data-model` §5.1의 global 부등식은 별도 패스가 아니라 로컬 검출(DM-3)과 같은 sweep 위의 합산이고, 검출은 judge 밖이라 judge step에 둘 자리가 없었다. TM-5(Resume leadIn 미적용)는 core에 확인할 대상이 없어 M2-5로 옮겼다.
- **Defined in:** `core/judge.md` §9·§10·§13, `core/naming.md` §2, `_plan/build-order.md` §4, `tests/golden/DIVERGENCES.md` §7
- **Rationale:** `_rationale/rationale.md`
- **Affects:** judge, naming, build-order, tests/golden, src/core, README
- **Supersedes:** None (D-2026-024가 정한 `judge` §10 시드 절차를 §6 재조정으로 접음)
- **Commit:** `6c5e67e`


### D-2026-041 — state는 성적이 정한다, tier 사다리, 단일 누산기

- **Status:** Accepted
- **Decision:** **state는 고른 모드가 아니라 성적이 정한다** `[보존]` — 원본 `computeState`가 `gaugeType`·`lockTarget`을 보지 않고 판정 카운트만 보는 것을 그대로 지킨다. 어느 게이지로 쳐도 `FC`/`AP`/`AS`가 나오고, `tier`는 `H`와 `C`를 가르는 자리에서만 쓰인다. `gauge` §2의 "성공 시 state" 열은 그 반대(모드 종속)로 읽혀 삭제했고, 산출은 §3의 7줄 표 하나로 모았다 — cascade가 별도 산출 경로를 갖지 않는다. **모드 표가 두 열로 줄었다**: `gaugeMode` 6종은 이제 **시작 tier + 탈락 시 동작**만 정한다(`GAUGE_MODE_TABLE`). 시작값·증감은 게이지의 성질이지 모드의 성질이 아니므로(두 게이지는 전 모드 병렬 누적) 표에서 뺐고, 탈락 조건은 tier마다 하나씩 붙는 `TIER_LADDER`(`as > ap > fc > hard > normal`)로 내렸다. **terminate는 게이지 값을 밟지 않고 `forceEnded` 하나로 표현한다** `[번복 — 구안은 "게이지를 즉시 0으로"]`; 단일 모드의 `tier`는 탈락 직전 값으로 얼어붙어 실패가 두 곳에 적히지 않는다. **누산기는 하나다** — 판정별 단위 수 `playState.counts`를 gauge가 들고 게이지·score·accuracy·state가 모두 그것을 읽는다(계약 GA-5의 실체). judge에서 누적을 뺀 D-2026-039의 반대편이다. `a` 스케일의 분모는 `JudgeNotes.totalUnits`가 낸다 — "Hold는 2단위"가 `judge` §8의 정의이므로 세는 곳도 거기다.
- **Amends:** 원본을 다시 읽어 **terminate 뒤에도 같은 프레임의 판정이 회계에 들어간다**는 것을 확인했다 `[보존]`. 원본 `play.js`는 `PS.playForceEnded`를 **프레임 끝에서** 확인하므로 그 프레임의 남은 MISS가 게이지·score에 그대로 반영된다. 처음 구현은 terminate 즉시 회계를 끊었고, 골든 30건 중 4건이 그 자리에서 어긋나 드러났다 — 판을 멈추는 것은 gauge가 아니라 host의 몫이다.
- **Defined in:** `core/gauge.md` (전면), `core/naming.md` §2·§3·§4, `core/data-model.md` §9, `core/glossary.md`, `tests/golden/DIVERGENCES.md` §2·§7
- **Rationale:** `_rationale/rationale.md`
- **Affects:** gauge, naming, data-model, glossary, tests/golden, src/core, README
- **Supersedes:** None (`gauge` §2의 "성공 시 state" 열과 §1의 "terminate = 게이지 0" 표현을 대체)
- **Commit:** `5d9cbcf`


### D-2026-042 — 겹침 검출: 활성은 점으로 정의하고, conflict가 표시를 덮는다

- **Status:** Accepted
- **Decision:** `buildOverlapMap(notes)`가 표시와 conflict group을 한 번에 낸다 — 캐시도 무효화도 없다(`buildTimeline`과 같은 형태). **활성을 점으로 정의했다** `[수정]`: tick `t`에서 Tap은 `startTick == t`, Hold는 `startTick <= t < startTick + duration`이다. 활성 집합은 `startTick`에서만 커지므로 검사 지점은 chart의 `startTick` 전부이고, sweep은 그것을 O(n log n)으로 계산하는 **방법**이지 정의가 아니다. 이 한 줄이 이벤트 처리 순서 규칙을 대신한다 — 같은 tick에서 tail이 먼저 빠지고 head가 평가되는 것(`judge` §7)이 별도 규칙이 아니라 귀결이 됐다. 구 표기 `Tap = [t, t]`를 sweep 이벤트로 옮기면 **같은 tick의 Tap 두 장이 서로 만나지 못한다**(자기 끝이 자기 시작을 밀어낸다). `startTick`에 정수 제약이 없어 `[t, t+1)` 통일도 성립하지 않는다. **출력은 순번 기반이다** — 영속 note ID가 없고 notes 배열 순서가 곧 배치 순서라 순번이 이미 도메인 값이며, 골든 JSON에 적을 수 있다. **conflict group이 `excess`를 함께 낸다** `[신규]` — capacity 규칙이 core와 editor 두 곳에 살면 표시와 삭제 개수가 어긋난다(judge에서 누적을 뺀 D-2026-039와 같은 부류). group을 내는 것까지가 domain이고 지우는 것은 `editor-editing` §1이다. **conflict가 세부 분류를 덮는다** — 그래서 `merged`/`hidden`/`yellow`/`clipped`는 정확히 2겹에서만 생기고 쌍 개념으로 닫힌다(n-way 규칙이 필요 없다). 노랑 구간은 tick으로 domain이 낸다 — px가 아니므로 render의 몫이 아니고, 골든이 그 값을 뽑는다.
- **Amends:** 원본 `overlaps.js`를 Node에서 직접 돌려 **대장 DM-3이 실제보다 작게 적혀 있었음을 확인했다.** `순회 기반 → sweep-line, O(n log n)` / `미커버`로 등재돼 있었으나, 바뀌는 것은 계산 방식이 아니라 **검출되는 집합 자체**다 — 원본은 pairwise라 lane 2·3의 3겹 이상을 conflict로 잡지 못한다. 계단형 3겹은 `clipped`·`yellow`·`yellow`가 되고, 같은 tick 4겹은 `merged` 한 장에 `hidden` 세 장이 되어 **화면에 한 장만 보이는데 네 번 쳐야 한다.** DM-3을 3겹 행으로 재정의하고 관계를 `어긋남`으로 올렸으며, 우선순위를 DM-6으로 분리했다. DM-6은 `어긋남`이 아니라 **`없음`**이다 — 원본은 풀마다 낼 수 있는 표시 종류가 갈려 있어(lane 2·3 = overlap 계열, lane 1·4·Wide = `invalid`) 두 종류가 한 노트를 두고 겨루는 상황 자체가 생기지 않는다. 계산 방식 자체는 2겹 결과가 같으므로 대장 행이 아니라 §5.1의 `[수정]` 태그가 담는다.
- **Defined in:** `core/data-model.md` §5.1, `core/naming.md` §2, `tests/golden/DIVERGENCES.md` §4·§5·§7
- **Rationale:** `_rationale/rationale.md`
- **Affects:** data-model, naming, tests/golden, tools/golden, src/core, README
- **Supersedes:** None (`data-model` §5.1의 활성구간 표기와 대장 DM-3 문구를 대체)
- **Commit:** `532554d`


### D-2026-044 — 미커버 가드와 결과 산출 골든

- **Status:** Accepted
- **Decision:** 설계 대장의 `미커버`는 "스펙 테스트가 유일한 판정자"라는 뜻인데, **그 판정자가 실재하는지 검사하는 장치가 없었다.** `expect(ledgerEntry('DM-4').relation).toBe('미커버')`는 대장의 글자만 확인하므로 주변 테스트를 전부 지워도 통과한다 — 링크지 가드가 아니었다. 연결을 **테스트 제목의 `[ID]` 태그**로 옮긴다: `tests/support/coverage.ts`가 `describe`·`it` 제목을 읽어 태그를 모으고, `support.test.ts`가 ① 태그된 ID가 대장에 실재하는가 ② 완료한 step에 배정된 `미커버` 전원이 태그를 갖는가 ③ `COVERED_STEPS`의 step 이름이 롤업에 실재하는가를 본다. 태그는 테스트를 지우면 함께 사라진다 — 주석이나 별도 목록과 달리 **뒤에 남을 수 없는 자리**다. 검사는 2층(담당 테스트가 실재하는가)까지이며, 그 테스트가 실제로 그 동작을 판별하는가(3층)는 사람이 리뷰에서 본다. 강제 범위는 `COVERED_STEPS` 상수로 한정해, M2 안에서 step을 하나씩 지을 때 아직 짓지 않은 뒤쪽 step이 먼저 실패하지 않게 한다. 기존 링크 여덟 자리는 **지웠다** — 같은 것을 두 곳에서 보면 한쪽을 고치고 다른 쪽을 잊는다.
- **Amends:** **`GA-6`·`GA-7`·`GA-8`을 골든으로 끌어올려 미커버가 아니게 만들었다.** 셋 다 `[보존]`인데 골든이 닿지 않아 "원본과 같다"는 주장 자체를 확인할 길이 없던 자리다 — 검증 공백 중 가장 약한 고리였다. `tools/golden/extract-result.mjs`가 원본 `computeResult`를 직접 불러 `result.json` 40건을 뽑고(집계만 맞춰 `playHitMap`을 합성한다), `extract-gauge.mjs`의 `lockTarget` 축에 `as`가 들어가 `gauge.json`이 30 → 40건이 됐다. score·accuracy·rank·counts가 전부 일치하므로 세 행은 차이도 공백도 아니게 되어 **대장에서 내려갔다**(세 표기 어디에도 속하지 않는 행을 남기면 대장이 거짓말을 한다). 그 추출에서 둘이 드러났다. **GA-3이 `미커버` → `어긋남`**이 됐다 — 원본 `computeState`의 마지막 줄 `return 'P'`가 표에 값으로 들어왔다. **GA-9를 신설했다** — 원본은 판정된 단위를 세지 않아 24단위 중 10단위만 판정된 판을 `AS`로 낸다. `F`를 뺀 모든 마크에 **완주 조건**을 걸어 `gauge` §3 산출표에 2번 줄을 추가했다. 결과 산출 골든의 게이지 값은 판을 다시 돌려 얻은 것이 아니라 집계에 맞춰 직접 세운 것이므로, 표에는 실제 판에서 나올 수 없는 조합도 들어 있다 — 이 표가 재는 것은 **입력 집계 → 결과**이지 판의 진행이 아니다. `result.json`을 `TABLES`에 등록해 지문 가드를 받게 했다(M1-8의 `overlap.json` 누락과 같은 부류를 반복하지 않기 위함). 리뷰가 지목한 "테스트가 언급조차 하지 않는 8행" 중 실제로 비어 있던 것은 `DM-5` 하나였다 — 나머지는 배열 안에 들어 있어 `ledgerEntry('TM-2')` 꼴 검색에 걸리지 않았을 뿐이고, 그 사실 자체가 grep 기반 링크 세기가 못 미더움을 보인다.
- **Defined in:** `core/gauge.md` §3, `tests/golden/DIVERGENCES.md` §2·§7, `tests/support/coverage.ts`
- **Rationale:** `_rationale/rationale.md`
- **Affects:** gauge, tests/golden, tests/support, tools/golden, src/core, README
- **Supersedes:** None (대장 GA-3 관계 표기와 GA-6·GA-7·GA-8 행을 대체)
- **Commit:** `585ba1b`


### D-2026-043 — 체인 보간과 anchor 정의, 골든 shape 재추출

- **Status:** Accepted
- **Decision:** `buildFieldGeometry(chart)`가 shape·lane 다섯 체인을 한 번에 만들고 나머지 함수가 그것을 인자로 받는다(`buildTimeline`과 같은 형태). **shape와 lane은 한 구현이다** — 선택자와 좌표계만 다르고 평가는 글자 그대로 같아, 문서가 `shape` §4를 단일 출처로 삼은 구조를 코드가 그대로 반영한다. **anchor는 체인의 시작값 하나다** `[보존]` — `startTick`도 `duration`도 보지 않으므로 시작값이 음수 tick에도 유효하고, 중간 anchor는 아무 일도 하지 않는다. anchor가 여럿이면 **가장 이른 tick**의 것이 이긴다 `[수정]`(원본은 배열 순서 — 대장 SH-6): 배열 순서에 기대면 같은 chart를 다시 저장하는 것만으로 모양이 바뀐다. 같은 tick 정렬은 **`duration 0`이 먼저** `[보존]` — 이 순서가 값을 바꾼다(즉시점프 32 뒤 보간이면 중간값 48, 아니면 32). 목록 밖 easing은 Linear로 흐르되 domain 검증이 **보고**한다 `[수정]`(대장 SH-3). `isStepTick`·`stepTicks`·`resolveArcEasing`을 함께 지어 "저장 안 되는 입력 호칭"(Step·Arc) 두 개가 한자리에서 닫혔다.
- **Amends:** **골든 `shape.json`이 사실상 빈 표였다.** 픽스처가 원본에 없는 필드(`blue: [10,20,30,40]`)를 써서 원본이 두 체인을 "비었다"고 판정했고, `getShape` 아홉 건이 전부 `{left: 32, right: null}`이었다 — 체인 보간을 대조하는 값이 **0건**이었다. easing도 추출기가 `In`/`Out`/`InOut`을 넘겼는데 원본의 실제 가지는 `Linear`/`In-Sine`/`Out-Sine`/`Arc`라, 28건이 전부 기본 가지(Linear)로 떨어졌다 — In-Sine·Out-Sine은 한 번도 측정된 적이 없었다. 하네스의 빈 표 방어는 "전부 비었는가"만 보므로 절반이 빈 표를 통과시켰다. 픽스처 8종으로 다시 뽑아 117건이 됐고 표본 tick에 보간 **도중** 지점을 넣었다(끝점만 재면 어떤 곡선을 써도 값이 같다). 하네스 `loadChart`가 fixture 교체 시 원본 캐시를 비우지 않던 것도 함께 고쳤다 — 이전 추출기는 fixture가 하나라 드러나지 않았다. 대장 **SH-3을 재정의**했다(원본 easing 4종이라는 서술은 추출기 인자 목록을 원본 명세로 읽은 것이었다 — 세 이름은 원본과 글자까지 같아 `[보존]`이다). `Arc` 가지를 **SH-5(`없음`)**, anchor 선택을 **SH-6(`어긋남`)**, 폐기된 `lineEvents` 모델을 **LE-1(`없음`)**으로 신설했다. **`overlap.json`이 `TABLES` 목록에 없어 M1-8 이후 아무 가드도 받지 않고 있었고**, 지문이 다른 표와 어긋난 것도 그래서 드러나지 않았다 — 전 표를 같은 원본에서 다시 뽑았고 기대값은 전부 동일했다. 명칭 가드를 `naming` §2(함수)까지 넓혔고, 세우자마자 드러난 judge 3자리는 **표를 고치는 쪽으로** 정리했다(`judgeKeyDown`/`judgeKeyUp`, `closeTail`) — 구현이 표보다 뒤에 알게 된 사실을 담고 있는 경우이며, 그 판별 조건을 `_rationale`에 못박았다.
- **Defined in:** `core/shape.md` §4·§5·§8, `core/lane-events.md` §6·§7, `core/naming.md` §2, `tests/golden/DIVERGENCES.md` §3·§4·§7
- **Rationale:** `_rationale/rationale.md`
- **Affects:** shape, lane-events, naming, tests/golden, tests/support, tools/golden, src/core, README
- **Supersedes:** None (`shape` §4 anchor 서술과 대장 SH-3 문구를 대체)
- **Commit:** `6398679`


### D-2026-045 — 표기 폴백 + TM-11 + 검토 결정 반영

- **Status:** Accepted
- **Decision:** M1 외부 검토에서 결정된 다섯 건을 반영한다. **1.** `tickToMeasure`가 sub를 gridDivisor 격자로 표현하지 못하면(마디 상대 나머지가 cell로 나눠떨어지지 않으면) 근사 표기 대신 `t{tick}` 원시 표기로 떨어진다 `[수정]` — 왕복이 표기 형태와 무관하게 항상 성립한다. 장기 방향으로 **절대 tick이 canonical representation**이고 `bar.beat.sub`는 파생 display라는 것을 명문화했다 — 시간 모델 재정리(Deferred, M2 에디터 표기 UI 설계 시 재론)는 이번 범위 밖이다. **2.** 첫 박자표 앞 구간은 외삽 표기가 원본 배선에 없는 자리라 `t{tick}` 폴백으로 떨어진다(TM-11, `어긋남`) — domain 검증에 `timeSignatures[0].startTick`이 0이 아니면 flag하는 규칙을 추가했다. **3.** GA-9 근거에 원본 배선상 이 입력이 만들어지지 않으며 재설계에서 gauge/host 분리로 새로 열린 호출 경로에 대한 방어라는 문장을 추가했다(코드 무변경). **4.** rationale의 "표를 고치는 조건"에 출처 인용 요건과, 이 조건이 어긋남의 **처분**만 정하고 **발견**은 별도 장치의 몫이라는 두 문장을 추가했다. **5.** `_plan/build-order.md`·`REVIEW_CHECKLIST.md`에 milestone 마감 시 `npm run mutate`를 `src/core` 전체에 실행하고 생존 뮤턴트를 테스트로 죽이거나 `MUTATION_EQUIVALENTS.md`에 등재하는 gate를 명문화했다.
- **Defined in:** `core/timing.md` §1·§4·§5, `core/data-model.md` §11, `tests/golden/DIVERGENCES.md` §1·§2·§7, `_plan/build-order.md`, `REVIEW_CHECKLIST.md`
- **Rationale:** `_rationale/rationale.md`
- **Affects:** timing, data-model, tests/golden, tests/property, _plan, src/core
- **Supersedes:** None (`timing` §5의 근사 표기 서술과 대장 TM-7 문구를 대체)
- **Commit:** `0890dc505b212c7a1cae4a594bdf0091d07fe42b`


### D-2026-046 — M2 진입 실측 gate를 M2-2 전으로 분리

- **Status:** Accepted
- **Decision:** `_plan/build-order.md` §2·§3의 "M2 진입 전" 실측 gate(판정선 Y·`gw`/`gh`·lane 구분선 굵기·콤보 블록 앵커·게이지 바 위치와 75% 색 반전·히트 이펙트 반지름·sudden lane cover·판정 텍스트 위치·shape render 폭 매핑·lane 최소 간격)를 **M2-2 전**으로 옮긴다. M2-1(`env` — canvas·resize·rAF·입력·audio)은 이 수치를 한 줄도 쓰지 않으므로, gate의 뜻("그거 없이는 이 step을 못 짓는다")이 M2-1에는 성립하지 않았다 — 못 짓는 게 아니라 순서 문제였다면 gate가 아니라 할 일 목록이다. 값이 실제로 쓰이는 시점(M2-2) 바로 앞으로 옮겨, 재는 시점과 쓰는 시점을 붙여 오독을 줄인다 — `HOLD_RELEASE_WINDOW_MS`가 상수 파일만 읽고 사용처를 안 읽어 값이 좁아졌던 사례(D-2026-039)와 같은 부류를 gate 배치 단계에서 막는다. M2-1은 진입 gate 없이 즉시 착수 가능하다.
- **Defined in:** `_plan/build-order.md` §2·§3·§5
- **Rationale:** `_rationale/rationale.md` (복귀 로드맵 §3 논의 참조)
- **Affects:** _plan
- **Supersedes:** None (build-order §2·§3의 "M2 진입" gate 배치를 대체)
- **Commit:** `f92786c`


### D-2026-047 — M2-1 검증 전략 = mock 계약 검사

- **Status:** Accepted
- **Decision:** M2-1(`env`)의 "맞게 만들었다"는 **mock 브라우저로 실패 모드별 동작을 검사**하는 것으로 확인한다 — 골든 표·설계 대장 확장은 쓰지 않는다. `env`는 브라우저에 값을 물어보는 층이라 Node에서 원본을 돌려 기대값을 뽑는 방식이 성립하지 않는다(소리가 났는지, 키가 언제 도착했는지는 JSON으로 안 나온다). `architecture` §1이 이미 `env`를 실패 모드 기준 6파일로 갈라놨으므로 그 경계를 그대로 mock 계약의 단위로 쓴다 — `env-audio`(AudioContext suspended → resume), `env-canvas`(resize·DPR 재계산), `env-time`(rAF 콜백 누락·`frameCap` 상한), `env-input`(focus 이탈 시 keydown 무시, timestamp 단조 증가). 검사 대상은 값이 아니라 "이 조건에서 이 복구/거부가 일어난다"는 동작 문장이다. 실제 브라우저 값과의 일치는 M2 이후 수동 대조 시나리오가 맡고, 대장 §0의 범위(골든 표가 있는 core/M1)는 넓히지 않는다.
- **Defined in:** `_plan/build-order.md` §1
- **Rationale:** `_rationale/rationale.md` (복귀 로드맵 §4 논의 참조)
- **Affects:** _plan, src/env (검증 방법론만 — 구현은 아직 없음)
- **Supersedes:** None
- **Commit:** `7483642`


### D-2026-048 — lane 최소 간격 제한 없음

- **Status:** Accepted
- **Decision:** gameplay 투영에서 lane 구분선의 **최소 간격 제한을 두지 않는다** `[신규 결정]`. [[lane-events]] §3/§4가 서술하던 "경계·이웃과 최소 간격을 둔 채 따라다닌다"를 제거하고, 구속은 경계 클램프 + 순서 클램프(`Blue ≤ 1 ≤ 2 ≤ 3 ≤ Red`) 둘로만 좁힌다. 구분선끼리, 또는 구분선과 경계가 맞붙어 **선처럼 좁아지는 것도 유효한 연출**로 확정했다(원본에서도 lane이 좁혀져 선처럼 보이는 것을 실제로 연출에 쓰고 있었다). `_extracted/EXTRACTED_FACTS.md` §12.9가 확인한 대로 원본에도 최소 간격을 강제하는 코드가 없었다 — 실측이 뒷받침하는 방향과 제품 결정이 일치한다.
- **Defined in:** `core/lane-events.md` §3·§4·§7, `_plan/build-order.md` §3 M2-2 항목, `_extracted/EXTRACTED_FACTS.md` §12.9
- **Rationale:** `_rationale/rationale.md` (사용자 확인: 최소 간격 제한 없음, lane이 좁아져 선처럼 보이는 것도 연출로 사용)
- **Affects:** lane-events, _plan, _extracted
- **Supersedes:** None (lane-events §3의 "최소 간격" 서술을 대체)
- **Commit:** (pending)


```md
### D-YYYY-NNN — <Title>

- **Status:** Accepted | Superseded | Deferred
- **Decision:** 한 줄 결정
- **Defined in:** `path/to/spec.md`
- **Rationale:** `path/to/rationale.md` | Not required
- **Affects:** 주요 영역
- **Supersedes:** D-YYYY-NNN | None
- **Commit:** `5e3d4de`
```

## Maintenance

1. spec 반영과 커밋이 끝난 뒤 항목을 추가한다.
2. 결정 ID는 연도별 일련번호를 사용한다.
3. 번복 시 기존 항목을 삭제하지 않고 `Superseded`로 변경한다.
4. 상세 정의나 장문의 이유를 이 문서에 작성하지 않는다.
5. 최신 spec과 충돌하면 spec을 우선하고 로그를 바로잡는다.
