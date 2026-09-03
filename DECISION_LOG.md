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

- **Status:** Superseded by D-2026-059
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
- **Commit:** `df95fe6`


### D-2026-049 — quick options 패널 내부 조작

- **Status:** Accepted
- **Decision:** quick options 패널(`scene.md` §5, 5필드 — scrollSpeed·gaugeMode·mirror·staticShape·autoplay)의 조작을 확정한다 `[신규 결정]`(build-order §2 gate 해소). **위/아래 화살표**로 row 이동. **값 변경**은 셋 — 마우스 클릭이 그 값으로 즉시 점프, 좌/우 화살표가 한 칸씩 step, 스크롤 휠이 위/아래로 한 칸씩. **Enter가 지금 row의 바뀐 값을 확정**한다. 사용자가 정하지 않은 세부 둘은 구현 시 가장 단순한 관용을 따랐고 재확인이 필요하면 뒤집기 쉽게 한 자리에 모아뒀다 — (1) 스크롤 휠의 부호(위=증가로 스피너 관용을 따름), (2) row 이동 시 그 전 row의 미확정 값 처리(확정 안 된 값은 버려지고 그 필드의 마지막 확정값으로 되돌아간다 — "한 번에 한 필드만 손보는" 모델). bool 필드(mirror/staticShape/autoplay)는 값이 둘뿐이라 방향과 무관하게 토글이다.
- **Defined in:** `src/core/core-quick-options.ts`, `scene/scene.md` §5, `_plan/build-order.md` §2
- **Rationale:** `_rationale/rationale.md` (사용자 확인: "위 아래 화살표로 상하 이동. 값은 그 값으로 바로 점프하는 마우스, 화살표 오른쪽 왼쪽으로 한칸씩, 스크롤은 위 아래로 한칸씩. 바뀐 값은 enter로 confirm.")
- **Affects:** scene, _plan, src/core
- **Supersedes:** None
- **Commit:** `a55a543`


### D-2026-050 — 히트음 계승(절차적 합성), autoplay는 즉시 재생으로 단순화

- **Status:** Accepted
- **Decision:** 히트음은 asset 파일이 아니라 **원본이 절차적으로 합성한 소리를 그대로 계승**한다(build-order §2 마지막 gate 해소, 사용자 확인: "히트음 효과음은 계승해서 사용하기"). 원본 `audio.js`의 `AS.hitBuf` 생성식 — 25ms 모노 버퍼, `exp(-t×160)` 지수 감쇠, 2400/4200/1200Hz 세 배음(가중치 0.35/0.15/0.1)의 합 — 을 `env-audio.createHitBuffer`로 그대로 옮겼다 `[보존]`. 재생은 판정 성공(tap/hold-head, MISS·tail 닫힘 제외)마다 `playHitSound`를 즉시 호출한다 — 원본은 수동 판정에서 `playHit()`(즉시)과 autoplay에서 `scheduleHitsounds`(150ms lookahead 포인터 스케줄러)를 따로 뒀지만, 이 재구현은 manual과 autoplay가 이미 같은 `applyEvents` 경로를 공유하므로(사용자 확인: "원본과 같은 경로로 가기") 별도 lookahead 스케줄러를 새로 만들지 않고 **양쪽 다 즉시 재생**으로 단순화했다 `[신규 결정 — 단순화]`. autoplay 히트음이 원본보다 최대 한 프레임(~16ms) 늦게 울릴 수 있다는 차이가 생기지만, 판정 자체(SYNC 확정 시각)는 영향받지 않는다.
- **Defined in:** `src/env/env-audio.ts`, `src/game/game-session.ts`, `_plan/build-order.md` §2
- **Rationale:** `_rationale/rationale.md` (사용자 확인: "히트음 효과음은 계승해서 사용하기"; 원본 `audio.js`/`play-judgment.js`/`scheduler.js` 실측)
- **Affects:** src/env, src/game, _plan
- **Supersedes:** None
- **Commit:** `3b36c42`


### D-2026-051 — ui-design 최소본 확정(토큰 + result 레이아웃)

- **Status:** Accepted
- **Decision:** `scene/ui-design.md`를 M2-6(result 화면) 최소 ui-design으로 확정한다(build-order §2 "ui-design 최소본" gate 해소). 원본 `play-result.js` 계승안에서 출발해 반복 수정한 결과다 — UI 표면색·텍스트·괘선 토큰, state·게이지·판정·티어·랭크 색 파생 규칙, result 레이아웃(성적/기록/판정·타이밍/곡 열 4블록)을 정의한다. state 색은 독립 정의하지 않고 판정색·게이지색에서 파생시켜(§1.4) `theme.md`와의 중복을 피한다. 액센트(`--cyan: #4fbcd0`)는 `theme.md`의 `WIDE_COLOR`(`#4AE8FF`)와 완전히 같은 값이었던 초안 시안을 실측으로 확인해 채도·명도를 낮춰 교체했다. 티어 색 대 Shape 편집선 충돌(§7-2 우려)은 `edit`·`game`이 서로 다른 scene 축이라(`_plan/architecture.md`) 같은 화면에 동시 노출될 수 없음을 확인해 기각한다. 티어 색 대 실패 적색 근접(§7-3)과 `scene.md` §9에 없는 8개 필드 추가(§6)는 별도 gate로 남긴다.
- **Defined in:** `scene/ui-design.md`, `_plan/build-order.md` §2
- **Rationale:** `_rationale/rationale.md` (사용자 확인: "승인"; 원본 `play-result.js`/`index.html` 실측; `render/theme.md` 색 실측 대조)
- **Affects:** scene, render, _plan
- **Supersedes:** None (D-2026-051 초안을 대체 — 같은 번호, 초안이 채택 전까지 임시 참조였다)
- **Commit:** `b4059bc`


### D-2026-052 — ESC 전체화면 충돌 대체키, result Retry = Space

- **Status:** Superseded (D-2026-053 — result의 Retry/Back 키 배정만 정정, 나머지 세 곳의 Backspace 대체키 결정은 유효)
- **Decision:** 전체화면 중 ESC는 브라우저의 전체화면 탈출 단축키로 예약되어 `preventDefault()`로 막을 수 없다(`ui-design.md` §9). **안 A 채택** — `scene.md`의 기존 ESC 바인딩 네 곳에 비-ESC 대체키를 더한다: credits→title·song-select→mode-select·gameplay→pause overlay 셋 다 **Backspace**로 통일한다(사용자 확인: "gameplay에서도 backspace를 누르면 back해서 pause되는 것으로 통일하기" — 대체키는 화면마다 다른 키가 아니라 하나의 "뒤로" 키다). song-select의 quick options 닫기(`Esc/Space`)는 이미 Space가 있어 대체키가 불필요하다. `navigator.keyboard.lock`(안 B)는 Chromium 전용이라 기각 — Firefox·Safari에서 결국 안 A로 폴백해야 해 대체키를 두 벌 유지하는 비용이 더 크다. 같은 논의에서 result의 Retry 키도 `scene.md` 기존안 F5에서 **Space**로 바꾼다(사용자 확인: "f5를 누르면 브라우저 새로고침으로 작동하는 것 아닌가?" — F5도 ESC와 같은 종류의 브라우저 예약 단축키 문제를 안고 있어 채택 당시 Space로 논의·결정했었다). result는 gameplay 화면이 아니므로 lane 키와 겹치지 않는다.
- **Defined in:** `scene/scene.md` §9, `scene/ui-design.md` §4·§9
- **Rationale:** `_rationale/rationale.md` (사용자 확인: 안 A + Backspace 통일, Retry=Space)
- **Affects:** scene
- **Supersedes:** None (scene.md의 Esc-only·F5 서술을 대체)
- **Commit:** `b4059bc`


### D-2026-053 — result Back/Retry 키 정정: Back = Backspace, Retry = Enter (Space 미사용)

- **Status:** Accepted
- **Decision:** D-2026-052가 정한 result의 Retry=Space를 정정한다 — **Back = Backspace, Retry = Enter**, Space는 UI에서 쓰지 않는다. 1차 근거는 **일관성**이다: D-2026-052가 Backspace를 전 씬 공통 "한 화면 뒤로"로 통일했는데, result만 Enter를 Back에 쓰면(기존 `scene.md` "Back(Enter): song-select") 그 통일에 예외가 하나 남는다. Backspace를 Back에 두면 예외가 사라지고, 남은 Enter가 자연스럽게 실행/재시도가 된다. 2차 근거는 반사 입력 차단이다 — 곡이 막 끝난 직후 손이 아직 lane 키(Space 포함) 위에 있어 마지막 노트에 대한 연타 관성이 Retry로 흘러들 수 있다. 부수 효과로 Space가 result에서 완전히 빠지며 lane 키와의 중복도 없어진다. D-2026-052가 세운 "Backspace = 전 씬 공통 뒤로" 원칙을 되돌리는 게 아니라 끝까지 적용하는 쪽이다.

  song-select의 quick options 닫기(`Esc/Space`)는 이번 결정의 범위 밖이다 — result의 반사 입력 문제(곡 종료 직후 손이 lane 키 위)는 song-select에는 없는 조건이라 같은 논리를 그대로 옮길 수 없고, Backspace-as-back 통일 관점에서 바꿀지는 "오버레이 닫기가 화면 뒤로가기인지 패널 닫기인지"부터 song-select UX를 보고 정해야 한다. result 게이트에 끼워 넣지 않고 song-select 작업 때 별도로 처리한다.
- **Defined in:** `scene/scene.md` §9, `scene/ui-design.md` §4·§9
- **Rationale:** `_rationale/rationale.md` (사용자 확인: "Retry = Enter, Back = Backspace" — 근거는 Backspace-as-back 통일의 예외 제거가 1차, 반사 입력 차단이 2차. song-select Space는 범위 밖, 이월)
- **Affects:** scene
- **Supersedes:** D-2026-052 (result의 Retry=Space 부분만 — 나머지 세 곳 Backspace 대체키 결정은 유효)
- **Commit:** `8ca8842`


### D-2026-054 — result 데이터 필드 5종 확정: gaugeTrace·progress·timingErrors·fastCount/slowCount·playedAt

- **Status:** Accepted
- **Decision:** `ui-design.md` §6의 8개 후보 중 실제로 빠진 다섯 필드만 `scene.md` §9에 추가한다. `chart.subtitle`·`fast`/`slow`(표시)·`prevBest`(표시 자체)는 이미 §9 result 표시 줄에 있어 제외한다. `options.settled`는 새 필드가 아니라 **전달 경로 문제**로 확인됐다 — `PlayResult`(`src/core/core-gauge.ts:246`)에 `tier`가 없어 `evaluateState`가 소비하고 버린다; `PlayResult.tier: Tier`를 core에 추가하고 `game-session.ts` 호출부를 고친다.
  - `progress`: 0~1. clear 시 항상 `1`, `forceEnded` 시 `종료 지점 / contentEndMs` `[정정 — 초안의 songEndMs 폐기]`. `songEndMs = contentEndMs + SONG_END_TAIL_MS`(무음 꼬리)라 분모로 쓰면 클리어해도 콘텐츠가 끝나는 실제 시점이 100%에 못 미치게 찍힌다 — `[[timing]] §9`가 이미 "진행 표시의 분모는 contentEndMs"라고 못박은 자리이므로 그 단일 출처를 그대로 따른다. 화면은 실패 시에만 쓴다.
  - `prevBest`: `null`이 정상 값이다(M3 이전·이후 최초 플레이 공통) — result는 `null`을 `0`/`0.00%` 기준선으로 다룬다. M3(기록 저장)를 기다릴 필요 없이 지금 붙인다.
  - `timingErrors`: `Float32Array`, 판정마다 1개 push. MISS는 `NaN`(0을 넣으면 분포 중앙에 가짜 봉우리가 생긴다) — 히스토그램·σ 계산은 `NaN`을 표본에서 제외한다. 원본 `histogram()`/`timingStats()`를 그대로 포팅하면 `NaN`을 거르지 않아 인덱스·평균이 깨지므로, 재구현 두 함수 모두 진입부에 `Number.isFinite()` 필터를 추가한다.
  - `fastCount`/`slowCount`: 신규 필드 아님 — 이미 `playState.fastCount`/`slowCount`(D-2026-039)이고 §9 "FAST·SLOW" 표시가 이 값을 읽는다고 명시만 한다. SYNC·MISS·wide·autoplay 제외 규칙은 기존 `[[glossary]]` §2 그대로다.
  - `gaugeTrace`: 고정 200포인트, **진행률(`contentEndMs` 200등분) 간격**이다 `[정정 — 초안의 songEndMs 폐기]`. ms 간격은 고정 개수와 양립하지 않고(곡 길이로 나누면 그게 곧 진행률 간격) 실패 조기 종료 시 `progress` 기반 가로 폭 계산과 어긋난다. 분모를 `songEndMs`가 아니라 `contentEndMs`로 쓰는 이유는 `progress`와 같다 — 무음 꼬리(`SONG_END_TAIL_MS`)를 분모에 넣으면 200번째 샘플이 실제 콘텐츠 종료 시점보다 늦어져 클리어 곡선이 100%에 못 미치는 지점에서 멈추고, `finalize`의 200-채움 로직이 그 꼬리 구간을 마지막 값의 평평한 반복으로 채우게 된다. Cascade는 게이지 종류별로 각각 기록하다가 세션 종료 시 **확정된 tier의 배열만 남긴다** — "매 샘플 최고 tier 하나"로 이어붙이면 확정 단색 라인(§1) 아래 서로 다른 게이지 구간이 섞이고 값이 도약한다.
- **Defined in:** `scene/ui-design.md` §6, `scene/scene.md` §9(후속 반영)
- **Rationale:** `_rationale/rationale.md` (사용자 확인: 5필드 승인, gaugeTrace ms→진행률 간격 정정, Cascade 최고-tier-단일-배열→게이지별 기록 후 확정분만 유지로 정정. 구현 세션에서 진행률 분모를 songEndMs→contentEndMs로 추가 정정 — `[[timing]] §9` 기존 단일 출처 적용, 무음 꼬리 문제 근거로 사용자 확인)
- **Affects:** scene, core(`PlayResult.tier` 추가는 별도 구현 스텝)
- **Supersedes:** None (ui-design.md §6 8필드 초안을 대체)
- **Commit:** `f4e2298`


### D-2026-055 — 티어 색(SURGE) 대 실패 적색 근접 [수용], M2-6 전 gate 완전 해소

- **Status:** Accepted
- **Decision:** `ui-design.md` §7-3 — SURGE `#ff4d5e`와 `--j-miss` `#ff5f70`이 색상값은 가깝지만 **수용**한다. 두 색이 실제로 만나는 유일한 조건(곡 선택창 실패 기록 표시)은 M3(기록 저장) 이후에나 성립하는데, 지금 정하지 않으면 M3에서 같은 논의가 다시 열리므로 사실 확인이 아니라 지금 확정하는 결정 항목으로 처리했다. 근거는 §7-5(CLEAR 대 FULL COMBO)와 동일한 논리 — 색상값이 가까워도 렌더 형태가 다르면 실제로는 혼동되지 않는다: 티어 칩은 배경이 칠해진 박스, 실패 표시는 작은 글자·아이콘이라 형태로 갈린다. SURGE를 주황으로 옮기는 안(티어 램프 B G R W D의 "R" 근거가 흐려짐)과 실패 표시를 비-색상 수단으로 바꾸는 안은 기각했다 — 후자는 곡 선택창 디자인이 아직 없어 미리 못 박을 필요가 없고, 형태 차이만으로 이미 충분하다.

  이로써 `ui-design.md` §6·§7-3 두 M2-6 전 gate가 모두 닫혔다(§6은 D-2026-054). 남은 §7-2(티어 색 대 Shape 색)는 M2-6과 무관한 별도 gate로 남는다.

  **구현 순서**(합의): `PlayResult.tier` 추가 + `game-session.ts` 필드 배선을 먼저 하고 CSS/JS 포팅을 나중에 한다 — 실데이터로 화면을 보면서 진행해 픽스처로 맞춰놓고 나중에 다시 뜯는 일을 피한다. 포팅 시 주의 두 가지: (1) 원본 `scene-result.js`의 `renderTiming()`은 `r.timingErrors`를 직접 binning하므로 실데이터 배선 전에는 히스토그램이 비어 있는 게 정상이다. (2) `renderGauge()`는 `r.gaugeTrace[length-1]`을 잔량으로, `r.progress`로 가로 폭을 잡는다 — 진행률 200등분 샘플링과는 맞지만, 실패 판에서 배열이 짧게 끝날 때 마지막 값이 0에 가까운지 확인 필요.
- **Defined in:** `scene/ui-design.md` §7-3
- **Rationale:** `_rationale/rationale.md` (사용자 확인: 수용 — 형태 차이로 색상 근접을 해소, §7-5와 동일 논리)
- **Affects:** scene
- **Supersedes:** None
- **Commit:** `14f5cdb`


```md
### D-2026-056 — ui-design.md 표기 누락 2건 확정: AP 풀네임, rank E 색

- **Status:** Accepted
- **Decision:** M2-6 CSS/JS 포팅 중 발견된 `ui-design.md` 표기 누락 두 건을 인접 패턴으로 추론한 값 그대로 확정한다.
  - **`AP`(ALL PERFECT) 풀네임**: §2.1의 state 풀네임 목록(FULL COMBO, ALL SYNC, HARD CLEAR, CLEAR, FAILED)에 `AP`가 빠져 있었다 — `PlayState` 6종 중 유일하게 누락. `AS`→`ALL SYNC`와 동일하게 "ALL " + 판정 이름 패턴을 그대로 적용해 `ALL PERFECT`로 확정한다.
  - **rank `E` 색**: §1.6 랭크 색 표가 `RANK_TABLE`(`core-constants.ts`, U/S+/S/A+/A/B/C/D/E/F 10종)의 `E`를 누락했다. 표가 이미 인접 랭크를 그룹으로 묶는 구조(S+/S, A+/A, C/D)이므로 그 패턴을 한 칸 더 밀어 `C`/`D` 그룹(`#8a8aa4`)에 합류시킨다.

  둘 다 기존 표의 구조적 패턴을 그대로 연장한 값이라 새 미학적 판단을 넣지 않았다.
- **Defined in:** `scene/ui-design.md` §1.6, §2.1
- **Rationale:** `_rationale/rationale.md` (사용자 확인: "둘다 확정. 그대로 가자")
- **Affects:** scene
- **Supersedes:** None (누락 보완이지 번복 아님)
- **Commit:** `6662669`


### D-2026-057 — M2-7에서 로딩 표시를 분리, 별도 미배정 단위로

- **Status:** Accepted
- **Decision:** `_plan/build-order.md` §5의 M2-7("마감 — 탭 백그라운드 auto-pause, 로딩 표시, 브라우저 단축키 충돌 처리")에서 **로딩 표시**를 떼어낸다. M2-7은 이제 탭 백그라운드 auto-pause·브라우저 단축키 충돌 처리 두 항목만 남는다 — 둘 다 구현·테스트를 마쳤다. 로딩 표시는 실제 비동기 호출부(`env-audio.decode()` 등)에 잇는 배선이 있어야 관찰 가능한데, M2는 §5 목표("scene 그래프·파일 층은 아직 없고 chart는 고정 입력")상 그 배선을 붙일 파일 로드 host 자체가 없다 — Exit 기준("지연이 임계를 넘으면 로딩 표시가 뜬다")이 M2 안에서는 관찰될 길이 없는 항목을 억지로 M2-7에 두면 "못 짓는 게 아니라 순서 문제"인 자리에 gate 아닌 할 일을 방치하는 것과 같은 부류의 문제다(D-2026-046과 같은 논리, 대상만 gate가 아니라 step 항목).

  분리된 로딩 표시는 milestone·step 번호를 받지 않는다 — 파일 로드 host를 짓는 step이 정해질 때(M3 이후 유력) 그 자리에 붙인다. 컴포넌트 자체(`src/scene/scene-loading.ts`, 임계 300ms 뜨고/숨는 계약)는 이미 구현·테스트됐고 그대로 유지한다 — 남는 것은 배선뿐이다.
- **Defined in:** `_plan/build-order.md` §5, `README.md` 다음 후보
- **Rationale:** `_rationale/rationale.md` (사용자 확인: "로딩-인디케이터 항목을 별도의, 일정 미배정 milestone/unit으로 분리하고... M2-7 범위를 이미 끝난 두 항목으로 좁혀라")
- **Affects:** _plan, scene
- **Supersedes:** None (M2-7 범위를 좁히는 것이지 이전 결정을 뒤집는 게 아니다)
- **Commit:** `fd70f46`


### D-2026-058 — M2 Exit 충족 판정: 3종 실측 대조 + 2종 의도된 편차 + 3종 spec-테스트 잠정 승인

- **Status:** Accepted
- **Decision:** `_plan/build-order.md` §5 M2 Exit(수동 대조 시나리오 8종)을 아래 근거로 **충족**으로 판정한다.
  - **실측 대조로 확인(3종)** — 전 SYNC·전 MISS·hard 사망. `airpole/conflux-editor`를 직접 clone해 골든 추출 파이프라인(`npm run golden`, `CONFLUX_EDITOR_DIR`)을 그 위에서 재실행하고, 결과(`result.json`·`gauge.json`)를 커밋된 골든 표와 바이트 단위로 대조했다 — 편차 0, 전체 816개 테스트 통과. 가정이 아니라 실제 원본 실행 결과다.
  - **원본과 일치가 목표가 아님(2종)** — cascade 강등(`core/gauge.md` §4·`DIVERGENCES.md` GA-4, 원본에 대응물 자체가 없음)·곡 끝 tail(TM-1, `SONG_END_TAIL_MS` 고정값은 원본의 조건부 `+4000/+2000ms`와 다르게 가기로 이미 D-2026-030에서 확정된 의도된 편차). 이 둘은 "원본과 같은가"를 물을 대상이 아니다.
  - **spec 테스트로 잠정 승인(3종)** — Hold 동시 소유(JD-2)·mid-start crossing-Hold(JD-7)는 `DIVERGENCES.md`가 이미 `미커버`로 등재해 원본 대조 골든이 없다고 밝혀뒀고, 후자는 원본 자체가 그 케이스를 정의하지 않는다. pause/Resume은 원본을 보존한 동작이 아니라 이번에 새로 정한 UX(D-2026-022)라 원본 대조 대상이 아니며, 검증에 실제 wall-clock·키 입력 타이밍이 필요해 headless 테스트로 재현할 수 없다. 셋 다 지금은 `core-judge.test.ts`/`game-engine.test.ts`의 spec 테스트(재설계 모델의 자기 일관성 검증)로 **당분간 충분**하다고 승인한다 — 진짜 원본-대조 수준 검증은 사람이 실제 브라우저에서 두 구현을 나란히 조작해야 하고, 이 세션엔 그 수단이 없다.

  이 승인은 위 세 항목이 "검증 끝"이라는 뜻이 아니다 — `_meta/manual-qa.md`(QA-1~3)에 무엇을 어떻게 확인해야 통과인지 구체적 절차로 남겨, 나중에 실제 QA를 돌릴 근거를 잃지 않는다. 이 파일은 같은 벽(자동화 불가·사람 확인 필요)에 부딪히는 모든 미래 항목을 계속 쌓는 자리다.
- **Defined in:** `_plan/build-order.md` §5, `_meta/manual-qa.md`
- **Rationale:** `_rationale/rationale.md` (사용자 확인: "1/2/3은 실측 근거, 4/8은 의도된 편차, 5/6/7은 spec-테스트로 당분간 충분 — 진짜 검증은 브라우저 QA가 필요하며 지금 수단이 없다는 전제로 M2 Exit을 충족 처리한다")
- **Affects:** _plan, _meta
- **Supersedes:** None
- **Commit:** `bbe178c`


### D-2026-059 — D-2026-021 해소: bundled 배포·평문 `.cfx`·records 로컬 유지

- **Status:** Accepted
- **Decision:** D-2026-021의 세 하위 질문을 다음과 같이 확정하고, M3 진입 gate를 닫는다.
  1. **라이브 웹 배포**: **안 A(bundled/static) 채택** — `_meta/persistence.md` §12의 현재 기준(`game-public: bundled curated .cfx만`)을 그대로 유지한다. 관리자 업로드·서버 호스팅 배포(안 B)는 도입하지 않는다.
  2. **`.cfx` 보호 수준**: **평문 채택** — 암호화 계층을 두지 않는다. D-2026-021이 남긴 "1차 추천(억지력 암호화)"은 채택하지 않는다.
  3. **공개 서비스 기록 저장 위치**: **브라우저 로컬 유지** — `_meta/records.md`의 현재 계약(로컬 개인 best, 서버 제출 없음)을 그대로 확인한다. 서버 기반 기록의 존재 여부 자체는 여전히 D-2026-019 소관이며, 이번 결정은 그 판을 열거나 닫지 않는다 — D-2026-019는 **Deferred로 유지**한다(로컬을 선택했으므로 강제되는 후속 결정이 없다).

  **근거**: 이 조합은 아키텍처를 순수 정적 client SPA로 유지한다 — 백엔드·호스팅 비용·운영 부담·새 인프라가 전혀 없다. 현재 프로젝트 규모에 맞는 선택이다. **받아들이는 트레이드오프**: (a) chart·음원 파일은 어떤 유저든 완전히 추출 가능하다 — 재배포에 대한 실질적 방어가 없다. (b) 공개 리더보드·부정 방지는 이 모델에서 **보류가 아니라 봉쇄**된다 — `_meta/records.md`/D-2026-019 자체가 이미 "신뢰 가능한 기록은 신뢰 경계 바깥(서버)의 검증으로만 성립한다"고 못박아뒀으므로, 로컬 유지가 그 결론을 재확인하는 것이지 새로 여는 문제가 아니다.
- **Defined in:** `_meta/persistence.md` §12, `_meta/records.md`, `_plan/build-order.md` §2
- **Rationale:** `_rationale/rationale.md` (사용자 확인: "1=A(bundled), 2=평문, 3=로컬 유지 — 순수 정적 SPA 유지가 목적, 트레이드오프는 명시적으로 수용")
- **Affects:** _plan, _meta(persistence, records), game-public 곡 공급
- **Supersedes:** D-2026-021
- **Commit:** `7d62200`


### D-2026-060 — 라이선스 서드파티 트랙 추출 가능성: 후속 팔로업 (블로킹 아님)

- **Status:** Accepted (팔로업 기록 — M3 진입과 무관, 블로킹 아님)
- **Decision:** D-2026-059가 `.cfx` 평문·bundled 배포를 확정하면서, 자체 제작 트랙과 다른 성격의 우려 하나를 별도로 남긴다 — **라이선스 서드파티 곡**(아웃리치로 확보한 트랙)은 게임 내 사용·홍보 사용을 허가받았지만 그 라이선스 조건이 "추출 가능성"을 다루지 않는다. 계약 위반은 아니지만, 아티스트가 자기 음원이 클라이언트에서 손쉽게 추출 가능하다는 사실을 나중에 알게 될 때의 **평판·신뢰 리스크**가 있다 — 자체 제작 트랙에는 없는 종류의 문제다.

  지금 당장 조치하지 않는다(암호화는 D-2026-059가 명시적으로 기각했다). 두 가지를 후속 항목으로만 남긴다:
  - (a) 앞으로 보낼 아웃리치 이메일 템플릿에 "이 게임은 클라이언트 사이드 웹 앱이라 파일이 기술적으로 추출 가능하다"는 고지 문구를 추가할 것.
  - (b) 이 우려가 실제로 문제가 되면(예: 아티스트 항의), **자체 제작 트랙은 그대로 두고 라이선스 서드파티 트랙에만 범위를 좁힌** 경량 클라이언트 암호화를 재검토할 것 — 지금은 하지 않는다.
- **Defined in:** `_meta/persistence.md` §12(각주), `README.md` Deferred
- **Rationale:** `_rationale/rationale.md` (사용자 확인: "라이선스 트랙은 자체 제작과 다른 우려 — 지금 안 하고 팔로업으로만 기록")
- **Affects:** _meta(persistence 곡 공급 정책), 아웃리치 프로세스(레포 밖)
- **Supersedes:** None
- **Commit:** `7d62200`


### D-2026-061 — M3-1 쓰기 실패 UI 배선·IndexedDB 마이그레이션 정책: 지금 결정하지 않음

- **Status:** Accepted (팔로업 기록 — M3-1 완료와 무관, 블로킹 아님)
- **Decision:** M3-1(`env-storage`, `_meta/persistence.md` §1) 구현 중 나온 두 항목을 지금 결정하지 않고 후속 항목으로만 남긴다. 둘 다 "못 짓는 게 아니라 순서 문제"라 D-2026-057(로딩 표시 분리)과 같은 논리다 — 필요해지는 시점이 오면 그 자리에서 자연히 결정된다.

  1. **쓰기 실패 지속 표시 UI**: `env-storage`는 `getWriteStatus`/`onWriteStatusChange`(및 이번에 추가한 `retryWrite`)로 실패를 관찰 가능하게만 만든다. 실제 화면 표시(토스트·배너 등)는 `architecture.md` §1 레이어 규율상 scene/app 소관이라 env가 만들 수 없고, 그걸 배선할 파일 저장/워크스페이스 호스트 자체가 아직 없다(M3-2·M3-3에서 생김). 호스트가 생기는 step에서 자연히 배선하면 된다 — 지금 결정할 제품 질문이 없다.
  2. **IndexedDB 데이터베이스/버전 마이그레이션 정책**: 현재 데이터베이스명 `conflux`, version 1 고정, `onupgradeneeded`는 5개 object store를 만들기만 하고 실제 마이그레이션 로직은 없다. 각 store의 실제 스키마(library value 구조, records 필드 등)는 아직 M3-1 범위 밖(M3-6·M3-7 등 이후 step)이라 스키마가 실제로 바뀌는 시점 전에는 마이그레이션 정책을 정할 근거 자체가 없다. 스키마 변경이 실제로 생기는 step에서 다룬다.

  둘 다 milestone·step 번호를 받지 않는다 — 필요해지는 시점(①은 M3-2/M3-3 유력, ②는 store 스키마가 실제로 바뀌는 첫 시점)에 그 자리에서 다룬다.
- **Defined in:** `src/env/env-storage.ts`, `_plan/build-order.md` M3-1
- **Rationale:** Not required (D-2026-057과 동일 패턴 — 순서 문제를 지금의 제품 결정으로 위장하지 않는다)
- **Affects:** env(env-storage), 향후 M3-2/M3-3/M3-6/M3-7
- **Supersedes:** None
- **Commit:** `f663ba1`


### D-2026-062 — M3-2 첫 저장 version 고정, `env-file` 브라우저 폴백: 지금 결정하지 않음

- **Status:** Accepted (팔로업 기록 — M3-2 완료와 무관, 블로킹 아님)
- **Decision:** M3-2(`edit-chart-save`/`edit-chart-open`/`env-file`, `_meta/persistence.md` §4·§9) 구현 중 스펙 문면이 명시하지 않은 두 항목을 지금 결정하지 않고 남긴다.

  1. **신규 chart 첫 저장에서 version을 사용자가 바꿀 수 있는가**: §4 "신규 chart 첫 저장"은 "첫 `Ctrl+S`는 version을 올리지 않고 v1로 저장한다"만 말한다 — 저장 창이 첫 저장에서도 version 필드를 보여주고 사용자가 그것을 편집할 수 있는지(예: 처음부터 v3으로 저장을 원하는 경우)는 적혀 있지 않다. `isSaveVersionValid`는 가장 좁은 해석 — **첫 저장은 메모리 `version`(항상 `1`)과 정확히 같아야 유효** — 을 채택했다. 사용자가 저장 창 UI에서 첫 저장 version을 직접 고를 수 있어야 한다면 이 함수의 계약이 바뀌어야 한다.
  2. **`env-file`의 실제 브라우저 구현**: File System Access API(`showOpenFilePicker`/`showSaveFilePicker`) 모양으로 호스트 인터페이스를 잡았다 — 파일 위치·이름을 사용자가 저장 창에서 고를 수 있어야 한다는 §4 요구("저장 창에서 위치, 파일명, version을 확인·수정할 수 있다")에 가장 직접 맞는 API이기 때문이다. 이 API를 지원하지 않는 브라우저(Safari 구버전 등)에서의 폴백(`<input type=file>` + 다운로드 링크 등)은 다루지 않았다 — 실제 브라우저 호스트 구현체를 붙이는 시점(에디터 scene이 서는 M5, 또는 그 전에 실제 배선이 필요해지는 시점)에 정한다.

  둘 다 milestone·step 번호를 받지 않는다 — ①은 저장 창 UI(M5)가 실제로 서는 시점, ②는 `env-file`의 실제 브라우저 호스트를 붙이는 시점에 그 자리에서 다룬다.
- **Defined in:** `src/edit/edit-chart-save.ts`, `src/env/env-file.ts`, `_plan/build-order.md` M3-2
- **Rationale:** Not required (D-2026-057·D-2026-061과 동일 패턴)
- **Affects:** edit(edit-chart-save), env(env-file), 향후 M5(에디터 저장 창 UI)
- **Supersedes:** None
- **Commit:** `a2c366d`


### D-2026-063 — M3-3 복구 세션의 autosave 재개 시점, asset 재선택 UI: 지금 결정하지 않음

- **Status:** Accepted (팔로업 기록 — M3-3 완료와 무관, 블로킹 아님)
- **Decision:** M3-3(`edit-workspace`/`edit-session-transition`, `_meta/persistence.md` §5·§6) 구현 중 스펙 문면이 다루지 않는 두 항목을 지금 결정하지 않고 남긴다.

  1. **복구된 세션의 autosave 재개 시점**: §6은 "복구된 세션은 dirty 상태로 시작한다"만 말하고, 복구 직후 autosave 타이머를 바로 예약할지(이미 dirty이므로) 아니면 다음 실제 변경까지 기다릴지는 적지 않는다. `createWorkspaceSession({ recovered: true })`는 후자 — **다음 변경까지 autosave를 예약하지 않는다** — 를 택했다. 방금 읽어들인 내용이 이미 디스크의 workspace와 같으므로 즉시 재기록이 불필요하다는 것이 근거이지만, "혹시 모를 비정상 종료 대비 재확인"을 원한다면 반대 선택이 맞을 수 있다.
  2. **asset(music/jacket) 재선택 UI**: `WorkspaceSession.updateMusicBlob`/`updateJacketBlob`는 자리만 만들었다 — 실제로 사용자가 파일을 다시 골라 Blob을 주는 흐름(`_meta/persistence.md` §10 "필요한 경우 사용자가 asset을 다시 선택한다")은 파일 선택 UI가 있는 층(M5)의 몫이라 아직 배선하지 않았다.

  둘 다 milestone·step 번호를 받지 않는다 — ①은 실제 비정상 종료 재현 테스트(수동 QA 또는 이후 milestone)가 필요해지는 시점, ②는 M5 asset 패널이 서는 시점에 그 자리에서 다룬다.
- **Defined in:** `src/edit/edit-workspace.ts`, `_plan/build-order.md` M3-3
- **Rationale:** Not required (D-2026-057·061·062와 동일 패턴)
- **Affects:** edit(edit-workspace), 향후 M5(에디터 asset 패널)
- **Supersedes:** None
- **Commit:** `4d35880`


### D-2026-064 — M3-4 `.cfx` ZIP 무압축(store), 폴더 스캔 prefill: 지금 결정하지 않음

- **Status:** Accepted (팔로업 기록 — M3-4 완료와 무관, 블로킹 아님)
- **Decision:** M3-4(`edit-cfx-package`/`env-file.createZipArchive`, `_meta/cfx.md` §8·§9) 구현 중 스펙 문면이 정하지 않는 두 항목을 지금 결정하지 않고 남긴다.

  1. **ZIP 압축 방식**: `createZipArchive`는 **store(무압축)만** 구현했다 — 이 레포가 런타임 의존성 0을 유지해 온 것과 같은 이유로, deflate 압축을 직접 구현하거나 외부 라이브러리(fflate 등)를 새 런타임 의존성으로 들이는 대신 의존성 없는 최소 ZIP writer를 택했다. `_meta/cfx.md`는 압축 여부를 규정하지 않는다. asset(특히 음원)이 큰 패키지에서 결과물 용량이 커진다는 트레이드오프가 있다 — 실제 사용자 체감(다운로드/저장 시간)이 문제가 되면 그때 deflate로 바꾼다. `createZipArchive`의 시그니처(`ZipEntry[] → Uint8Array`)는 압축 방식이 바뀌어도 유지되므로 나중에 바꿔도 호출측(`edit-cfx-package`)은 손대지 않는다.
  2. **폴더 스캔 prefill**: `_meta/cfx.md` §9는 "사용자가 작업 폴더 하나를 지정하면 접근 권한 범위에서 chart JSON·asset을 자동 탐색해 선택 목록을 미리 채운다"는 편의 기능을 정의하지만, 패키징 진입점 자체는 다중 파일 선택 하나로 확정돼 있다(D-2026-016). 이번 M3-4는 진입점(다중 파일 선택 → `groupBySongId`/`recommendCandidates`/`validatePackageGroup`/`buildCfxPackage`)만 구현했다 — 폴더 스캔은 그 선택 목록을 미리 채우는 **편의 기능일 뿐**이라 실제 파일시스템 탐색 UI(`showDirectoryPicker` 등)가 필요하고, 이는 패키징 화면 UI 자체가 서는 시점(M4/M5)의 일이다.

  둘 다 milestone·step 번호를 받지 않는다 — ①은 실제 대용량 패키지에서 용량이 문제가 되는 시점, ②는 패키징 화면 UI가 서는 시점에 그 자리에서 다룬다.
- **Defined in:** `src/env/env-file.ts`(`createZipArchive`), `src/edit/edit-cfx-package.ts`, `_plan/build-order.md` M3-4
- **Rationale:** Not required (D-2026-057·061·062·063과 동일 패턴)
- **Affects:** env(env-file), edit(edit-cfx-package), 향후 M4/M5(패키징 화면 UI)
- **Supersedes:** None
- **Commit:** `494a1c1`


### D-2026-065 — M3-5 chart JSON/asset 구별 기준(`.json` 확장자), import decode 게이트 경계: 지금 결정하지 않음

- **Status:** Accepted (팔로업 기록 — M3-5 완료와 무관, 블로킹 아님)
- **Decision:** M3-5(`edit-cfx-load`, `_meta/cfx.md` §12·§15) 구현 중 스펙 문면이 명시하지 않는 두 항목을 지금 결정하지 않고 남긴다.

  1. **`.cfx` 안에서 chart JSON과 asset을 가르는 기준**: `.cfx`는 하위 폴더 없는 평탄 ZIP이라([[cfx]] §8) chart JSON과 asset을 구조적으로 구별할 신호가 파일명 확장자뿐이다. `loadCfxPackage`는 `.json`으로 끝나는 항목만 chart 후보로 시도하고 나머지는 전부 asset으로 취급한다 — `.cfx` §1의 파일명 관례(`{title}_..._v{n}.json`)를 그대로 따른 것이다. 다른 접근(모든 항목을 일단 파싱 시도해보고 성공하는 것만 chart로 인정)도 가능했지만, 확장자 기준이 더 예측 가능하고 우연히 유효한 Chart 구조를 갖춘 비-chart JSON 자산이 chart로 오인될 여지를 없앤다. `_meta/cfx.md`가 이 구별 기준을 명문화하지 않아 결정 사항으로 남긴다.
  2. **game/library import의 실제 audio decode 게이트**: `_meta/cfx.md` §12.2 "game/library import·load"는 "모든 playable music을 현재 환경에서 decode 검증한다 ... 하나라도 실패하면 package 전체 거부"를 요구한다. `loadCfxPackage`는 이 결정을 내리지 않는다 — ZIP 압축 해제와 §10/§12.1의 구조 검증까지만 하고, 실제 `env-audio.decode()`를 통한 음원 decode 검증은 하지 않는다. 이유: decode 검증은 "로드했다"가 아니라 "라이브러리에 등록해도 되는가"의 정책이고, `env-audio.AudioEnv`(M2-1)를 주입해야 하는데 그 주입·에러 집계·jacket-실패-시-placeholder-계속 로직은 M3-6(game library 등록)이 자연스러운 자리라고 판단했다. `_meta/cfx.md`는 이 경계를 "M3-5 vs M3-6"으로 명시하지 않으므로(빌드 오더의 step 경계가 이 판단 근거다), 결정 사항으로 남긴다.

  둘 다 milestone·step 번호를 받지 않는다 — ①은 실제로 확장자 없는/다른 확장자의 chart JSON을 다뤄야 하는 사례가 나오는 시점, ②는 M3-6(game library 등록) 구현 시점에 그 자리에서 다룬다.
- **Defined in:** `src/edit/edit-cfx-load.ts`, `_plan/build-order.md` M3-5·M3-6
- **Rationale:** Not required (D-2026-057·061·062·063·064와 동일 패턴)
- **Affects:** edit(edit-cfx-load), 향후 M3-6(game library)
- **Supersedes:** None
- **Commit:** `c19e05a`


### D-2026-066 — M3-6 jacket 이미지 decode host 부재, records 경계, reimport 확인 UI: 지금 결정하지 않음

- **Status:** Accepted (팔로업 기록 — M3-6 완료와 무관, 블로킹 아님)
- **Decision:** M3-6(`edit-cfx-library`, `_meta/persistence.md` §12·D-2026-018) 구현 중 나온 세 항목을 지금 결정하지 않고 남긴다.

  1. **jacket 이미지 decode host 부재**: `_meta/cfx.md` §12.2·`_meta/persistence.md` §12는 "jacket decode 실패는 placeholder와 경고"를 요구하지만, 이 레포에는 아직 이미지 decode를 실제로 수행하는 env 계층이 없다(`env-canvas`는 canvas 획득·resize·DPR·fullscreen만 다룬다, `_plan/architecture.md` §1). `validateCfxForImport`의 `decodeJacket`은 **선택적** 주입으로 남겨뒀다 — 주지 않으면 jacket decode 검증 자체를 건너뛴다(차단도 경고도 없음). 실제 이미지 decode host(어떤 API로 만들지 — `createImageBitmap`, `<img>` 로드 등)는 아직 결정하지 않았다.
  2. **records 경계**: `_meta/persistence.md` §12 "삭제"는 "records 삭제 여부는 records의 고아 기록 정책을 따른다"고 명시한다. `deleteLibraryEntry`는 library blob만 지우고 records는 전혀 건드리지 않는다 — records 모듈 자체가 아직 없다(M3-7). 고아 기록 정책이 실제로 무엇을 삭제/보존할지는 M3-7이 정한다.
  3. **reimport 확인 UI**: `planLibraryRegistration`이 비교(추가·삭제·upgrade·downgrade)를 내지만, 그것을 사용자에게 실제로 보여주고 선택(진행/취소)을 받는 UI는 song-select scene(M4)이 서는 시점의 일이다. `commitLibraryRegistration`은 "확인을 이미 거쳤다"는 **호출 규율**로만 다운그레이드 허용(D-2026-018)을 지킨다 — 함수 자체가 확인 여부를 검증하지 않는다.

  셋 다 milestone·step 번호를 받지 않는다 — ①은 실제 jacket 렌더링이 필요해지는 시점(M4/M5), ②는 M3-7(records) 구현 시점, ③은 song-select UI(M4)가 서는 시점에 그 자리에서 다룬다.
- **Defined in:** `src/edit/edit-cfx-library.ts`, `_plan/build-order.md` M3-6·M3-7
- **Rationale:** Not required (D-2026-057·061·062·063·064·065와 동일 패턴)
- **Affects:** edit(edit-cfx-library), 향후 M3-7(records)·M4(song-select)
- **Supersedes:** None
- **Commit:** `9b71d20`


### D-2026-067 — M3-7 "이번 판의 파생 score" 자기완결 해석, game-session 배선·records 초기화 UI 미결: 지금 결정하지 않음

- **Status:** Accepted (팔로업 기록 — M3-7·M3 milestone 완료와 무관, 블로킹 아님)
- **Decision:** M3-7(`core-records.ts`/`game-records.ts`, `_meta/records.md`) 구현 중 나온 항목들을 지금 결정하지 않고 남긴다.

  1. ~~**"이번 판의 파생 score" 자기완결 해석**~~ — **해소** (D-2026-069). "이번 판"은 실제 `PlayResult.score`(chart 진짜 `totalUnits` 기준)를 쓰고, "저장된 판"은 자기완결 근사로 재계산하는 비대칭 비교로 정리했다.
  2. **`game-session.finalize` → `saveRecordIfEligible` 배선 부재**: `game-records.ts`의 함수들은 만들었지만, 실제 판이 끝나는 지점(`game-session.ts`의 `finalize`)에서 이걸 호출하는 배선은 없다. `midStart`·`editorOrigin`을 실제로 판별하는 로직(CTX가 그 정보를 어떻게 실어 나를지)도 아직 없다 — song-select→game 진입 경로(M4)와 editor test 진입 경로(M5)가 서야 안다.
  3. **기록 초기화(§4) 진입 UI**: `resetRecord` 함수는 만들었지만 confirm 다이얼로그·`FEATURES.recordReset` 게이팅 진입점은 song-select scene(M4)의 몫이라 아직 없다.

  셋 다 milestone·step 번호를 받지 않는다 — ①은 실제 배선(②) 시점에 재확인, ②·③은 M4/M5가 서는 시점에 그 자리에서 다룬다.
- **Defined in:** `src/core/core-records.ts`, `src/game/game-records.ts`, `_plan/build-order.md` M3-7·M4·M5
- **Rationale:** Not required (D-2026-057·061·062·063·064·065·066과 동일 패턴, ①만 해석 근거를 남긴다는 점에서 다르다)
- **Affects:** core(core-records), game(game-records), 향후 M4·M5
- **Supersedes:** None
- **Commit:** `803a893`


### D-2026-068 — M3 milestone Exit 충족 판정: 헤드리스 통합 테스트로 확인

- **Status:** Accepted
- **Decision:** `_plan/build-order.md` §6 M3 Exit("에디터에서 만든 chart를 저장 → `.cfx`로 묶기 → 다른 프로필에서 열기 → 플레이 → 기록 저장 → 같은 songId reimport 후에도 기록 유지가 한 줄로 이어진다")을 **충족**으로 판정한다. M3에는 아직 scene/UI가 없어(M4/M5가 그것을 세운다) 사람이 브라우저로 이 흐름을 직접 눌러볼 수 없다 — M2 Exit이 원본 대조 대신 헤드리스 엔진 테스트로 판정된 것(D-2026-058)과 같은 논리를 M3에 적용한다.

  `tests/integration/m3-persistence-chain.test.ts` 하나가 M3-1~M3-7이 만든 실제 함수를 새 로직 없이 그대로 이어 붙여 검증한다: `saveChartVersion`(M3-2, 첫 저장이 version을 안 올리는 것까지 포함) → `buildCfxPackage`(M3-4) → 완전히 별도인 `StorageEnv` 인스턴스("다른 프로필")에서 `loadCfxPackage`(M3-5) → `validateCfxForImport`+`planLibraryRegistration`(`add`)+`commitLibraryRegistration`(M3-6) → `saveRecordIfEligible`(M3-7) → trace를 v2로 올린 새 `.cfx`를 다시 검증·`planLibraryRegistration`(`reimport-confirm-needed`, `upgraded` 확인)·`commitLibraryRegistration` → `readRecord`로 기록이 reimport와 무관하게 그대로 유지됨을 확인. M3-3(workspace)은 파일 저장 경로와 별개(에디터 세션 복구용)라 이 체인에 직접 걸리지 않는다 — M3-3 자체 테스트("새로고침해도 chart와 asset이 복구된다")가 이미 그 조각을 검증했다.

  실제 브라우저 파일 다이얼로그·다른 프로필 디렉토리 전환으로 사람이 다시 확인하는 것은 M4/M5가 서서 UI가 생긴 뒤의 일이며, 지금은 메커니즘 수준 검증으로 충분하다고 승인한다.
- **Defined in:** `_plan/build-order.md` §6, `tests/integration/m3-persistence-chain.test.ts`
- **Rationale:** Not required (D-2026-058과 동일 논리의 재적용)
- **Affects:** _plan, tests(integration)
- **Supersedes:** None
- **Commit:** `803a893`


### D-2026-069 — "이번 판의 파생 score" 비교 확정: 비대칭(실제 score vs 자기완결 근사), 미완주 최고기록 잔여 약점 별도 보고

- **Status:** Superseded by D-2026-070 — 이 결정이 "별도 보고"로 남긴 잔여 약점을 D-2026-070이 스키마 변경(`ChartRecord`에 `totalUnits` 저장)으로 근본 해결했다. 아래 내용은 그 경로를 기록으로 남긴다.
- **Decision:** `_meta/records.md` §2("총 노트 수는 `bestJudgments`의 합이다. 저장 당시 기준으로 자기완결이다")와 §3("이번 판의 파생 score가 저장된 파생 score보다 크면 교체")을 재검토해 다음으로 확정한다.

  **두 읽기와 수치 차이.** chart가 총 10단위이고 어떤 판이 앞 4단위를 전부 SYNC로 친 뒤 hard-mode terminate로 죽었다고 하자.
  - **(a) 실제 score** — `core-gauge.computeResult`가 그 순간 결과 화면에 실제로 띄웠을 값. 분모는 chart의 진짜 `totalUnits`(10). `score = round(4/10 × 1,000,000) = 400,000`.
  - **(b) 자기완결 근사** — §2의 "합이 곧 총 노트 수"를 이번 판에도 그대로 적용한 값. 분모는 판정된 것만의 합(4). `score = round(4/4 × 1,000,000) = 1,000,000`(만점).

  이 둘은 **2.5배** 차이 나고, (b)를 택하면 `bestState`는 `evaluateState`상 `forceEnded`라 항상 `F`(최하)로 잡히는데 `bestJudgments`가 파생하는 score/rank는 만점 근처로 나오는 모순된 조합이 저장될 수 있다 — 플레이어가 결과 화면에서 본 점수와 나중에 "내 최고 기록"이 보여줄 점수가 어긋난다.

  **확정: 비교는 (a)를 쓴다, 단 저장된 쪽은 어쩔 수 없이 (b)로 재계산한다.** `RecordCandidate`에 `score: number` 필드를 추가해 호출측(`game-records.ts`, 방금 끝난 세션이 이미 계산해 둔 `PlayResult.score`)이 그대로 넘긴다 — `mergeRecord`는 `judgments`에서 score를 다시 파생하지 않는다. "저장된 판"의 score는 여전히 `deriveScore(existing.bestJudgments)`(자기완결)로만 계산한다 — 과거 기록은 원 chart에 다시 접근할 방법이 없어 이 근사가 유일한 선택지이기 때문이다.

  **근거:**
  - 결과 화면에 이미 보여준 점수와 나중에 "최고 기록"이 보여줄 점수가 어긋나면 안 된다 — §2의 "자기완결"은 **읽기 시점**(오래된 기록을 chart 없이 다시 표시할 때) 편의를 위한 것이지, **쓰기 시점**(방금 끝난 판은 실제 chart 정보에 접근 가능하다)의 계산 규칙으로 확대 해석할 근거가 약하다.
  - 완주한 판이라면 (a)와 (b)가 정확히 같은 값이다 — 정상 케이스(완주)에서는 비대칭이 전혀 드러나지 않고, 갈리는 것은 미완주 판뿐이다.
  - `records.md`가 명시적으로 다루는 "부작용 수용"(D-2026-017, 리차팅으로 `maxCombo`·`bestState`가 새 내용 기준 재현 불가능해질 수 있음)과 같은 계열의 트레이드오프이지, 정합성을 아예 포기하는 것과는 다르다.

  **잔여 약점(별도 보고, 이번 결정으로 완전히 없어지지 않음):** 자기완결 근사는 판정 안 된 노트가 분모에서 빠져 실제보다 **후하게**(높게) 나온다. 그래서 과거에 **미완주** 판이 최고 기록으로 저장돼 있었다면(예: 첫 시도가 곧바로 terminate), 그 부풀려진 저장 값이 이후의 정직한 완주 판보다 더 높게 잡혀 정당한 교체가 늦어질 수 있다 — `core-records.test.ts`("미완주 판의 판정 분포에 적용하면 실제 score보다 후하게 나온다")로 수치까지 확인했다. 이 잔여 약점은 이번 결정의 범위 밖으로 남긴다: 근본 해결(예: 미완주 판을 애초에 `bestJudgments` 비교 후보에서 제외)은 `records.md`의 갱신 규칙 자체를 바꾸는 문제라 별도 승인이 필요하다.

  **"unit"/"totalUnits" 용어 확인.** 별도로 요청받은 "unit 계열 용어가 폐기됐다"는 전제를 `core/naming.md`·`core/glossary.md`·`DECISION_LOG`(D-2026-024, D-2026-041/GA-5)에서 확인했으나 **근거를 찾지 못했다** — 세 문서 모두 "judgment unit"/`totalUnits`/"단위"를 현재의 의도된 단일 용어로 명시하고 있다(`naming.md`의 "판정별 **단위 수**"는 `[신규]`로 표시돼 있다). 이 전제가 사실이 아니라고 판단해 **용어를 바꾸지 않았다** — 다른 근거(이 세션이 접근할 수 없는 별도 논의 등)가 있다면 그 출처를 알려주면 재검토한다.
- **Defined in:** `src/core/core-records.ts`, `src/game/game-records.ts`, `_meta/records.md` §2·§3
- **Rationale:** Not required (근거는 이 Decision 항목 자체에 있다)
- **Affects:** core(core-records), game(game-records)
- **Supersedes:** D-2026-067 (항목 1만 — 항목 2·3은 그대로 유지)
- **Commit:** `22c1c0a`


### D-2026-070 — 자기완결 score 근사 폐기: `ChartRecord`에 `totalUnits` 저장, "unit" 용어 확인(재확인)

- **Status:** Accepted — D-2026-069가 "별도 보고"로 남긴 잔여 약점을 근본 해결한다(D-2026-069를 대체).
- **Decision:** D-2026-069는 쓰기 시점("이번 판")의 비대칭 비교로 가장 심각한 모순(미완주 판이 accuracy 100%로 보이는 것)을 막았지만, **저장된 쪽**은 여전히 자기완결 근사(`bestJudgments`의 합을 분모로 씀)에 의존했다 — 그 근사는 판정 안 된 노트가 분모에서 빠져 실제보다 후하게 나오므로, 과거에 미완주 판이 최고 기록으로 저장돼 있으면 이후의 정직한 완주 판이 그 부풀려진 값을 못 넘어 교체가 늦어질 수 있었다. 이번 결정으로 **자기완결 근사를 완전히 제거**한다 — 쓰기 시점이든 읽기 시점이든 예외 없이 실제 `totalUnits`를 쓴다.

  **스키마 변경**: `ChartRecord`에 `totalUnits: number`를 추가한다 — `bestJudgments`를 낸 바로 그 판의 chart 실제 판정 단위 수이며, `bestJudgments`와 항상 같이 갱신된다(둘 중 하나만 바뀌는 일이 없다). `deriveScore`/`deriveAccuracy`는 이제 `(judgments, totalUnits)`를 받는다 — `totalUnits`를 판정 분포 자신에서 다시 계산하는 내부 함수(`totalUnitsOf`)를 삭제했다. `RecordCandidate.score`(D-2026-069가 추가한 필드)도 없앴다 — `deriveScore`가 이제 항상 정확하므로 `mergeRecord`가 `deriveScore(candidate.judgments, candidate.totalUnits)`로 직접 계산해도 `core-gauge.computeResult`의 실제 score와 정확히 같다(같은 가중치·같은 분모). 중복 필드로 두면 호출측이 서로 다른 값을 실수로 넣을 드리프트 위험만 남긴다.

  **`_meta/records.md` §2·§3 개정**: 스키마에 `totalUnits` 필드를 추가하고, "총 노트 수는 bestJudgments의 합이다. 저장 당시 기준으로 자기완결이다" 문장을 제거했다 — 더 이상 사실이 아니다(자기완결 경로 자체가 없다).

  **1a. "unit 폐기" 근거 재확인**: 이 레포의 git 이력은 단일 squash 커밋(`0890dc5`)에서 시작해 그 이전 이력이 없다 — naming.md·glossary.md·DECISION_LOG(508줄)가 전부 그 커밋에 이미 완성된 형태로 들어있어, "unit 이전에 다른 용어(예: note)를 쓰다가 바뀐" 흔적을 이 레포 안에서는 찾을 수 없다. D-2026-024(Hold 2단위 확정)·D-2026-041(GA-5 "단일 누산기") 원문도 "note" 계열 용어를 폐기했다는 언급이 없다 — `hits`를 "note별 판정 상태"로 되돌린다는 문구가 있지만 이는 `hits` 필드(노트별 상태 배열) 얘기지 score 회계 단위 얘기가 아니다. 폐기 근거를 찾지 못했다는 D-2026-069의 결론을 재확인한다.

  **1b. `totalUnits` vs note 수**: `core-judge.ts`의 `unitsOf(note) = note.duration > 0 ? 2 : 1`로 코드까지 확인했다 — Tap 1단위, Hold는 head+tail 2단위(`core/judge.md` §8 "Hold head MISS — 2단위 회계"). Hold가 하나라도 있는 chart는 `totalUnits > notes.length`다(예: tap 5 + hold 3이면 note 8개, totalUnits 5+6=11). **`totalUnits`를 `totalNotes`로 부르면 틀린 이름이 된다** — 그래서 이번 스키마 변경도 필드명을 `totalUnits`로 유지했다.
- **Defined in:** `src/core/core-records.ts`, `src/game/game-records.ts`, `_meta/records.md` §2·§3, `src/core/README.md`
- **Rationale:** Not required (근거는 이 Decision 항목 자체에 있다)
- **Affects:** core(core-records), game(game-records), _meta(records)
- **Supersedes:** D-2026-069
- **Commit:** `34a43af`


### D-2026-071 — M3.5 milestone 신설: ui-design 전체(song-select·settings·title·credits)

- **Status:** Accepted
- **Decision:** `_plan/build-order.md`에 M3와 M4 사이 M3.5를 신설한다(§6.5). 목표는 M4 진입 gate("ui-design 전체")가 요구하는 네 화면(song-select·settings·title·credits)의 레이아웃을 `ui-design.md`에 확정하는 것뿐이다 — 코드 산출물은 없다. `ui-design.md` 현재본(D-2026-051)은 스스로 "최소본 — tokens + result layout"이라 밝히고 있고, `song-select.md` §14도 "레이아웃·치수·모션·램프 색: ui-design 소관"이라 명시적으로 위임해 뒀다 — 이 gate는 실제로 열려 있으며 아직 아무 문서도 닫지 않았다(M2-6 gate들과 달리 build-order.md §2 표에 취소선/닫힘 표기가 없다).

  역할 분담을 명확히 한다: 레이아웃 구조·강조점·색과 간격의 구체값 같은 시각/제품 디자인 판단은 사용자 몫이다. Claude Code(구현자)는 각 화면이 이미 확정한 spec(scene.md·song-select.md·settings.md 등)에서 레이아웃이 담아야 할 내용·동작을 정리해 초안을 제안하고, 사용자 검토·확정 후 `ui-design.md`에 반영한다 — 제품 디자인을 임의로 확정하지 않는다(`CLAUDE.md` §1 "구현자" 역할 경계).

  M4 자체는 이 milestone이 끝나기 전까지 진입하지 않는다.
- **Defined in:** `_plan/build-order.md` §6.5·§2(M4 진입 gate 행)
- **Rationale:** Not required
- **Affects:** _plan
- **Supersedes:** None
- **Commit:** `8d92bc1`


### D-2026-072 — M3.5-1 곡 선택 레이아웃 확정: `ui-design.md` §2.5

- **Status:** Accepted
- **Decision:** 사용자의 디자인 리뷰로 확정된 곡 선택 화면 레이아웃을 `ui-design.md` §2.5로 문서화했다 — 상단 category pill 탭 + 3-상태 검색, 정렬·그룹 클릭+휠 순환 바, 좌 정보 패널(40%, 자켓을 패널 높이 기준 60%+로 확대)/우 목록(60%, BMS급 밀도의 단일 행 row, 5개 난이도 slot에 tier 색 박스 + state 색 세로 막대), 하단 키 힌트 바. §2 result 레이아웃의 16:9 컨테이너 쿼리·780px 스택 폴백 메커니즘을 그대로 재사용하며 새 메커니즘을 만들지 않았다. 필요한 색은 §1의 기존 토큰(표면/텍스트, state 파생, tier, `--cyan`)으로 전부 커버돼 새 토큰을 추가하지 않았다.

  색약 접근성을 위한 slot 막대 높이 차등 안은 검토됐으나 시각적 단순함을 우선해 채택하지 않았다 — §2.5.3에 트레이드오프만 기록하고 별도 결정 항목을 만들지 않는다.

  `--cyan`의 이 화면 용법(활성 탭·검색 활성 상태·선택 row 강조·정렬/그룹 바·SCORE 텍스트·folder 헤브론)을 state 파생 색(§1.4)과 대조했다 — `C` state는 `--gauge-NORMAL`을 참조하고 `--cyan`을 쓰는 state 값이 없어 충돌 없음을 확인했다.

  두 가지는 이 결정으로 닫지 않고 별도로 남긴다: (1) [[settings]] §2의 "목록 옵션 overlay 진입 키·`sortDir` 단축 전환 키·가속 스크롤 수치" gate가 아직 키보드만 전제하고 있어, 이 레이아웃이 요구하는 마우스 클릭+휠 스크롤을 1급 입력으로 포함하도록 그 gate가 닫힐 때 확장해야 한다 — 지금 여기서 확장하지 않는다. (2) 빈 library 상태의 레이아웃은 이번 리뷰 목업에 없었다 — `ui-design.md` §2.5.7-2에 공백으로 남기고 사용자 방향 확인 후 별도로 반영한다. 이 두 항목이 해결되기 전에는 M3.5-1(곡 선택)을 완전히 닫힌 것으로 보지 않는다.

  "tutorial 탭 제거"가 잠재 충돌 예시로 언급됐으나 `song-select.md` 전문에 tutorial 탭 언급이 없어 해당사항 없음으로 확인했다.
- **Defined in:** `scene/ui-design.md` §2.5
- **Rationale:** Not required
- **Affects:** scene
- **Supersedes:** None
- **Commit:** `9a5e65a`


### D-2026-073 — 빈 library 레이아웃 불필요: `game-public`은 항상 번들 curated `.cfx`로 시작

- **Status:** Accepted
- **Decision:** `ui-design.md` §2.5.7-2가 남겼던 "빈 library 안내/import 레이아웃" 공백을 전용 레이아웃 없이 해소한다 — Conflux에 사용자 chart import UI가 없고(`_meta/persistence.md` §12·D-2026-059로 `game-public`은 첫 실행부터 번들 curated `.cfx` 세트가 library에 채워진 채 시작), "진짜로 텅 빈 library" 최초 진입 경로가 존재하지 않는다. 목록이 비어 보일 수 있는 경우는 이미 스펙에 있는 두 edge case뿐이다 — 검색 매치 0건, 빈 category 탭/빈 group folder. 둘 다 §2.5.1의 "검색 결과가 없습니다" 빈 목록 표시를 그대로 재사용하며 새 레이아웃을 만들지 않는다. [[song-select]] §11의 "안내 문구 + import 진입점" 요구는 import UI가 없는 `game-public` 경로에는 적용되지 않는다.

  이로써 M3.5-1(곡 선택 레이아웃)은 §2.5.7-1(정렬/그룹 overlay 진입 키 게이트의 마우스+휠 확장, [[settings]] §2 소관 — 별도로 열려 있음)을 제외하고 완전히 닫혔다.
- **Defined in:** `scene/ui-design.md` §2.5.3·§2.5.7-2
- **Rationale:** Not required
- **Affects:** scene
- **Supersedes:** None
- **Commit:** `9fc7d28`


### D-2026-074 — M3.5-2 settings scene 구조 수정: GAUGE를 OPTION scene에 병합, 3-scene graph

- **Status:** Accepted
- **Decision:** `settings.md` §2의 4-category 분류(PLAY/VISUAL/GAUGE/OPTION)는 그대로 두되, `scene.md` §3의 settings scene graph를 4-scene에서 **3-scene**(`play`/`visual`/`option`)으로 접는다 — `option` scene이 GAUGE·OPTION 두 category를 함께 표시한다.

  D-2026-020의 실제 근거를 재확인한 결과, 그 결정은 "settings를 tab에서 editor와 같은 flat scene mechanism으로 통일한다"는 mechanism 결정이었지(`_rationale/rationale.md` "settings를 category별 4 scene으로 나눈 이유" — "editor tab 폐기와 같은 방향의 mechanism 통일이다"), 카테고리 개수·경계 자체를 새로 설계한 근거가 아니었다 — 4개라는 숫자는 `settings.md` §2의 기존 category 분류를 그대로 이어받은 것뿐이다. GAUGE가 독립 scene이어야 할 다른 의존(키 바인딩, quick options 배치, no-record gate 등)도 레포 전체에서 찾지 못했다 — `settings-gauge`를 언급하는 곳은 `scene.md`의 scene id 표·진입 서술 두 줄뿐이었다.

  GAUGE를 OPTION에 합치는 근거: (1) quick options overlay(`scene.md` §5)가 이미 `gaugeMode`와 `mirror`/`staticShape`/`autoplay`를 같은 5종 안에 나란히 두고 있어 자연스러운 짝이다. (2) `settings.md` §2 본문에서 PLAY("input·audio sync")·OPTION("quick per-play changes")은 소제목으로 성격을 설명하는데 GAUGE만 그런 소제목 없이 필드 한 줄뿐이다 — 처음부터 강한 독립 카테고리로 의도되지 않았다는 정황이다.
- **Defined in:** `scene/scene.md` §3·§11, `_meta/settings.md` §5
- **Rationale:** Not required
- **Affects:** scene, settings UI 구조 (M3.5-2 레이아웃의 전제)
- **Supersedes:** None
- **Commit:** `d77d6e4`


### D-2026-075 — M3.5-2 SOUND scene 신설: volMaster/volMusic/volEffect를 PLAY에서 분리

- **Status:** Accepted
- **Decision:** `volMaster`/`volMusic`/`volEffect`(구 PLAY 소속)를 새 SOUND category/scene으로 분리한다 — 결과: settings graph는 `play ↔ visual ↔ sound ↔ option` 4-scene이 된다. 이 4-scene은 D-2026-020이 원래 정한 4-scene(play/visual/gauge/option, 이후 D-2026-074가 3-scene으로 접음)과는 **다른 구성**이다 — 우연히 다시 4개가 된 것뿐, 원래대로 돌아간 게 아니다.

  볼륨 3필드가 input·key mapping(PLAY의 나머지 필드 성격)과 축이 달라 PLAY 아래 묶여 있을 근거가 약했다는 것이 분리 근거다.

  `volEffect`가 정확히 무엇의 볼륨인지는 조사했으나 이 레포 어디에도 텍스트로 정의돼 있지 않다 — 실제 오디오 배선(env-audio)이 아직 없다(M4/M5 이후). 이름만으로 "hitsound(판정 사운드)"라고 단정하지 않았다 — 오히려 `render/theme.md`의 "hit effect"(판정선의 시각 물결 효과, `settings.md` VISUAL의 `hitEffect` 토글이 그 on/off)와 "effect"라는 용어가 겹쳐, `volEffect`(SOUND, 볼륨)와 `hitEffect`(VISUAL, 시각 토글)를 헷갈릴 소지가 있다는 점을 기록해 둔다. SOUND scene에서 이 필드를 "Hitsound"로 표시할지 "Effect"로 표시할지는 `ui-design.md` 레이아웃에서 별도 확정한다 — 필드명(`volEffect`) 자체는 이 결정으로 바꾸지 않는다.
- **Defined in:** `_meta/settings.md` §2·§5, `scene/scene.md` §3·§11
- **Rationale:** Not required
- **Affects:** settings 구조, settings UI (M3.5-2 레이아웃의 전제)
- **Supersedes:** None
- **Commit:** `6fae4d8`


### D-2026-076 — M3.5-2 settings 레이아웃 확정: `ui-design.md` §2.6

- **Status:** Accepted
- **Decision:** settings 4-scene(PLAY/VISUAL/SOUND/OPTION)의 레이아웃을 `ui-design.md` §2.6으로 문서화했다. 상단 nav 바(4 라벨, 클릭 전환 + `Tab`/`Shift+Tab`이 4개 전부를 `PLAY→VISUAL→SOUND→OPTION→PLAY` 순으로 순환 — editor의 `notes→shapes→test` 순환에서 `meta`를 click 전용으로 뺀 비대칭을 그대로 옮기지 않고, settings 3개 모두 그럴 근거가 없어 4개 전부를 순환 대상으로 두는 의도적 결정), 4개 scene 공용 필드 표현 어휘(toggle/slider/select/number/key-rebind, key-rebind는 idle/capturing/conflict **시각 상태만** — 캡처 흐름 자체는 M4-6 前 게이트로 범위 밖), scene별 배치(PLAY: 볼륨 제거 후 8필드, padding 없이 그대로 짧게 둠; VISUAL: select→number→slider→toggle 그룹, `judgeLinePos`만 raise-only를 트랙 시작점이 저장값인 예외로 표현; SOUND: 3-slider, `volEffect` 라벨은 "Effect"로 확정하고 "Hitsound"는 채택하지 않음; OPTION: gauge 선택 스트립(5개 peer 색 박스 + cascade는 구분선 뒤 무채색 outline 6번째 칸) + toggle 3종 + no-record 인라인 안내)를 담았다.

  `volEffect` 라벨 확정 근거: `volEffect`의 실제 의미가 이 레포 어디에도 정의된 적이 없고(D-2026-075), `render/theme.md`의 "hit effect"(시각 물결, `hitEffect` 토글의 대상)와 용어가 겹쳐 "Hitsound"로 표시하면 근거 없이 더 구체적인 의미를 단정하는 셈이 된다 — 이 항목은 **막지 않고 남겨둔다**: 실제 오디오 배선/설계(M4+/M5+)가 이뤄질 때 `volEffect`의 실제 의미를 정의하고 라벨을 재검토한다.

  cascade의 gauge 선택 UI: `gauge.md` §4("cascade는 5개 조건을 병렬로 태우다가 깨진 조건만큼 관대한 tier로 강등되며 끝까지 가고, 최종 표시는 항상 정착한 tier 자신의 색을 쓴다")를 확인해 cascade가 6번째 peer 색을 가질 개념적 근거가 없음을 재확인했다 — 구분선 + 무채색 outline으로 "5개를 가로질러 실행되는 모드"라는 성격만 표현한다.

  M3.5-2는 이로써 완전히 닫혔다 — 레이아웃 범위에서 남은 항목(key rebinding UI 캡처 흐름, volume 슬라이더 조작 단위, `volEffect` 실제 의미)은 전부 별도 게이트(`settings.md` §5 잔여, M4-6 前 등)로 이미 분리돼 있어 M3.5-2를 막지 않는다.
- **Defined in:** `scene/ui-design.md` §2.6
- **Rationale:** Not required
- **Affects:** scene
- **Supersedes:** None
- **Commit:** `90cb826`


### D-2026-077 — UI 텍스트 i18n 방침 채택: 공용 영어 vs 실제 번역, `ui-design.md` §2.5·§2.6 소급 재정리

- **Status:** Accepted
- **Decision:** UI 문자열을 두 범주로 나누는 방침을 채택하고 이미 확정된 §2.5(곡 선택)·§2.6(settings) 레이아웃에 소급 적용한다.

  **공용 영어(canonical, 번역 대상 아님)**: 한 번 익히면 언어와 무관하게 패턴으로 읽는 짧은 UI 라벨 — 버튼·필드·nav/메뉴 이름(Sort/Group/Rank/Score/Effect 등), 판정·state·tier·rank 이름과 고유명사(Conflux/Shape/Line/Tap/Hold/Wide, 이미 전 프로젝트에서 영어 고정 — 이번 결정이 만든 선례가 아니라 기존 선례를 UI 텍스트 전반으로 넓힌 것)는 locale과 무관하게 코드에 직접 쓴다. 조회 테이블을 거치지 않는다 — 값이 하나뿐이고 절대 안 바뀌므로 간접화가 비용만 늘린다.

  **실제 번역 대상**: 목적이 이해인 문자열 — 에러 메시지, 안내 문장, 향후 라이선스/약관, 온보딩 툴팁. 이런 문자열만 `src/core/core-i18n.ts`의 `translate(key, locale)` 조회를 거친다.

  전체 i18n 런타임(plural rule·RTL·날짜/숫자 포맷)은 두지 않는다 — 실제 번역 대상 표면이 지금 그 기계장치를 정당화할 만큼 크지 않다(에러/안내 문장 몇 개뿐). 필요해지면 별도로 재검토한다. locale 설정은 v1에서 사용자 노출 없이 브라우저 locale 자동 감지로 두고, `settings.md`에 `locale` 필드를 지금 추가하지 않는다 — 번역 대상이 실제로 늘어나면 그때 추가한다.

  **경계 판정 사례** (기계적으로 "한국어면 다 바꾼다"가 아니라 기능으로 갈랐다):
  - 검색 매치 수(`fo · 2개` → `fo · 2`)·folder count(`전체 128곡` → `All 128`): 카운터 단어("개")를 아예 없애 숫자만 남겼다 — plural 규칙을 아예 안 타므로 별도 locale 분기 없이 어느 언어에서도 그대로 맞는다.
  - 하단 키 힌트 바(`↑↓ 곡 이동` 등)는 문장이 아니라 짧은 패턴 라벨이라 공용 영어로 분류했다 — 다른 리듬 게임들의 키 힌트 바가 UI locale과 무관하게 영어 단문을 쓰는 관행과 같다.
  - 검색 결과 없음 안내("검색 결과가 없습니다")와 OPTION scene의 no-record 안내 문장("autoplay·staticShape는 기록에 반영되지 않습니다")은 완결된 문장이고 사용자가 내용을 실제로 이해해야 하므로 실제 번역 대상으로 분류했다 — `songSelect.search.noResults`·`settings.option.noRecordNotice` 두 키로 `core-i18n.ts`에 en/ko 값을 채웠다.

  **구현**: `src/core/core-i18n.ts` 신설 — `LocaleCode`(`'en'|'ko'`)·`StringKey` 타입과 `translate()` 조회 함수만 둔다(실제 브라우저 locale 감지 배선은 env 레이어 몫, 아직 하지 않음). `DEFAULT_LOCALE = 'en'`이며 다른 locale에 키가 비면 en으로 fallback하고 그 사실을 `usedFallback`으로 알린다(`settings.md` §4 "되돌림은 보고한다"와 같은 원칙). `src/core/core-i18n.test.ts` 5 테스트 추가.

  이 결정은 `ui-design.md` §2.5(D-2026-072)·§2.6(D-2026-076)이 이미 확정한 레이아웃의 **텍스트 표기만** 소급 수정한다 — 구조·배치·색·컴포넌트 결정은 그대로다.
- **Defined in:** `src/core/core-i18n.ts`, `scene/ui-design.md` §2.5·§2.6
- **Rationale:** Not required
- **Affects:** scene, core (신규 모듈), 향후 모든 UI 텍스트 작성 방침
- **Supersedes:** None — D-2026-072·D-2026-076을 무효화하지 않고 텍스트 표기만 개정
- **Commit:** `0bda292`


### D-2026-078 — title 입력 규칙 명확화: 키보드 아무 키 OR 마우스 클릭 둘 다 mode-select로 전환

- **Status:** Accepted
- **Decision:** `scene.md` §3 id 표의 title 행 "아무 입력 → mode-select"가 클릭을 포함하는지 명시하지 않았다 — `scene.md` 전문을 확인한 결과 title 화면 자체의 입력 규칙은 그 한 줄이 전부였고 다른 어디서도 보완되지 않았다. M3.5-3 title 레이아웃(D-2026-079)의 확정된 하단 힌트 문구 "Press anywhere to start"가 클릭이 유효 입력임을 전제하므로, 이 공백을 실제 스펙으로 닫는다 — **키보드 아무 키 OR 마우스 클릭 모두** title → mode-select를 트리거한다.

  단순 표기 정리가 아니라 이전에 미정이던 입력 종류(클릭 포함 여부)를 처음으로 확정하는 행동 변경이라 별도 항목으로 남긴다.
- **Defined in:** `scene/scene.md` §3
- **Rationale:** Not required
- **Affects:** scene (title 입력 처리)
- **Supersedes:** None
- **Commit:** `41cc5b2`


### D-2026-079 — M3.5-3 title 레이아웃 확정: `ui-design.md` §2.7

- **Status:** Accepted
- **Decision:** title scene의 레이아웃을 `ui-design.md` §2.7로 문서화했다 — 16:9 프레임(§2/§2.5/§2.6과 같은 컨테이너 메커니즘 재사용, title은 정적 단일 프레임이라 780px 스택 폴백 대상이 없음) 중앙에 wordmark("Conflux", 첫 글자만 대문자, ~8cqw) + tagline("Two movements to One.", ~1.8cqw, `--dim`) + 하단 힌트("Press anywhere to start", ~1.7cqw, opacity 0.45↔1.0 약 2.6초 ease-in-out 무한 pulse). 세 텍스트 전부 D-2026-077의 공용 영어 분류(고유명사·고정 브랜드 문구·짧은 패턴 라벨)라 `translate()`를 거치지 않는다.

  배경은 두 겹의 물 컨셉 애니메이션 — (1) 5개 수평 wave 밴드, 위(약함·저opacity)→아래(강함·고opacity)로 깊이감을 주며 각자 독립 위상으로 움직인다, (2) ~30-35개 bubble 입자가 임의 방향·속도로 4면 wrap하며 떠다니고 크기가 작을수록 느리고 투명해 "멀다"로 읽힌다. 중앙 텍스트 풋프린트에 맞춘 타원 감쇠 구역으로 입자가 텍스트를 가리지 않는다. 둘 다 `--cyan`(§1.1, §2.5 cyan 사용처 목록과 같은 토큰) 재사용 — 새 색 토큰 없음. wave/bubble의 정확한 보간 곡선·분포는 색 토큰이 아니라 장식 파라미터라 `constants.md`에 올리지 않고 이 절에 근사값으로만 남겼다(§2.3의 hit effect 반지름이 `render/theme.md`에 남는 것과 같은 분류).

  입력 규칙(클릭 포함 확정)은 D-2026-078로 `scene.md` §3에 반영했다 — 레이아웃 문서가 아니라 행동 스펙이 단일 출처이므로 분리해 로그했다.

  M3.5-3은 `prefers-reduced-motion` 대응 여부(§2.7.5-2)만 남기고 닫혔다 — result 화면(§5)에 이미 있는 같은 원칙이 title의 pulse·wave·bubble에도 적용돼야 하는지는 제품 판단이 필요해 임의로 정하지 않았다.
- **Defined in:** `scene/ui-design.md` §2.7
- **Rationale:** Not required
- **Affects:** scene
- **Supersedes:** None
- **Commit:** `41cc5b2`


### D-2026-080 — M3.5-4 credits 레이아웃 골격 확정: `ui-design.md` §2.8, M3.5 milestone 전체 완료

- **Status:** Accepted
- **Decision:** credits scene의 레이아웃 **골격**을 `ui-design.md` §2.8로 문서화했다 — 표시 내용 자체는 여전히 범위 밖(M4-2 前 게이트)이며, 이 절은 섹션 구조·스크롤 형태·배경만 정의한다.

  **구조**: role-category 섹션 4개 고정 — `Project Staff`(원래 scope), `Music`/`Chart`/`Jacket`. 뒤 세 섹션은 song이나 chart로 나뉘지 않고 **library 전체를 스캔해 해당 필드(`musicBy`/`chartBy`/`jacketBy`, [[data-model]] §2·§4) 값을 필드별로 중복 제거한 평평한 이름 목록**으로 보여준다. 이 구조는 검토 과정에서 발견한 문제 — 같은 `songId` 그룹 안에서도 chart마다 `musicBy`/`jacketBy`/`chartBy`가 다를 수 있어([[data-model]] §1) "song당 한 섹션"이 어느 chart 값을 대표로 쓸지 정할 수 없었던 문제 — 를 애초에 song/chart로 묶지 않음으로써 우회한다. 한 사람이 여러 역할을 겸하면 겸하는 각 역할 섹션에 각각 나타난다(하나로 합치지 않음).

  "Illust by"라는 표현이 리뷰 중 나왔으나 프로젝트의 실제 필드/라벨은 `jacketBy`/"Jacket by"뿐이라([[data-model]] §2, [[naming]]) 그 이름을 채택하지 않았다.

  **heading·스크롤**: `Credits` 헤딩은 스크롤 콘텐츠와 함께 움직인다(고정 아님). 스크롤바·fade-edge 등 chrome 없음 — 순수 기능 스크롤.

  **배경**: §2.7(title)의 bubble 메커니즘을 재사용하되 큰 폭으로 축소(개수 30~35→10~15, 크기 3~24px→2~8px, 속도 감소)하고 wave field는 두지 않는다. 저밀도 baseline과 §2.7과 같은 중앙 텍스트 감쇠 둘 다 적용(양자택일 아님). `--cyan` 액센트는 쓰지 않는다 — 클릭 가능 요소가 없어 강조할 대상이 없다.

  **placeholder**: Project Staff 더미 행 몇 개, Music/Chart/Jacket 아래 겹치는 이름을 포함한 더미 이름 목록 — 겸직이 각 섹션에 각각 나타나는 규칙을 시연한다. 골격 시연용이며 실제 내용이 아니다.

  **M4-2 前 게이트를 위한 의도 기록**: `Project Staff`는 수작업 유지, `Music`/`Chart`/`Jacket`은 library 스캔 기반 자동 수집·필드별 dedupe(song/chart 그룹 없음)라는 방향을 `ui-design.md` §2.8.5와 `build-order.md`의 M4-2 前 행에 남겼다 — 실제 배선은 그 게이트가 열릴 때 결정한다. `scene`(credits) → `game`(library 접근) 방향의 읽기는 `architecture.md`의 단방향 의존을 어기지 않음을 확인했다 — engine 미사용은 렌더/판정 루프 얘기지 store 조회를 막지 않는다.

  **M3.5 milestone 전체가 이로써 완료된다** — M3.5-1(D-2026-072/073)·M3.5-2(D-2026-074/075/076)·M3.5-3(D-2026-078/079)·M3.5-4(이 결정) 4단계 모두 닫혔다. M4 진입 gate("ui-design 전체")가 충족된다.
- **Defined in:** `scene/ui-design.md` §2.8, `_plan/build-order.md` M4-2 前 행
- **Rationale:** Not required
- **Affects:** scene, _plan (M4 진입 gate 충족)
- **Supersedes:** None
- **Commit:** `cbd2015`


### D-2026-081 — M4-1 scene-manager: 단일 스택 엔진, FEATURES 필터링은 app 레이어 몫

- **Status:** Accepted
- **Decision:** `src/scene/scene-manager.ts`로 `scene.md` §2의 mechanism(`goScene`/`goScene(id,'replace')`/`goBack`/`resetSceneStack`, lazy mount)을 구현했다.

  **축별로 엔진을 가르지 않는다.** §2가 "game은 stack형, editor/settings는 평면형"이라 부르지만, 이는 엔진이 두 가지로 동작해야 한다는 뜻이 아니다 — editor/settings의 실제 전환은 형제 scene 사이를 `goScene(id)`로 직접 건너뛰는 것뿐이라 그 축에서는 스택이 실질적으로 깊어질 일이 없다. "평면형"은 축이 스택을 쓰는 방식에서 저절로 나오는 결과이지 엔진의 별도 모드가 아니다 — 하나의 스택 mechanism으로 충분하다.

  **FEATURES 기반 build gate 필터링은 이 모듈이 하지 않는다.** `architecture.md` §1의 단방향 의존(`… → scene → app`, app이 scene보다 위)을 지키려면 scene 레이어가 app의 `FEATURES`를 import할 수 없다. `createSceneManager`는 이미 걸러진 scene 목록을 받는 설계로, 꺼진 축의 scene은 그 목록에 없어 `mount()`가 호출될 방법이 구조적으로 없다(M4-1 Exit 기준 충족). 실제 필터링 호출(어떤 scene을 넘길지)은 app 레이어 몫이며, title/mode-select/credits 등 실제 root graph scene 모듈이 아직 없어(M4-2 범위) 그 배선 자체는 `app-main.ts`에 아직 없다 — `scene-manager.ts` 엔진만 이번 step의 산출물이다.

  **스펙이 이름 이상으로 정의하지 않은 두 지점을 가장 단순하게 채웠다** (Deferred — 실제 배선 시 재확인):
  - `goBack()`을 스택에 1개만 남았을 때 부르면 **no-op**으로 뒀다 — 크래시보다 안전한 기본값. 이 경계에 실제로 닿는 시나리오(예: 어느 scene에서 잘못 호출되는가)가 나오면 재검토한다.
  - `resetSceneStack()`은 **현재 scene은 유지하고 그 아래 history만 비운다**로 구현했다 — 함수 이름이 스펙에 나열만 돼 있고 정확한 사용처·파라미터가 없어 이름 그대로 가장 단순하게 읽었다.

  테스트 11개(`scene-manager.test.ts`) — lazy mount 1회, no-op 재전환, onExit→onEnter 순서, goBack pop, replace 통과점 제거, resetSceneStack 동작, 미등록 id 예외, 꺼진 축 scene 접근 불가.
- **Defined in:** `src/scene/scene-manager.ts`
- **Rationale:** Not required
- **Affects:** scene (신규 모듈), app (향후 M4-2 배선 지점)
- **Supersedes:** None
- **Commit:** `bf3fcff`


### D-2026-082 — mode-select 레이아웃 확정: `ui-design.md` §2.9 (M4-2 선행 공백 해소)

- **Status:** Accepted
- **Decision:** M4-2 구현 직전 `ui-design.md`에 mode-select 레이아웃이 없다는 공백을 발견했다 — M3.5의 네 화면 목록(song-select·settings·title·credits, `build-order.md` M4 진입 gate 행)에 mode-select가 애초에 없었다. 별도 디자인 리뷰로 §2.9를 확정했다.

  **구조**: 세로 목록 하나(Play/Editor/Settings/Credits) — 정확히 4칸 고정 그리드가 아니라 [[scene]] §4의 "mode 추가의 단일 확장점"을 반영해 항목이 늘어도 그대로 늘어나는 리스트로 그린다. 라벨은 공용 영어(D-2026-077).

  **Editor 항목 가시성**: `FEATURES.editor`가 꺼지면 reflow한다 — 빈 자리를 남기지 않고 나머지 3개가 채운다. `Credits`는 반대로 항상 노출이라 이 규칙의 대상이 아니다.

  **배경**: wave·bubble 둘 다 두지 않는다(§2.7 title과 다른 선택) — mode-select는 song-select·settings·credits에서 D-2026-052의 통일 Back 키가 계속 돌려보내는 허브라, 매번 재생되는 앰비언트 배경이 반복 방문에서 피로를 만들 위험이 첫인상 연출의 이점보다 크다고 판단했다. title·mode-select가 같은 공용 root([[scene]] §1)라는 시각적 연속성 논거보다 방문 빈도 차이를 더 중요한 기준으로 삼았다.

  새 색 토큰 없음 — `--bg`/`--text`/`--cyan` 전부 §1 기존 토큰.
- **Defined in:** `scene/ui-design.md` §2.9
- **Rationale:** Not required
- **Affects:** scene
- **Supersedes:** None
- **Commit:** `18373b5`


### D-2026-083 — M4-2: title/mode-select/credits scene 구현, credits placeholder 이름 계열 충돌 수정

- **Status:** Accepted
- **Decision:** `scene-title.ts`/`scene-mode-select.ts`/`scene-credits.ts`를 구현하고 `app-main.ts`에서 `scene-manager`로 조립해 실제 부팅한다(`title → mode-select → credits`, 그리고 그 반대).

  세 모듈 다 `mountXxxScene(target, ...): { show(), hide() }` 형태다. `Scene.mount()` 클로저 안에서 실제 `mountXxxScene()` 호출을 미뤄 M4-1의 lazy-mount 계약을 지키고, 입력 리스너는 `show()`/`hide()`에서 붙였다 뗀다 — 그 scene이 화면에 없을 때 입력에 반응하면 안 되므로(예: mode-select에 있을 때 아무 키나 눌러도 title이 반응하면 안 된다).

  `scene-result.ts`의 카운트업 연출과 같은 이유로 title의 wave/bubble/pulse, credits의 bubble 배경 애니메이션은 구현하지 않았다 — 데이터·입력 계약이 이번 범위의 핵심이고 순수 시각 효과는 Deferred다.

  mode-select의 `play`/`editor`/`settings` 선택은 목적지 scene이 아직 없다(M4-3·M4-5·M4-6 범위) — 가짜 scene을 만들어 억지로 연결하지 않고 콘솔 로그만 남긴다. `Editor` 항목은 `FEATURES.editor`를 app 레이어에서 주입받아 꺼지면 목록에서 빠지고 reflow한다(§2.9.2 그대로).

  **테스트로 드러난 문서 결함을 함께 고쳤다**: credits placeholder 콘텐츠 구현 중 `ui-design.md` §2.8.4가 "Project Staff Direction" 항목과 "Music" 섹션 양쪽에 `[Placeholder A]`를 실수로 재사용하고 있었다 — 원래 의도는 Music·Chart 사이의 겸직 시연이었는데, Project Staff까지 같은 이름을 쓰면서 "이 사람이 project staff이면서 동시에 어느 chart의 credit이기도 하다"로 잘못 읽힐 수 있는 문구가 됐다. `ui-design.md` §2.8.4와 `scene-credits.ts`를 함께 고쳐 Project Staff는 `[Staff N]` 계열, Music/Chart/Jacket은 `[Placeholder N]` 계열로 이름을 분리했다.

  테스트 16개 신규(`scene-title.test.ts` 6, `scene-mode-select.test.ts` 6, `scene-credits.test.ts` 4) — show/hide에 따른 리스너 연결·해제, 클릭/키보드 선택, Editor reflow, 겸직 placeholder 노출.
- **Defined in:** `src/scene/scene-title.ts`, `src/scene/scene-mode-select.ts`, `src/scene/scene-credits.ts`, `src/app/app-main.ts`, `scene/ui-design.md` §2.8.4
- **Rationale:** Not required
- **Affects:** scene, app, ui-design(§2.8.4 정정)
- **Supersedes:** None
- **Commit:** `5518d7a`


### D-2026-084 — M4-3: song-select 목록 모델·렌더 구현, groupBy 4축·데이터 로딩 배선은 결정 필요로 분리

- **Status:** Accepted (구현분) / 하위 두 항목은 Deferred — 아래 참조
- **Decision:** `core-song-select.ts`(row/slot 구성, category 필터, sort 9축 전부)와 `scene-song-select.ts`(row+slot 렌더, category 탭 클릭 전환, groupBy folder 헤더, 세 축 변경 시 목록 재구성)를 구현했다. M4-3 Exit 기준("library의 chart가 song row + chart slot으로 뜬다. 세 축을 바꾸면 목록이 그에 맞게 재구성된다. folder 헤더에 클리어 진척이 뜬다. slot에 level·difficulty·state 램프가 함께 뜬다")을 렌더 레이어에서 충족한다.

  row 대표값(title/musicBy)은 Representative Chart(chartId 0/init)에서 가져온다 — `_meta/cfx.md` §6이 이미 "chart 선택 전 song/library 목록의 title·musicBy·jacket·preview music"을 Representative Chart의 표시 기본값으로 명시하고 있어, 이건 새 결정이 아니라 기존 스펙 적용이다. M4-3 前 게이트의 "song row 대표값 출처(title·jacket)" 항목은 이걸로 해소된다. 같은 게이트의 "정보 패널 BPM 표기 방식·곡 길이 표시"는 정보 패널 자체가 커서 의존([[song-select]] §9 "커서가 놓인 slot의 chart를 기준으로 한다")이라 M4-3 Exit 기준에 없다 — M4-4(정보 패널이 처음 등장하는 step)로 자연히 넘어간다.

  **[결정 필요 1] groupBy 4축 보류**: [[song-select]] §4의 chart 분기 축(`level`/`difficulty`/`state`/`rank`)에서, 기록 없는(`N`) chart가 그 축의 folder에 아예 안 들어가는지 별도 "미기록" folder를 만드는지 스펙에 없다 — sort의 "기록 기반 축은 미기록이 항상 최하단"(§5)과 같은 처리를 groupBy에도 적용해도 되는지 확인이 필요하다. `none`/`updated`/`title`(song 공통 축, 모호함 없음) 3축만 구현했다.

  **[결정 필요 2] 데이터 로딩 배선 — edit/game 레이어 경계 문제**: song-select(game 레이어)가 library를 렌더하려면 `.cfx` decode(`loadCfxPackage`)가 필요한데, 이 로직이 전부 `edit/`(edit-cfx-load.ts·edit-cfx-package.ts)에 있다 — `game-song-select.ts`를 만들어 import했더니 `import/no-restricted-paths`(architecture.md §1 "edit=에디터, game=플레이. 둘은 서로를 모른다")에 걸렸다. `openChartJson`(edit-chart-open.ts)·`loadCfxPackage`·`groupBySongId`·`validatePackageGroup` 전부 브라우저 API를 직접 안 쓰는 순수 로직이지만(`env-file`의 `readZipArchive`만 호출, 그 함수 자체도 실측상 순수 바이트 연산 — jsdom 없이 Node에서 테스트됨), M3 시점에 editor 워크플로 전용으로 `edit/`에 배치됐다. `core-quick-options.ts`가 "edit·game 둘 다 쓰는 순수 로직은 core로 내린다"는 선례를 이미 세웠지만, 이번 로직은 `env-file`의 ZIP 함수를 호출해야 해서 그대로 core로 내리면 core가 env를 import하게 돼(`architecture.md`의 "core는 브라우저 API를 하나도 안 쓴다"는 사용 여부가 아니라 import 방향 자체의 규율이라 예외를 만드는 셈) 다른 구조적 결정이 필요하다. 시도했던 `game-song-select.ts`/테스트는 되돌렸다 — `core-song-select.ts`/`scene-song-select.ts`는 데이터가 어디서 오든 동작하므로 이 문제와 독립적으로 완성됐다.
- **Defined in:** `src/core/core-song-select.ts`, `src/scene/scene-song-select.ts`
- **Rationale:** Not required
- **Affects:** core, scene, 향후 game/edit 레이어 재검토
- **Supersedes:** None
- **Commit:** `8e7ca55`


### D-2026-085 — `format` 레이어 신설: `.cfx`/chart JSON 파싱을 `edit/`에서 재분류, M4-3 완료

- **Status:** Accepted
- **Decision:** D-2026-084가 남긴 "데이터 로딩 배선" 결정 필요 항목을 닫는다. `architecture.md` §1을 8층으로 개정해 `core → env → { render, format } → edit / game → scene → app`으로 만들고, `.cfx`/chart JSON 파싱·검증 로직을 `edit/`에서 새 `format/` 층으로 재분류했다 — `render`와 같은 깊이(둘 다 `env`/`core` 위, `edit`/`game` 아래, 서로 무관).

  **왜 "이동"이 아니라 "재분류"인가**: 이 로직(`loadCfxPackage`·`groupBySongId`·`validatePackageGroup`·`openChartJson`)이 M3 때 `edit/`에 있었던 건 M3 자체가 "persistence + `.cfx`"로 스코프됐던 편의상의 배치였지, editor 전용이라는 결정이 아니었다 — `.cfx` bytes → chart 집합·검증은 파일 포맷 계약이지 어느 한쪽의 소유물이 아니다.

  **세 대안을 검토하고 기각했다** (D-2026-084가 제시한 목록 그대로 판단):
  1. `game`에 복제 — spec-critical한 §10 체크리스트를 두 벌 두면 `cfx.md`가 바뀔 때 몰래 어긋날 위험.
  2. `core`로 내림 — `core-quick-options.ts` 선례를 따르되, 이 로직은 `env-file`의 ZIP 함수를 호출해야 해서 core가 env를 import하게 된다. `env-file`의 ZIP 함수 자체는 실측상 순수 바이트 연산(jsdom 없이 Node 테스트됨)이지만, "core는 어떤 위층도 import하지 않는다"는 규율은 개별 함수의 순수성이 아니라 import 방향 자체의 규율이라 core 하나를 위해 이 규율에 예외를 두는 셈이 된다 — 기각.
  3. ESLint 예외 목록 — 규칙이 폴더 이름만으로 판단 가능해야 한다는 전제를 깨고, 유사 사례마다 예외가 늘어난다 — 기각.

  **어느 로직이 옮겨갔는지 (읽기/검증 vs 쓰기로 갈랐다)**:
  - `format/format-chart-open.ts`(`openChartJson`), `format/format-cfx-package.ts`(`CandidateChart`/`AssetFile`/`SongGroup` 타입, `groupBySongId`, `validatePackageGroup`), `format/format-cfx-load.ts`(`loadCfxPackage`) — 읽기/검증, `edit`·`game` 둘 다 필요.
  - `edit/edit-cfx-package.ts`에 남은 것: `recommendCandidates`(버전 충돌 선택 UI 로직)·`suggestCfxFileName`·`buildCfxPackage`·`packageAndSaveCfx` — 새 `.cfx`를 **만드는** editor 전용 쓰기. `game`은 패키징을 안 하므로 옮길 이유가 없다.
  - `edit/edit-cfx-library.ts`는 그대로 뒀다 — `game-song-select.ts`가 필요한 건 `StorageEnv`(env 타입, 이미 game이 자유롭게 씀)의 원시 `read`/`keys`뿐이라 library 워크플로 전체를 옮길 이유가 없었다. 최소 범위 원칙(`CLAUDE.md` §4)을 지켰다.

  **기계적 재배선**: `edit-cfx-library.ts`·`edit-cfx-package.test.ts`·`edit-cfx-library.test.ts`·`tests/integration/m3-persistence-chain.test.ts`의 import 경로를 갱신했다. 테스트도 로직을 따라 분리했다 — `edit-cfx-load.test.ts`→`format-cfx-load.test.ts`(그 중 `buildCfxPackage`를 쓰던 테스트 1개는 손으로 만든 ZIP bytes로 바꿔 `format`이 `edit`을 import하지 않게 했다), `edit-cfx-package.test.ts`의 `groupBySongId`/`validatePackageGroup` 관련 테스트는 `format-cfx-package.test.ts`로. 동작 변경은 없다 — 순수 재배치다. `tests/support/layout.test.ts`의 레이어 목록도 `format`을 추가해 갱신했다(이 테스트가 파일 배치를 감시하는 단일 출처).

  **M4-3 완료**: `game-song-select.ts`를 `format-cfx-load.ts` 위에 재작성해 실제로 library를 decode하고, `app-main.ts`가 mode-select의 `Play` 선택 → `song-select` scene(실제 library 데이터로 `update()`) → Backspace/Esc로 mode-select 복귀까지 실제 부팅 경로에 연결했다. M4-3 Exit 기준("library의 chart가 song row + chart slot으로 뜬다. 세 축을 바꾸면 목록이 그에 맞게 재구성된다. folder 헤더에 클리어 진척이 뜬다. slot에 level·difficulty·state 램프가 함께 뜬다")이 실제 앱에서 충족된다. groupBy 4축(D-2026-084의 [결정 필요 1])은 여전히 열려 있다 — 이번 결정과 무관, 별도로 남는다.

  테스트 4개 신규(`game-song-select.test.ts`, 재작성), 기존 테스트 전부 재배치돼도 그대로 통과 — 전체 1044/1044.
- **Defined in:** `_plan/architecture.md` §1·§1.1, `core/naming.md` §7, `src/format/`(신설), `src/edit/edit-cfx-package.ts`, `src/edit/edit-cfx-library.ts`, `src/game/game-song-select.ts`, `src/app/app-main.ts`
- **Rationale:** Not required
- **Affects:** _plan(레이어 모델), core/naming, format(신설), edit, game, app — M4-3 완료
- **Supersedes:** None — D-2026-084의 "결정 필요 2"를 해소
- **Commit:** `eb2974a`


### D-2026-086 — M4-4: song-select 커서·검색·preview·viewState·기록 초기화 구현

- **Status:** Accepted (구현분) / 하위 항목들은 Deferred — 아래 참조
- **Decision:** `core-song-select.ts`(커서 `CursorTarget`/`locateCursor`/`cursorTarget`/`moveCursorHorizontal`/`moveCursorVertical`, 검색 `matchesSearch`/`filterBySearch`), `game-viewstate.ts`(`viewState` store 영속), `game-song-preview.ts`(preview 재생 오케스트레이션), `scene-song-select.ts`(커서 하이라이트·검색 UI·정보 패널·기록 초기화 버튼), `app-main.ts`(전체 배선 — `AudioEnv`+`createPreviewController`로 실제 preview 재생, `readSongSelectViewState`/`writeSongSelectViewState`로 재진입 복원, `FEATURES.recordReset` 게이팅)를 구현했다. M4-4 Exit 기준("타이핑 즉시 검색되고, 정렬을 바꿔도 커서가 유지된다. 커서가 멈춘 뒤 preview가 지연 재생된다. 재진입 시 `lastSelected`가 복원된다")을 충족한다.

  **커서 식별을 `{songId, chartId}`로 뒀다**(row/slot 좌표가 아니다) — 정렬·필터가 바뀌어도 같은 chart를 계속 가리키게 하려는 것([[song-select]] §8 "축을 바꿔도 커서는 같은 chart를 유지"). `locateCursor`가 좌표로 변환하며, 가리키던 chart가 사라지면 첫 항목으로 대체한다(§8 fallback). column affinity(같은 열 → 더 낮은 열 → 더 높은 열, 직전 열은 기억 안 함)를 `moveCursorVertical`에 그대로 구현했다(§7) — 테스트로 "기억 안 함" 규칙을 직접 확인했다.

  **M4-3 前 게이트 재확인**: "목록 옵션 overlay 진입 키"·"가속 스크롤 수치"는 여전히 안 닫혀 정렬·그룹 바 클릭 인터랙션과 long-press 가속 스크롤은 이번에도 없다(표시만). "정보 패널 BPM 표기 방식·곡 길이 표시"는 M4-3 때는 정보 패널 자체가 없어 막지 않았지만, M4-4에서 커서가 생겨 정보 패널이 실제로 들어오므로 이제 진짜로 막는다 — BPM·길이 칸은 비워 뒀다. D-2026-084의 groupBy 4축 미결 항목은 커서 로직과 무관함을 확인했다(커서는 `groupRows()`가 이미 만든 결과 위에서만 움직인다 — 몇 개 축이 구현됐는지와 독립적).

  **[결정 필요 1] 아코디언(folder 접힘/펼침) 미구현**: [[song-select]] §4가 요구하는 "진입 시 전부 접힘, 최근 선택 folder만 펼침"은 별도 인터랙션 설계(접힘 상태를 어디서 들고 있는지, 커서가 접힌 folder로 이동하면 자동으로 펼치는지 등)가 필요해 미룬다 — 모든 folder가 항상 펼쳐진 채로 렌더된다(M4-3부터의 임시 상태 유지).

  **[결정 필요 2] PageUp/PageDown·Home/End 미구현**: Exit 기준에 명시되지 않아 이번 범위에서 뺐다.

  **[결정 필요 3] 기록 칸 judge 모드 미완성**: `recordCellMode`가 `judge`일 때 우하단 칸에 표시할 4값 breakdown이 `SlotView`에 판정 카운트 필드 자체가 없어 아직 못 채운다(현재 `—`로 빈 값) — `SlotView`에 필드를 추가할지, 다른 경로로 가져올지는 별도 결정.

  **preview fade 근사**: `AudioEnv.setVolume`이 즉시 값을 바꾸는 API라(WebAudio 램프 예약 API 없음) fade는 100ms 간격 계단식 근사다 — 매끄러운 램프가 필요해지면 `env-audio.ts`에 램프 API를 추가하는 별도 작업.

  **기록 초기화 확인 UI**: 스펙에 확인 인터랙션이 정해져 있지 않아 `confirm()`(브라우저 기본 대화상자)으로 막았다 — 되돌릴 수 없는 동작에 대한 가장 단순한 방어. 전용 확인 모달이 필요하면 별도 결정.

  테스트 신규/확장: `core-song-select.test.ts` +22(커서·검색), `game-viewstate.test.ts` 5, `game-song-preview.test.ts` 7, `scene-song-select.test.ts` 21(M4-3의 7에서 확장) — 전체 1091/1091 통과.
- **Defined in:** `src/core/core-song-select.ts`, `src/game/game-viewstate.ts`, `src/game/game-song-preview.ts`, `src/game/game-song-select.ts`(`loadPreviewAsset` 추가), `src/scene/scene-song-select.ts`, `src/app/app-main.ts`
- **Rationale:** Not required
- **Affects:** core, game, scene, app — M4-4 완료
- **Supersedes:** None
- **Commit:** `87d6f14`


### D-2026-087 — M4-4 후속: folder 아코디언·PageUp/PageDown/Home/End·기록 격자 judge 모드

- **Status:** Accepted
- **Decision:** D-2026-086이 남긴 Deferred Findings 세 항목을 닫는다 — 사용자가 세 항목 모두 이미 확정된 설계/스펙임을 확인해 결정 필요 항목이 아니라 구현 완료로 처리했다.

  **1) folder 아코디언(§4)**: folder 헤더를 row와 같은 메커니즘으로 상하 이동이 지나가는 정지점으로 뒀다 — 새 입력 어휘를 만들지 않고, 커서가 헤더에 있을 때 기존 `Enter`(다른 곳에서도 확정/토글 역할)와 기존 클릭 입력(sort/group 칩의 클릭+휠 patterns과 같은 클릭+기존 입력 병행 패턴)으로 펼침/접힘을 토글한다. 펼치면 다른 folder는 자동으로 접힌다(한 번에 하나, §4 "아코디언이다"). 진입 시 `lastSelected`가 속한 folder만 펼친 채 시작한다(§4). 접힘 상태는 영속하지 않는다(scene 내부 상태일 뿐 `viewState`에 없다).

  `core-song-select.ts`의 좌표계를 `{rowIndex, slotIndex}`(row만 나열)에서 `CursorStop`(header 또는 row) 배열 + `{stopIndex, slotIndex}`로 바꿨다 — header는 chart 정체성이 없어(`CursorTarget`은 songId+chartId뿐) 커서가 헤더에 있는 동안 `cursorTarget()`은 `null`을 돌려주고, `scene-song-select.ts`가 `headerFocusFolderIndex`로 이 상태를 별도로 들고 있다(`onCursorChange`도 이때 `null`을 받는다 — preview는 멈추고 `lastSelected`는 마지막 실제 chart 값을 그대로 유지한다, `app-main.ts`).

  **2) `PageUp`/`PageDown`/`Home`/`End`(§7)**: `song-select.md` §7에 이미 명시돼 있던 항목이라(M4-4 Exit 기준 문구에만 안 들어갔을 뿐 범위 판단이 아니었다) 그대로 구현했다. `Home`/`End`는 첫/마지막 정지점으로 가는 단순 이동이라 모호함이 없다. `PageUp`/`PageDown`의 "한 화면 단위"는 실제 viewport에 몇 row가 보이는지에 달려 있는데, 그 값은 DOM 렌더 시점 정보라 순수 계산인 `core-song-select.ts`가 알 수 없다 — `moveCursorByPage(stops, position, direction, pageSize)`가 `pageSize`를 인자로 받게 하고, `scene-song-select.ts`가 실제 viewport 측정 없이 고정 근사값(`PAGE_STOP_COUNT = 5`)을 넘긴다. 실제 DOM 측정 기반 페이지 크기 설계는 이번 범위 밖 — 결정 필요 항목으로 별도 보고.

  **3) 기록 격자 judge 모드(§9)**: `ChartRecord.bestJudgments`(M3-7, `core-records.ts`)가 이미 있는 데이터였다 — `SlotView`에 그 필드가 없었을 뿐이라 새 결정이 아니라 배선 보완이다. `SlotView.judgments: JudgmentCounts | null`을 추가하고 `buildSongRow`가 `record.bestJudgments`를 그대로 옮긴다. `scene-song-select.ts`의 기록 칸이 `recordCellMode: 'judge'`일 때 `sync / perfect / good / miss` 순서로 표시한다(§9 "judge: sync/perfect/good/miss 순의 네 값").

  테스트 신규: `core-song-select.test.ts`에 `buildCursorStops`/`folderIndexOf`/`moveCursorByPage`/`moveCursorHome`/`moveCursorEnd` describe 블록(기존 cursor 테스트는 새 정지점 좌표계로 전환), `scene-song-select.test.ts`에 아코디언 토글(Enter·클릭)·PageDown·Home/End·judge 모드 표시 테스트 6개 추가 — 전체 1107/1107 통과.
- **Defined in:** `src/core/core-song-select.ts`, `src/scene/scene-song-select.ts`, `src/app/app-main.ts`
- **Rationale:** Not required
- **Affects:** core, scene, app
- **Supersedes:** None — D-2026-086의 Deferred Findings 세 항목을 닫음
- **Commit:** `0a41ea8`


### D-2026-088 — M4-5: song-credit + gameplay 진입 결선

- **Status:** Accepted (구현분) / 하위 항목들은 Deferred·결정 필요 — 아래 참조
- **Decision:** `scene-song-credit.ts`(§6 fade 연출)·`scene-gameplay.ts`(canvas·오디오·입력·pause overlay를 묶어 `game-session.ts`를 실제로 돌리는 host)·`game-settings.ts`(설정 읽기)·`game-song-select.ts`의 `loadPlayableChart`(chart 전체+음원 로드)를 신설하고, `app-main.ts`가 song-select `Enter` → song-credit(5초) → `goScene('gameplay','replace')` → 판 종료 → (autoplay면 `goBack()`으로 바로 song-select, 아니면) `goScene('result','replace')` → Retry/Back까지 전체 경로를 이었다. M4-5 Exit 기준("선택한 chart의 credit이 fade로 흐른 뒤 gameplay가 그 chart로 시작한다. 종료 후 result를 거쳐 song-select로 돌아온다")을 충족한다.

  **gameplay→result에도 song-credit→gameplay의 replace 관례를 확장했다**: [[scene]] §6은 song-credit→gameplay만 명시하지만, Retry를 반복해도 스택이 계속 자라지 않게 하려고 gameplay→result·result→gameplay(Retry)도 전부 `'replace'`를 썼다 — song-select가 항상 스택에서 정확히 한 칸 아래 있게 유지해, 어디서든 `goBack()` 하나로 song-select에 돌아갈 수 있다. 스펙이 이 확장을 명시하지 않아 결정 필요 항목으로 보고한다.

  **hitVol/음악 volume 조합식은 결정 필요 항목이다**: `_meta/settings.md` §2가 스스로 "volEffect가 정확히 무엇의 볼륨인지 정의된 적 없다... 실제 오디오 배선은 아직 없다"고 명시해 둔 자리다. `hitVol = volMaster × volEffect`, 음악 volume = `volMaster × volMusic`로 가장 단순한 곱을 택했다 — 3계통 분리의 정확한 결합 방식이 정해지면 재검토.

  **gameplay 화면의 HUD·pause overlay 픽셀 디자인은 결정 필요 항목이다**: ui-design.md가 아직 gameplay 화면을 다루지 않는다(§2.5~§2.9는 song-select/settings/title/credits/mode-select뿐) — 최소 기능 레이아웃(canvas + Resume/Retry/Exit 세 버튼)만 뒀다.

  **`PageUp`/`PageDown`의 페이지 크기와 같은 이유로, `frameCap`·note thickness 등은 이미 있는 설정값을 그대로 썼다** — 새 결정이 아니다.

  **`AudioEnv`에 `getContext(): AudioContext`를 더했다**(D-2026 목록에 없던 최소 의존 수정, `CLAUDE.md` §4) — `playHitSound`/`createHitBuffer`가 raw context를 요구하는데 `AudioEnv`가 그걸 감추고 있었다. 동작 변경 없는 순수 접근자 추가다.

  **기록 초기화와 같은 패턴으로, gameplay scene은 `AudioEnv`를 주입받는다**(`mountGameplayScene(target, audio, handlers)`) — `game-song-preview.ts`와 같은 DI 관례이며, `AudioContext`가 없는 테스트 환경(jsdom)에서도 fake `AudioEnv`로 이 파일 전체를 검증할 수 있게 하는 목적과, `app-main.ts`가 이미 preview용으로 들고 있는 같은 context를 재사용하는 목적 둘 다다.

  no-record 4조건 중 `midStart`/`editorOrigin`은 이 진입 경로(song-select → song-credit → gameplay)에서 항상 `false`다 — 둘 다 아직 없는 host(mid-start·editor test scene, M5)에서만 `true`가 될 수 있다.

  테스트 신규: `scene-song-credit.test.ts` 6, `scene-gameplay.test.ts` 7(jsdom에 `AudioContext`가 없어 fake `AudioEnv` 주입, canvas 2D context 없이도 크래시하지 않음을 확인), `game-settings.test.ts` 3, `game-song-select.test.ts`에 `loadPlayableChart` 3개 추가 — 전체 1126/1126 통과.
- **Defined in:** `src/scene/scene-song-credit.ts`, `src/scene/scene-gameplay.ts`, `src/game/game-settings.ts`, `src/game/game-song-select.ts`, `src/env/env-audio.ts`, `src/app/app-main.ts`
- **Rationale:** Not required
- **Affects:** scene, game, env, app — M4-5 완료
- **Supersedes:** None
- **Commit:** `0732ba0`


### D-2026-089 — `pauseOnBlur` 설정 신설, M2-7의 "blur는 pause 안 함"을 기본값에서 뒤집음

- **Status:** Accepted
- **Decision:** `Settings.pauseOnBlur`(boolean, PLAY category, 기본값 `true`)를 신설한다. 창 focus를 잃으면(`blur`, 탭은 계속 보임) 이 설정이 켜져 있을 때만 gameplay가 자동 pause한다 — 탭이 실제로 안 보일 때(`visibilitychange` hidden)의 auto-pause는 이 설정과 무관하게 항상 켜져 있다(M2-7 그대로 유지, 여기는 안 바뀐다).

  **M2-7의 근거를 기본값에서 뒤집는 결정이다** — M2-7(`game-visibility.ts`, `scene.md` §9)은 "devtools를 열거나 다른 창을 클릭해도 `blur`는 뜨지만 탭 자체는 여전히 보이므로 pause 대상이 아니다"라는 이유로 `blur`를 아예 무시했다. `pauseOnBlur` 기본값을 `true`로 두면 devtools를 여는 것도 이제 pause를 유발해 그 오탐이 기본 경험에 다시 들어온다.

  **그럼에도 기본값을 켜기로 한 이유**: 플레이어 보호(자리를 비우거나 다른 창을 보는 동안 진행 중인 판이 안전하게 멈춘다)가 개발자 편의(devtools를 열어도 판이 안 멈추면 편함)보다 우선한다고 판단했다. 트레이드오프가 비대칭적이다 — devtools로 디버깅해야 하는 사람은 이 설정 하나를 끄면 M2-7 시절 동작(blur 무시)으로 정확히 돌아가지만, 반대로 기본값이 꺼져 있으면 실수로 자리를 비운 일반 플레이어를 보호할 방법이 없다. 정확히 devtools-blur와 진짜 focus 상실(다른 창 전환 등)을 구분하는 브라우저 API가 없어(둘 다 같은 `blur` 이벤트), 휴리스틱으로 골라내는 대신 설정 하나로 전부 위임했다.

  **`visibilitychange`와 독립된 별도 축이다** — 하나의 설정이 두 트리거를 한꺼번에 묶지 않는다: 탭이 실제로 안 보이는 경우는 판단의 여지가 없는 correctness 문제(화면을 볼 수 없다)라 설정으로 끌 수 없게 뒀고, `blur`만 있는 경우(탭은 보임)는 순수히 취향의 영역이라 설정으로 뺐다.

  `attachAutoPause(session, pauseOnBlur = false, doc?, win?)`의 두 번째 인자로 구현했다 — 함수 자체의 기본값은 `false`(호출측이 명시 안 하면 M2-7 시절 동작 그대로)이고, `scene-gameplay.ts`가 `Settings.pauseOnBlur`를 명시적으로 넘긴다(기본 설정값은 `true`이므로 실제 기본 동작은 pause한다). 이렇게 가른 이유: `game-visibility.ts` 자체는 순수 이벤트 배선이라 settings를 몰라도 되고, 무엇을 기본으로 할지는 오직 호출측(game 레이어)이 결정한다.

  category는 PLAY로 뒀다 — `_meta/settings.md` §2의 OPTION은 quick options 5종·no-record 게이트 전용 category라 이 필드와 성격이 다르고, PLAY("input·audio sync")가 세션 진행 취향이라는 점에서 더 맞는다.

  `scene.md` §9·§11(결정 완료 목록)과 `_meta/settings.md` §2·§4·§5를 함께 정정했다 — spec 문서 자체가 이전 판단("blur 제외")을 명시하고 있었으므로 코드만 바꾸고 문서를 안 고치면 스펙과 구현이 어긋난다(`CLAUDE.md` §7 "Single Source 유지").

  테스트: `game-visibility.test.ts`에 3개 추가(`pauseOnBlur=true`일 때 blur가 pause 호출·detach 후 무효화·`visibilitychange`는 설정과 무관하게 여전히 pause), `scene-gameplay.test.ts`에 2개 추가(기본 설정으로 blur가 pause overlay를 열고, `pauseOnBlur:false`면 안 연다) — 전체 통과.
- **Defined in:** `src/core/core-settings.ts`, `src/game/game-visibility.ts`, `src/scene/scene-gameplay.ts`, `scene/scene.md` §9·§11, `_meta/settings.md` §2·§4·§5
- **Rationale:** Not required
- **Affects:** core, game, scene, scene(spec)·settings(spec)
- **Supersedes:** M2-7의 "blur는 pause 대상이 아니다" 판단(기본값 한정 — `pauseOnBlur: false`로 두면 그 동작이 정확히 재현된다)
- **Commit:** `c44a27c`


### D-2026-090 — M4.5-1: gameplay HUD 완성 — jacket·key 빔·마디선/step 선·sudden·text event·카운터/퍼센트·곡정보 띠·canvas pause 아이콘

- **Status:** Accepted
- **Decision:** M4-5가 최소 기능 레이아웃만 구현하고 남겨둔 gameplay HUD 8종(jacket 배경·key 빔·마디선/step 선·sudden 커버·text event·카운터/퍼센트·곡정보 띠·canvas pause 아이콘)을 전부 구현했다. `render/theme.md`가 원본 게임에서 이미 실측해 둔 draw order(§2)·치수(§3)·색(§1)을 그대로 썼다 — 새 레이아웃 설계가 아니라 뒤늦은 배선이다. `ui-design.md` §2.10이 이 확인과, theme.md에 없던 네 자리(아래)를 문서화했다.

  **판정 텍스트(SYNC/PERFECT/GOOD/MISS)에 지속시간을 추가했다** — `HUD_TEXT.judgmentFlashMs = 500ms`(`render-theme.ts`). 원래 theme.md에 이 값이 없어 다음 판정이 올 때까지 안 지워지는 채로 구현돼 있었다 — `fastSlowFlashMs`(바로 아래 줄에 붙는 형제 HUD 텍스트)와 같은 값을 재사용했다. `core/constants.md`가 아니라 `render/theme.md`(순수 표시 값)에 뒀다 — `core/constants.md`는 로직에 쓰이는 수치 전용이라는 그 문서 자신의 분류 기준을 따랐다.

  **카운터·퍼센트 행의 Y 순서를 새로 정했다** — 콤보 → 판정 텍스트 → 카운터 → 퍼센트 → FAST/SLOW로 스택했다. theme.md의 원본 주석("카운터·정확도 행이 아직 없어 판정 텍스트가 그 자리를 당겨 쓴다")을 판정 텍스트가 카운터/퍼센트 행의 자리를 임시로 빌려 쓰던 것으로 읽어, 판정 텍스트를 표 순서대로 제자리로 옮기고 그 사이에 카운터/퍼센트를 끼워 넣었다 — theme.md가 정확한 Y 앵커를 안 남겨서 이 세션의 해석이다.

  **canvas pause 아이콘에 클릭 판정을 붙였다** — 좌상단 `cell`(`gw/16`) 영역 클릭 → `session.pause()`. 이전엔 키보드(Escape/Backspace, `attachPauseKeys`)만 있었다 — `pauseIconHitTest`(순수 함수, `render-playfield.ts`)로 hit-test하는 canvas `click` 리스너를 `scene-gameplay.ts`에 새로 달았다. `attachPauseKeys`와는 완전히 별개 경로이지만 둘 다 `session.pause()`(멱등)만 부르므로 충돌하지 않는다.

  **pause overlay(Resume/Retry/Exit) DOM 색은 새로 만들지 않고 `scene-result.css`(`ui-design.md` §5)의 기존 토큰(`--bg`/`--text`/`--rule`/`--rule-strong`/`--cyan`)을 그대로 가져다 썼다** — canvas HUD 색(`render-theme.ts`)과는 별개 팔레트다(둘이 이미 미세하게 다른 값이었다는 점도 이 분리가 새 결정이 아님을 보여준다).

  **jacket 배경 로딩을 새로 배선했다** — `game-song-select.ts`의 `PlayableChart`에 `jacketBytes` 필드를 추가하고(`musicBytes`와 같은 패턴), `app-main.ts`가 `createImageBitmap`으로 decode해 `GameplayStartInput.jacket`에 채운다. decode 실패나 `jacketFile` 없음은 배경 없이 진행(필수 데이터가 아니다).

  **`DrawContext`에 `drawImage`를 추가했다** — jacket 배경 draw에만 쓰는 최소 확장. `drawPlayfield`에 `jacket: JacketInput | null` 선택 인자를 추가해 draw order layer 0(배경 fill)과 layer 2(shape 경계) 사이(layer 1)에 정확히 끼워 넣었다 — 기존 호출부는 인자 생략 시 그대로 동작한다(하위 호환).

  **key 빔 페이드는 두 톤 계단으로 근사했다** — `DrawContext`가 그라디언트 API를 안 받아(`drawJudgeTrack`의 기존 주석과 같은 이유) theme.md의 "1/3 지점부터 페이드 인"을 정확한 그라디언트 대신 머리(head)만 더 밝은 두 구간으로 단순화했다.

  **lane1~4 text event의 "펄스" 애니메이션은 정적 삼각형으로 뒀다** — theme.md가 펄스 주기를 안 남겨 결정 필요 항목으로 남긴다.
- **Defined in:** `src/render/render-theme.ts`, `src/render/render-playfield.ts`, `src/scene/scene-gameplay.ts`, `src/scene/scene-gameplay.css`, `src/game/game-song-select.ts`, `src/app/app-main.ts`, `render/theme.md`, `scene/ui-design.md` §2.10, `_plan/build-order.md` §7.5
- **Rationale:** Not required
- **Affects:** render, game, scene, app, theme(spec)·ui-design(spec)·build-order(spec) — M4.5-1 완료
- **Supersedes:** None
- **Commit:** `e6ff161`


### D-2026-091 — M4-6: settings 4 scene + key rebinding UI

- **Status:** Accepted (구현분) / 하위 항목들은 결정 필요 — 아래 참조
- **Decision:** `scene-settings.ts`(신규, ~380줄)가 `ui-design.md` §2.6이 확정한 PLAY/VISUAL/SOUND/OPTION 4 category 레이아웃을 전부 구현했다. 하나의 DOM host를 `settings-play`/`-visual`/`-sound`/`-option` 네 scene id가 공유하며(`mountSettingsScene()`은 처음 mount되는 scene에서 한 번만 호출, 나머지는 `show(category)`만 호출 — `scene-manager.ts`의 lazy-mount-once 계약을 유지하면서 네 scene이 상태를 공유하는 새 패턴), `Tab`/`Shift+Tab`은 [[scene]] §2.6.2가 정한 대로 `PLAY → VISUAL → SOUND → OPTION → PLAY` 4개 전부를 순환한다(editor의 `meta` 제외 순환과는 다른 대칭 순환). `app-main.ts`가 mode-select의 `settings` 목적지를 `settings-play`로 잇고, `onChange`→`writeSettings`(신규, `game-settings.ts`)로 필드 커밋마다 전체 settings를 즉시 저장하고, `onCategoryChange`→`goScene`, `onBack`→`goScene('mode-select')`로 배선했다. M4-6 Exit 기준(4 scene 존재·카테고리 전환·필드 조작·key rebind)을 충족한다.

  **M4-6 前 게이트의 "key rebinding UI capture-flow"를 이 세션이 확정했다**: idle 버튼 클릭 → capturing(다음 keydown 하나를 가로챈다) → 충돌이 없으면 그 즉시 커밋(별도 확인 단계 없음, `CLAUDE.md` "가장 단순한 구현" 원칙) → `Esc`는 캡처를 취소하고 원래 값을 유지한다. **충돌은 커밋을 거부한다** — `core-settings.ts`에 새 순수 함수 `conflictingLaneKey(bindings, target, candidateCode)`를 추가해, 새 코드가 다른 lane key에 이미 쓰이고 있으면 그 lane key id를 돌려준다. 이건 취향이 아니라 기술적 제약이다: `game-judge-input.ts`의 `codeToKey`가 물리 key code → lane key id 1:1 `Map`이라, 중복 바인딩을 그대로 커밋하면 나중에 등록된 쪽 lane이 조용히 입력을 잃는다. 충돌 시엔 conflict 시각 상태(`ui-design.md` §2.6.3의 3상태 중 하나)를 보여주고 capturing으로 남아 다음 키 입력이나 `Esc`를 기다린다.

  **"volume slider interaction unit"도 이 세션이 확정했다**: 모든 slider 필드(volume 3종뿐 아니라 scrollSpeed·laneOpacity·judgeLinePos·sudden·jacketBrightness 전부)에 네이티브 `<input type="range">`를 썼다 — 클릭 점프·드래그·화살표 key step을 브라우저가 그대로 제공해, "조작 단위"라는 질문 자체가 `step` 속성값 선택 하나로 줄어든다. `step` 값은 어느 스펙에도 없어 이 세션이 필드별로 골랐다: `scrollSpeed`는 기존 `SCROLL_SPEED_STEP`(0.1)을 재사용, `volMaster`/`volMusic`/`volEffect`/`laneOpacity`는 0.05(20단계), `sudden`/`jacketBrightness`는 1(정수 %), `judgeLinePos`는 0.01. number 필드(`audioOffset`/`visualOffset`/`noteThickness`) 도 같은 이유로 `step=1`을 뒀고, 커밋 전 기존 `SETTING_CHECKS`(`core-settings.ts`)로 검증해 무효값이면 원래 값으로 되돌린다(새 검증 로직을 이 파일에서 다시 만들지 않았다).

  **`judgeLinePos`의 raise-only 제약**(§2.6.5 "트랙 자체가 그 이하로 안 내려간다")은 `<input type=range>`의 `min` 속성을 고정 0이 아니라 "지금 저장된 `judgeLinePos` 값"으로, `max`는 `JUDGE_LINE_DEFAULT`로 둬서 네이티브 range 시맨틱만으로 구현했다 — 별도 드래그 clamp 로직이 없다.

  **settings 전용 Back 키는 스펙에 명시돼 있지 않다 — D-2026-052(mode-select 자식 scene의 Backspace 통일 Back) 관례의 확장으로 추론했다.** `scene.md`가 settings 4 scene의 Back 키를 별도로 정의한 자리를 찾지 못했다 — 다른 mode-select 자식 scene(song-select 등)과 일관되게 Backspace/Esc → `onBack`으로 뒀다. 스펙이 다른 Back 키(또는 Back 없음)를 의도했다면 재검토가 필요한 결정 필요 항목이다.

  gauge 관련 필드(OPTION category)는 M4-5 이전 D-2026-074(GAUGE→OPTION 병합)·D-2026-075(SOUND 분리)가 이미 확정한 4-scene 구성을 그대로 따른 것으로, 이번 세션이 새로 정한 게 아니다.

  테스트 신규: `core-settings.test.ts`에 `conflictingLaneKey` 3개, `game-settings.test.ts`에 `writeSettings` 1개, `scene-settings.test.ts`(신규) 14개(mount/show/hide, nav pill 클릭, Tab/Shift+Tab 순환과 wraparound, toggle/slider/select/number 4개 위젯 커밋과 number 검증 실패 시 되돌림, key-rebind 클릭→즉시 커밋·Esc 취소·충돌 거부, Backspace/Escape→onBack) — 전체 1169/1169 통과.
- **Defined in:** `src/scene/scene-settings.ts`, `src/scene/scene-settings.css`, `src/core/core-settings.ts`, `src/game/game-settings.ts`, `src/app/app-main.ts`
- **Rationale:** Not required
- **Affects:** scene, core, game, app — M4-6 완료
- **Supersedes:** None
- **Commit:** `784f437c2e19c490252f6c38d177302bfb5eeda5`


### D-2026-092 — M4-7: quick options 오버레이 배치 + no-record 결선

- **Status:** Accepted (구현분) / 오버레이 픽셀 배치는 결정 필요 — 아래 참조
- **Decision:** song-select `Space`가 quick options 오버레이(`scene.md` §5·§10, 로직은 이미 완성돼 있던 `core-quick-options.ts`)를 열고, Esc/Space로 닫는다. 열려 있는 동안 `scene-song-select.ts`의 `onKeyDown`은 오버레이 전용 핸들러로만 가고 검색·커서 이동 등 나머지 scene 입력은 전혀 처리하지 않는다(§10 "열림 중 scene 입력 차단"). 5필드(scrollSpeed/gaugeMode/mirror/staticShape/autoplay)를 목록으로 나열해 ↑↓=row 이동, ←→=한 칸 step, 휠=위/아래 한 칸씩 step, 클릭=그 값으로 즉시 점프, Enter=지금 row의 draft 확정으로 구현했다 — 전부 `core-quick-options.ts`의 기존 순수 함수(`moveQuickOptionsRow`/`stepQuickOption`/`jumpQuickOption`/`confirmQuickOption`/`applyQuickOptions`)를 그대로 호출할 뿐이고, 이 세션은 DOM·키·휠·클릭 이벤트를 그 함수들에 잇는 host 배선만 했다.

  **no-record 결선**: `SongSelectHandlers`에 `onQuickOptionsChange(settings)`를 추가해, row가 Enter로 확정될 때마다 그 즉시 불린다(`applyQuickOptions`로 병합한 전체 `Settings`) — `app-main.ts`가 이를 `writeSettings(storage, settings)`로 영속한다([[settings]] D-2026-022 "즉시 영속 필드", M4-6의 설정 화면 `onChange`와 같은 즉시-커밋 패턴). no-record OR 4조건(`isNoRecord`, `core-records.ts`)과 `saveRecordIfEligible` 호출 배선 자체는 M4-5(D-2026-088)가 이미 완성해 뒀다 — `app-main.ts`의 `enterSongCredit`이 매 진입마다 `readSettings(storage)`로 최신 저장값을 읽어 gameplay에 넘기므로, quick options로 바꾼 `autoplay`/`staticShape`는 다음 판 시작부터 no-record 게이트에 자동으로 반영된다. M4-7이 새로 더한 건 "이 두 필드를 바꿀 수 있는 입구 하나"뿐이고, 게이트 로직 자체를 다시 만들지 않았다.

  `SongSelectSceneHandle.update()`에 세 번째 인자 `settings: Settings`를 추가했다(오버레이가 열리는 순간의 스냅샷 출처, M4-6 settings 화면과 같은 "update가 show보다 먼저 불려야 한다" 계약) — `app-main.ts`의 `refreshSongSelect`가 `loadSongSelectRows`와 `readSettings`를 병렬로 읽어 함께 넘긴다.

  **오버레이의 픽셀 배치는 결정 필요 항목이다** — `ui-design.md`가 이 오버레이의 레이아웃을 아직 정의하지 않아(§2.6 setting 화면과 달리 quick options 전용 절이 없다), M4-6 settings 화면과 같은 기존 토큰으로 최소 기능 목록형 UI(중앙 모달, 5행)만 뒀다. 배치가 확정되면 재검토.

  **클릭의 "즉시 점프"는 필드 성격에 따라 두 갈래로 구현했다**: bool 필드(mirror/staticShape/autoplay)는 값이 둘뿐이라 클릭이 정확히 스펙대로(그 값으로 즉시 점프 = 토글) 동작한다. scrollSpeed/gaugeMode는 클릭 위치→값 환산 UI(슬라이더 드래그 등)가 없어 클릭이 "그 row를 고른다"는 역할만 하고 값 자체는 좌우 화살표/휠로 바꾼다 — 오버레이 배치가 결정 필요 항목인 것과 같은 이유로, 정확한 클릭-점프는 배치가 정해지면 함께 재검토한다.

  **닫을 때(Esc/Space)의 미확정 draft 처리는 이 세션이 정했다**: row 이동 시 미확정 draft가 버려지는 `core-quick-options.ts`의 기존 규칙을 닫기에도 그대로 확장했다 — 스펙이 닫을 때의 draft 처리를 명시하지 않아서다(결정 필요 항목). 즉, Enter로 확정하지 않은 값은 오버레이를 닫으면 사라진다.

  테스트 신규: `scene-song-select.test.ts`에 quick options overlay describe 블록 9개(Space로 열기·열림 중 scene 입력 차단·Esc/Space로 닫기·row 이동과 step·Enter 확정과 `onQuickOptionsChange` 호출·row 이동이 미확정 draft를 버림·bool 필드 클릭 토글·wheel step·hide()가 오버레이를 닫음) — `update()` 시그니처 변경으로 기존 호출부 전체(27곳)에 `DEFAULT_SETTINGS` 인자를 추가했다(동작 변경 없는 순수 시그니처 맞춤). 전체 1178/1178 통과.
- **Defined in:** `src/scene/scene-song-select.ts`, `src/scene/scene-song-select.css`, `src/app/app-main.ts`
- **Rationale:** Not required
- **Affects:** scene, app — M4-7 완료
- **Supersedes:** None
- **Commit:** `32e7a5be9009bd09450fa30ee54cdee960082d2f`


### D-2026-093 — M4.6: quick options 오버레이 레이아웃 확정, D-2026-092의 discard-on-close를 뒤집음

- **Status:** Accepted
- **Decision:** M3.5-1의 원래 범위 문구("quick options overlay 배치")가 실제로는 `ui-design.md` §2.5에 반영되지 못한 채 넘어갔던 공백을 §2.5.8로 닫는다. M4-7의 최소 기능 placeholder(설정 화면 토큰의 중앙 모달, 목록형 5행, 클릭은 "그 row를 고른다"는 역할만)를 대체하는 정식 레이아웃이다.

  **배치**: 중앙 정렬 dimmed modal(`rgb(5 5 8 / 70%)` 스크림, M4-7 placeholder와 동일 값 유지) — `scene.md` §10 "열림 중 scene 입력 차단"을 시각적으로도 뒷받침한다. 모달 폭·행 간격은 §2.6.3(settings 필드 표현 어휘)의 `.field-row` 계열 치수를 재사용한다.

  **필드별 컴포넌트 — 새 위젯 없음, §2.6.3 재사용**: scrollSpeed는 네이티브 `<input type="range">`(`.slider-input`, settings의 slider와 동일 컴포넌트) — 클릭·드래그가 그 위치의 값으로 즉시 점프해 [[scene]] §5 "마우스 클릭(그 값으로 즉시 점프)"을 문자 그대로 만족한다. gaugeMode는 segmented control(`.segment-group`/`.segment-btn`, settings의 select와 동일) — 6개 모드가 각각 독립 클릭 타겟이다. mirror/staticShape/autoplay는 M4-7의 toggle-switch 클릭 토글을 그대로 유지한다(bool 필드는 애초에 클릭 토글이 "즉시 점프"를 만족했다).

  **활성 row 표시**: M4-7의 풀 row outline을 좌측 강조 바 하나로 바꿨다 — settings의 key-rebind capturing 상태(§2.6.3, `--cyan` 강조)와 같은 시각 어휘.

  **닫을 때(Esc/Space)의 동작을 뒤집는다 — D-2026-092 수정**: M4-7은 오버레이를 닫을 때 확정 안 된 draft를 버렸다(row 이동과 같은 규칙을 닫기에도 확장한 잠정 결정). 이 라운드에서 뒤집는다 — **닫기는 지금 활성 row의 draft를 암묵적으로 확정한다**(Enter를 누른 것과 동일). 근거: 클릭이 이제 실제 값 설정 동작이라(위 필드별 컴포넌트), 클릭 직후 Space로 나가면서 그 값이 사라지면 "빠른 조작"이라는 이 화면의 존재 이유와 반대로 느껴진다 — "quick" options 표면에 Enter라는 두 번째 확인 게이트를 요구하는 건 클릭-즉시-점프 인터랙션과 마찰을 일으킨다. row 이동(↑/↓) 시 미확정 draft를 버리는 규칙은 그대로 유지한다 — "다른 필드로 옮긴다"와 "오버레이를 나간다"는 다른 액션으로 갈랐다.

  **core 변경 없음**: 닫기의 confirm 동작은 `scene-song-select.ts`의 `closeQuickOptionsOverlay`가 기존 `commitQuickOptionsRow`(→ `confirmQuickOption`+`applyQuickOptions`, `core-quick-options.ts`)를 그대로 재사용해 구현했다 — 새 pure 로직이 필요 없었다. scrollSpeed 슬라이더 드래그 중에는 `quickOptionsPanel` 전체를 다시 그리지 않고(드래그 중인 `<input>` 자체가 교체되면 포인터 캡처가 끊긴다) 값 텍스트 노드만 갱신하는 예외를 뒀다 — row가 실제로 바뀔 때만 전체 재렌더한다.

  테스트: `scene-song-select.test.ts`의 quick options 블록을 gaugeMode segment 클릭·scrollSpeed slider `input` 이벤트·toggle-switch class 검사로 갱신하고, close-confirms 동작 2개(미확정 draft가 닫을 때 confirm됨 / row 이동으로 버려진 draft는 닫아도 안 되살아남)를 새로 추가했다 — 전체 1182/1182 통과.
- **Defined in:** `scene/ui-design.md` §2.5.8, `src/scene/scene-song-select.ts`, `src/scene/scene-song-select.css`
- **Rationale:** Not required
- **Affects:** scene, ui-design(spec) — M4.6 완료
- **Supersedes:** D-2026-092의 discard-on-close 잠정 결정(닫기가 이제 confirm) — 배치·클릭 컴포넌트는 확장이지 번복이 아니다
- **Commit:** `abc0369f198568fd844d916f1a442b7e80f469f5`


### D-2026-094 — M5-1: editor graph + start scene + single-chart session

- **Status:** Accepted (구현분) / `.cfx` 열기·저장 창 UI는 결정 필요 항목 — 아래 참조
- **Decision:** editor 5-scene 그래프(`editor-start` + 형제 4개 `editor-notes`/`-shapes`/`-meta`/`-test`)를 `scene-manager`(M4-1)에 등록하고, mode-select의 `editor` 항목을 `editor-start`로 이었다. `editor-graph.md` §1의 Tab 순환("notes → shapes → test → notes", meta는 click 진입만)을 `scene-editor-workspace.ts`가 그대로 구현했고, 4개 형제 scene은 `mountSettingsScene`(M4-6)과 같은 "하나의 host, 여러 scene id" 패턴으로 하나의 DOM host를 공유한다(§2 "shared editorState"와 자연히 맞는다).

  **세션은 M3에서 이미 완성된 `edit-workspace.ts`의 `createWorkspaceSession`을 그대로 재사용한다** — 새 세션 관리 로직을 만들지 않았다. `editor-start`의 4개 진입 경로 중 3개를 이번 라운드에서 실제로 연결했다:
  - **New Chart**: songId 입력 → 신설 `edit-chart-init.ts`의 `createInitChart`(chartId 0·difficulty 'init', 나머지 필드는 `core-chart-fixture.ts`의 `makeChart()`가 이미 검증 통과로 확인해 둔 최소값 재사용 — bpm 120·4/4·level 1)로 init chart를 만들고 `createWorkspaceSession`으로 세션화.
  - **Open Chart JSON**: `env-file.ts`의 `FileEnv.open`(텍스트) + `format-chart-open.ts`의 `openChartJson`으로 파싱·검증. asset(music/jacket) 재연결 UI 없이도 스펙을 만족한다 — `_meta/persistence.md` §10이 "music Blob 없이 열기"를 명시적으로 허용해 뒀다(재생 불가 상태만 표시, 저장은 허용). 재연결 UI는 meta scene(M5-5) 몫으로 남긴다.
  - **Continue Editing**: `edit-workspace.ts`의 `loadRecoverableWorkspace`로 dirty workspace를 조회해 `hasRecoverableWorkspace`로 버튼 노출을 결정하고(§6·§9), 있으면 `recovered: true`로 세션화.

  **`.cfx` 열기는 이번 라운드에서 뺐다(결정 필요 항목)**: `env-file.ts`의 `FileOpenHost.pickFile`이 텍스트만 돌려주는 계약이라 바이너리 ZIP인 `.cfx`를 열 방법이 없다. 새 host 능력(binary open) 추가는 `env` 계약을 넓히는 architecture 확장이라 이 커밋에서 조용히 하지 않고 버튼을 disabled로 자리만 잡아 뒀다 — 언제 그 확장을 승인할지 별도 보고한다.

  **Back(Backspace/Esc)의 dirty-transition 확인은 자리만 만들어 뒀다(결정 필요 항목)**: `edit-session-transition.ts`의 `resolveSessionTransition`(M3, 이미 완성)을 그대로 호출하지만, 이 라운드에는 chart 편집 인터랙션 자체가 없어(command layer는 M5-2, chart field 편집은 M5-5) dirty가 실제로 true가 될 경로가 없다. `saveNewVersion` 콜백은 저장 창 UI가 아직 없어 즉시 `'cancelled'`를 돌려주는 자리표시자다 — 실제로 dirty가 true인 상태에서 이 경로에 닿으면(향후 milestone) 전환하지 않고 세션을 유지해, 저장 창이 붙기 전까지 편집을 조용히 버리는 일은 없게 했다.

  **notes/shapes/meta/test 4 scene은 이번 라운드에 껍데기만 만들었다** — chart identity(songId/chartId/difficulty)만 표시해 "세션이 chart 하나를 소유한다"는 M5-1 Exit 기준을 확인할 수 있게 했을 뿐, 실제 편집 UI(노트 캔버스 M5-3, shape/lane 툴바 M5-4, metadata 필드 M5-5, test 재생 M5-6)는 없다.

  **editor 화면은 `ui-design.md`가 전혀 다루지 않는다** — M3.5(§6.5)가 song-select/settings/title/credits 4화면만, M4.5/M4.6이 gameplay/quick-options만 다뤘고 editor는 그 목록에 없었다. 그래서 이번 라운드는 M2(ui-design 이전)와 같은 처지로, 최소 기능 미디자인 UI만 뒀다 — 나중에 M3.5·M4.5·M4.6과 같은 별도 design-review milestone이 editor 화면에도 필요할 수 있다(결정 필요 항목, 사용자 판단).

  **M5 진입 gate(§3 실측 3항목: 히트 반경·드래그 임계, `viewMs` 기본값·zoom 범위, shape 보조 툴 계승 여부)는 이번 라운드에 닫지 않았다** — D-2026-046의 "값이 실제로 쓰이는 step 바로 앞으로 gate를 옮긴다" 선례를 그대로 적용해, M5-1 자신의 Exit 기준(scene 전환·세션 소유)은 이 세 값 중 어느 것도 쓰지 않는다고 판단해 그대로 진행했다. 세 값은 각각 M5-3(노트 편집, 히트 반경·드래그 임계)·M5-1 이후 notes/shapes 실 렌더(`viewMs`)·M5-4(shape 보조 툴)가 실제로 그 값을 쓰기 시작하는 지점에서 다시 막힌다 — build-order.md에 그 재배치를 반영했다.

  테스트 신규: `edit-chart-init.test.ts` 2, `scene-editor-start.test.ts` 12, `scene-editor-workspace.test.ts` 8 — 전체 1204/1204 통과.
- **Defined in:** `src/scene/scene-editor-start.ts`, `src/scene/scene-editor-workspace.ts`, `src/edit/edit-chart-init.ts`, `src/app/app-main.ts`, `_plan/build-order.md`
- **Rationale:** Not required
- **Affects:** scene, edit, app, build-order(spec) — M5-1 부분 완료(`.cfx` 열기 제외)
- **Supersedes:** None
- **Commit:** `31827edf2b4546bc721fb777711215344751fd91`


### D-2026-095 — M5-2: command/history 엔진

- **Status:** Accepted
- **Decision:** `editor-commands.md` §1~§5의 command/history 계약을 그대로 구현하는 chart-agnostic 엔진(`src/edit/edit-command.ts`, `createCommandHistory`)을 신설했다. `Command = { name, apply(), undo(), invalidates[] }`(§1), scope 3분할(notes/textEvents→n, shapeEvents/laneEvents→s, tempos/timeSignatures→m, §2), scope당 깊이 60(초과 시 가장 오래된 항목부터 버림), `dispatch`(apply → scope stack push → 해당 scope redo clear → listener 발화), `undo`/`redo`(scope별 독립), `onDispatch` listener(§3), `resetBaseline()`(§5 history baseline)을 구현했다. `app-main.ts`가 매 `WorkspaceSession` 생성마다(New Chart/Open JSON/Continue Editing) 새 `CommandHistory`도 함께 만든다 — "새 인스턴스 = 항상 빈 상태로 시작"이 `resetBaseline()`을 굳이 호출하는 것보다 단순해 그 경로를 택했다(`resetBaseline()`은 엔진 계약 자체의 단위 테스트를 위해 API로는 남겨 뒀다).

  **이 엔진은 chart 배열을 실제로 어떻게 바꿀지 모른다** — `invalidates`에 적힌 필드 이름(예: `'notes'`)으로 scope만 판정할 뿐, `AddNotes`/`MoveNotes`/`MirrorShapeEvents` 등 §6의 구체 command 목록(실제로 note/shape/lane 배열을 편집하는 apply/undo 본문)은 이 라운드에 포함하지 않았다 — 그건 실제 편집 인터랙션이 필요한 M5-3(notes)·M5-4(shapes/lane)·M5-5(tempo/timeSignature)·M5-7(textEvents)의 몫이다. M5-2는 "그 command들이 붙을 수 있는 검증된 엔진"까지만 낸다.

  **"cache invalidate" 단계는 실제 캐시가 없어 자연히 해소된다** — `core-timing.ts`(`buildTimeline`)·`core-shape.ts`(`buildFieldGeometry`)가 이미 "캐시도 무효화도 없다, 매번 chart에서 다시 계산한다"는 설계라(두 파일 헤더), §1 알고리즘의 이 단계는 `onDispatch` listener가 `invalidates`를 실어 나르는 것으로 충분하다고 판단했다 — 새 캐시 객체를 만들지 않았다.

  **drag command(§4)에 특별한 API를 두지 않았다** — "drag 중 live mutate, drag-end에 old/new snapshot command 1개 dispatch"는 보통 command 하나(apply=새 값, undo=이전 값)로 이미 표현되므로 새 추상화가 불필요하다고 판단했다. drag 중 dispatch를 안 하다가 끝에 한 번만 하는 건 호출측(M5-3·M5-4의 실제 드래그 로직)의 책임으로 남긴다.

  **"undo/redo 직전 해당 scope selection clear"(§2)는 이 파일 밖이다** — selection은 scene 내부 상태이고 이 엔진은 scene을 모른다. `onDispatch` listener로 미래의 notes/shapes scene(M5-3+)이 직접 처리해야 한다.

  **chart field 편집이 history 밖이라는 M5-2 Exit 기준의 절반은 새 코드 없이 이미 충족돼 있었다** — M5-1부터 `WorkspaceSession.updateChart()`가 chart field(chartId/difficulty/subtitle/level/chartBy/metadata/asset 연결) 편집의 유일한 경로였고, 이 엔진을 거치지 않는다. 통합 테스트로 "그 경로가 command history를 전혀 건드리지 않는다"를 명시적으로 확인했다.

  `app-main.ts`가 `editorCommandHistory.onDispatch(() => editorWorkspaceHandle?.update(editorSession!.chart))`로 §3 "active scene redraw"의 최소 배선을 미리 만들어 뒀다 — 지금은 notes/shapes/meta/test가 전부 M5-1의 껍데기라 실제로 dispatch될 command가 없지만, M5-3+이 command를 만들기 시작하면 이 구독이 바로 작동한다.

  테스트 신규: `edit-command.test.ts` 17개(scope 분할·깊이 60 초과 시 최오래 항목 폐기·invalidates 여러 scope 혼입 시 에러·undo/redo LIFO·resetBaseline·onDispatch 구독/해제·M5-2 Exit 통합 2개) — 전체 1221/1221 통과.
- **Defined in:** `src/edit/edit-command.ts`, `src/app/app-main.ts`
- **Rationale:** Not required
- **Affects:** edit, app — M5-2 완료(구체 command 목록은 M5-3~M5-7로 이월)
- **Supersedes:** None
- **Commit:** `b25d77d5d65928960cfc55a2ae443f81a3fb060a`


### D-2026-096 — M5-3 前 게이트 해소: note 히트 반경·드래그 임계값 원본 재실측

- **Status:** Accepted
- **Decision:** `editor-editing.md` §8 잔여("히트 반경·드래그 임계 등 미세 수치")를 기억이 아니라 `airpole/conflux-editor`(commit `09aa8dad4`) `notes-input.js`를 직접 읽어 닫았다. **히트 반경**: `findNoteAt()`의 `const tol = tpp * 15` — `tpp`("ticks per pixel", `notes-render.js`에서 캔버스 높이·zoom으로 유도)와 곱해 tick 단위로 쓰지만 실질은 **화면상 고정 15px**다(zoom이 바뀌어도 15px 유지, tick 폭만 달라짐). **드래그 임계**: `onMove`가 `moved` 플래그를 세우는 모든 지점(스크롤 드래그·사각 선택 드래그·일반 이동)에서 일관되게 **4px**. 가로 lane 이동 히스테리시스(`colW*0.5`, 이미 스펙 반영됨)와는 별개 값이라는 것도 확인했다.

  `shape-input.js`는 3px/4px가 혼재해(줄마다 다름) 이번엔 notes 탭 범위(M5-3)만 닫고 shapes/lane 서브모드 값은 M5-4 진입 시 별도 재실측하기로 남겼다.

  측정 결과를 `_extracted/EXTRACTED_FACTS.md` §13에 출처(commit, 파일, 코드 인용)와 함께 기록하고, `editor-editing.md` §8과 `_plan/build-order.md`의 "M5-3 전" 게이트를 닫았다.
- **Defined in:** `_extracted/EXTRACTED_FACTS.md` §13, `editor/editor-editing.md` §8, `_plan/build-order.md`
- **Rationale:** Not required
- **Affects:** editor-editing(spec), build-order(spec) — M5-3 진입 gate 해소
- **Supersedes:** None
- **Commit:** `5d5c98b970d9cdeb8d367d701dc168a23f5501d6`


### D-2026-097 — M5-3: notes scene 편집 interaction

- **Status:** Accepted (구현분) / `viewMs` 여전히 결정 필요, 아래 단순화 항목들도 결정 필요 — 아래 참조
- **Decision:** `editor-commands.md` §6의 note 관련 command 6개(Add/Delete/Move/Mirror/SetDuration/ReplaceNotes, `edit-notes-commands.ts`)와 실제 편집 캔버스(`scene-editor-notes.ts`)를 구현해 M5-3 Exit 기준(배치·이동·삭제·복사·붙여넣기·flip이 원본과 같은 결과, overlap/conflict 화면 표시)을 충족했다.

  **command는 전부 snapshot 기반이다** — apply()/undo()가 `notes` 배열 전체를 "이후"/"이전" 스냅샷으로 교체한다. 배열 끝에서 개수만큼 잘라내는 위치 추정 방식을 안 써서 undo가 항상 정확히 원래 배열로 돌아간다.

  **overlap/conflict 검출은 이미 core에 있던 `core-overlap.ts`(`buildOverlapMap`)를 그대로 재사용했다** — 새로 만들지 않았다. mirror도 이미 있던 `core-judge.ts`의 `MIRROR_LANE_MAP`(1↔4, 2↔3)을 재사용했다.

  **좌표계 grid-snap을 위해 `core-timing.ts`에 `snapTick(tick, gridDivisor)`를 신설했다**(`cellTickOf`를 감싼 최소 함수) — 직접 필요한 최소 의존 추가.

  **`EditorCategoryController` delegation을 `scene-editor-workspace.ts`(M5-1)에 새로 얹었다** — category(지금은 notes만)가 자기 body의 키 입력을 workspace의 Tab/Backspace/Escape보다 먼저 가로챌 수 있게 하는 자리(§5 "Esc 취소 계단"이 전역 뒤로가기보다 먼저 와야 하므로). chart가 command dispatch로 바뀔 때는 body를 통째로 다시 만들지 않고 controller의 가벼운 `update(chart)`만 부른다 — 매 편집마다 선택 툴·선택 상태가 초기화되지 않게 하려는 목적이다.

  **M5-1 이후(notes/shapes 실 렌더) 前 게이트("`viewMs` 기본값·zoom 범위")는 이번 라운드에서도 닫지 못했다** — 원본의 `edZm`(줌 계수, 기본 1·범위 0.25~8·step ×1.35, `notes-tools.js` 실측)은 **tick/beat 비례 축의 값**인데, `editor-graph.md` §3이 이 축을 ms 비례로 재설계(`[수정]`)해 둬서 단위 자체가 달라 그대로 옮길 수 없다 — 순수 측정이 아니라 해석이 필요한 자리라 이 세션이 임의로 확정하지 않았다. `VIEW_MS_DEFAULT = 8000`(ms)을 임시 상수로 두고 Z/X 줌 키는 배선하지 않았다(마우스 휠 스크롤만 지원, `core-timing.ts`의 기존 `minTick`으로 하한을 막는다) — 결정 필요 항목으로 보고한다. 참고로 `savedLNDur`(quick-hold 길이) 기본값은 원본 `editor-state.js`의 `TPB`(1 beat)를 그대로 썼다 — 이건 단위가 안 바뀐 순수 측정값이라 바로 채택했다.

  **이번 라운드가 의도적으로 단순화한 지점(전부 결정 필요 항목)**:
  1. 배치는 항상 `AddNotesCommand`(추가)뿐이다 — 원본의 "lane 2·3 용량 초과 시 기존 tap 자동 치환" 같은 배치-시점 자동 해소 규칙은 구현하지 않았다. `core-overlap.ts`의 conflict 표시가 문제를 시각적으로 보여주고 유저가 delete로 해소한다(conflict 해소 삭제 자체는 `deleteNotesCommand`로 구현돼 있다 — 자동 치환만 뺐다).
  2. `A` 드래그 사각 선택 모디파이어가 없다 — 클릭(단일)·Shift+클릭(추가/제거)만 지원한다.
  3. note 우선순위(같은 히트 반경에 여럿 겹칠 때 tap>hold>wideTap>wideHold 우선, 원본 규칙)를 "가장 최근에 배치된 것" 우선으로 단순화했다.
  4. 붙여넣기 충돌 시 토스트 안내가 없다(조용히 스킵만) — 토스트 UI 시스템 자체가 아직 없다.
  5. text 툴(`T`)은 이 라운드 범위 밖이다 — textEvent는 M5-7(text events) 소관.
  6. `editor-editing.md`의 편집 화면 픽셀 디자인은 여전히 `ui-design.md`가 안 다뤄 최소 기능 미디자인 캔버스로 뒀다(M5-1과 같은 상황).

  테스트 신규: `core-timing.test.ts`에 `snapTick` 4개, `edit-notes-commands.test.ts` 10개, `scene-editor-workspace.test.ts`는 기존 8개 그대로(controller delegation은 회귀 없음 확인), `scene-editor-notes.test.ts`(신규) 15개(tool 전환, tap/wideTap/hold 2클릭 배치, quick-hold 아님 확인, Escape 취소 계단, 클릭 선택+D 삭제, Ctrl+F mirror, Ctrl+C/V 복사-붙여넣기, drag-end 1-command 이동, 4px 미만은 클릭 취급, destroy/update 안전성) — 전체 1247/1247 통과.
- **Defined in:** `src/edit/edit-notes-commands.ts`, `src/scene/scene-editor-notes.ts`, `src/scene/scene-editor-workspace.ts`, `src/core/core-timing.ts`, `src/app/app-main.ts`
- **Rationale:** Not required
- **Affects:** edit, scene, core, app — M5-3 완료(단순화 6항목·`viewMs` gate는 결정 필요로 이월)
- **Supersedes:** None
- **Commit:** `4561682ad2f88f00a3aa76c7944af7d63146861a`


### D-2026-098 — `viewMs` 기본값·zoom 범위 파생, Z/X 줌 배선

- **Status:** Accepted
- **Decision:** D-2026-097이 못 닫은 "M5-1 이후(notes/shapes 실 렌더) 前" 게이트(`viewMs` 기본값·zoom 범위)를 닫았다. 원본 `edZm`(tick/beat 비례 줌 계수, 기본 1·범위 0.25~8·step ×1.35)을 ms 비례로 재설계된 세로축(`editor-graph.md` §3)으로 옮기려면 기준 tempo가 필요하다 — **이 절은 §13(D-2026-096)류의 순수 실측이 아니라 해석적 결정이다**.

  유도: 원본 `tpp = (TPB*16)/(ch*edZm)`에서 캔버스에 보이는 tick 폭 `visTk = tpp*ch = TPB*16/edZm`(`ch` 상쇄) — 여기에 `msPerTick = 60000/(bpm*TPB)`를 곱하면 `TPB`도 상쇄돼 `viewMs = 960000/(edZm×bpm)`이 나온다. `bpm`은 캔버스 높이·TPB 어느 쪽에도 없던 새 자유도라 값 하나를 선택해야 한다 — **120bpm을 기준 tempo로 선택했다**(측정값이 아니라 선택: 근거는 `_extracted/EXTRACTED_FACTS.md` §9의 `state.js` 기본 차트 `tempo: [{tick:0, bpm:120}]` — 코드베이스 자체가 이미 이 값을 "기준" 관례로 쓰고 있다는 사실을 재사용했다). 다른 기준 tempo였다면 아래 ms 값은 전부 비례로 달라졌을 것이다 — 반면 step ratio(×1.35)는 reciprocal 관계라 기준 tempo 선택과 무관하게 방향만 뒤집혀 그대로 넘어온다(`edZm`×1.35 ⇔ `viewMs`÷1.35).

  확정값(120bpm 기준): `VIEW_MS_DEFAULT=8000ms`(edZm=1)·`VIEW_MS_MIN=1000ms`(edZm=8, 최대 확대)·`VIEW_MS_MAX=32000ms`(edZm=0.25, 최대 축소).

  `scene-editor-notes.ts`에서 `viewMs`를 상수에서 mutable 상태로 바꾸고, `pixelYToTick`/`tickToPixelY`/`noteHitAt`/`findNoteIndexAt`에 명시적 매개변수로 threading했다(기존 함수들의 "순수 함수·명시적 인자" 스타일 그대로 확장). `editor-editing.md` §5가 이미 확정해 둔 Z/X 키(줄 111, "구 +/-"에서 개명)를 `onKeyDown`에 배선했다 — Z=줌 아웃(`viewMs *= 1.35`, `VIEW_MS_MAX` clamp), X=줌 인(`viewMs /= 1.35`, `VIEW_MS_MIN` clamp), 매번 `render()` 호출·consumed=true. 마우스 휠 스크롤은 그대로 유지(로컬 view 상태라 command/history를 거치지 않는다).

  측정·유도 결과를 `_extracted/EXTRACTED_FACTS.md` §14에 기록하고, `editor-editing.md` §8·`editor-graph.md` §6·`_plan/build-order.md`의 해당 게이트를 닫았으며 `src/scene/README.md`의 서술도 갱신했다.

  테스트 신규: `scene-editor-notes.test.ts`에 Z/X 각 1개(줌 후에도 새 축 기준 히트테스트 성공 확인)·양 끝 clamp 확인 2개(20회 반복 후 `VIEW_MS_MAX`/`VIEW_MS_MIN`에서 여전히 히트) 총 4개 추가 — 전체 1251/1251 통과.
- **Defined in:** `src/scene/scene-editor-notes.ts`, `_extracted/EXTRACTED_FACTS.md` §14, `editor/editor-editing.md` §8, `editor/editor-graph.md` §3·§6, `_plan/build-order.md`, `src/scene/README.md`
- **Rationale:** Not required
- **Affects:** scene, spec(editor-editing, editor-graph, build-order) — M5-1 이후 gate 해소, Z/X 줌 인터랙션 완료
- **Supersedes:** None
- **Commit:** `c5a5b6e`


### D-2026-099 — M5-4: shapes scene(shape/lane 서브모드) 편집 interaction, shape 보조 툴 gate 해소

- **Status:** Accepted (구현분) / 아래 단순화 항목들은 결정 필요 — 아래 참조
- **Decision:** `editor-commands.md` §6의 shape/lane 관련 command 4개(`AddShapeEvents`/`DeleteShapeEvents`/`AddLaneEvents`/`DeleteLaneEvents`, `edit-shape-commands.ts`)와 실제 편집 캔버스(`scene-editor-shapes.ts`)를 구현해 M5-4 Exit 기준(`T`로 서브모드가 갈리고 선택 필터가 서브모드를 따른다, Q/W/E/R 툴이 정의대로 배치한다, 현재 그룹·symmetry 쌍·`R` 모드가 툴바에 상시 표시된다)을 충족했다.

  **"M5-4 前" 게이트("shape 보조 툴(normalize 등)의 계승 여부")를 실측으로 닫았다** — `conflux-editor` 전체(`shape-input.js`·`shape-tools.js`·HTML 툴바)에서 "normalize"라는 이름의 사용자 노출 툴/버튼을 찾지 못했다. 유일한 "normalize"는 `shape.js`의 `normalizeShapeChain()`, 매 편집 커맨드 apply/undo마다 자동으로 도는 내부 배열 정합화 함수였다 — 이건 `editor-commands.md` §6이 이미 "shape/lane command는 apply·undo 양쪽에서 chain normalize"로 확정해 둔 요구사항이었으므로, 별도로 "계승할지" 결정할 대상이 아니었다. 근거는 `_extracted/EXTRACTED_FACTS.md` §15.1.

  **chain normalize를 `edit-shape-commands.ts`가 구현했다** — 원본 `normalizeShapeChain`과 같은 알고리즘(보간 이벤트를 dest tick(`startTick+duration`) 오름차순으로 훑어 `startTick`/`duration`을 다시 세운다)이지만, **배열 순서는 바꾸지 않는다** — 선택(`Set<number>` 인덱스, notes와 같은 패턴)이 배열 위치에 의존하므로 원소 자리는 그대로 두고 값만 갈아치운다. symmetry·그룹 배치로 한 클릭에 여러 이벤트가 생기는 경우도 `Add*Command`가 배열로 한 번에 받아 한 undo 단위로 묶는다 — notes의 `AddNotesCommand`와 같은 패턴이라 별도 `ApplyShapeOps` 타입이 필요 없었다.

  **`viewMs`/`scrollMs`를 notes와 공유하도록 옮겼다**(`editor-graph.md` §2 "scroll/zoom: notes·shapes 공유") — `scene-editor-view.ts` 신설, `scene-editor-workspace.ts`가 `EditorViewState` 객체 하나를 만들어 `mountNotes`/`mountShapes` 양쪽에 같은 참조로 넘긴다. M5-3 때는 이 상태가 `scene-editor-notes.ts` 로컬이었다(shapes가 아직 없어 공유할 대상이 없었다) — M5-4가 그 요구를 실현했다.

  **shape 클릭 히트 반경·드래그 판별 임계값을 재실측했다**(`_extracted/EXTRACTED_FACTS.md` §15.2~15.3) — `shape-input.js`의 `findDotAt`/`findShapeEvtAt`/del 툴이 전부 `bd = 35`(px 고정, notes와 달리 zoom 무관) 하나만 쓴다. 드래그 판별 임계는 두 값(notes는 4px 하나였다) — 점 재배치·그룹 이동 3px, 사각 선택·스크롤 4px. 이번 라운드는 점 드래그 재배치를 구현하지 않아 히트 반경(35px)만 실제로 코드에 반영했다.

  **이번 라운드가 의도적으로 단순화한 지점(전부 결정 필요 항목)**:
  1. 기존 점 드래그 재배치가 없다 — `MutateShapeEvents`/`MutateLaneEvents`를 구현하지 않았다. 배치는 항상 새 이벤트 추가뿐이다.
  2. Ctrl+F(선택 mirror)·클립보드(Ctrl+C/V)가 없다 — notes 탭에 이미 있는 패턴을 shape/lane에 옮기는 건 후속 라운드로 미뤘다.
  3. symmetry 축은 항상 동적 스냅샷이다(§3 "배치 지점 기준 쌍 평균") — 드래그로 축을 수동 조절하는 UI·"토글 off까지 유지" 상태는 없다.
  4. lane 그룹은 토글-누적 방식이다 — 원본은 Q/W/E를 물리적으로 동시에 누르고 있는 상태(`keydown`/`keyup`)로 그룹을 표현하지만, `EditorCategoryController`는 `onKeyDown`만 델리게이션한다. 누를 때마다 그룹 멤버십을 토글하는 방식을 택했다(마지막 1개는 비우지 않는다) — 얻는 그룹 구성 집합은 원본과 같고 입력 메커니즘만 다르다.
  5. lane symmetry는 그룹이 정확히 2개일 때만 적용된다 — §3의 "쌍" 개념이 2개 조합을 전제하므로, 1개·3개일 때는 symmetry가 켜져 있어도 일반 그룹 배치로 떨어진다.
  6. `laneGridDivisor` 드롭다운·`V` 위치 스냅 순환 UI가 없다 — 각각 4(spec 기본값)·0.25(최소 단계) 고정.
  7. 같은 dest tick·같은 체인에 이미 이벤트가 있으면 배치를 조용히 스킵한다 — 원본은 그 자리에서 easing만 갱신했지만(`addShapeEvt` "sameTickSameSide"), 이 command 모델은 추가 전용이라 갱신을 표현하려면 별도 command가 필요해 후속으로 미뤘다.
  8. init(anchor, `easing===null`) 점은 삭제·선택 대상에서 제외한다(원본 del 툴과 동일).
  9. pinch 배치는 Blue·Red에 같은 easing 선택을 적용한다 — 원본은 좌/우 드롭다운을 따로 뒀지만(Arc 선택 시엔 `resolveArcEasing`이 side별로 독립 해석되므로 실제 저장값은 이미 갈릴 수 있다), 비-Arc 선택은 양쪽에 동일하게 적용한다(별도 드롭다운 UI 없음).

  테스트 신규: `edit-shape-commands.test.ts` 9개(normalize 알고리즘 3개, add/delete 3개, invalidates 1개, lane 2개), `scene-editor-shapes.test.ts` 17개(서브모드 전환, Q/W/E/R 배치 4종, symmetry, 삭제(init 보호 포함), lane 그룹 토글·최소 1개 유지·R 토글·배치, Escape, Z/X 공유 view, destroy/update) — 전체 1277/1277 통과.
- **Defined in:** `src/edit/edit-shape-commands.ts`, `src/scene/scene-editor-shapes.ts`, `src/scene/scene-editor-view.ts`, `src/scene/scene-editor-notes.ts`(viewMs 공유로 리팩터), `src/scene/scene-editor-workspace.ts`, `src/app/app-main.ts`
- **Rationale:** Not required
- **Affects:** edit, scene, app, spec(shape, editor-editing, editor-graph, build-order) — M5-4 완료(단순화 9항목은 결정 필요로 이월), M5-4 前 게이트 해소
- **Supersedes:** None
- **Commit:** `830c05f`


### D-2026-100 — M5-4 후속: shape/lane 기존 점 드래그 재배치

- **Status:** Accepted (구현분) / composite dot(center/pinch) 드래그·symmetry 축 수동 조절 등은 여전히 결정 필요 — 아래 참조
- **Decision:** D-2026-099의 단순화 항목 #1("기존 점 드래그 재배치가 없다")을 이번 라운드에서 구현했다. `edit-shape-commands.ts`에 `mutateShapeEventCommand`/`mutateLaneEventCommand`(§6 `MutateShapeEvents`/`MutateLaneEvents`)를 추가하고, `scene-editor-shapes.ts`에 click-vs-drag 판별·드래그 렌더 프리뷰·drag-end dispatch를 배선했다.

  **드래그는 위치(`targetPos`)만 바꾼다 — tick(`startTick`/`duration`)은 바뀌지 않는다.** 두 근거를 확인했다: (1) `editor-editing.md` §2가 이미 "기존 이벤트 dot 드래그 = 위치 수정(drag-end 커맨드)"라고 명시해 뒀다. (2) `conflux-editor`의 `shape-input.js` `onMove`의 `dragDot` 분기를 다시 읽어도 `targetPos`만 갱신하고 `startTick`/`duration`은 건드리지 않는다(세로=시간축은 드래그 대상이 아니다). anchor(`easing===null`)도 위치는 옮길 수 있다 — §2 "init 이동 = 프롬프트 숫자 입력 + 드래그"가 명시하며, `deleteShapeEventsCommand`의 anchor 삭제 방지와는 별개 규칙이다.

  **사용자가 명시적으로 flag한 두 설계 질문("symmetry-pair·grid-snap이 드래그에도 적용돼야 하는가")을 원본 코드로 직접 답을 확인했다** — 추측이 아니라 재확인이다:
  - **grid-snap은 적용된다** — 원본 `dragDot` 분기가 매 `onMove`마다 `snapPos()`를 부른다. 이 재설계도 같다: `snapExt`(shape)/`snapRel`(lane, 자체 chain-projection을 거쳐)을 드래그 중 계속 적용한다.
  - **symmetry는 적용되지 않는다** — 원본 `dragDot`/`dragMoveSel` 분기 어디에도 `ES.sMirror` 참조가 없다. mirror는 `handleSTap`(배치 경로)에만 있다. 드래그는 항상 단일 이벤트 하나만 옮긴다 — 켜져 있어도 짝이 자동으로 따라 움직이지 않는다. 테스트로 확인했다("symmetry ON이어도 드래그는 반대편 이벤트를 만들거나 옮기지 않는다").

  click-vs-drag는 D-2026-099가 이미 실측해 둔 드래그 임계 3px(점 재배치·그룹 이동)를 그대로 쓴다. 기존 점 클릭 처리를 pointerdown에서 즉시 선택하던 것을, "잠정 드래그 시작 → pointerup에서 이동 여부로 분기"로 바꿨다(`scene-editor-notes.ts`의 click-vs-drag 판별과 같은 패턴) — 이동이 없으면 기존 선택 토글 로직 그대로, 이동이 있으면 `Mutate*Command` 1개를 dispatch한다.

  **composite dot(center/pinch로 놓인, 같은 tick의 Blue+Red 쌍) 드래그는 이번에도 범위 밖이다** — 원본 `findDotAt`은 `type: 'center'|'pinch'` 복합 히트를 별도로 찾아 두 이벤트를 함께 옮기지만, 이 재설계의 `findShapeIndexAt`은 단일 인덱스만 돌려준다(§2 클릭 선택 히트테스트 재사용). 개별 점(Q/E 단일 체인 이벤트, anchor 포함)의 드래그만 이번에 구현했다 — 복합 드래그는 별도 히트테스트가 필요해 후속 라운드로 미룬다.

  테스트 신규: `edit-shape-commands.test.ts` 4개(targetPos만 변경·dest 불변, anchor 이동 허용, lane 대응, invalidates), `scene-editor-shapes.test.ts` 5개(드래그로 MutateShapeEvents dispatch, 임계 미만은 클릭 처리, symmetry 무시 확인, anchor 드래그, lane MutateLaneEvents) — 전체 1286/1286 통과.
- **Defined in:** `src/edit/edit-shape-commands.ts`, `src/scene/scene-editor-shapes.ts`, `editor/editor-editing.md` §2·§8, `src/edit/README.md`, `src/scene/README.md`
- **Rationale:** Not required
- **Affects:** edit, scene, spec(editor-editing) — M5-4 단순화 항목 #1 해소
- **Supersedes:** None
- **Commit:** `aa8cbbe`


### D-2026-101 — M5-4 후속: composite dot(center/pinch 쌍) 드래그

- **Status:** Accepted (구현분) / Ctrl+F mirror·클립보드·symmetry 축 수동 조절 등은 여전히 결정 필요 — 아래 참조
- **Decision:** D-2026-100이 남긴 Deferred Finding("composite dot 드래그는 별도 히트테스트가 필요해 후속 라운드로 미룬다")을 이번 라운드에서 구현했다. 원본 `shape-input.js`의 `findDotAt`을 다시 읽어 정확한 그룹핑 규칙을 확인한 뒤(추측하지 않았다) 그대로 옮겼다:

  - **`pinch` 후보**는 같은 tick(dest)에 Blue·Red가 **둘 다** 있고, 위치 차이가 0.5(외부단위) 미만이며 **둘 다 anchor가 아닐 때만**(`easing !== null`) 생긴다. 히트 지점은 Blue의 위치.
  - **`center` 후보**는 Blue·Red 중 **하나만 있어도**(half-pair) 생긴다 — 히트 지점은 그 tick의 실제 evaluated 경계 중점(`shapeGeometryAt`)이지, 이벤트 자신의 저장값이 아니다(원본 `getShape(tk).left/right`와 동일).
  - 두 composite 후보와 개별 점(`dot`/`init`) 후보가 전부 같은 최소거리 경쟁에 참여한다 — 원본처럼 순서가 아니라 거리로 가장 가까운 것이 이긴다.

  `findShapeHitAt`(`scene-editor-shapes.ts`)이 이 규칙을 구현해 `ShapeHit`(point/center/pinch 판별 유니온)을 돌려준다. 기존 `findShapeIndexAt`(단일 인덱스만)은 이 함수로 대체됐다.

  **드래그 동작도 원본 `onMove`를 그대로 옮겼다**: `pinch`는 드래그하면 두 쪽 다 커서 위치로 모인다(원래 위치가 조금 달랐어도 하나로 합쳐진다). `center`는 드래그 시작 시점의 폭(Red−Blue, **부호 있음** — 두 체인이 교차해 있어도 그 상태를 보존)을 그대로 유지한 채 커서를 중심으로 대칭 이동한다. 원본은 매 `onMove`마다 `getShape()`으로 폭을 다시 계산하지만, 그 폭 자체가 프레임마다 안 바뀌므로(매번 같은 halfW로 대칭 재배치하니 수렴) 드래그 시작 시 한 번만 캡처해도 결과가 같다 — 재확인 후 내린 구현 선택이다. half-pair `center`는 존재하는 쪽 인덱스만 갱신한다(반대편은 애초에 없으니 조용히 버려진다, 원본과 동일).

  **명령 계층 결정**: `mutateShapeEventCommand`(단수, index 하나)를 `mutateShapeEventsCommand`(복수, `{index, targetPos}[]`)로 **일반화했다** — composite 드래그가 두 점을 한 undo 단위로 함께 옮기기 때문이다(`editor-commands.md` §4 "drag-end에 snapshot command 1개"). `addShapeEventsCommand`가 이미 "여러 개를 배열로 받아 한 undo"인 것과 같은 패턴이라 별도 "복수형" 타입을 새로 만들지 않고 기존 단수 함수를 확장했다 — 단일 점 드래그도 원소 하나짜리 배열로 같은 함수를 쓴다. lane은 composite pair 개념이 없어(원본에 lane 자체가 없었다, `[신규]`) `mutateLaneEventCommand`는 단수 그대로 뒀다.

  **클릭(드래그 없이) composite 히트의 선택 동작**은 이 재설계의 기존 단순화(클릭=선택, 원본의 sel-tool 전용 선택과 다름)를 composite에도 일관 적용해 존재하는 양쪽 인덱스를 함께 선택하도록 했다 — 원본은 애초에 `findDotAt`을 sel 툴 선택에 쓰지 않았으니 대응하는 원본 동작이 없다. 이 부분만 해석적 결정이라고 명시한다.

  테스트 신규: `edit-shape-commands.test.ts`에 복수 갱신 1개 undo 확인 1개, `scene-editor-shapes.test.ts`에 4개(pinch 드래그, center 드래그 폭 유지, half-pair center, composite 클릭 시 양쪽 선택) — 전체 1291/1291 통과.
- **Defined in:** `src/edit/edit-shape-commands.ts`, `src/scene/scene-editor-shapes.ts`, `editor/editor-editing.md` §2·§8, `_plan/build-order.md`, `src/edit/README.md`, `src/scene/README.md`
- **Rationale:** Not required
- **Affects:** edit, scene, spec(editor-editing, build-order) — M5-4 D-2026-100의 Deferred Finding 해소
- **Supersedes:** None
- **Commit:** `1d3a7f4`


### D-2026-102 — M5-5: meta scene(identity·metadata·tempo·timeSignature·asset)

- **Status:** Accepted (구현분) / "새 난이도" 파생·`measureLabelOffset`은 Exit 기준 밖으로 결정 필요 — 아래 참조
- **Decision:** `editor-commands.md` §6의 tempo/timeSignature command 6개(`AddTempo`/`DeleteTempo`/`EditTempo`·`AddTimeSignature`/`DeleteTimeSignature`/`EditTimeSignature`, `edit-meta-commands.ts`)와 편집 폼(`scene-editor-meta.ts`)을 구현해 M5-5 Exit 기준("값 편집이 즉시 timing cache를 재구성한다. music·jacket 교체가 반영된다")을 충족했다.

  **두 편집 경로가 명확히 갈린다**(`editor-commands.md` §6·§7, 이미 확정돼 있던 구분): identity(chartId/difficulty/subtitle/level/chartBy)·metadata 6필드·asset(musicFile/jacketFile)은 command가 아니라 `session.updateChart()` 직접 호출(undo 불가, scope 없음). tempo·timeSignature만 command다(scope `m`, `edit-command.ts`가 이미 알고 있던 필드).

  **direct-edit 경로는 기존 `onDispatch` 자동 새로고침을 못 받는다** — notes/shapes는 command dispatch만 하면 `editorCommandHistory.onDispatch` 구독이 자동으로 `editorWorkspaceHandle.update(chart)`를 불러 주지만, meta의 identity/metadata/asset 편집은 그 구독 경로를 안 거친다. 새 `EditorMetaApi.notifyChanged()` 콜백을 만들어 그 경로 전용으로 `app-main.ts`가 `editorWorkspaceHandle?.update(editorSession!.chart)`를 명시적으로 부르게 했다 — 이게 없으면 meta에서 title을 바꾼 뒤 notes 탭으로 넘어가도 workspace의 `chart` 클로저가 갱신 안 돼 이전 값을 계속 들고 있었을 것이다.

  **timing cache 재구성은 새로 만든 게 없다** — `core-timing.ts`/`edit-command.ts` 둘 다 이미 "캐시도 무효화도 없다, 매번 chart에서 다시 계산" 설계를 헤더에 적어 뒀다. tempo/timeSignature 편집 → command dispatch → 기존 `onDispatch` → `editorWorkspaceHandle.update(chart)` → notes/shapes controller의 `update(chart)`(내부에서 `buildTimeline(next)` 재호출)로 이어지는 이미 있던 경로가 "즉시 재구성"을 그대로 만족한다.

  **asset 교체**는 `env-file.ts`의 `FileOpenHost`(텍스트 전용, chart JSON용)를 재사용하지 않았다 — music/jacket은 바이너리라 다른 표면이 필요했다. 표준 `<input type="file" accept="audio/*|image/*">`를 직접 만들어 클릭을 위임하는 방식을 택했다(파일 선택 자체가 이미 브라우저 네이티브 다이얼로그라 `showOpenFilePicker`류의 File System Access API 표면을 새로 쓸 이유가 없었다 — 그건 저장까지 있는 `Ctrl+S`/`Ctrl+O` 흐름 전용으로 남겨 둔다). 선택 즉시 `session.updateMusicBlob`/`updateJacketBlob`과 `musicFile`/`jacketFile` 필드 갱신을 한 번에 한다(`_meta/persistence.md` §10 "다시 선택한 파일명이 다르면 해당 필드를 새 이름으로 갱신").

  **chartId 자동 규칙**(`editor-graph.md` §4)을 그대로 구현했다: `init` → 0(잠금), subtitle 없는 고정 난이도(Trace/Drift/Surge/Flux/Phase) → 1~5(잠금), 그 외("추가 chart") → 5 이상 직접 입력(미만은 거부, 인라인 에러). **스펙 원문은 예시로 "1/2/3/4"만 들고 Phase(5번 슬롯)를 언급하지 않는데**, `core/data-model.md` §4가 "`chartId 0`은 init, `1~5`는 Trace/Drift/Surge/Flux/Phase 고정 슬롯"이라고 5칸 전부를 못박아 둬서 그 표를 그대로 완성해 구현했다 — 두 문서가 실제로 다른 규칙을 말하는 게 아니라 editor-graph.md 예시가 5번째 칸을 생략한 것으로 판단했다(결정 필요 항목으로 명시).

  **이번 라운드가 범위 밖으로 둔 것(결정 필요 항목)**:
  1. "새 난이도" 파생(같은 songId의 새 독립 chart 세션 시작, `editor-graph.md` §4 "새 chart 파생" · `persistence.md` §8) — session 교체·dirty confirm 흐름까지 엮인 별도 기능이고 M5-5 Exit 기준에 없다.
  2. `measureLabelOffset`(editor-graph.md §4 "editor settings") — chart 데이터가 아니라 player 전역 설정이다(`core/data-model.md` §2, `_meta/settings.md`). `game-settings.ts`의 read/writeSettings 저장소를 따로 물려야 하고, 지금은 그 값을 실제로 읽는 렌더 소비자(notes/shapes 마디 라벨)도 없어 넣지 않았다.
  3. tempo/timeSignature 목록에 정렬·중복 tick 경고 UI는 없다 — 도메인 검증(빈 배열·`timeSignatures[0].startTick≠0` 등)은 `core-validate.ts`가 이미 보고 전용으로 처리하는 자리라 다시 만들지 않았다. 마지막 한 줄 삭제만 이 폼이 막는다(shape의 anchor 삭제 방지와 같은 위치 — command 계층이 아니라 scene 계층).

  테스트 신규: `edit-meta-commands.test.ts` 6개(tempo add/delete/edit, timeSignature add/delete/edit, invalidates), `scene-editor-meta.test.ts` 16개(5섹션 렌더, onKeyDown 항상 false, songId 읽기전용, chartId 자동규칙 3종 + 거부, metadata 즉시반영, tempo add/삭제방지/삭제, timeSignature add, asset music/jacket 교체, destroy/update) — 전체 1313/1313 통과.
- **Defined in:** `src/edit/edit-meta-commands.ts`, `src/scene/scene-editor-meta.ts`, `src/scene/scene-editor-meta.css`, `src/scene/scene-editor-workspace.ts`, `src/app/app-main.ts`, `_plan/build-order.md`, `src/edit/README.md`, `src/scene/README.md`, `src/app/README.md`
- **Rationale:** Not required
- **Affects:** edit, scene, app, spec(build-order) — M5-5 완료(2가지 범위 밖 항목은 결정 필요로 이월)
- **Supersedes:** None
- **Commit:** `58de2d0`


### D-2026-103 — M5-6(부분): engine/session mid-start

- **Status:** Accepted (engine/session 층) / scene 층("current position" 정의 없음)은 Deferred — 아래 참조
- **Decision:** `game-engine.ts`의 `startEngineSession`에 `startChartMs`(기본
  0)·`leadInMs`(기본 `LEAD_IN_MS`) 두 선택 인자를 추가해 0이 아닌 위치에서
  세션을 여는 mid-start를 지원한다([[judge]] §10). chart 시계는 anchor
  이전에도 계속 흐르되(`chartStartMs = startChartMs - leadInMs`, tick-0
  lead-in의 노트 스크롤-in 연출을 그대로 유지하려는 것) 새 `leadIn` phase
  동안 `paused`가 `true`를 돌려줘 호출측이 keydown/keyup만 등록하고 judging을
  시도하지 않게 막는다. `leadInMs=0`이면 첫 프레임에 바로 anchor를 넘어
  test scene의 즉시재생(lead-in 없음, [[editor-graph]] §5)을 그대로 표현한다.
  `pause()`의 가드를 `phase !== 'running'`에서 `phase === 'paused' ||
  phase === 'resuming'` 제외로 일반화해, 새 `leadIn` phase에서도(=mid-start의
  카운트다운 중에도) pause가 그대로 동작하게 했다(그러지 않으면 mid-start
  세션만 lead-in 중 pause 못 하는 회귀가 생긴다).

  `game-session.ts`의 `createGameSession`은 `GameSessionOptions`에
  `startChartMs?`/`leadInMs?`를 더해, `startChartMs !== 0`이면 세션(=engine)을
  열기 전에 동기로 `seedPlayStateAt(judgeState, context, startChartMs)`을 한 번
  불러 그 위치 이전 note를 SYNC로 미리 채우고 반환된 이벤트를 기존
  `applyEvents`로 라우팅한다 — [[judge]] §10이 이미 정한 알고리즘 그대로다.
  둘 다 기존 4-인자/필수-필드 호출과 100% 하위호환(default가 기존 tick-0
  동작과 byte-for-byte 동일 — 기존 94개 game-layer 테스트 무수정 통과로 확인).

  **seek 축 최소 표시 길이**(D-2026-097이 M5-6 전으로 재배치한 gate)도 이번에
  실측으로 닫혔다 — 원본 `conflux-editor`의 `load-chart.js`(25행)
  `Math.max(ES.audioMs || 0, getChartEndMs(), 5000)`: 5000ms 하한, `songEndMs`
  ([[timing]] §9)와 다른 값이다. seek bar UI 자체가 아직 없어 코드 반영은 이후
  라운드로 미룬다.

  **scene 층(test scene 화면)은 이번 라운드에 시작하지 못했다** —
  `editor-graph.md` §5·`editor-editing.md`의 idle/Space/Enter 세 인터랙션
  전부가 "current position"(에디터 재생 커서 위치)을 전제하는데, 그 상태가
  리포에 없다(`scene-editor-view.ts`의 `EditorViewState`는 scroll/zoom만
  있고 playhead 필드가 없다 — notes/shapes 어디에도 이 개념이 없음을 확인).
  값이 어디 살고 무엇이 갱신하며 탭 전환에 유지되는지가 제품 결정이라 추측하지
  않고 결정 필요 항목으로 보고한다. embedded quick options 패널(이미 있는
  `core-quick-options.ts` 재사용)·editor-origin no-record 실제 배선
  (`game-records.ts`의 `NoRecordConditions` 필드는 이미 있다)·gameplay 진입 후
  result 생략하고 편집 화면 복귀([[scene]] §9)는 이 결정이 나면 바로 이어
  붙일 수 있는 상태로 남겨 뒀다.

  테스트 신규: `game-engine.test.ts` +6(leadIn phase, anchor 도달, `leadInMs=0`
  즉시 running, audioStartThreshold, leadIn 중 pause, 기존 tick-0 동작 회귀
  없음), `game-session.test.ts` +4(anchor 이전 seed, `leadInMs=0`, leadIn 중
  입력 무판정, `startChartMs===0` no-op) — 전체 1323/1323 + 신규 10개 포함
  94/94(game 폴더) 통과.
- **Defined in:** `src/game/game-engine.ts`, `src/game/game-session.ts`, `_plan/build-order.md`
- **Rationale:** Not required
- **Affects:** game, spec(build-order) — M5-6 Exit 기준 일부 충족, scene 층은
  "current position" 정의가 결정 필요 항목으로 남아 이월
- **Supersedes:** None
- **Commit:** `388b1f2`


### D-2026-104 — M5-6: test scene 완성 — scrollMs=current position, 새 scrollbar

- **Status:** Accepted
- **Decision:** M5-6의 남은 결정 필요 항목(D-2026-103이 이월한 "current
  position")을 사용자 확인으로 닫고 scene 층을 완성했다.

  **"current position" = 새 상태를 만들지 않고 `EditorViewState.scrollMs`를
  그대로 쓴다.** notes/shapes가 이미 공유하는 필드이고, "지금 타임라인 맨
  아래에 보이는 시각"이 test scene이 필요로 하는 "재생 시작점" 개념과 정확히
  같다. 탭 전환 시 유지도 기존 참조 공유로 공짜로 따라온다.

  **새 draggable scrollbar**(`scene-editor-view.ts`의 `mountEditorScrollbar`)를
  notes/shapes/test 셋 다에 붙였다 — 우측 고정 세로 트랙, `scrollMs`를
  드래그로 seek. **원본 `conflux-editor`에는 대응하는 요소가 없다**
  (`load-chart.js`/`notes-render.js`/`shape-tools.js` 실측 확인) — 완전히
  새 UI다, 기존 CSS 토큰만 재사용했다(`scene-editor-view.css`).
  notes/shapes의 상한은 원래 무제한 위쪽 스크롤 모델이라 고정 총량이 없어
  현재 스크롤 위치까지 동적으로 늘어나는 상한을 썼다(결정 필요 항목으로
  별도 표시) — test scene은 D-2026-097의 5000ms 하한을 고정 상한으로 쓴다.

  **`editor-editing.md`의 "seek bar" 문구는 (a)(위치를 고르는 컨트롤)만
  가리킨다** — idle의 정적 요소 나열(HUD·conflict·quick options와 나란히)로만
  등장하고, 재생 **중** 스크럽을 가리키는 별도 문구는 어디에도 없다. (b) 해석
  (mid-playback pause+jump)은 이 라운드가 만들지 않았다 — 필요하면 별도 결정.
  5000ms 하한은 (a)에만 적용된다.

  **`scene-editor-test.ts`(신규)**: idle static preview(`drawPlayfield`를
  `scrollMs`로 한 번)·embedded quick options 패널(`core-quick-options.ts`,
  song-select overlay와 같은 로직·모달이 아닌 상시 배치)·seek bar·
  Space(idle 전용, `leadInMs=0` mid-start, D-2026-103)·Enter(host에
  `onEnterGameplay(scrollMs)` 위임)·Esc(세션 중단). **Enter 충돌**(quick
  options 확정과 gameplay 진입 모두 Enter) — 패널이 모달이 아니라서 포커스로
  못 가른다, "확정할 미확정 draft가 있을 때만 quick options가 삼킨다"로
  절충(해석적 결정, 파일 헤더에 명시).

  **`scene-gameplay.ts`**에 `startChartMs`/`leadInMs`/`editorOrigin`을 더해
  `GameSessionOptions`로 그대로 흘린다. **`app-main.ts`**의
  `enterGameplayFromEditorTest`가 `editorSession`의 chart/musicBlob/jacketBlob
  으로 `pendingGameplayInput`을 채워 `manager.goScene('gameplay')`(push, 기존
  song-credit의 `'replace'`와 다른 경로 — editor-test가 스택에 남아 있어야
  `goBack()`이 거기로 돌아간다)로 진입한다. `onGameplayFinished`는
  `editorOrigin`이면 result를 건너뛰고 `goBack()`한다([[scene]] §9). 이
  경로에서 `NoRecordConditions.editorOrigin`/`midStart`가 처음 실제 값으로
  채워진다(M3-7이 정의해 둔 필드, 값 판별 로직 자체는 안 건드렸다).

  즉시재생 HUD는 playfield·notes·판정선·key 빔·콤보·카운터/퍼센트만 그린다
  (jacket·sudden cover·text event·hit effect는 Exit 기준 밖으로 남김,
  `scene-editor-test.ts` 헤더).

  테스트 신규: `scene-editor-view.test.ts`(scrollbar mount/update/드래그/
  destroy, 5개), `scene-editor-test.test.ts`(mount·Enter→onEnterGameplay·
  idle Space 가로챔·quick options 확정·destroy·update, 6개) — 전체
  1334/1334 통과.
- **Defined in:** `src/scene/scene-editor-test.ts`, `src/scene/scene-editor-view.ts`,
  `src/scene/scene-editor-notes.ts`, `src/scene/scene-editor-shapes.ts`,
  `src/scene/scene-editor-workspace.ts`, `src/scene/scene-gameplay.ts`,
  `src/app/app-main.ts`, `_plan/build-order.md`
- **Rationale:** Not required
- **Affects:** scene, app, spec(build-order) — M5-6 완료
- **Supersedes:** None
- **Commit:** `4114fb1`


### D-2026-105 — M5-7: text events — 배치·편집·삭제

- **Status:** Accepted (구현분) / 저장 UI 없음은 M5 전체 Exit 기준 결정 필요 항목으로 별도 보고
- **Decision:** `editor-commands.md` §6의 text command 3개(`AddTextEvents`/
  `DeleteTextEvents`/`EditTextEvent`, `edit-text-commands.ts`)와 `scene-editor-
  notes.ts`의 새 `T` 툴로 M5-7 Exit 기준("배치·편집·삭제가 되고 재생 시 정의된
  fade로 표시된다")을 충족했다.

  **배치**: `editor-editing.md` §1 "textEvent 2클릭(시작→끝)" 그대로 tick
  범위를 잡은 뒤, content·position을 원본 `text-events.js`처럼 모달 폼
  (textarea + select)으로 받는다 — `transition`/`mode` 필드는 `data-model.md`
  §8이 이미 폐기해 둬 만들지 않았다.

  **클릭 모델은 원본과 다르게 재해석했다** — 원본은 클릭 자체가 모달을
  연다(`teEdit`)지만, 이 코드베이스는 notes에 이미 "클릭=선택, Shift+클릭=
  토글" 모델을 세워 뒀고 `editor-editing.md` §1 "선택에 textEvents가 포함되면
  함께 복사·붙여넣기"가 text event도 그 선택 모델 안에 있어야 함을 요구한다.
  그래서 클릭은 선택(별도 `textSelection: Set<number>`)만 하고, **더블클릭이
  기존 이벤트의 편집 모달을 연다** — 해석적 결정이라 명시한다.

  **모달이 열린 동안은 이 파일의 단축키를 전부 끈다** — `onKeyDown`이
  `textEditor !== null`이면 `Escape`(취소)만 처리하고 그 외에는 `true`만
  돌려준다(`preventDefault()` 안 함 — workspace의 Tab/Backspace-back만 막고
  textarea 네이티브 입력·Ctrl+C/V 복사는 그대로 통과한다).

  **tick 범위는 배치 시점에 고정, 모달에서 재편집하지 않는다** — 원본
  `teSave`의 시작/끝 measure 입력 재현은 범위 밖(결정 필요 항목)으로 뒀다.

  **delete/copy-paste는 note와 textEvent를 각각 별도 dispatch로 처리한다** —
  한 undo로 합치지 않았다(결정 필요 항목). copy는 note+text 선택을 한
  클립보드에 같이 담아 "함께 복사·붙여넣기" 요구를 만족하되, 실제 배치는
  여전히 두 번의 dispatch(paste가 두 undo 단위)다.

  **재생 시 fade 표시는 이미 M4.5-1이 구현해 뒀다** —
  `render-playfield.ts`의 `computeActiveTextEvents`/`drawTextEvent`
  (`TEXT_FADE_MS`, [[constants]] §6)를 `scene-gameplay.ts`가 이미 호출한다.
  이번 라운드는 그 데이터를 만드는 편집 쪽만 채웠다 — 재생 쪽은 한 줄도
  안 건드렸다.

  **M5 전체 Exit 기준은 이걸로 안 닫힌다** — "저장한 뒤 game에서 플레이할 수
  있다"의 저장 단계가 에디터 UI에 없다. `app-main.ts`의 `saveNewVersion`은
  M5-1부터 `async () => 'cancelled'`(자리표시자, 이미 M5-1 때 결정 필요
  항목으로 보고됨)이고 `.cfx` 내보내기 UI도 없다 — 에디터에서 만든 chart가
  song-select/game library로 넘어가는 경로 자체가 아직 없다. M5-2~M5-7은
  전부 이 경로 없이 단위/통합 테스트만으로 각자의 Exit 기준을 확인할 수 있어
  이번까지 드러나지 않았다.

  테스트 신규: `edit-text-commands.test.ts`(Add/Delete/Edit, scope 검증
  4개), `scene-editor-notes.test.ts` +7(T 키·2클릭+Save·Cancel·모달-열림-중
  단축키 차단·더블클릭 편집+Delete·클릭 선택+D 삭제·Ctrl+C/V 함께 복제) —
  전체 1345/1345 통과.
- **Defined in:** `src/edit/edit-text-commands.ts`, `src/scene/scene-editor-notes.ts`,
  `src/scene/scene-editor-notes.css`, `_plan/build-order.md`, `src/edit/README.md`,
  `src/scene/README.md`
- **Rationale:** Not required
- **Affects:** edit, scene, spec(build-order) — M5-7 완료, M5 전체 Exit는
  저장 UI 부재로 미결(별도 결정 필요 항목)
- **Supersedes:** None
- **Commit:** `97e69d0`


### D-2026-106 — M5-8: chart JSON 저장·`.cfx` 내보내기·library 등록 UI

- **Status:** Accepted
- **Decision:** M5-7이 드러낸 "M5 자체 Exit 기준 미충족"(저장 후 game에서
  플레이하는 경로가 통째로 없음)을 조사해 실제로는 세 개의 분리된 gap이라는
  걸 확인하고 전부 닫았다.

  **조사 결과(구현 전 보고)**: (1) chart JSON 저장(`Ctrl+S`) — `edit-chart-
  save.ts`(M3-2)에 순수 로직만 있고 UI가 없었다. (2) `.cfx` 내보내기 —
  `edit-cfx-package.ts`(M3-4)의 `packageAndSaveCfx`를 부르는 UI가 없었다.
  (3) `.cfx` → library 등록 — `edit-cfx-library.ts`(M3-6)의
  `commitLibraryRegistration`을 부르는 UI가 없었다. `game-song-select.ts`가
  `library` store만 읽으므로 (1)만 닫아도 게임에서 안 보인다 — 세 개
  전부 필요했다. (3)은 binary(`.cfx`) 읽기가 필요한데 `env-file.ts`의
  `FileOpenHost`는 텍스트 전용이었다 — M5-1이 "Open .cfx" 버튼을 disabled로
  남기며 결정 필요 항목(D-2026-062)으로 미뤄 둔 지점과 같다.

  **env-file.ts 확장 설계**(구현 전 별도 보고, 사용자 확인): `saveFile`의
  `contents: string | Uint8Array`처럼 기존 메서드의 파라미터 타입을 넓히는
  방식은 여기 안 맞다고 판단했다 — 그건 호출측이 이미 들고 있는 값을
  넘기는 자리라 union이 자연스럽지만, `pickFile`의 반환값은 **호스트가
  만드는** 값이고 텍스트/binary는 `File.text()` vs `File.arrayBuffer()`로
  아예 다른 읽기 경로다. 그래서 `pickFile`/`open`(단일·텍스트)은 그대로
  두고 `pickFiles`(다중 텍스트)·`pickBinaryFiles`(binary, `multiple` 플래그)
  두 메서드를 `FileOpenHost`에 **선택(optional)**으로 추가했다 — 기존
  호출부(`app-main.ts`의 `jsonOpenHost`, `edit-chart-open.test.ts`) 무변경,
  그 능력이 필요 없는 host는 구현 안 해도 되고 `FileEnv.openMultiple`/
  `openBinary`가 없는 host에 부르면 명시적으로 던진다.

  **(1) chart JSON 저장**: `scene-editor-save.ts`(신규, version 입력·파일명
  표시·Save/Cancel)를 `app-main.ts`가 `proposeSaveVersion`/`saveChartVersion`
  /`suggestChartFileName`(기존 M3-2 로직, 무변경)에 그대로 잇는다. 성공하면
  `WorkspaceSession.updateChart`+`onFileSaveSuccess`로 dirty를 해제한다 —
  이후 Backspace/Esc로 나갈 때 `leaveEditor()`의 `resolveSessionTransition`
  이 `dirty=false`라 확인 없이 바로 나간다(그 확인 다이얼로그 UI 자체는
  M5-1부터 여전히 자리표시자다 — save-then-leave 정상 경로에서는 안 걸려
  이번 라운드가 건드릴 이유가 없었다). `Ctrl+S`는 어느 scene의 `onKeyDown`
  도 거치지 않는 완전히 독립된 `document` 리스너다 — 이 레포는
  `stopPropagation`을 쓰지 않으므로 다른 컨트롤러(예: M5-7의 text 편집
  모달, 열린 동안 자기 단축키를 전부 삼킨다)가 뭘 하든 항상 실행돼
  `editor-editing.md` §6 "text input에 focus가 있어도 Ctrl+S는 예외"를
  구조적으로 만족한다.

  **(2) `.cfx` 내보내기·(3) library 등록**: `editor-start` 화면에 "Package
  .cfx"/"Import .cfx" 버튼 2개를 더했다(`app-main.ts`에 로직, 별도 화면
  없음). Package는 `_meta/cfx.md` §9 "패키징 진입점은 직접 다중 파일 선택
  하나다" 그대로 여러 chart JSON을 골라 `groupBySongId`→`recommendCandidates`
  (동률 충돌은 그 songId 그룹만 건너뜀, 자동 선택 안 함)→참조 asset을
  binary로 별도 선택→`packageAndSaveCfx`로 저장한다. Import는 `.cfx` binary
  하나를 읽어 `validateCfxForImport`(구조+decode 검증)→`planLibraryRegistration`
  (재등록이면 `confirm()`으로 변경 요약 표시, D-2026-018 다운그레이드 허용
  그대로)→`commitLibraryRegistration`.

  **"Package .cfx"는 init(chartId 0) + playable(1개 이상)의 group을
  요구한다**(`validatePackageGroup`) — 한 editor 세션에서 M5-5가 이미 만든
  meta 탭의 difficulty 전환(자동 chartId 규칙)으로 init→Trace처럼 바꿔
  가며 Ctrl+S를 두 번 쓰면 이 조합이 만들어진다. 새 "여러 chart를 한 세션
  안에서 나란히" 편집 UI는 만들지 않았다("새 난이도" 파생은 M5-5가 이미
  범위 밖으로 남겨 둔 별도 기능).

  **버튼 배치는 spec에 안 정해져 있다**(결정 필요 항목) — `_meta/cfx.md`가
  "패키징 화면"이라고만 부르지 위치는 안 정한다. mode-select 항목 목록은
  이미 확정 spec이라 새 항목을 안 넣었고, song-select(더 자연스러울 수
  있는 후보)는 이미 완성된 화면이라 건드리지 않았다 — 이미 파일-흐름
  진입점이 모인 `editor-start`를 재사용했다.

  **M5 자체 Exit 기준이 이걸로 end-to-end 충족된다**(수동 다중 단계) —
  New Chart → 편집 → meta에서 difficulty 전환 + music 연결 → Ctrl+S 두 번
  → Package .cfx → Import .cfx → song-select에서 플레이. 빠진 단계 없음.

  테스트 신규: `env-file.test.ts` +6(`openMultiple`/`openBinary` 성공·취소·
  미구현 host), `scene-editor-save.test.ts` 6개(open 프리필·Save·Cancel·
  showError·close), `scene-editor-start.test.ts` +2(새 버튼 2개 클릭) —
  전체 1359/1359 통과.
- **Defined in:** `src/env/env-file.ts`, `src/scene/scene-editor-save.ts`,
  `src/scene/scene-editor-save.css`, `src/scene/scene-editor-start.ts`,
  `src/app/app-main.ts`, `_plan/build-order.md`, `src/env/README.md`
- **Rationale:** Not required
- **Affects:** env, scene, app, spec(build-order) — M5 전체 Exit 기준 충족
- **Supersedes:** None
- **Commit:** `658f146`


### D-2026-107 — M6-1: 잔여 실측/결정 항목 정리 — credits scene 자동 스캔

- **Status:** Accepted
- **Decision:** 레포 전체 spec의 `- [ ]` 잔여 항목 7개를 조사해 6개는
  이미 이전 milestone에서 구현·확정됐는데 체크박스만 안 뒤집힌 문서
  동기화 누락이었음을 확인하고 정리했다(`editor-graph.md` seek 축 최소
  길이, `core/judge.md` playJudgQueue→표시 연결, `core/lane-events.md`
  init 이동 편집 UI, `_meta/settings.md` key rebinding·volume 슬라이더,
  `core/naming.md` 입력단계 변수명). 각 문서에 확정 근거(구현 파일·기존
  D-번호)를 남기고 체크박스를 옮겼다 — 새 코드 변경 없음, 순수 문서
  동기화다.

  유일하게 실제로 미완이었던 건 `scene/scene.md`의 "credits scene 표시
  내용"이다. `ui-design.md` §2.8.5가 이미 방향을 정해 둔 대로
  `Music`/`Chart`/`Jacket` 세 섹션을 실제로 배선했다 — 새 `game-credits.ts`
  의 `loadCreditsRoleNames`가 library 전체를 스캔해 `musicBy`/`chartBy`/
  `jacketBy`를 필드별로 dedupe한다(song/chart 단위로 안 묶음, §2.8.1).
  `scene-credits.ts`가 `update(roleNames)`를 받아 그 세 섹션을 다시
  그린다 — host(`app-main.ts`)가 song-select의 row 재로딩과 같은 관례로
  매 `onEnter`마다 다시 스캔해 넘긴다. `Project Staff`(수작업 유지 목록)
  는 건드리지 않았다 — 실제 인원 이름은 이 재구현 프로젝트 자체의
  제작진 정보라 소스에서 추출할 수 없다, `scene/scene.md`에 결정 필요
  항목으로 남겼다.

  이 라운드가 새로 내린 결정 셋(§2.8.5가 "여기서 정하지 않는다"고 열어
  둔 자리): (1) 스캔 결과가 빈 섹션은 숨긴다(빈 헤더만 뜨는 것보다
  자연스럽다), (2) 빈 문자열 필드는 목록에서 제외한다, (3) 정렬은
  알파벳순(스펙이 순서를 안 정해 결정적이게 택함).

  테스트 신규: `game-credits.test.ts` 6개(빈 library·필드별 dedupe·같은
  song 안 중복 제거·겸직 각 섹션 등장·여러 song 걸친 정렬·손상 entry
  건너뛰기), `scene-credits.test.ts` 재작성 6개(Project Staff 상시 표시·
  빈 결과 시 섹션 숨김·update() 반영·겸직·재호출 시 교체·Back 키).
- **Defined in:** `src/game/game-credits.ts`, `src/scene/scene-credits.ts`,
  `src/app/app-main.ts`, `editor/editor-graph.md`, `scene/scene.md`,
  `core/judge.md`, `core/naming.md`, `core/lane-events.md`,
  `_meta/settings.md`, `_plan/build-order.md`
- **Rationale:** Not required
- **Affects:** game, scene, app, spec(다수 문서 동기화) — M6-1 사실상 완료
  (credits의 Project Staff 실명만 결정 필요 항목으로 남음)
- **Supersedes:** None
- **Commit:** `e75b008`


### D-2026-108 — M6-2: editor 코드를 동적 import로 분리해 public 번들에서 제거

- **Status:** Accepted
- **Decision:** `FEATURES.editor`로 mode-select 버튼만 가리던 기존 배선은
  번들 제거가 아니었다(editor scene·`edit-*`·`format-cfx-*` 모듈이 전부
  정적 import라 항상 실렸다). editor 전용 코드 전체를 신규
  `src/app/app-editor.ts`로 옮기고, `app-main.ts`의 `boot()`를 `async`로
  바꿔 `FEATURES.editor`가 true일 때만
  `await import('./app-editor.js')`로 불러 `createSceneManager([...])`
  구성 *전에* editor scene들을 완성한다(`Scene.mount()`가 동기라 나중에
  끼워 넣을 수 없어서). `manager`/`pendingGameplayInput`은
  `gotoScene`/`setPendingGameplayInput` 콜백으로 넘긴다(호출 시점엔
  `manager`가 아직 초기화 전이지만, 콜백은 클로저라 실제로 눌릴 때까지
  실행되지 않아 안전하다).

  검증 방법(빌드 산출물 검사, 신뢰 여부를 코드 읽기가 아니라 실측으로
  확인): `npm run build`(public)·`npm run build:internal`을 각각 돌려
  `dist/`를 비교했다. public은 단일 JS 청크만 나오고 internal은 별도
  `app-editor-*.js` 청크(~59KB)가 추가로 나온다 — 그 청크에만 있는 editor
  전용 한국어 문자열(`.cfx import 실패`·`Package .cfx`·`editor-notes` 등,
  함수명은 minify로 안 남지만 문자열 리터럴은 남는다)을 `grep -c`로 셌을
  때 internal에는 있고 public에는 0임을 확인했다.

  `FEATURES.recordReset`은 같은 방식으로 분리하지 않았다 — `onResetRecord`
  핸들러 하나짜리 삼항 분기가 상수 접힘만으로 이미 public 번들에서 완전히
  빠지는 걸 같은 grep 검사로 확인했다(`resetRecord`/관련 문자열 0건) —
  scene 여러 개짜리 형제 축인 editor와 달리 청크 분리가 과한 추상화라
  판단했다(결정 필요 항목으로 보고).
- **Defined in:** `src/app/app-editor.ts`, `src/app/app-main.ts`,
  `src/app/README.md`, `_plan/build-order.md`
- **Rationale:** `_plan/architecture.md` §4
- **Affects:** app — M6-2 완료(editor/recordReset 둘 다 산출물 검사로
  public 번들 부재 확인)
- **Supersedes:** None
- **Commit:** `1d190f6`


### D-2026-109 — M6-3: headless smoke pass 스코프 확정 + `[hidden]` CSS 우선순위 버그 일괄 수정

- **Status:** Accepted
- **Decision:** M6-3("M2~M5의 수동 대조 시나리오를 한 번에 다시 돌려 전부
  통과한다")를 문자 그대로 실행하려면 원본 `conflux-editor`와의 실측 대조·
  실제 사람의 wall-clock 관찰이 필요한데, 이 세션에는 원본 레포도 사람도
  없다(`_meta/manual-qa.md` QA-1~3은 여전히 `(미실시)`, 이 라운드에서도
  바뀌지 않는다 — 원본 대조·실제 오디오/키 입력 타이밍 관찰은 이 환경의
  범위 밖이라는 결정이다). 그래서 M6-3은 다음 둘로 좁혀 실행했다: (1)
  `npm run check`(format/lint/tsc/vitest) 전체 재실행, (2) 미리 설치된
  headless Chromium(Playwright, repo에 `--no-save`로 임시 설치 — 커밋에는
  안 남는다)으로 internal 빌드 산출물을 실제로 클릭해 돌리는 smoke
  walkthrough(title→mode-select→credits→settings→song-select(빈
  library)→editor-start→New Chart→notes/shapes/meta/test 탭→Ctrl+S→
  editor-test의 Enter로 gameplay 진입(mid-start)→Esc pause→Resume→Exit).
  `.cfx` 저장/내보내기/가져오기의 실제 왕복은 headless Chromium이 File
  System Access API(`showOpenFilePicker`/`showSaveFilePicker`)를 지원하지
  않아 이 경로로는 못 돌렸다 — 버튼 클릭 자체가 크래시 없이 graceful
  cancel로 끝나는 것만 확인했다.

  이 smoke pass가 **실제 회귀를 발견했다**: `hidden` attribute는 UA
  stylesheet의 `display: none`을 깔지만, 각 scene·오버레이 CSS가
  `.xxx-scene { display: flex/grid }`를 무조건 선언해(author stylesheet가
  UA보다 우선) `root.hidden = true`여도 계속 렌더링되고 있었다 — scene
  root 8개(`title`·`mode-select`·`editor-start`·`editor-workspace`·
  `settings`·`song-credit`·`song-select`·`result`)와 하위 오버레이 5개
  (editor 저장 모달·gameplay pause overlay·editor text 편집 폼·result
  tier chip·song-select quick options overlay) 전부 같은 버그였다.
  jsdom 기반 vitest는 `.hidden` boolean만 보고 실제 CSS cascade를 안 걸어
  이 버그를 한 번도 못 잡았다(수정 전후 모두 1367/1367 그대로 통과) —
  실제 브라우저 렌더링 확인이 정확히 이런 걸 잡으려고 있다는 걸 이번에
  실증했다. 각 파일에 `<selector>[hidden] { display: none; }`을 추가해
  `[hidden]`을 명시적으로 다시 이겼다(동작 변경 없음 — 원래도 "hidden이면
  안 보여야 한다"는 코드 쪽 의도 그대로 복원하는 수정이라 CLAUDE.md §5의
  "행동을 바꾸지 않는 정적 오류 수정"에 해당한다고 판단해 별도 승인 없이
  바로 고쳤다. gameplay pause overlay가 상시 렌더링되고 있었다는 건 특히
  QA-3(pause/Resume)가 여태 `(미실시)`였던 이유와도 맞물린다 — 사람이
  실제로 봤다면 바로 드러났을 결함이었다).

  `_meta/manual-qa.md`의 QA-1/QA-2/QA-3, 원본과의 실측 대조는 여전히
  열려 있다 — M6-3이 이걸 닫지 않는다. 자동화 계층(golden table·spec
  test·이번 smoke pass)이 커버하지 못하는 마지막 구간으로 그대로
  남긴다(결정 필요 항목 — 실제 브라우저·원본 빌드가 있는 사람이 실행해야
  닫힌다).
- **Defined in:** `src/scene/scene-title.css`, `scene-mode-select.css`,
  `scene-editor-start.css`, `scene-editor-workspace.css`,
  `scene-settings.css`, `scene-song-credit.css`, `scene-song-select.css`,
  `scene-result.css`, `scene-editor-save.css`, `scene-gameplay.css`,
  `scene-editor-notes.css`, `_meta/manual-qa.md`(변경 없음, 확인만),
  `_plan/build-order.md`
- **Rationale:** `_plan/build-order.md` §9 M6-3, `_meta/manual-qa.md`
- **Affects:** scene(CSS 전반) — M6-3의 자동화 가능한 부분 완료, 사람
  QA 항목은 그대로 backlog
- **Supersedes:** None
- **Commit:** `afd9dbf`


### D-2026-110 — M6-4: 스펙↔구현 동기화, 3갈래 위험도 기반 타겟 감사

- **Status:** Accepted
- **Decision:** `DECISION_LOG` 109건 전체를 줄 단위로 재감사하는 대신
  (사용자 확인 하에) 위험도 높은 세 갈래로 좁혀 실행했다: (1) spec
  문서에 남아 있는 `결정 필요 항목` 표기 6곳(`_extracted/
  EXTRACTED_FACTS.md`, `editor/editor-editing.md`, `src/scene/README.md`,
  `src/app/README.md`, `src/core/README.md`, `render/theme.md`)을 각각
  후속 결정으로 이미 닫혔는지 확인, (2) `Defined in`이 `.md` spec
  파일을 하나도 안 가리키는 결정(다단 줄 파싱까지 정확히 해 10건으로
  확정) 각각이 실제로 spec 불변경이 맞는지 확인, (3) `[수정]` 태그가
  붙은 결정 7건의 대상 spec이 실제 수정된 값을 담고 있는지 확인.

  drift 2건을 찾아 고쳤다:
  1. `src/app/README.md`의 M5-1 단락이 "`Open .cfx`는 binary 확장으로도
     못 연다"고 여전히 적혀 있었는데, M5-8(D-2026-106)이 `pickBinaryFiles`
     로 binary read 자체는 이미 닫아(D-2026-062 해소) stale이었다 —
     "binary는 이제 가능하지만 버튼이 disabled인 진짜 이유는 chart-선택
     UI 부재"라는 주석을 추가해 바로잡았다.
  2. `scene/scene.md` §6이 `song-credit → gameplay`의 `replace` 관례만
     명시하고, D-2026-088(M4-5)이 `gameplay → result`에도 같은 관례를
     확장한 것(당시 "스펙이 명시하지 않은 이 세션의 결정"으로 보고만
     되고 spec에는 한 번도 안 실렸다)이 전혀 문서화돼 있지 않았다 —
     `[수정]` 문단을 §6에 추가했다.

  나머지는 전부 이미 정확했다: 열린 `결정 필요 항목` 6곳 중 5곳은
  아직 정당하게 열려 있는 잔여 스코프(원본과 대조 대상이 아니거나
  후속 milestone이 손대지 않은 항목)였고, code-only `Defined in` 10건은
  전부 "이미 있는 spec을 그대로 구현"이라 spec을 바꿀 필요가 애초에
  없던 결정이었으며, `[수정]` 7건 중 나머지 5건은 이미 올바른 spec
  파일이 `Defined in`에 있었다. 스코프 밖(M1~M5의 settled 결정 전체에
  대한 줄 단위 재검증)은 의도적으로 건드리지 않았다 — 사용자가 승인한
  타겟 스코프.
- **Defined in:** `src/app/README.md`, `scene/scene.md` §6,
  `_plan/build-order.md`
- **Rationale:** `_plan/build-order.md` §9 M6-4
- **Affects:** scene(spec), app(README) — M6-4 완료(타겟 스코프 기준)
- **Supersedes:** None
- **Commit:** `e801bd9`


### D-2026-111 — build-order §10 잔여 체크박스 닫음 — 수동 대조 시나리오 구체 목록

- **Status:** Accepted
- **Decision:** `_plan/build-order.md` §10의 마지막 미체크 항목("수동 대조
  시나리오의 구체 목록 — 각 milestone 진입 시 작성")을 닫는다. 별도의
  사전 작성 문서로는 실현되지 않았지만, 그 항목이 요구한 실질("무엇을
  대조할지 구체적으로 정해 둔다")은 각 milestone 자신의 `**Exit**:` 줄이
  그 자리에서 채웠다 — M2(8개 named 시나리오)·M4("gameplay 구간에
  한정"으로 M2 목록 재사용)·M5("편집 조작별 결과 비교", M5-8 보고의
  다단계 경로가 실질적 concrete list 역할). M3은 end-to-end 흐름 자체가
  하나의 시나리오 문장이라 별도 목록이 필요 없었다. "진입 시 작성"이
  아니라 "Exit에 명시"로 실현된 차이는 실행 방식의 차이일 뿐 항목의
  의도는 충족됐다고 판단했다.
- **Defined in:** `_plan/build-order.md` §10
- **Rationale:** Not required
- **Affects:** build-order(spec) — 잔여 항목 정리
- **Supersedes:** None
- **Commit:** PENDING


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
