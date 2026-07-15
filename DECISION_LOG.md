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

- **Status:** Deferred
- **Decision:** 같은 chart identity에서 playable content가 바뀔 때의 fingerprint·record key·보존 UX를 후속 records/game-library review로 보류한다.
- **Defined in:** `_meta/records.md`
- **Rationale:** `_rationale/rationale.md`
- **Affects:** records, library
- **Supersedes:** None
- **Commit:** this commit

### D-2026-008 — Downgrade reimport policy

- **Status:** Deferred
- **Decision:** 보유 chart보다 낮은 version의 `.cfx` reimport를 허용할지 거부할지 persistence 후속 review로 보류한다.
- **Defined in:** `_meta/persistence.md`
- **Rationale:** `_rationale/rationale.md`
- **Affects:** library reimport
- **Supersedes:** None
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

- **Status:** Deferred
- **Decision:** 이번 meta-review 지시문은 `.cfx` 내부에 `charts/`+`assets/music`·`assets/jacket` 하위 폴더 구조("권장"으로 표기하면서도 loader 경로는 고정 지정)와, 패키징을 "작업 폴더 하나 선택 후 자동 탐색"으로 시작하는 흐름을 제시한다. 이는 기존 flat ZIP·전역 파일명 유일 결정(D-2026-004)과 user-selected 다중 파일 선택을 기본으로 하는 결정(D-2026-005)과 직접 상충할 수 있어 이번 커밋에서는 해소하지 않았다. flat ZIP 구조와 다중 파일 선택 기본 흐름을 그대로 유지했다.
- **Defined in:** `_meta/cfx.md` §8~§9 (잔여 항목으로 표시)
- **Rationale:** `_rationale/rationale.md`
- **Affects:** `.cfx` packaging structure, packaging entry UX
- **Supersedes:** None (pending)
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
