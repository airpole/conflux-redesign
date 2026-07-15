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

## Entry Template

```md
### D-YYYY-NNN — <Title>

- **Status:** Accepted | Superseded | Deferred
- **Decision:** 한 줄 결정
- **Defined in:** `path/to/spec.md`
- **Rationale:** `path/to/rationale.md` | Not required
- **Affects:** 주요 영역
- **Supersedes:** D-YYYY-NNN | None
- **Commit:** `<sha>`
```

## Maintenance

1. spec 반영과 커밋이 끝난 뒤 항목을 추가한다.
2. 결정 ID는 연도별 일련번호를 사용한다.
3. 번복 시 기존 항목을 삭제하지 않고 `Superseded`로 변경한다.
4. 상세 정의나 장문의 이유를 이 문서에 작성하지 않는다.
5. 최신 spec과 충돌하면 spec을 우선하고 로그를 바로잡는다.
