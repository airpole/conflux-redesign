# Conflux 외부 검토 DOSSIER

> **기계 생성물이다.** `node tools/review/dossier.mjs` 로 다시 만들 수 있다.
> 손으로 고치지 마라 — 다음 생성에서 지워진다.

| | |
|---|---|
| 기준 커밋 | `6f4214e79ada390aedb5b3ab17bf1de90db6c15c` |
| 브랜치 | `claude/astra-6-code-review-orchestration-rnhyvm` |
| raw base | `https://raw.githubusercontent.com/airpole/conflux-redesign/claude/astra-6-code-review-orchestration-rnhyvm` |
| 생성 시각 | 2026-09-05T05:27:34.297Z |

원문이 필요하면 **raw base + `/` + 파일 경로**로 URL 을 만들어 직접 fetch 해라.
예: `https://raw.githubusercontent.com/airpole/conflux-redesign/claude/astra-6-code-review-orchestration-rnhyvm/core/timing.md`

## 이 문서의 성격

요약이 아니라 **색인**이다. 판단이 개입한 압축을 거치지 않았다 — 필드 추출, 헤딩 수집,
시그니처 수집, grep 뿐이다. 그래서 여기 없는 것은 "중요하지 않다고 판단된 것"이 아니라
**원문에만 있는 것**이다.

원문 전체는 문서 949.4KB + 구현 706.1KB 라 한 번에 넣을 수 없다.
색인으로 볼 자리를 좁힌 뒤 **필요한 파일만 raw URL 로 가져가라.**
색인만으로 단정할 수 없는 자리는 단정하지 말고, 어떤 파일이 필요한지 지목해라.

곁가지 색인 두 개가 따로 있다. 필요할 때 fetch 해라.

- `https://raw.githubusercontent.com/airpole/conflux-redesign/claude/astra-6-code-review-orchestration-rnhyvm/_review/INDEX-SPEC.md` — 문서 헤딩 트리 (정의가 어디 사는지)
- `https://raw.githubusercontent.com/airpole/conflux-redesign/claude/astra-6-code-review-orchestration-rnhyvm/_review/INDEX-CODE.md` — 구현 export 시그니처·테스트 인벤토리

## 목차

1. 파일 인벤토리
2. DECISION_LOG 색인
3. 레이어 import 매트릭스
4. 미해결 표지 grep
5. 전문 — `tests/golden/DIVERGENCES.md`
6. 전문 — `tools/audit/MUTATION_EQUIVALENTS.md`
7. 전문 — `core/constants.md`

---

## 1. 파일 인벤토리

### 1.1 문서 43개 — 949.4KB

| 파일 | 줄 | 크기 |
|---|---:|---:|
| `CLAUDE.md` | 160 | 5.7KB |
| `DECISION_LOG.md` | 2617 | 271.3KB |
| `DESIGN_PRINCIPLES.md` | 86 | 3.3KB |
| `PROJECT-OPERATING-GUIDELINE.md` | 416 | 12.0KB |
| `README.md` | 510 | 52.6KB |
| `REVIEW_CHECKLIST.md` | 112 | 4.5KB |
| `_extracted/EXTRACTED_FACTS.md` | 569 | 30.3KB |
| `_extracted/timing-verification.md` | 58 | 3.5KB |
| `_meta/cfx.md` | 288 | 12.3KB |
| `_meta/manual-qa.md` | 143 | 9.6KB |
| `_meta/persistence.md` | 343 | 13.5KB |
| `_meta/records.md` | 110 | 5.6KB |
| `_meta/settings.md` | 177 | 8.9KB |
| `_plan/architecture.md` | 200 | 14.6KB |
| `_plan/build-order.md` | 713 | 63.5KB |
| `_rationale/rationale.md` | 748 | 67.6KB |
| `core/constants.md` | 129 | 6.4KB |
| `core/data-model.md` | 317 | 16.1KB |
| `core/gauge.md` | 141 | 11.2KB |
| `core/glossary.md` | 180 | 7.8KB |
| `core/judge.md` | 367 | 20.7KB |
| `core/lane-events.md` | 118 | 9.7KB |
| `core/naming.md` | 363 | 28.7KB |
| `core/shape.md` | 182 | 11.7KB |
| `core/timing.md` | 178 | 6.7KB |
| `editor/editor-commands.md` | 87 | 3.6KB |
| `editor/editor-editing.md` | 185 | 22.4KB |
| `editor/editor-graph.md` | 109 | 5.6KB |
| `render/theme.md` | 238 | 12.8KB |
| `scene/scene.md` | 253 | 13.0KB |
| `scene/song-select.md` | 295 | 12.3KB |
| `scene/ui-design.md` | 1288 | 75.6KB |
| `src/app/README.md` | 188 | 13.4KB |
| `src/core/README.md` | 88 | 6.1KB |
| `src/edit/README.md` | 140 | 10.0KB |
| `src/env/README.md` | 63 | 4.4KB |
| `src/format/README.md` | 58 | 3.7KB |
| `src/game/README.md` | 148 | 10.1KB |
| `src/render/README.md` | 41 | 2.5KB |
| `src/scene/README.md` | 302 | 22.3KB |
| `tests/golden/DIVERGENCES.md` | 395 | 27.1KB |
| `tools/audit/MUTATION_EQUIVALENTS.md` | 29 | 3.0KB |
| `tools/golden/README.md` | 74 | 3.5KB |

### 1.2 그 밖

| 묶음 | 파일 수 | 크기 | 목록 |
|---|---:|---:|---|
| 구현 (`src/**/*.ts`, 테스트 제외) | 74 | 706.1KB | `INDEX-CODE.md` §1 |
| 단위 테스트 (`*.test.ts`) | 72 | 621.8KB | `INDEX-CODE.md` §2 |
| 골든·지원 (`tests/**`) | 11 | 492.4KB | `INDEX-CODE.md` §3 |

---

## 2. DECISION_LOG 색인 (129건)

원문에서 `Decision` 본문과 `Rationale`·`Commit` 을 뺀 필드만 뽑았다. 본문은 `DECISION_LOG.md` 의 해당 줄.
문서 끝 `D-YYYY-NNN` 은 서식 템플릿이라 제외했다.

### 2.1 Status 분포

- **Accepted** 117건 — D-2026-001, D-2026-002, D-2026-004, D-2026-005, D-2026-006, D-2026-009, D-2026-010, D-2026-011, D-2026-012, D-2026-013, D-2026-014, D-2026-015, D-2026-016, D-2026-017, D-2026-018, D-2026-020, D-2026-022, D-2026-023, D-2026-024, D-2026-025, D-2026-026, D-2026-027, D-2026-028, D-2026-029, D-2026-030, D-2026-031, D-2026-032, D-2026-033, D-2026-034, D-2026-035, D-2026-036, D-2026-037, D-2026-038, D-2026-039, D-2026-040, D-2026-041, D-2026-042, D-2026-044, D-2026-043, D-2026-045, D-2026-046, D-2026-047, D-2026-048, D-2026-049, D-2026-050, D-2026-051, D-2026-053, D-2026-054, D-2026-055, D-2026-056, D-2026-057, D-2026-058, D-2026-059, D-2026-060, D-2026-061, D-2026-062, D-2026-063, D-2026-064, D-2026-065, D-2026-066, D-2026-067, D-2026-068, D-2026-070, D-2026-071, D-2026-072, D-2026-073, D-2026-074, D-2026-075, D-2026-076, D-2026-077, D-2026-078, D-2026-079, D-2026-080, D-2026-081, D-2026-082, D-2026-083, D-2026-085, D-2026-087, D-2026-089, D-2026-090, D-2026-091, D-2026-092, D-2026-093, D-2026-094, D-2026-095, D-2026-096, D-2026-097, D-2026-098, D-2026-099, D-2026-100, D-2026-101, D-2026-102, D-2026-104, D-2026-105, D-2026-106, D-2026-107, D-2026-108, D-2026-109, D-2026-110, D-2026-111, D-2026-112, D-2026-113, D-2026-114, D-2026-115, D-2026-116, D-2026-117, D-2026-118, D-2026-119, D-2026-120, D-2026-121, D-2026-122, D-2026-123, D-2026-124, D-2026-125, D-2026-126, D-2026-127, D-2026-129
- **Superseded** 6건 — D-2026-003, D-2026-007, D-2026-008, D-2026-021, D-2026-052, D-2026-069
- **Deferred 포함** 6건 — D-2026-019, D-2026-084, D-2026-086, D-2026-088, D-2026-103, D-2026-128

### 2.2 기계 점검 — Supersedes 역참조 불일치 후보

다른 결정이 `Supersedes` 로 지목했는데 정작 본인 Status 가 `Superseded` 가 아닌 항목이다.

**부분 대체는 정상이다** — 한 결정의 일부만 갈아치웠다면 대상은 Accepted 로 남는 게 맞다.
그래서 이건 결함 목록이 아니라 **판정 대기 후보**다. 지목 문구를 함께 실었으니 전체/부분 여부를 직접 판정해라.

| 대상 | 대상 Status | 지목한 결정 | 지목 문구 (Supersedes) |
|---|---|---|---|
| D-2026-067 | Accepted (팔로업 기록 — M3-7·M3 milestone 완료와 무관, 블로킹 아님) | D-2026-069 | D-2026-067 (항목 1만 — 항목 2·3은 그대로 유지) |
| D-2026-092 | Accepted (구현분) / 오버레이 픽셀 배치는 결정 필요 — 아래 참조 | D-2026-093 | D-2026-092의 discard-on-close 잠정 결정(닫기가 이제 confirm) — 배치·클릭 컴포넌트는 확장이지 번복이 아니다 |

> 이 점검은 Status 필드만 본다. **대체된 정의가 spec 본문에 아직 살아있는지는 확인하지 않는다** — 그 대조가 검토자의 몫이다.

### 2.3 전체 표

`L` 은 `DECISION_LOG.md` 의 줄 번호다.

| ID | L | 제목 | Status | Defined in | Affects | Supersedes | Superseded by |
|---|---|---|---|---|---|---|---|
| D-2026-001 | L24 | Independent chart ownership | Accepted | `core/data-model.md`, `_meta/cfx.md` | data model, editor, package, … | 이전 `song ⊃ chart[]` 및 s… | — |
| D-2026-002 | L34 | Derived song group | Accepted | `core/data-model.md`, `_meta/cfx.md` | library, song-select, package | persisted song container | — |
| D-2026-003 | L44 | Representative Chart | Superseded | `_meta/cfx.md` | package naming, song-select, … | init 무언 skip만 정의한 이전 역할 | D-2026-013 |
| D-2026-004 | L55 | Explicit per-chart asset references | Accepted | `core/data-model.md`, `_meta/cfx.md` | save, workspace, packager, lo… | suffix-based implicit p… | — |
| D-2026-005 | L65 | User-selected packager input | Accepted | `_meta/cfx.md`, `_meta/persistence.md` | editor packaging UX | work-folder inference 중… | — |
| D-2026-006 | L75 | Remove automatic record migration | Accepted | `_meta/records.md`, `_meta/persistence.… | reimport, records | four-array rename detec… | — |
| D-2026-007 | L85 | Modified-chart record linkage | Superseded | `_meta/records.md` | records, library | None | D-2026-017 |
| D-2026-008 | L96 | Downgrade reimport policy | Superseded | `_meta/persistence.md` | library reimport | None | D-2026-018 |
| D-2026-009 | L107 | Version-gated chart save | Accepted | `_meta/persistence.md`, `core/data-mode… | editor save UX, chart version… | Ctrl+S=workspace 즉시 저장 | — |
| D-2026-010 | L117 | Remove Ctrl+E / derive / duplicate-… | Accepted | `_meta/persistence.md`, `_meta/cfx.md`,… | editor shortcuts, new-song cr… | Ctrl+E=chart export, Ct… | — |
| D-2026-011 | L127 | Workspace as dirty-only recovery sl… | Accepted | `_meta/persistence.md` | workspace autosave, session r… | workspace=마지막 작업 chart … | — |
| D-2026-012 | L137 | Session-switch dirty confirm | Accepted | `_meta/persistence.md` | editor session switching, his… | None | — |
| D-2026-013 | L147 | init required for `.cfx` packaging | Accepted | `_meta/cfx.md` | packaging validation, Represe… | D-2026-003 | — |
| D-2026-014 | L157 | `.cfx` filename includes version | Accepted | `_meta/cfx.md` | packaging output naming | `.cfx` 파일명에 version 없음 | — |
| D-2026-015 | L167 | New-difficulty Start Blank / Use Cu… | Accepted | `_meta/persistence.md`, `editor/editor-… | new-difficulty creation UX | 단순 "시작값 복사 가능"만 정의한 이전 … | — |
| D-2026-016 | L177 | `.cfx` internal ZIP layout vs. pack… | Accepted | `_meta/cfx.md` §8~§9 | `.cfx` packaging structure, p… | None (D-2026-004·005 확정… | — |
| D-2026-017 | L187 | Records follow chart identity; manu… | Accepted | `_meta/records.md` §1·§4, `scene/scene.… | records, song-select, build g… | D-2026-007 | — |
| D-2026-018 | L197 | Downgrade-inclusive reimport allowe… | Accepted | `_meta/persistence.md` §12 | library reimport | D-2026-008 | — |
| D-2026-019 | L207 | Server-backed records | Deferred | `_meta/records.md` (범위 한정 머리말) | records (미래) | None | — |
| D-2026-020 | L217 | Scene remainder resolution | Accepted | `scene/scene.md` §3·§6·§7·§10, `core/co… | scene graph, settings UI, con… | None | — |
| D-2026-021 | L227 | Live web distribution & `.cfx` prot… | Superseded by D-2026-059 | `_meta/persistence.md` §12 (보류 각주) | game-public 곡 공급, `.cfx` 포맷 보… | None (pending) | — |
| D-2026-022 | L237 | Walkthrough resolutions: pause resu… | Accepted | `scene/scene.md` §9, `_meta/settings.md… | pause UX, no-record gate, qui… | None | — |
| D-2026-023 | L247 | Counter-inquiry pass: editor intera… | Accepted | `editor/editor-editing.md` §2, `core/co… | editor interaction spec, cons… | None | — |
| D-2026-024 | L257 | Key-demand judgment and global inpu… | Accepted | `core/judge.md`, `core/data-model.md`, … | judgment, runtime play state,… | None (replaces prior un… | — |
| D-2026-025 | L270 | song-select 3축 목록 모델 | Accepted | `scene/song-select.md` | scene, records, persistence, … | None | — |
| D-2026-026 | L280 | records 스키마를 판정 분포 기반으로 전환 | Accepted | `_meta/records.md` | records, song-select, result | None | — |
| D-2026-027 | L290 | chartId 5 = Phase 고정 슬롯 | Accepted | `_meta/cfx.md` §4 | cfx, data-model, song-select | None | — |
| D-2026-028 | L300 | viewState store 신설 | Accepted | `_meta/persistence.md` §1 | persistence, song-select, set… | None | — |
| D-2026-029 | L310 | 스펙 공백 7건 일괄 확정 | Accepted | `scene/song-select.md`, `scene/scene.md… | scene, editor, persistence, c… | None | — |
| D-2026-030 | L320 | 곡 종료 시각 정의 | Accepted | `core/timing.md` §9, `core/constants.md… | timing, constants, scene, arc… | None | — |
| D-2026-031 | L330 | updatedAt 신설과 lane 매핑 승격 | Accepted | `core/data-model.md` §1·§4, `_meta/sett… | data-model, settings, judge, … | None | — |
| D-2026-032 | L340 | build-order 신설과 M3/M4 순서 반전 | Accepted | `_plan/build-order.md` | build-order, architecture, sh… | None | — |
| D-2026-033 | L350 | M1 진입 gate 해소 | Accepted | `_plan/architecture.md` §1·§4, `_plan/b… | architecture, build-order, RE… | None (구 `config.js`의 "코… | — |
| D-2026-034 | L360 | 골든 하네스와 M1 실측 gate | Accepted | `tools/golden/README.md`, `_plan/build-… | build-order, README, tools/go… | None | — |
| D-2026-035 | L370 | 설계 대장과 골든의 역할 | Accepted | `tests/golden/DIVERGENCES.md`, `_plan/b… | build-order, tools/golden, te… | None | — |
| D-2026-036 | L380 | chart 검증 2층과 settings 기본값 | Accepted | `core/data-model.md` §11, `_meta/settin… | data-model, settings, build-o… | None | — |
| D-2026-037 | L390 | timing API 형태와 격자 축 | Accepted | `core/timing.md` §2·§4·§5·§6·§10, `core… | timing, constants, glossary, … | None | — |
| D-2026-038 | L400 | judge 기본 구현 형태, 명칭 대응표 가드, JD-1 재분류 | Accepted | `core/judge.md` §1·§2, `core/constants.… | judge, constants, naming, set… | None | — |
| D-2026-039 | L410 | Hold 소유 구현, tail release 임계 정정, `na… | Accepted | `core/judge.md` §4·§5·§7·§9·§13, `core/… | judge, constants, naming, rat… | None (D-2026-024의 tail … | — |
| D-2026-040 | L420 | 중간 시작 시드, 카운트다운 등록 진입점, global conf… | Accepted | `core/judge.md` §9·§10·§13, `core/namin… | judge, naming, build-order, t… | None (D-2026-024가 정한 `j… | — |
| D-2026-041 | L431 | state는 성적이 정한다, tier 사다리, 단일 누산기 | Accepted | `core/gauge.md` (전면), `core/naming.md` … | gauge, naming, data-model, gl… | None (`gauge` §2의 "성공 시… | — |
| D-2026-042 | L443 | 겹침 검출: 활성은 점으로 정의하고, conflict가 표시를 … | Accepted | `core/data-model.md` §5.1, `core/naming… | data-model, naming, tests/gol… | None (`data-model` §5.1… | — |
| D-2026-044 | L455 | 미커버 가드와 결과 산출 골든 | Accepted | `core/gauge.md` §3, `tests/golden/DIVER… | gauge, tests/golden, tests/su… | None (대장 GA-3 관계 표기와 GA… | — |
| D-2026-043 | L467 | 체인 보간과 anchor 정의, 골든 shape 재추출 | Accepted | `core/shape.md` §4·§5·§8, `core/lane-ev… | shape, lane-events, naming, t… | None (`shape` §4 anchor… | — |
| D-2026-045 | L479 | 표기 폴백 + TM-11 + 검토 결정 반영 | Accepted | `core/timing.md` §1·§4·§5, `core/data-m… | timing, data-model, tests/gol… | None (`timing` §5의 근사 표… | — |
| D-2026-046 | L490 | M2 진입 실측 gate를 M2-2 전으로 분리 | Accepted | `_plan/build-order.md` §2·§3·§5 | _plan | None (build-order §2·§3… | — |
| D-2026-047 | L501 | M2-1 검증 전략 = mock 계약 검사 | Accepted | `_plan/build-order.md` §1 | _plan, src/env (검증 방법론만 — 구현은… | None | — |
| D-2026-048 | L512 | lane 최소 간격 제한 없음 | Accepted | `core/lane-events.md` §3·§4·§7, `_plan/… | lane-events, _plan, _extracted | None (lane-events §3의 "… | — |
| D-2026-049 | L523 | quick options 패널 내부 조작 | Accepted | `src/core/core-quick-options.ts`, `scen… | scene, _plan, src/core | None | — |
| D-2026-050 | L534 | 히트음 계승(절차적 합성), autoplay는 즉시 재생으로 단… | Accepted | `src/env/env-audio.ts`, `src/game/game-… | src/env, src/game, _plan | None | — |
| D-2026-051 | L545 | ui-design 최소본 확정(토큰 + result 레이아웃) | Accepted | `scene/ui-design.md`, `_plan/build-orde… | scene, render, _plan | None (D-2026-051 초안을 대체… | — |
| D-2026-052 | L556 | ESC 전체화면 충돌 대체키, result Retry = Spa… | Superseded (D-2026-053 — result의 Retry/Back 키 배정만 정… | `scene/scene.md` §9, `scene/ui-design.m… | scene | None (scene.md의 Esc-onl… | — |
| D-2026-053 | L567 | result Back/Retry 키 정정: Back = Back… | Accepted | `scene/scene.md` §9, `scene/ui-design.m… | scene | D-2026-052 (result의 Ret… | — |
| D-2026-054 | L580 | result 데이터 필드 5종 확정: gaugeTrace·pro… | Accepted | `scene/ui-design.md` §6, `scene/scene.m… | scene, core(`PlayResult.tier`… | None (ui-design.md §6 8… | — |
| D-2026-055 | L596 | 티어 색(SURGE) 대 실패 적색 근접 [수용], M2-6 전… | Accepted | `scene/ui-design.md` §7-3 | scene | None | — |
| D-2026-056 | L612 | ui-design.md 표기 누락 2건 확정: AP 풀네임, r… | Accepted | `scene/ui-design.md` §1.6, §2.1 | scene | None (누락 보완이지 번복 아님) | — |
| D-2026-057 | L627 | M2-7에서 로딩 표시를 분리, 별도 미배정 단위로 | Accepted | `_plan/build-order.md` §5, `README.md` … | _plan, scene | None (M2-7 범위를 좁히는 것이지 … | — |
| D-2026-058 | L640 | M2 Exit 충족 판정: 3종 실측 대조 + 2종 의도된 편차… | Accepted | `_plan/build-order.md` §5, `_meta/manua… | _plan, _meta | None | — |
| D-2026-059 | L656 | D-2026-021 해소: bundled 배포·평문 `.cfx`… | Accepted | `_meta/persistence.md` §12, `_meta/reco… | _plan, _meta(persistence, rec… | D-2026-021 | — |
| D-2026-060 | L672 | 라이선스 서드파티 트랙 추출 가능성: 후속 팔로업 (블로킹 아님) | Accepted (팔로업 기록 — M3 진입과 무관, 블로킹 아님) | `_meta/persistence.md` §12(각주), `README… | _meta(persistence 곡 공급 정책), 아… | None | — |
| D-2026-061 | L687 | M3-1 쓰기 실패 UI 배선·IndexedDB 마이그레이션 정… | Accepted (팔로업 기록 — M3-1 완료와 무관, 블로킹 아님) | `src/env/env-storage.ts`, `_plan/build-… | env(env-storage), 향후 M3-2/M3-… | None | — |
| D-2026-062 | L703 | M3-2 첫 저장 version 고정, `env-file` 브라… | Accepted (팔로업 기록 — M3-2 완료와 무관, 블로킹 아님) | `src/edit/edit-chart-save.ts`, `src/env… | edit(edit-chart-save), env(en… | None | — |
| D-2026-063 | L719 | M3-3 복구 세션의 autosave 재개 시점, asset 재… | Accepted (팔로업 기록 — M3-3 완료와 무관, 블로킹 아님) | `src/edit/edit-workspace.ts`, `_plan/bu… | edit(edit-workspace), 향후 M5(에… | None | — |
| D-2026-064 | L735 | M3-4 `.cfx` ZIP 무압축(store), 폴더 스캔 p… | Accepted (팔로업 기록 — M3-4 완료와 무관, 블로킹 아님) | `src/env/env-file.ts`(`createZipArchive… | env(env-file), edit(edit-cfx-… | None | — |
| D-2026-065 | L751 | M3-5 chart JSON/asset 구별 기준(`.json`… | Accepted (팔로업 기록 — M3-5 완료와 무관, 블로킹 아님) | `src/edit/edit-cfx-load.ts`, `_plan/bui… | edit(edit-cfx-load), 향후 M3-6(… | None | — |
| D-2026-066 | L767 | M3-6 jacket 이미지 decode host 부재, rec… | Accepted (팔로업 기록 — M3-6 완료와 무관, 블로킹 아님) | `src/edit/edit-cfx-library.ts`, `_plan/… | edit(edit-cfx-library), 향후 M3… | None | — |
| D-2026-067 | L784 | M3-7 "이번 판의 파생 score" 자기완결 해석, game… | Accepted (팔로업 기록 — M3-7·M3 milestone 완료와 무관, 블로킹 아님) | `src/core/core-records.ts`, `src/game/g… | core(core-records), game(game… | None | — |
| D-2026-068 | L801 | M3 milestone Exit 충족 판정: 헤드리스 통합 테스… | Accepted | `_plan/build-order.md` §6, `tests/integ… | _plan, tests(integration) | None | — |
| D-2026-069 | L816 | "이번 판의 파생 score" 비교 확정: 비대칭(실제 scor… | Superseded by D-2026-070 — 이 결정이 "별도 보고"로 남긴 잔여 약점을… | `src/core/core-records.ts`, `src/game/g… | core(core-records), game(game… | D-2026-067 (항목 1만 — 항목 … | — |
| D-2026-070 | L844 | 자기완결 score 근사 폐기: `ChartRecord`에 `t… | Accepted — D-2026-069가 "별도 보고"로 남긴 잔여 약점을 근본 해결한다(D… | `src/core/core-records.ts`, `src/game/g… | core(core-records), game(game… | D-2026-069 | — |
| D-2026-071 | L863 | M3.5 milestone 신설: ui-design 전체(son… | Accepted | `_plan/build-order.md` §6.5·§2(M4 진입 ga… | _plan | None | — |
| D-2026-072 | L878 | M3.5-1 곡 선택 레이아웃 확정: `ui-design.md`… | Accepted | `scene/ui-design.md` §2.5 | scene | None | — |
| D-2026-073 | L897 | 빈 library 레이아웃 불필요: `game-public`은 … | Accepted | `scene/ui-design.md` §2.5.3·§2.5.7-2 | scene | None | — |
| D-2026-074 | L910 | M3.5-2 settings scene 구조 수정: GAUGE를… | Accepted | `scene/scene.md` §3·§11, `_meta/setting… | scene, settings UI 구조 (M3.5-2… | None | — |
| D-2026-075 | L925 | M3.5-2 SOUND scene 신설: volMaster/vo… | Accepted | `_meta/settings.md` §2·§5, `scene/scene… | settings 구조, settings UI (M3.… | None | — |
| D-2026-076 | L940 | M3.5-2 settings 레이아웃 확정: `ui-design… | Accepted | `scene/ui-design.md` §2.6 | scene | None | — |
| D-2026-077 | L957 | UI 텍스트 i18n 방침 채택: 공용 영어 vs 실제 번역, … | Accepted | `src/core/core-i18n.ts`, `scene/ui-desi… | scene, core (신규 모듈), 향후 모든 UI… | None — D-2026-072·D-202… | — |
| D-2026-078 | L983 | title 입력 규칙 명확화: 키보드 아무 키 OR 마우스 클릭… | Accepted | `scene/scene.md` §3 | scene (title 입력 처리) | None | — |
| D-2026-079 | L996 | M3.5-3 title 레이아웃 확정: `ui-design.md… | Accepted | `scene/ui-design.md` §2.7 | scene | None | — |
| D-2026-080 | L1013 | M3.5-4 credits 레이아웃 골격 확정: `ui-desi… | Accepted | `scene/ui-design.md` §2.8, `_plan/build… | scene, _plan (M4 진입 gate 충족) | None | — |
| D-2026-081 | L1038 | M4-1 scene-manager: 단일 스택 엔진, FEATU… | Accepted | `src/scene/scene-manager.ts` | scene (신규 모듈), app (향후 M4-2 배… | None | — |
| D-2026-082 | L1059 | mode-select 레이아웃 확정: `ui-design.md`… | Accepted | `scene/ui-design.md` §2.9 | scene | None | — |
| D-2026-083 | L1078 | M4-2: title/mode-select/credits sce… | Accepted | `src/scene/scene-title.ts`, `src/scene/… | scene, app, ui-design(§2.8.4 … | None | — |
| D-2026-084 | L1099 | M4-3: song-select 목록 모델·렌더 구현, grou… | Accepted (구현분) / 하위 두 항목은 Deferred — 아래 참조 | `src/core/core-song-select.ts`, `src/sc… | core, scene, 향후 game/edit 레이어… | None | — |
| D-2026-085 | L1116 | `format` 레이어 신설: `.cfx`/chart JSON … | Accepted | `_plan/architecture.md` §1·§1.1, `core/… | _plan(레이어 모델), core/naming, f… | None — D-2026-084의 "결정 … | — |
| D-2026-086 | L1145 | M4-4: song-select 커서·검색·preview·vie… | Accepted (구현분) / 하위 항목들은 Deferred — 아래 참조 | `src/core/core-song-select.ts`, `src/ga… | core, game, scene, app — M4-4… | None | — |
| D-2026-087 | L1172 | M4-4 후속: folder 아코디언·PageUp/PageDow… | Accepted | `src/core/core-song-select.ts`, `src/sc… | core, scene, app | None — D-2026-086의 Defe… | — |
| D-2026-088 | L1193 | M4-5: song-credit + gameplay 진입 결선 | Accepted (구현분) / 하위 항목들은 Deferred·결정 필요 — 아래 참조 | `src/scene/scene-song-credit.ts`, `src/… | scene, game, env, app — M4-5 … | None | — |
| D-2026-089 | L1220 | `pauseOnBlur` 설정 신설, M2-7의 "blur는 p… | Accepted | `src/core/core-settings.ts`, `src/game/… | core, game, scene, scene(spec… | M2-7의 "blur는 pause 대상이 … | — |
| D-2026-090 | L1245 | M4.5-1: gameplay HUD 완성 — jacket·ke… | Accepted | `src/render/render-theme.ts`, `src/rend… | render, game, scene, app, the… | None | — |
| D-2026-091 | L1272 | M4-6: settings 4 scene + key rebind… | Accepted (구현분) / 하위 항목들은 결정 필요 — 아래 참조 | `src/scene/scene-settings.ts`, `src/sce… | scene, core, game, app — M4-6… | None | — |
| D-2026-092 | L1295 | M4-7: quick options 오버레이 배치 + no-re… | Accepted (구현분) / 오버레이 픽셀 배치는 결정 필요 — 아래 참조 | `src/scene/scene-song-select.ts`, `src/… | scene, app — M4-7 완료 | None | — |
| D-2026-093 | L1318 | M4.6: quick options 오버레이 레이아웃 확정, D… | Accepted | `scene/ui-design.md` §2.5.8, `src/scene… | scene, ui-design(spec) — M4.6… | D-2026-092의 discard-on-… | — |
| D-2026-094 | L1341 | M5-1: editor graph + start scene + … | Accepted (구현분) / `.cfx` 열기·저장 창 UI는 결정 필요 항목 — 아래 참조 | `src/scene/scene-editor-start.ts`, `src… | scene, edit, app, build-order… | None | — |
| D-2026-095 | L1369 | M5-2: command/history 엔진 | Accepted | `src/edit/edit-command.ts`, `src/app/ap… | edit, app — M5-2 완료(구체 comman… | None | — |
| D-2026-096 | L1394 | M5-3 前 게이트 해소: note 히트 반경·드래그 임계값 원… | Accepted | `_extracted/EXTRACTED_FACTS.md` §13, `e… | editor-editing(spec), build-o… | None | — |
| D-2026-097 | L1409 | M5-3: notes scene 편집 interaction | Accepted (구현분) / `viewMs` 여전히 결정 필요, 아래 단순화 항목들도 결정… | `src/edit/edit-notes-commands.ts`, `src… | edit, scene, core, app — M5-3… | None | — |
| D-2026-098 | L1440 | `viewMs` 기본값·zoom 범위 파생, Z/X 줌 배선 | Accepted | `src/scene/scene-editor-notes.ts`, `_ex… | scene, spec(editor-editing, e… | None | — |
| D-2026-099 | L1461 | M5-4: shapes scene(shape/lane 서브모드)… | Accepted (구현분) / 아래 단순화 항목들은 결정 필요 — 아래 참조 | `src/edit/edit-shape-commands.ts`, `src… | edit, scene, app, spec(shape,… | None | — |
| D-2026-100 | L1493 | M5-4 후속: shape/lane 기존 점 드래그 재배치 | Accepted (구현분) / composite dot(center/pinch) 드래그·sy… | `src/edit/edit-shape-commands.ts`, `src… | edit, scene, spec(editor-edit… | None | — |
| D-2026-101 | L1516 | M5-4 후속: composite dot(center/pinch… | Accepted (구현분) / Ctrl+F mirror·클립보드·symmetry 축 수동 조… | `src/edit/edit-shape-commands.ts`, `src… | edit, scene, spec(editor-edit… | None | — |
| D-2026-102 | L1541 | M5-5: meta scene(identity·metadata·… | Accepted (구현분) / "새 난이도" 파생·`measureLabelOffset`은 E… | `src/edit/edit-meta-commands.ts`, `src/… | edit, scene, app, spec(build-… | None | — |
| D-2026-103 | L1569 | M5-6(부분): engine/session mid-start | Accepted (engine/session 층) / scene 층("current posi… | `src/game/game-engine.ts`, `src/game/ga… | game, spec(build-order) — M5-… | None | — |
| D-2026-104 | L1624 | M5-6: test scene 완성 — scrollMs=curr… | Accepted | `src/scene/scene-editor-test.ts`, `src/… | scene, app, spec(build-order)… | None | — |
| D-2026-105 | L1689 | M5-7: text events — 배치·편집·삭제 | Accepted (구현분) / 저장 UI 없음은 M5 전체 Exit 기준 결정 필요 항목으로… | `src/edit/edit-text-commands.ts`, `src/… | edit, scene, spec(build-order… | None | — |
| D-2026-106 | L1750 | M5-8: chart JSON 저장·`.cfx` 내보내기·lib… | Accepted | `src/env/env-file.ts`, `src/scene/scene… | env, scene, app, spec(build-o… | None | — |
| D-2026-107 | L1833 | M6-1: 잔여 실측/결정 항목 정리 — credits scen… | Accepted | `src/game/game-credits.ts`, `src/scene/… | game, scene, app, spec(다수 문서 … | None | — |
| D-2026-108 | L1877 | M6-2: editor 코드를 동적 import로 분리해 pub… | Accepted | `src/app/app-editor.ts`, `src/app/app-m… | app — M6-2 완료(editor/recordRe… | None | — |
| D-2026-109 | L1914 | M6-3: headless smoke pass 스코프 확정 + … | Accepted | `src/scene/scene-title.css`, `scene-mod… | scene(CSS 전반) — M6-3의 자동화 가능한… | None | — |
| D-2026-110 | L1971 | M6-4: 스펙↔구현 동기화, 3갈래 위험도 기반 타겟 감사 | Accepted | `src/app/README.md`, `scene/scene.md` §… | scene(spec), app(README) — M6… | None | — |
| D-2026-111 | L2012 | build-order §10 잔여 체크박스 닫음 — 수동 대조 … | Accepted | `_plan/build-order.md` §10 | build-order(spec) — 잔여 항목 정리 | None | — |
| D-2026-112 | L2032 | M5-4 후속: shapes/lane Ctrl+F mirror … | Accepted | `src/edit/edit-shape-commands.ts`, | edit, scene — M5-4 잔여 단순화 지점 … | None | — |
| D-2026-113 | L2080 | `src/core/core-timing.ts` 뮤테이션 게이트 … | Accepted | `tools/audit/MUTATION_EQUIVALENTS.md` | core(검증) — M5 이후 처음으로 `core-t… | None | — |
| D-2026-114 | L2122 | M5-4 후속: shapes/lane 클립보드(Ctrl+C/V)… | Accepted | `src/scene/scene-editor-shapes.ts`, | scene — M5-4 잔여 단순화 지점 6개 중 2… | None | — |
| D-2026-115 | L2162 | M5-4 나머지 3개 잔여 항목: symmetry 축 수동 조절… | Accepted | `src/scene/scene-editor-shapes.ts`, | scene — M5-4 잔여 단순화 지점 6개 중 5… | None | — |
| D-2026-116 | L2220 | manual-qa QA-1/QA-2/QA-3 실측 통과 | Accepted | `_meta/manual-qa.md` QA-1·QA-2·QA-3의 **… | manual-qa, judge(§5·§10 실측 대조… | None | — |
| D-2026-117 | L2245 | QA-1 WideHold 동시 소유 정밀 재검증(원본 버그 조건… | Accepted | `_meta/manual-qa.md` QA-1 **결과** 필드 | manual-qa QA-1, judge §5(JD-2… | None — D-2026-116의 QA-1… | — |
| D-2026-118 | L2277 | credits `Project Staff` 실제 인원 확정 (1… | Accepted | `src/scene/scene-credits.ts`의 `PROJECT_… | scene-credits, `scene/scene.m… | None | — |
| D-2026-119 | L2293 | `laneGridDivisor`·`V` 위치 스냅 UI 노출 (… | Accepted | `src/scene/scene-editor-shapes.ts`(`ren… | scene-editor-shapes, `editor-… | None | — |
| D-2026-120 | L2317 | M5-4 후속: shapes/lane Ctrl+D 구간 복제 | Accepted | `src/scene/scene-editor-shapes.ts`(`dup… | scene-editor-shapes, `editor-… | None | — |
| D-2026-121 | L2344 | notes 탭 Ctrl+D 구간 복제 | Accepted | `src/scene/scene-editor-notes.ts`(`dupl… | scene-editor-notes, `editor-e… | None | — |
| D-2026-122 | L2369 | 같은 dest tick 배치 충돌 = easing 갱신, lan… | Accepted | `src/edit/edit-shape-commands.ts`(`upda… | edit-shape-commands, scene-ed… | None | — |
| D-2026-123 | L2415 | notes 탭 paste(note+text) 한 undo로 합침 | Accepted | `src/edit/edit-notes-commands.ts` | edit-notes-commands, scene-ed… | None | — |
| D-2026-124 | L2445 | notes 탭 delete(note+text) 한 undo로 합침 | Accepted | `src/edit/edit-notes-commands.ts` | edit-notes-commands, scene-ed… | None | — |
| D-2026-125 | L2469 | notes 탭 Ctrl+D 복제(note+text) 한 undo… | Accepted | `src/scene/scene-editor-notes.ts`(`dupl… | scene-editor-notes, `src/scen… | None | — |
| D-2026-126 | L2500 | notes/shapes 스크롤바 상한 = `contentEndM… | Accepted | `src/scene/scene-editor-notes.ts`, | scene-editor-notes, scene-edi… | None | — |
| D-2026-127 | L2530 | "Package .cfx"/"Import .cfx" 배치 = e… | Accepted | `src/scene/scene-editor-start.ts` | scene-editor-start, `_plan/bu… | None | — |
| D-2026-128 | L2551 | notes 탭 F/G 미구현 — 기능 공백(기록만, 이번 범위 … | Deferred | `src/scene/scene-editor-notes.ts` | scene-editor-notes — 향후 별도 구현… | None | — |
| D-2026-129 | L2567 | M5.5-1 notes 캔버스 시각 디자인(부분) — theme… | Accepted | `scene/ui-design.md` §10 | scene-editor-notes, render-th… | None | — |

---

## 3. 레이어 import 매트릭스

규율은 `_plan/architecture.md` §1 — `core → env → { render, format } → edit / game → scene → app`, 위→아래 한 방향.
`render`↔`format`, `edit`↔`game` 은 각각 동급 형제라 서로를 모른다.
아래는 실제 상대경로 import 문에서 기계적으로 센 것이다 (레이어 내부 import 은 제외).

| 방향 | 건수 |
|---|---:|
| scene → core | 44 |
| game → core | 21 |
| app → scene | 20 |
| edit → core | 9 |
| app → game | 8 |
| game → env | 8 |
| scene → game | 8 |
| scene → edit | 8 |
| app → edit | 7 |
| scene → env | 7 |
| render → core | 6 |
| app → core | 5 |
| app → env | 5 |
| scene → render | 5 |
| edit → format | 3 |
| edit → env | 3 |
| format → core | 3 |
| app → format | 2 |
| game → format | 2 |
| env → core | 1 |
| format → env | 1 |
| game → render | 1 |

### 위반 후보 (아래 레이어가 위를 참조 / 동급 형제 상호 참조)

- 발견 없음

---

## 4. 미해결 표지 grep

`TODO|FIXME|미정|추후|보류` — 산문 속 일반 용례도 섞여 있다. 필터가 아니라 원자료다.
`DECISION_LOG.md` 는 §2 가 대신하므로 제외했다.

| 파일 | 줄 | 내용 |
|---|---|---|
| `PROJECT-OPERATING-GUIDELINE.md` | L50 | 현재 보류 항목: |
| `PROJECT-OPERATING-GUIDELINE.md` | L126 | 질문이 해결되면 상위 단계로 돌아간다. A 단계에서 새로운 B 단계를 연쇄적으로 만들지 않는다. 새 문제가 현재 결정을 막지 않으면 보류한다. |
| `PROJECT-OPERATING-GUIDELINE.md` | L144 | 독립된 설계 주제이거나 현재 완료를 막지 않는 문제다. 보류 목록에 기록하고 현재 논의를 계속한다. |
| `PROJECT-OPERATING-GUIDELINE.md` | L273 | 발견된 문제는 별도 작업이지만 현재 문서의 완료를 막지 않는다고 명시하고 보류한다. |
| `PROJECT-OPERATING-GUIDELINE.md` | L406 | 5. 결정 사항과 보류 사항 정리 |
| `README.md` | L142 | - **Active unit:** M3 — persistence + `.cfx`, 착수 가능. M3 진입 gate(D-2026-021)를 D-2026-059로 닫았다 — 라이브 웹 배포는 bundled/static 유지, `.cfx`는 평문, 공개 서 |
| `README.md` | L157 | records/game library Closure Review를 완료했다(D-2026-017·018). 기록은 chart identity를 따라 유지되고 내용 변경을 판별하지 않으며(fingerprint 미도입), chart 단위 기록 초기화(con |
| `README.md` | L163 | 시나리오 워크스루 검증 패스를 완료했다(모순 0건, D-2026-022). pause Resume을 정지 카운트다운 재개(되감기 없음)로 바꾸고 기록을 유지한다. no-record의 mid-start는 "곡 처음이 아닌 지점에서 시작한 판"으로 좁혔다 |
| `README.md` | L488 | 리더보드·부정 방지의 봉쇄(보류가 아니라 이 모델에서 성립 자체가 안 됨, |
| `README.md` | L498 | - 서버 기반 기록(조작 방지·전체 유저 기록·리더보드) — `DECISION_LOG.md` D-2026-019 (D-2026-059로 강제되지 않음, 계속 보류) |
| `REVIEW_CHECKLIST.md` | L8 | - 🟡 **Needs Decision** — 사용자 결정 또는 명시적 보류 필요 |
| `REVIEW_CHECKLIST.md` | L76 | - [ ] 🟡 항목이 결정되었거나 명시적으로 보류되었다. |
| `REVIEW_CHECKLIST.md` | L105 | - [ ] 🟡 항목 결정 또는 명시적 보류 |
| `_meta/persistence.md` | L281 | - 서버 기반 기록은 여전히 D-2026-019로 보류한다 — 이번 결정은 공개 서비스 기록도 로컬 유지로 확인했을 뿐 그 판을 열거나 닫지 않는다. |
| `_meta/records.md` | L6 | > records는 로컬 개인 데이터다 — 각 플레이어 기기의 records store에만 존재하며 공유·서버 제출은 범위 밖이다(D-2026-019 보류). |
| `_meta/records.md` | L109 | - (없음 — 서버 기반 기록·리더보드는 D-2026-019로 별도 보류.) |
| `_plan/build-order.md` | L103 | \| ~~M3 진입~~ \| ~~결정~~ \| ~~**D-2026-021** — 라이브 웹 배포 / `.cfx` 보호 / 공개 서비스 기록 위치~~ — **닫힘** (D-2026-059: bundled 유지·평문·records 로컬 유지, D-2026-01 |
| `_plan/build-order.md` | L207 | Resume)은 원본 미정의 또는 wall-clock 실기기 확인이 필요해 headless로 |
| `_rationale/rationale.md` | L80 | - 처분: 근사 표기를 버리고 `t` 폴백 — 왕복이 표기 형태와 무관하게 항상 성립하게 됐다. (a) 절대 격자 기준 sub는 읽기 규칙 변경이 에디터 UI까지 파급돼 보류, (b) 원본 복귀는 TM-7 취지 상실. |
| `_rationale/rationale.md` | L195 | ### 기록을 identity에 유지하고 수동 초기화로 돌린 이유 `[번복 반영 — 구 fingerprint 보류]` |
| `_rationale/rationale.md` | L204 | ### 서버 기반 기록을 보류한 이유 |
| `_rationale/rationale.md` | L255 | package 생성은 드물어 과거 manual old-version selection을 오래 유지할 근거가 약하다. candidate set을 새로 읽으면 최신을 다시 기준으로 삼는다. 이 규칙은 packager 후보 선택에만 해당하며 library의 |
| `_rationale/rationale.md` | L378 | 이번 records/game-library Closure Review에서 다음 근거가 기존 fingerprint 보류 근거를 대체한다. |
| `scene/ui-design.md` | L361 | key binding 소관, 아직 미정)는 지금까지 키보드 입력만 염두에 둔 |
| `scene/ui-design.md` | L714 | (D-2026-078) — 단순 표기 정리가 아니라 이전에 미정이던 입력 종류를 |
| `scene/ui-design.md` | L1150 | ## 7. 미해결 [보류] |
| `scene/ui-design.md` | L1263 | ### 10.3 툴바 크롬 — 보류 (사용자 확인 대기) |
| `src/core/core-timing.test.ts` | L244 | it('cell 미정렬 TS 전환점 재현 케이스가 t 폴백으로 왕복한다 (D-2026-045)', () => { |
| `tests/golden/DIVERGENCES.md` | L248 | \| JD-7 \| 중간 시작·Resume \| crossing Hold 처리 미정의 \| mid-start crossing-Hold 시드·anchor 규칙, Resume은 비-재시드 \| 미커버 \| `judge` §10(manual-qa 실측: D-2026- |
| `tests/property.test.ts` | L5 | * 실제 왕복 붕괴 하나를 찾았다(TS 전환점이 cell 미정렬일 때 — 결정 1). |
| `tests/property.test.ts` | L7 | * TODO(결정 1 / WO-2 §1): D-2026-045로 해소. 표현 불가 tick은 `t{tick}` |
| `tools/review/dossier.mjs` | L216 | const pat = /TODO\|FIXME\|미정\|추후\|보류/; |
| `tools/review/dossier.mjs` | L228 | \`TODO\|FIXME\|미정\|추후\|보류\` — 산문 속 일반 용례도 섞여 있다. 필터가 아니라 원자료다. |

---

## 5. 전문 — `tests/golden/DIVERGENCES.md`

# 설계 대장 — 재구현이 원본에서 벗어난 자리

> 골든 표(`tests/golden/*.json`)는 원본 `conflux-editor`의 관측 자료다.
> 재구현은 원본을 따라가는 게 목적이 아니라 **더 나은 설계로 다시 짓는 것**이므로,
> 표와 어긋나는 자리가 생긴다. 이 문서가 그 자리를 전부 모은다.
>
> 예외를 관리하는 문서가 아니라 **재설계가 무엇을 바꿨는지 한 장에서 보는 문서**다.

---

## 0. 규칙

**대장에 없는 차이는 실패다.** 등재된 차이는 통과하고, 등재되지 않은 불일치는
테스트를 실패시킨다. 골든 표의 값어치는 "원본을 따르게 하는 것"이 아니라
**몰랐던 차이를 드러내는 것**에 있다 — 원본을 잘못 읽었거나, 스펙에 적히지 않은
동작을 건드렸을 때 그것이 질문으로 떠오르게 하는 장치다.

등재는 가볍다. 한 줄과 근거 링크면 된다. 설계의 방향을 바꾸는 큰 결정만
`DECISION_LOG`로 승격한다 — 개선할 때마다 결정 사이클을 돌려야 한다면
그 마찰이 개선 자체를 억누른다.

### 범위

이 대장이 **행 단위로** 담는 것은 **골든 표가 존재하는 영역**(core / M1)이다. 대조할
관측 자료가 있어야 "어긋남"을 말할 수 있기 때문이다.

M2 이후 영역(render·scene·persistence·`.cfx`·editor)의 차이는 각 문서의 태그와
`DECISION_LOG`가 갖는다 — 원본에 브라우저 앱 형태로만 존재하거나 대응물 자체가
없어 자동 대조가 성립하지 않는다. 그 영역은 milestone별 **수동 대조 시나리오**가
맡으며, 시나리오가 만들어지는 시점에 이 대장도 해당 절을 늘린다(§7).

### 관계 표기

| 표기 | 뜻 | 무엇이 검증하나 |
|---|---|---|
| `어긋남` | 골든 표에 대응 케이스가 있고 값이 다르다 | 대장이 차이를 명시하고, 그 외의 불일치는 실패 |
| `미커버` | 원본에 대응물이 있으나 골든이 뽑지 않았다 | **스펙 테스트가 반드시 있어야 한다** |
| `없음` | 원본에 대응물 자체가 없다 | 스펙만이 판정한다 |

`미커버`가 이 표에서 가장 중요한 표기다. 골든도 안 걸고 대장에도 없으면
아무 검증 없이 통과한다 — 검증 공백은 어긋남보다 위험하다.

### 이 대장이 담지 않는 것 — 이름

대장은 **동작**의 차이를 담는다. 구현이 [[naming]] §3의 이름을 벗어난 것은 동작
차이가 아니라 명세 위반이므로 여기 오르지 않고, 골든도 잡지 못한다. M1-4에서
그런 이탈 두 건(`WINDOW_*_MS`·`DEFAULT_LANE_KEYS`)이 M1-2부터 살아 있던 것이
드러났다 — 그 부류는 `src/core/core-naming.test.ts`가 `naming` §3을 파싱해
대조한다(D-2026-038).

---

## 1. timing

골든 198건 중 값이 어긋나는 케이스는 없다. 다만 `getBPMAt` 30건과 `getTimeSig`
30건은 **대응 함수가 없다** — `timing` §2가 unused `bpmAt`을 만들지 않기 때문이다.
이 60건은 세그먼트 조회(`tempoSegmentAt`·`measureSegmentAt`)로 채점한다. 값이 나오는
자리가 이미 있으므로 공개 API를 늘리지 않고도 검증이 유지된다(D-2026-037).

`tickToMeasure` 30건은 인자가 전부 박 정렬이라 `sub`가 0이다 — TM-7의 차이를
골든이 짚지 못한다. `getGridLines`는 골든이 아예 뽑지 않았다(TM-9).

| ID | 자리 | 원본 | 재설계 | 관계 | 근거 |
|---|---|---|---|---|---|
| TM-1 | 곡 끝 tail | 차트가 길면 `+4000ms`, 음악이 길면 `+2000ms` | `SONG_END_TAIL_MS = 3000` 단일 | 미커버 | D-2026-030 |
| TM-2 | `musicEndMs` | raw audio duration (offset 미보정) | `musicDurationMs − offset` | 미커버 | D-2026-030 |
| TM-3 | `chartEndMs` | note·textEvent·shapeEvent만 (`lineEvents` 누락) | 전 event 종류 | 미커버 | D-2026-030 |
| TM-4 | 5000ms 하한 | `totalMs`가 종료 판정과 seek 분모를 겸함 | 종료에서 제거, timeline 소관 | 미커버 | D-2026-030 |
| TM-5 | leadIn | 시작·Resume 구분 없음 | Resume은 leadIn 미적용 (되감기 없는 카운트다운 재개) | 미커버 | D-2026-022 |
| TM-6 | grid 분리 | note grid와 lane 수평 스냅이 같은 축 | `gridDivisor`와 `laneGridDivisor` 분리, 공유하지 않음 | 미커버 | `timing` §6 |
| TM-7 | `sub` 분할 | 박 하나를 **고정 16분할** (`round(subTick/(tpbUnit/16))`) | 온음표를 `gridDivisor` 등분 — 표기와 snap이 같은 격자 … 표현 불가 tick은 `t{tick}` 폴백(근사 표기 폐기) | 미커버 | D-2026-037 |
| TM-8 | `gridDivisor` 목록·기본 | `GDIVS` 상단 64, 기본 `ES.nGD = 2` | 상단 `96·128·192·256` 추가, 기본 8 | **어긋남** | D-2026-037 |
| TM-10 | `measureToTick` 마디 0 | 빈 값 폴백이 `0`까지 먹어 `"0"`이 마디 1로 떨어진다 — 왕복이 깨진다 | 마디 0을 그대로 읽는다. 빈 문자열만 1로 폴백 | 미커버 | D-2026-037 |
| TM-9 | `getGridLines` | `{tick, isMeasure, measureNum, beatInMeasure, isPreRoll}` | 같은 기술자 유지(px 없음). 골든이 뽑지 않아 스펙만이 판정 | 미커버 | D-2026-037 |
| TM-11 | 첫 박자표 앞 구간 표기 | tick < 첫 TS tick이면 't{tick}' 폴백 (epoch 루프 break → 폴백) | 첫 박자 구간을 뒤로 외삽해 수치 표기. domain 검증이 이 배치 자체를 보고한다 | 어긋남 | M1 외부 검토 / D-2026-045 |

**TM-1~4는 원본에 대응 함수가 있다**(`getChartEndMs`·`updateTotalMs`). 골든이
뽑지 않았을 뿐이다. 지금은 스펙 테스트로 검증하되, 의심이 들면 추출 대상에
추가할 수 있다.

---

## 2. gauge

| ID | 자리 | 원본 | 재설계 | 관계 | 근거 |
|---|---|---|---|---|---|
| GA-1 | hold tail 게이지 델타 | hard에 tail 특례 (`TAIL_OK +0.1` / `TAIL_MISS −2.5`) | tail 성공 = SYNC 델타, tail MISS = MISS 델타 1회 | **어긋남** | `constants` §2 |
| GA-2 | Hold head MISS 회계 | MISS 델타 1회 | 즉시 2회 (head 단위 + tail 단위) | 미커버 | D-2026-024 |
| GA-3 | state `P` | "끝까지 쳤으나 미달" = `P`, best 순위 `C > P > N > F` | `P`를 `F`에 흡수, `C > F > N` | **어긋남** | `gauge` §3 |
| GA-4 | cascade | `as/ap/fc` 티어만 한 칸 강등, 게이지는 단일·연속 | 게이지 2종 병렬 평가, 최고 생존 티어 | 없음 | `gauge` §4 |
| GA-5 | judgment 단위 회계 | kind 6종 피드, 단위 개념이 암묵적 | 판정 단위를 명시적으로 정의하고 score·accuracy·게이지가 같은 단위를 쓴다 | 미커버 | `gauge` §5 |
| GA-9 | 완주하지 않은 판의 마크 | `computeState`가 미스·GOOD·PERFECT 개수만 본다 — 절반만 판정된 판도 미스가 없으면 `AS` | `F`를 뺀 모든 마크가 완주를 요구한다 — 판정되지 않은 단위가 남으면 `F` | **어긋남** | `gauge` §3 |

> `HOLD_RELEASE_GRACE_MS = 50`은 대장에 오르지 않는다. 재설계 과정에서 한 번
> 폐기했다가 `[번복]`으로 복원한 값이라 **최종 상태가 원본과 같다** — 원본 대비
> 차이가 아니다. 대장은 재설계 내부의 번복이 아니라 **원본과의 차이**를 담는다.

### GA-1의 범위

**`gaugeType: 'hard'`이면서 `TAIL_OK`/`TAIL_MISS`를 포함한 시퀀스만** 어긋난다.
`normal`은 구 코드에서도 tail 델타가 SYNC/MISS와 같은 값이었으므로 `[보존]`이며,
골든이 계속 채점한다 — 스펙의 "normal은 실변경 없음"이라는 주장 자체가
골든으로 검증된다.

어긋나는 골든 케이스: `gaugeType='hard'` × `sequence ∈ {mixed, tailOnly}`
(lockTarget 3종 × 2시퀀스 = 6건).

GA-4는 원본에 병렬 평가 모델이 없어 대조할 값이 없다. `gauge` §4의 검증
시나리오 6종이 기준이다. 원본의 6단 사다리는 `settings.js gaugeToLock`이
cascade를 `gaugeType: 'normal'`로 매핑하므로 **`H`를 낼 수 없었다** — 코드
주석의 `AS→AP→FC→Hard→Normal`은 실제 매핑과 달랐다(D-2026-041).

### 결과 산출은 이제 골든이 채점한다

한때 GA-6(state 산출)·GA-7(score·accuracy·rank 산출)·GA-8(`as` 모드 terminate)
세 행이 `미커버`로 올라 있었다. 셋 다 `[보존]`인데 골든이 닿지 않아 **같다는 주장
자체를 확인할 길이 없던 자리**였다 — 추출기가 `gaugeOnJudgment`·`evaluateEnd`만
뽑고 `lockTarget` 축에 `as`가 빠져 있었기 때문이다.

M1 마감에서 둘 다 덮었다(D-2026-044). `tools/golden/extract-result.mjs`가
`computeResult`를 직접 불러 `result.json` 40건을 뽑고, `extract-gauge.mjs`의
`lockTarget` 축에 `as`가 들어가 `gauge.json`이 30건 → 40건이 됐다. 값이 전부
일치하므로 **세 행은 차이도 공백도 아니게 되어 대장에서 내려갔다.** 세 표기 중
어디에도 속하지 않는 것을 남겨 두면 대장이 "스펙만이 판정한다"고 거짓말을 한다.

그 추출에서 두 건이 드러났다.

- **GA-3이 `미커버` → `어긋남`이 됐다.** 원본 `computeState`의 마지막 줄은
  `return 'P'`이고, `result.json`에 그 케이스가 값으로 들어왔다. 원본이 `P`를
  내는 3건에서 재설계는 `F`를 낸다.
- **GA-9가 새로 생겼다.** 원본은 판정된 단위 수를 세지 않으므로 24단위 중 10단위만
  판정된 판을 `AS`로 낸다. 실제 판은 miss sweep이 끝을 쓸고 지나가 늘 완주
  상태로 끝나지만, 마크의 뜻이 "이 성적으로 곡을 통과했다"인 이상 판정되지 않은
  단위가 남아 있으면 그 뜻이 성립하지 않는다. 재설계는 `F`를 뺀 모든 마크에
  완주를 요구한다. 원본 배선에서는 이 입력이 만들어지지 않는다(자연 종료 전
  miss sweep이 전부 판정하고, force-end는 잔여를 missSet에 넣는다 —
  `play.js` 실측). 이 조건은 재설계에서 gauge가 host와 분리되며 새로 열린
  호출 경로에 대한 방어다.

`result.json`의 게이지 값은 판정 열을 다시 돌려 얻은 것이 아니라 집계에 맞춰 직접
세운 것이다 — 결과 산출만 홀로 재기 위해서다. 그래서 표에는 실제 판에서 나올 수
없는 조합(hard 게이지가 12미스를 견딘 자리 등)도 들어 있다. 이 표가 재는 것은
**입력 집계 → 결과**이지 판의 진행이 아니다.

---

## 3. shape

| ID | 자리 | 원본 | 재설계 | 관계 | 근거 |
|---|---|---|---|---|---|
| SH-1 | 좌표계 | 내부 0~64 저장 + `posToExt = 내부/4−8` 표시 변환 + `sp2f = 내부/64` render 변환 | 외부단위 -8~+8 단일 (저장=표시=입력) | **어긋남** | `shape` §3 |
| SH-2 | init fallback | 비대칭 (Blue 0 / Red +2) | 대칭 (-2 / +2) | **어긋남** | `shape` §4 |
| SH-3 | 모르는 easing | 조용히 `Linear`로 떨어뜨리고 끝 | 같은 값으로 흘리되 domain 검증이 **보고**한다 | 미커버 | `shape` §5 |
| SH-4 | symmetry 축 기본값 | (한때 "기본 0 고정"으로 바꾸려다 `[번복]`) 동적 중심 | 스냅 tick 시점의 체인 평균 + 드래그 −8~+8 | 미커버 | `shape` §6 |
| SH-5 | `Arc` 곡선 | `ease()`에 네 번째 가지가 있다 (`sin(tπ)` — 올라갔다 제자리로) | 없다. `Arc`는 저장되지 않는 입력 호칭이고 저장값은 3종 + `null`뿐이다 | 없음 | `shape` §5 |
| SH-6 | anchor가 여럿일 때 | 배열에 **먼저 적힌** anchor가 시작값이 된다 | **가장 이른 tick**의 anchor가 시작값이 된다 | **어긋남** | `shape` §4 |

### 범위

- **SH-1**: `getShape`·`sp2f` 골든 값이 전부 구 좌표계 단위다. 값 자체가 아니라
  **단위가 다르다** — 재구현 값에 `내부 = (외부+8)×4`를 적용하면 일치해야 한다.
  변환이 성립하는지를 보는 것이 이 항목의 검증이다.
- **SH-2**: `noAnchor` fixture의 `getShapeInit`·`getShape` 5건.
- **SH-3**: 골든은 `Nonsense` 3건으로 **값이 Linear로 떨어지는 것까지만** 잰다.
  보고가 나오는지는 원본에 대응물이 없어 `core-validate.test.ts`가 판정한다.
- **SH-5**: `ease` 골든 `Arc` 7건은 대조 상대가 없다. 저장 경로(`shape-input.js`)가
  L/R·C·P 세 갈래 전부에서 `resolveArcEasing`을 거치므로 실제 차트에 `Arc`가
  남지 않는다는 것이 실측이다 — 재설계는 그 사실을 타입으로 굳혔다.
- **SH-6**: `anchorOrder` fixture 2건.

### SH-3이 "easing 종류"가 아니게 된 이유

이 행은 원래 `원본 Linear/In/Out/InOut 4종 → 재설계 3종`으로 적혀 있었고 관계도
**어긋남**이었다. 원본을 직접 읽어 보니 그런 이름은 없다 — 원본 `ease()`의 가지는
`Linear`/`In-Sine`/`Out-Sine`/`Arc`이고, 재설계가 저장하는 세 이름은 **원본과
글자까지 같다**(D-2026-043).

`In`/`Out`/`InOut`은 골든 추출기가 넘기던 인자였고, 원본은 목록에 없는 이름을
예외 없이 Linear로 떨어뜨리므로 28건이 전부 같은 값으로 나왔다. 대장이 그 인자
목록을 원본의 명세로 읽은 것이다. 표를 다시 뽑아 세 곡선이 실제로 갈리는 것을
확인했고(`ease` 21건 일치), 남은 차이인 폴백 보고를 이 ID가 잇는다.

---

## 4. data-model

DM-1·DM-2·DM-4·DM-5는 골든 표가 없는 영역이지만 **core 계산이고 M1 범위**라 여기
담는다 — 스펙 테스트가 검증한다. DM-3·DM-6은 M1-8에서 `overlap.json`이 생겨
대조 대상이 됐다.

| ID | 자리 | 원본 | 재설계 | 관계 | 근거 |
|---|---|---|---|---|---|
| DM-1 | 저장 단위 | 전역 `D` 하나, song 단위 암묵 | 독립 chart가 canonical, song은 같은 `songId`의 파생 그룹 | 미커버 | `data-model` §1 |
| DM-2 | metadata·timing·asset 소유 | 전역에 흩어짐 | 전부 chart 소유 | 미커버 | `data-model` §2·§3 |
| DM-3 | lane 2·3 3겹 이상 | pairwise라 conflict를 **검출하지 못한다** — 동일구간이면 한 장만 남기고 나머지를 `hidden`으로 숨긴다 | 동시 활성 수가 capacity를 넘으면 그 순간 활성인 노트 전체가 conflict | 어긋남 | `data-model` §5.1 |
| DM-4 | lane 데이터 구속 | 저장 시점에 구속 | 데이터 무구속(`targetPos` 실수, 역전·초과 허용), 구속은 gameplay 투영이 담당 | 미커버 | `lane-events` |
| DM-5 | 검증 | 층 구분 없음 — 잘못된 값은 런타임까지 그대로 감 | structural(거부) / domain(보고) 2층, 무mutate, `schemaVersion` 불일치 거부 | 미커버 | `data-model` §11 |
| DM-6 | conflict와 overlap이 겨룰 때 | 겨루는 자리가 없다 — lane 2·3은 overlap만, lane 1·4·Wide는 conflict만 낸다 | conflict가 세부 분류를 덮는다. group에 든 노트는 `hidden`이어도 conflict로 보인다 | 없음 | `data-model` §5.1 |
| LE-1 | 구분선 데이터 모델 | `lineEvents` — 구분선 넷의 폭을 한 덩어리로 든다(`lines: [25,25,25,25]`). 편집 UI·렌더·게임 적용이 모두 미구현이고 실데이터도 균등 init 1개뿐이었다 | `laneEvents` — 구분선 1·2·3이 각각 독립 체인이고 shape와 같은 알고리즘을 탄다 | 없음 | `lane-events` §2·§6 |

### DM-3은 알고리즘 차이가 아니다

처음 이 항목은 `순회 기반 → sweep-line, O(n log n)` / `미커버`로 등재돼 있었다.
**M1-8에서 원본을 직접 돌려 보니 바뀌는 것은 계산 방식이 아니라 검출되는 집합
자체였다.** 2겹 결과는 원본과 완전히 같고, 갈리는 것은 3겹 이상뿐이다.

원본은 노트를 두 장씩 짝지어 비교하므로 "이 순간 세 장이 동시에 활성"이라는 사실을
계산하지 않는다. lane 2에 Hold를 계단으로 세 장 겹치면 `clipped`·`yellow`·`yellow`가
나오고 conflict가 아니며, 같은 tick에 Tap 네 장이면 `merged` 한 장에 `hidden` 세
장이다 — **화면에 한 장만 보이는데 네 번 쳐야 한다.** 채보를 만드는 사람이 그것을
알아챌 방법이 없다.

계산 방식(pairwise → sweep) 자체는 2겹 결과가 같으므로 대장 행이 아니라
`data-model` §5.1의 `[수정]` 태그가 담는다 — 관계 세 표기 중 어디에도 들어가지
않는 자리다.

### LE-1이 `없음`인 이유

`lineEvents`와 `laneEvents`는 이름만 다른 같은 것이 아니다. 원본은 구분선 넷의
**폭**을 한 배열로 들었고 재설계는 구분선 셋의 **위치**를 각각의 체인으로 든다 —
개수도, 무엇을 재는지도, 몇 덩어리인지도 다르다. 골든 `getLines` 값을 재설계
값으로 옮기는 변환이 성립하지 않으므로 대조 상대가 없다.

이 자리가 `없음`인 것은 `lane-events` 문서 전체가 `[신규]`인 것과 같은 사실이다.
M1-9에서 `shape.json`을 다시 뽑을 때 `getLines`·`getLinesInit` 11건을 표에서 뺐다 —
대조할 수 없는 값을 표에 두면 "확인했다"는 착각만 남는다(D-2026-043).

DM-6이 `없음`인 것도 같은 조사에서 나왔다. 원본은 풀마다 낼 수 있는 표시 종류가
갈려 있어(lane 2·3 = overlap 계열, lane 1·4·Wide = `invalid`) **두 종류가 한 노트를
두고 겨루는 상황 자체가 생기지 않는다.** 우선순위 규칙은 3겹 검출(DM-3)과 global
6키(JD-5)가 생기면서 비로소 필요해진 재설계 고유 규칙이다.

---

## 5. judge

후보 순서가 D-2026-024에서 통째로 `[번복]`됐다. 골든 2,700건의 지위가
케이스마다 다르므로 용도를 가른다.

| ID | 자리 | 원본 | 재설계 | 관계 | 근거 |
|---|---|---|---|---|---|
| JD-1 | 후보 선택 | normal·wide **분리 풀**, 각 풀에서 earliest-tick | 단일 풀 — earliest-tick → same-tick normal 우선 → hold 우선 → 이른 tail 우선 | 미커버 | D-2026-024 |
| JD-2 | Hold 소유 | key-owned (`holds` 맵) | key-demand — Normal 익명 수요, Wide 단일 소유·원자적 이양 | 미커버 | D-2026-024(manual-qa 실측: D-2026-116·D-2026-117) |
| JD-3 | hit 이펙트 | `commitJudgment`가 `above/below`를 계산해 실어보냄 | judge는 싣지 않음, render 소관 | 없음 | `judge` §4 |
| JD-4 | overlap/conflict | judge 안 | domain 파생 속성(`noteOverlapMap`) | 없음 | `judge` §11 |
| JD-5 | global 6키 conflict | 없음 — 풀끼리 서로 보지 않는다 | 검사 지점마다 `D1+D2+D3+D4+W <= 6` | 없음 | D-2026-024 |
| JD-6 | Hold tail 처리 | tail 자동완료는 **autoplay에서만**, 수동은 keyup 전까지 미확정 | 항상 `tailMs`에 자동완료, `[head, tail)` 반개구간, 같은 tick이면 tail 먼저 | 미커버 | `judge` §7 |
| JD-7 | 중간 시작·Resume | crossing Hold 처리 미정의 | mid-start crossing-Hold 시드·anchor 규칙, Resume은 비-재시드 | 미커버 | `judge` §10(manual-qa 실측: D-2026-116) |
| JD-8 | visualOffset | 렌더 시점 보정 | 입력 타임스탬프 보정으로 배선 | 미커버 | `judge` §1 |

### JD-1을 골든이 목격하지 못한다

처음 이 항목은 `어긋남`으로 등재됐고 `holdOverlap`·`sixKeySaturation` 두 fixture가
갈린다고 적혀 있었다. **실측하니 어긋나는 케이스가 0건이다** — 2,700건이 전부
새 규칙에서도 원본과 같은 노트를 고른다(M1-4).

구·신 규칙이 갈리는 조건은 하나뿐이다: **같은 판정창 안에서 wide가 lane-매칭
normal보다 이른 tick에 있을 때.** 구 규칙은 분리 풀에서 `bestNormal ?? bestWide`로
normal을 집고, 새 규칙은 earliest-tick으로 wide를 집는다. 그런데 여섯 fixture를
통틀어 wide는 `holdOverlap` tick 1920의 **하나뿐이고, 그것이 그 fixture의 가장 늦은
노트다** — 뒤에 오는 normal이 없다.

같은 tick에서는 두 규칙이 일치한다. 구 규칙의 normal 우선과 새 규칙의 `same-tick
normal 우선`이 같은 답을 내기 때문이다. `holdOverlap` tick 1920에서 key 1·3·5가
wide를 집는 것도 분리 풀의 귀결이 아니라 **lane 불일치**의 귀결이다 — 그 tick의
normal은 lane 2와 lane 4뿐이라 lane 1·3 키의 후보가 되지 못한다. 새 규칙에서도
같은 답이 나온다.

따라서 D-2026-024가 `[번복]`한 후보 순서 규칙 전체가 **골든 검증 밖**에 있다.
`core-judge.test.ts`의 §1 스펙 테스트가 유일한 판정자다 — 이른 wide 대 늦은
normal, same-tick normal 우선, hold 우선, 이른 tail 우선을 각각 건다.

> 골든 표에 `noteChannel`·`noteIsWide`를 남기는 결정 자체는 유효하다. 지금은
> 목격하지 못하지만, 원본 fixture에 늦은 normal이 추가되는 순간 이 두 필드가
> 없으면 "어느 쪽을 골랐는가"가 표에서 사라진다.

---

### tail release 임계는 어긋남이 아니다 — 오독이었다 (D-2026-039)

M1-5에서 원본 keyup 경로를 처음 직접 읽었다. `play-input.js`가 쓰는 임계는
`tailMs − JUDGE_GOOD − LN_RELEASE_GRACE_MS` = **150ms**이고,
`LN_RELEASE_GRACE_MS`(50)는 관용 폭 전체가 아니라 GOOD 창 위의 추가분이었다
([[EXTRACTED_FACTS]] §8.1).

D-2026-024가 상수 파일만 읽고 임계를 50으로 적어, 관용 폭이 원본의 1/3로 좁아진 채
스펙에 남아 있었다. **이 자리는 대장에 오르지 않는다** — 원본과 같은 150으로 정정했으므로
어긋남이 아니다. 여기 적는 이유는 골든이 keyup 경로를 뽑지 않아 이런 좁힘이 자동으로는
영원히 드러나지 않기 때문이다. `core-judge.test.ts`가 임계 = `WINDOW_GOOD_MS +
HOLD_RELEASE_GRACE_MS`를 직접 건다.

---

## 6. settings

골든 표 `constants.json`이 원본 `settings.js`의 `DEFAULT_SETTINGS`를 통째로 담는다.
기본값은 대부분 `[보존]`이고 어긋나는 자리는 하나뿐이다. 병합 규칙은 원본에
대응 코드가 있으나 골든이 동작으로 뽑지 않았다.

| ID | 자리 | 원본 | 재설계 | 관계 | 근거 |
|---|---|---|---|---|---|
| ST-1 | `volMusic` 기본값 | `0.7` | `1.0` — 음악은 감쇠 없이 출발하고 크기는 master로 잡는다 | **어긋남** | `settings` §4 |
| ST-2 | 알 수 없는 키 | `{...DEFAULT, ...saved}` — 그대로 남는다 | 버린다. 폐기된 설정이 저장본에 살아남지 않는다 | 미커버 | `settings` §4 |
| ST-3 | 허용 밖 값 | 검사 없이 통과 | 필드 단위로 기본값 복귀, 객체 전체는 유지 | 미커버 | `settings` §4 |
| ST-4 | `cmod` | 기본값에 있음 | 폐기 — 기본값에 없다 | **어긋남** | `settings` §2 |
| ST-5 | 키 배치의 거처 | `PS`(런타임 상태) — settings 객체 밖 | settings 영속 필드 `keyBindings`. rebinding이 영속하고 병합 검사를 받는다 | 미커버 | `settings` §4 |

`sudden`의 허용 범위 `0~90`은 대장에 오르지 않는다 — 원본 값을 그대로 명문화한
것이라 차이가 아니다. 스펙에 없던 것을 채운 것은 **누락 보완**이지 어긋남이 아니다.

---

## 7. 미커버 항목 — 스펙 테스트가 있어야 하는 자리

위 표에서 `미커버`로 표시된 것을 모은다. **여기가 재설계의 실체다** — 원본에
대조할 것이 없거나 골든이 닿지 않아, 오직 스펙만이 옳고 그름을 말한다.

| ID | 무엇을 | 어느 step에서 |
|---|---|---|
| DM-1·DM-2 | chart가 canonical 저장 단위, metadata·timing·asset 소유 | M1-2 |
| DM-4 | lane 데이터 무구속 | M1-2 |
| DM-5 | 검증 2층 (structural 거부 / domain 보고) | M1-2 |
| ST-2·ST-3 | settings 병합 — 알 수 없는 키 폐기, 필드 단위 되돌림 | M1-2 |
| ST-5 | 키 배치가 settings 영속 필드 | M1-2 |
| TM-1~4 | 곡 끝 4값 (`chartEndMs`·`musicEndMs`·`contentEndMs`·`songEndMs`) | M1-3 |
| TM-6 | `gridDivisor`와 `laneGridDivisor` 분리 | M1-3 |
| TM-7 | `sub` 분할이 `gridDivisor`를 탄다 | M1-3 |
| TM-9 | grid line 기술자 (px 없음, 박 단위 간격) | M1-3 |
| TM-10 | `measureToTick` 마디 0 왕복 | M1-3 |
| JD-8 | visualOffset = 입력 타임스탬프 보정 | M1-4 |
| JD-1 | 후보 순서 단일 풀 (골든이 갈리는 케이스 0건) | M1-4 |
| JD-3·JD-4 | judge 관심사 분리 (이펙트·overlap 검출이 judge 밖) | M1-4 |
| GA-2·GA-5 | Hold head MISS 2단위, 판정 단위 회계 통일 (`core-judge.test.ts` §8) | M1-5 |
| JD-2 | key-demand Hold 모델 (`core-judge.test.ts` §5·§6) | M1-5 |
| JD-6 | tail 자동완료·반개구간·같은 tick 순서 (`core-judge.test.ts` §7) | M1-5 |
| JD-7 | mid-start 시드·anchor, Resume 비-재시드 (`core-judge.test.ts` §9·§10) | M1-6 |
| GA-3 | state `P→F` 흡수와 best 순위 (`core-gauge.test.ts` §7) | M1-7 |
| GA-9 | 완주하지 않은 판은 `F` (`core-gauge.test.ts` §7) | M1-7 |
| GA-4 | cascade 병렬 평가 (`gauge` §4 시나리오 6종) | M1-7 |
| DM-3 | lane 2·3 3겹 이상 conflict 검출 (`core-overlap.test.ts` §3) | M1-8 |
| DM-6 | conflict가 세부 분류를 덮는 우선순위 (`core-overlap.test.ts` §5) | M1-8 |
| JD-5 | global 6키 conflict (같은 검사 지점, `core-overlap.test.ts` §4) | M1-8 |
| TM-5 | Resume leadIn 미적용 | M2-5 |
| SH-3 | 모르는 easing 폴백 보고 (`core-validate.test.ts`) | M1-9 |
| SH-4 | symmetry 축 동적 스냅샷 | M5-4 |

**27행이다**(ID로는 35건). M1의 9개 step 중 8개가 스펙 테스트를 요구한다 — 골든만으로 통과할
수 있는 step은 거의 없다.

DM-3은 M1-8에서 `overlap.json`이 생기며 `미커버` → `어긋남`이 됐다. 위 표에 남는 이유는
관계가 바뀌어도 **의도한 차이라는 사실**은 그대로이기 때문이다 — 롤업은 담당 step의
소재를 가리키고, 검증 방식은 관계 칸이 갖는다.

JD-5(global 6키)는 원래 M1-6에 있었으나 M1-8로 옮겼다(D-2026-040). global 부등식은
별도 패스가 아니라 DM-3과 **같은 검사 지점 위에서** 풀별 활성 수를 합산한 것이고, 검출은
judge 밖(`data-model` §5.1)이라 judge step에 둘 자리가 없었다. TM-5(Resume leadIn
미적용)는 core에 확인할 대상이 없어 — `leadIn`은 상수 하나이고 "Resume에 적용하지
않는다"는 play loop의 성질이다 — 배선이 서는 M2-5로 옮겼다.

---

## 8. M2 이후

`render`·`scene`·`persistence`·`.cfx`·`editor` 영역의 차이는 여기 행으로 담지
않는다(§0 범위). 대조할 골든 표가 없고, 원본에 대응물이 없거나 브라우저 앱
형태로만 존재해 자동 대조가 성립하지 않는다.

전수 대조 결과 그 영역의 `[수정]`/`[번복]`은 다음과 같이 분포한다:

| 문서 | 수정 | 번복 |
|---|---|---|
| `song-select` | 10 | 0 |
| `editor-editing` | 5 | 6 |
| `persistence` | 1 | 12 |
| `cfx` | 0 | 12 |
| `editor-graph` | 1 | 8 |
| `records` | 0 | 5 |
| `scene` | 3 | 1 |

`song-select`의 10건이 전부 `[수정]`이고 `[번복]`이 0인 것은 이 화면이 사실상
신규 설계이기 때문이다(원본에 곡 선택 화면이 없다). 반대로 `cfx`·`persistence`의
`[번복]`이 많은 것은 데이터 소유 구조를 chart 중심으로 뒤집은 여파다.

각 milestone의 **수동 대조 시나리오**를 작성할 때 해당 절을 이 대장에 추가한다.

---

## 9. 유지

- 새 차이가 나면 여기에 한 줄 추가한다. 등재 없이는 테스트가 통과하지 않는다.
- 골든 표를 재생성해도 이 문서는 자동으로 갱신되지 않는다 — 원본이 바뀌어
  차이가 사라지거나 새로 생기면 사람이 반영한다.
- `[수정]`/`[번복]` 태그가 스펙 문서에 추가되면 여기에도 대응 행이 있어야 한다.
  둘의 개수가 어긋나면 어느 한쪽이 빠진 것이다.


---

## 6. 전문 — `tools/audit/MUTATION_EQUIVALENTS.md`

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
| core-overlap.ts L180 while 경계 | `<→<=` | `endAt`이 `byEnd.length`에 닿는 tick이 sweep에 없다 — 마지막 항목이 만료되는 tick 이후로는 순회하지 않는다 |
| core-overlap.ts L242 for 경계 | `<→<=` | `pooled[length]`는 `undefined`지만 안쪽 루프가 즉시 끝나 역참조가 없다 — 관측 가능한 차이 없음 |
| core-timing.ts L351 `startTick < 0` | `<→<=` | `startTick === 0`이면 pre-roll 루프의 `tick < negativeEnd(0)`가 즉시 거짓이라 줄이 하나도 안 생긴다 |
| core-timing.ts L362 `tick < 0` | `<→<=` | pre-roll 루프는 `tick < negativeEnd ≤ 0`에서만 돌아 `tick === 0`이 들어오지 않는다 |
| core-timing.ts L382 `segmentEnd <= startTick` | `<=→<` | 건너뛰지 않아도 안쪽 루프가 `tick >= segmentEnd`에서 즉시 break라 줄이 안 생긴다 |
| core-timing.ts L434 `end > last` | `>→>=` | 같은 값으로 갱신해도 결과가 같다 |
| core-judge.ts L548 `serial > bestSerial` | `>→>=` | `keyPressSerial`은 누를 때마다 증가하는 고유값이라 동률이 생기지 않는다 |
| core-judge.ts L586 `at > 0` | `>→>=` | `at === 0`이면 `tails[-1]`이 `undefined`라 비교가 항상 거짓 — 검사 결과가 같다 |


---

## 7. 전문 — `core/constants.md`

# constants — 튜닝 수치 단일 출처

> 게이지 증감 / 판정창 / rank 임계 등 "얼마"에 해당하는 값을 한곳에 모은다.
> "무엇"(정의)은 각 문서, "얼마"(수치)는 여기. 코드 `constants.js`에 대응.
> 분류 기준: **로직 계산에 쓰이는 수치 = constants / 순수 표시 값 = [[theme]] / 취향·환경 값 = [[settings]]**. 근거 → [[rationale#constants와 settings의 분류 기준]]
> 출처: `constants.js` 정밀 추출. 별도 태그가 없으면 `[보존]` (값이 틀리면 회귀).
> 용어: [[glossary]] / 근거: [[rationale]]

---

## 1. 판정창 (ms, |diff| 기준)

| 판정 | 이름 | 창 | 비고 |
|---|---|---|---|
| SYNC | `WINDOW_SYNC_MS` | 25 | |
| PERFECT | `WINDOW_PERFECT_MS` | 50 | |
| GOOD | `WINDOW_GOOD_MS` | 100 | 이 밖은 MISS |
| WIDE SYNC | `WINDOW_WIDE_SYNC_MS` | 100 | wide 노트는 SYNC만, ±100 |
| — | `HOLD_RELEASE_GRACE_MS` | 50 | hold tail release grace. GOOD 창 **위에 얹는 추가분**이다 |
| — | `HOLD_RELEASE_WINDOW_MS` | 150 | tail release 분류 임계 폭 = `WINDOW_GOOD_MS + HOLD_RELEASE_GRACE_MS`. 두 상수의 합에 준 이름이지 새 튜닝 수치가 아니다 |

이름은 [[naming]] §3이 정하고 **값은 여기가 단일 출처**다. [[judge]] §2는 이 이름을 참조만 한다.

- hold tail 분류 임계는 `HOLD_RELEASE_WINDOW_MS`(150)이며 **원본과 같다** `[보존]`([[judge]] §7). 원본은 `tailMs − JUDGE_GOOD − LN_RELEASE_GRACE_MS`로 합성해 썼고(`play-input.js` 실측 → [[EXTRACTED_FACTS]] §8.1), D-2026-024가 상수 파일만 읽어 50으로 적었던 것을 D-2026-039에서 정정했다. 근거 → [[rationale#hold release 임계를 원본과 같은 150ms로 되돌린 이유]].
- SYNC/PERFECT/GOOD/WIDE SYNC 판정창 자체는 이번 개편으로 바뀌지 않는다.
- 판정 로직은 [[judge]], 여기는 값만.

## 2. 게이지 증감 (`GAUGE_DELTA`)

start: `normal` 0 / `hard` 100. 둘 다 상한 100(`gaugeMax`).
`normal` 클리어 임계 `NORMAL_CLEAR_PCT` = 75.

| 판정 | normal | hard |
|---|---|---|
| SYNC | +1.0 ×a | +0.15 |
| PERFECT | +1.0 ×a | +0.15 |
| GOOD | +0.5 ×a | 0 |
| MISS | **−2.0** (절대) | **−5.0** |

- **normal**: 양수 delta만 `×a` 스케일. `a = GAUGE_NORMAL_TOTAL_GAIN / 총콤보`, **`GAUGE_NORMAL_TOTAL_GAIN = 150`** `[보존]`. 세션 시작 시 1회 계산. 콤보 수 = tap 1, hold 2(head+tail). 올-SYNC면 잠재 회복 +150%인데 100 상한이라 초과분 폐기 → 75% 클리어는 대략 SYNC의 절반 분량. **손실은 절대값**(차트 길이 무관, 후살 비용 일정).
- **hard**: 전 항목 절대 퍼센트, 저게이지 자비 없음. MISS −5.0 → 20연속 MISS면 풀바 소진. 중간 릴리즈도 MISS와 동일 −5.0 `[수정 — 구 −2.5]`, tail 성공도 SYNC와 동일 +0.15 `[수정 — 구 +0.1]`.
- 판정은 SYNC/PERFECT/GOOD/MISS **4종 단일 축** — hold tail도 **게이지 델타까지 완전 통합** `[수정]`: tail 성공 = SYNC 델타, tail MISS(head 성공 후) = MISS 델타 1회([[judge]] §7). 구 코드의 게이지 피드는 6종 kind였고 **hard에만** tail 특례(TAIL_OK +0.1 / TAIL_MISS −2.5)가 있었다 — normal은 구에서도 동일 값이라 실변경은 hard뿐. 근거 → [[rationale#hold tail의 게이지 특례를 폐기한 이유]].
- **Hold head MISS는 MISS 델타를 즉시 2회 적용**한다(normal·hard 게이지 모두) `[번복]` — head 판정 단위 1개 + tail 판정 단위 1개가 함께 종결되기 때문이다. 이후 원래 tail 시각에 중복 delta를 적용하지 않는다. 판정 단위·회계 계약 → [[judge]] §8, [[gauge]] §5.
- gaugeMode 정의·terminate·cascade는 [[gauge]]. 여기는 normal/hard 증감 값만.

## 3. rank 임계 (`RANK_TABLE`, 백만점제, 높음→낮음 첫 도달)

| rank | 점수 |
|---|---|
| U | 1,000,000 |
| S+ | 995,000 |
| S | 985,000 |
| A+ | 970,000 |
| A | 950,000 |
| B | 900,000 |
| C | 800,000 |
| D | 700,000 |
| E | 500,000 |
| F | 0 |

- 점수 = (SYNC+tail성공 + PERFECT + GOOD×0.5) / 총콤보 × 1,000,000.
- accuracy(%) = (SYNC+tail성공 + PERFECT×0.7 + GOOD×0.3) / 총콤보 × 100. 점수와 **별개 지표**다 (가중이 다름: 점수는 PERFECT 풀·GOOD 0.5, accuracy는 PERFECT 0.7·GOOD 0.3). `computeResult`가 score·rank·state와 함께 반환. `[보존]`
- rank는 state와 독립 축([[glossary]]). result 화면이 이 중 무엇을 어떻게 표시하는지(레이아웃)는 core 밖 — scene/render 소관.

## 4. 스크롤 속도 범위 (`SCROLL_SPEED_*`)

| 상수 | 값 |
|---|---|
| `SCROLL_VIEW_MS` | 2000 |
| `SCROLL_SPEED_MIN` | 1.0 |
| `SCROLL_SPEED_MAX` | 10.0 |
| `SCROLL_SPEED_STEP` | 0.1 |

- `SCROLL_VIEW_MS`는 판정선까지 한 화면이 담는 시간이다 — `visMs = SCROLL_VIEW_MS / scrollSpeed`([[timing]] §3).
- 나머지는 `[보존]` (구 `SPEED_MIN/MAX/STEP`). scrollSpeed의 현재값은 취향([[settings]])이지만, 허용 범위·스텝은 `visMs = SCROLL_VIEW_MS / scrollSpeed`([[timing]] §3) 로직의 경계 조건이라 여기 둔다 — 머리말 분류 기준. 정의·절대분리는 [[glossary]].

## 5. song-credit 연출 (`CREDIT_*`) `[신규]`

| 상수 | 값 |
|---|---|
| `CREDIT_FADE_IN_MS` | 500 |
| `CREDIT_HOLD_MS` | 4000 |
| `CREDIT_FADE_OUT_MS` | 500 |

- 합 5000ms 고정 — song-credit scene 총 표시 시간([[scene]] §6). 입력·skip 없음이므로 로직 경계값이라 여기 둔다.

## 6. textEvent fade (`TEXT_FADE_MS`) `[수정]`

| 상수 | 값 |
|---|---|
| `TEXT_FADE_MS` | 300 |

- 등장·퇴장 fade에 **같은 값**을 쓴다. 구 `transition`·`mode` 필드 폐기의 귀결로 고정값 하나에 수렴했다([[data-model]] §8). 표시 스타일·배치는 [[theme]] §3.

---

## 7. song-select `[신규]`

| 상수 | 값 |
|---|---|
| `SLOTS_PER_ROW` | 5 |
| `PREVIEW_DELAY_MS` | 400 |
| `PREVIEW_LOOP_MS` | 15000 |
| `PREVIEW_FADE_OUT_MS` | 5000 |

- 정의·동작은 [[song-select]] §3·§10.
- `PREVIEW_DELAY_MS`는 커서가 멈춘 뒤 preview 재생을 시작하기까지의 대기다.
- fade in은 없다. `PREVIEW_FADE_OUT_MS`는 루프 구간의 마지막 구간에 적용한다.

---

## 8. 로딩 표시 `[신규]`

| 상수 | 값 |
|---|---|
| `LOADING_INDICATOR_DELAY_MS` | 300 |

비동기 작업이 이 시간을 넘기면 로딩 표시를 낸다. 적용 지점은 각 scene 문서.

---

## 9. 곡 종료 `[수정]`

| 상수 | 값 |
|---|---|
| `SONG_END_TAIL_MS` | 3000 |

`contentEndMs` 이후 이 시간이 지나면 판이 끝난다. 정의는 [[timing]] §9.

