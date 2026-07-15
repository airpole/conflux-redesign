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

- **Status:** Accepted
- **Decision:** init 우선·최저 playable chart fallback으로 Representative Chart를 정하고 표시 기본값만 제공한다.
- **Defined in:** `_meta/cfx.md`
- **Rationale:** `_rationale/rationale.md`
- **Affects:** package naming, song-select, preview, reimport
- **Supersedes:** init 무언 skip만 정의한 이전 역할
- **Commit:** this commit

### D-2026-004 — Explicit per-chart asset references

- **Status:** Accepted
- **Decision:** chart가 `musicFile`·`jacketFile`을 명시하고 flat `.cfx` root의 전역 파일명 충돌을 검증한다.
- **Defined in:** `core/data-model.md`, `_meta/cfx.md`
- **Rationale:** `_rationale/rationale.md`
- **Affects:** export, workspace, packager, loader
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
