# Conflux — 재설계 명세 (Spec)

> Conflux를 **현재 동작은 보존하되 명칭·구조·파일을 백지에서 새로** 만들기 위한 설계 명세.
> 방법론: **Spec-Driven Development** — 명세가 source of truth, 코드는 명세에서 파생.

---

## 이 레포의 원칙

1. **정의(what)와 근거(why) 분리** — 정의 문서는 "무엇"만. "왜"는 [`_rationale/`](_rationale/rationale.md).
2. **현재 코드 = 동작 명세서** — 동작·수치는 [`_extracted/`](_extracted/EXTRACTED_FACTS.md)에서 추출. 명칭·구조는 계승 안 함.
3. **출처 태그** — 각 동작은 `[보존]`(1:1 유지) / `[수정]`(의식적 변경) / `[신규]`(새 설계).
4. **용어는 영어 단일** — 개념은 영어 이름 하나로 고정, 설명은 한국어. ([`core/glossary.md`](core/glossary.md))
5. **단일 출처** — 한 개념은 한 곳에서만 정의. 다른 문서는 링크로 참조.

설계 판단의 세부 기준은 [DESIGN_PRINCIPLES](DESIGN_PRINCIPLES.md)를 따른다.

---

## 문서 지도

### Project governance

| 문서 | 역할 |
|---|---|
| [PROJECT_OPERATING_GUIDELINE](PROJECT_OPERATING_GUIDELINE.md) | 세션, 역할, 결정, 커밋 운영 절차 |
| [DESIGN_PRINCIPLES](DESIGN_PRINCIPLES.md) | 좋은 설계를 판단하는 프로젝트 원칙 |
| [REVIEW_CHECKLIST](REVIEW_CHECKLIST.md) | spec 종료 전 공통 리뷰와 Closure Gate |
| [DECISION_LOG](DECISION_LOG.md) | 중요한 확정·번복·보류 결정의 상태 색인 |

권장 읽기 순서: `README → PROJECT_OPERATING_GUIDELINE → 대상 spec → 관련 rationale`

### `core/` — 핵심 정의
| 문서 | 내용 |
|---|---|
| [naming](core/naming.md) | 명칭 규칙 + 현재→새이름 대응표 + 출처 태그 |
| [glossary](core/glossary.md) | 개념 사전 (모든 용어의 색인) |
| [data-model](core/data-model.md) | 전체 데이터 스키마 단일 출처 (song/chart/note/shape/lane…) |
| [timing](core/timing.md) | tick↔ms·스크롤 진행도·마디 세그먼트·gridDivisor |
| [judge](core/judge.md) | 입력 판정 / 노트 매칭 로직 |
| [shape](core/shape.md) | 바깥 경계(Blue·Red) 변형 / 평가·체인·easing·좌표계 |
| [lane-events](core/lane-events.md) | 레인 구분선 변형 (shape 안쪽 1·2·3) |
| [gauge](core/gauge.md) | 게이지·클리어·state·cascade·terminate 정의 (수치는 constants) |
| [constants](core/constants.md) | 튜닝 수치 단일 출처 (판정창·게이지 증감·rank 임계) |

### `render/` — 렌더
| 문서 | 내용 |
|---|---|
| [theme](render/theme.md) | 표현 값 단일 출처 (색·draw order; 치수·폰트 placeholder) |

### `scene/` — 화면 그래프
| 문서 | 내용 |
|---|---|
| [scene](scene/scene.md) | 화면 그래프 (공용 루트 title·mode-select + game/editor/settings 모드 그래프), overlay·전환·호스트 |

### `editor/` — 에디터
| 문서 | 내용 |
|---|---|
| [editor-graph](editor/editor-graph.md) | 에디터 씬 그래프 (탭 4 scene·전환·공유 상태·세로축 ms 통일·test↔gameplay) |
| [editor-commands](editor/editor-commands.md) | 커맨드·히스토리 계약 (dispatch·scope 스택·커맨드 목록·시그니처) |
| [editor-editing](editor/editor-editing.md) | 편집 인터랙션 (툴·단축키·클립보드·symmetry·mirror) |

### `_meta/` — 비(非)로직 정의
| 문서 | 내용 |
|---|---|
| [settings](_meta/settings.md) | 플레이어·에디터 설정 단일 출처 (곡 데이터 아님) |
| [records](_meta/records.md) | 플레이 기록 단일 출처 (chart당 best 기록·갱신 규칙·no-record 연동) |
| [persistence](_meta/persistence.md) | 영속성 단일 출처 (파일 정본 체제·workspace/library·autosave·열기/export) |
| [cfx](_meta/cfx.md) | 파일 포맷 단일 출처 (두 층: chart .json 작업 / .cfx 배포 zip·songId/chartId·difficulty) |

### `_plan/` — 재구현 계획
| 문서 | 내용 |
|---|---|
| [architecture](_plan/architecture.md) | 레이어 7층·의존 방향·CTX seam·빌드 게이트 단일 출처 |

### 받침 문서
| 문서 | 내용 |
|---|---|
| [_extracted/EXTRACTED_FACTS](_extracted/EXTRACTED_FACTS.md) | 현재 코드 실측치 (옛 용어 사용, 참조용) |
| [_extracted/timing-verification](_extracted/timing-verification.md) | timing 재설계 검증 (현재 코드와 수치 1:1 대조) |
| [_rationale/rationale](_rationale/rationale.md) | 설계 결정 근거 모음 |

---

## 확정된 핵심 결정 (요약)

**데이터 구조**
- `song ⊃ chart[]` 2층. tempos/timeSignatures/offset는 곡 공통, notes/events는 chart별. chart 파일 직렬화는 공통 필드 사본 포함(자립).
- 노트 4종 = `isWide` × `duration` (Tap / Hold / WideTap / WideHold).
- `channel` 폐기 → `lane`(1~4) 통일. `key`(1~6)는 물리 입력만.

**판정 / 게이지**
- judgment = `abs(diff)` 임계 (SYNC 25 / PERFECT 50 / GOOD 100). wide는 SYNC/MISS만.
- gaugeMode(normal/hard/fc/ap/as/cascade) → state(C/H/AS/AP/FC/F/N) 한 표로. rank는 독립 축.
- terminate = "게이지 즉시 0" 단일 메커니즘 (cascade 제외 — 강등으로 동작, gauge §4).

**연출 (시각, 판정 무관)**
- shape = 바깥 경계(Blue/Red), laneEvents = 안쪽 구분선(1·2·3). 둘 다 순수 시각.
- shape 좌표 외부단위 -8~+8 단일(0.25 스텝). isBlue=체인 식별자(교차 자유). easing 저장 3종 + Arc 입력모드.
- 입력/렌더 분리: judge는 shape·laneEvents·overlap을 모름. render가 overlap을 스스로 판단.

**그리드**
- gridDivisor = 1박 N등분. 박자 독립(박자는 마디선만). 드롭다운(3·4배수) + 타이핑(특수 N). 틱 반올림.

**타이밍 / 스크롤**
- 스크롤 = ms 등속(노트 낙하 속도 BPM 무관, 간격만 변동). "가변속"은 tickToMs의 부산물.
- BPM(시간)·timeSignature(마디) 둘 다 "정렬→누적 세그먼트→룩업" 한 패턴. 음수 tick은 외삽.
- core는 진행도(scrollProgressAt)까지. scrollYAt(px)은 render, clock(leadIn/offset)은 game.
- 마디 표기 sub = gridDivisor 칸 번호(16 고정 폐기).
- lane 스냅도 이 분박 시스템 공유.

**파일 / 영속**
- **정본 = 유저의 파일.** chart `.json`(작업 단위, 자립) / `.cfx`(배포 ZIP, 수동 조립: `*_music`·`*_jacket` + chart들).
- chartId: 0=init(에디터 전용)·1~4=Trace/Drift/Surge/Flux 고정 슬롯·5+=추가 채보(기본 Phase). difficulty 6종 enum + subtitle(차분명). version(export마다 +1)/schemaVersion(규격) 두 축.
- 스토어: workspace(단일 복구 슬롯+에셋 blob) / library(.cfx blob) / records / settings. Ctrl+S=workspace 저장·Ctrl+E=export·Ctrl+Shift+S=derive(새 UUID).

---

## 아키텍처 방향 (재구현 시)

레이어 7층, import은 **위→아래 한 방향만**. core는 환경을 모른다.

```
core → env → render → edit/game → scene → app
```

- `core` 순수 로직(브라우저 무관, Node 가능) · `env` 브라우저 설비 래핑(구 plat) · `render` 캔버스 드로잉 · `edit`/`game` 인터랙션(형제 축) · `scene` 화면 그래프 · `app` 부트스트랩.

> 정의·의존 규칙·CTX seam·빌드 게이트의 **단일 출처는 [_plan/architecture.md](_plan/architecture.md)**. 여기는 요약. 파일명 접두사 규칙은 [[naming]] §5.

---

## 작업 방식

- **User (Product Owner):** 사용자가 제품 방향과 의식적 동작 변경을 최종 결정한다.
- **Design Steward:** 채팅에서 최신 main을 읽고 조사·설계·비판적 리뷰·Implementation Agent 작업 지시·사후 검증을 담당한다.
- **Implementation Agent:** 승인된 Change Scope를 최신 main에 반영하고 PR 없이 main에 직접 커밋한다. **Current implementation agent: Claude Code.**
- **Session:** 하나의 논리적 커밋 단위로 운영하며, 커밋 검증 후 가능한 한 새 대화를 시작한다.
- **Review:** spec을 닫기 전에 [REVIEW_CHECKLIST](REVIEW_CHECKLIST.md)를 적용한다.

세부 절차는 [PROJECT_OPERATING_GUIDELINE](PROJECT_OPERATING_GUIDELINE.md)을 따른다.

---

## 진행 상태

### Current Focus

- **Active unit:** persistence/cfx/editor specifications meta review
- **Discussion Scope:** `_meta/persistence.md`
- **Change Scope:** `_meta/persistence.md` 및 검토 중 확인되는 `_meta/cfx.md`, editor 문서, 관련 링크
- **Exit:** 단순화·누락·Single Source·링크 검토, 필요한 결정 반영, Implementation Agent 커밋, 최신 main 검증

**완료**: naming, glossary, data-model, timing, judge, lane-events, shape, gauge, theme(←colors), constants, scene, settings, records, persistence, cfx, editor 3문서(graph/commands/editing), architecture + 받침 문서 — **전 영역 1차 명세 완료**

> 게이지(gaugeMode 6종·terminate·cascade·state)는 **정의 [[gauge]] / 수치 [[constants]] §2**로 분리 단일 출처화. (정의가 무거워져 glossary 한 섹션에서 전용 문서로 독립 — 근거 [[rationale]].) fc/ap/as/cascade 단일 축 평탄화는 [수정](코드의 gaugeType×lock 직교를 유저 관점 1축으로).

> scene 그래프: **공용 루트(title·mode-select) + 세 모드 그래프**(game 스택형 / editor·settings 평면형). game 흐름 title→mode-select→song-select→song-credit→gameplay→result. `play`(모드)/`gameplay`(scene) 분리, `song-credit`(곡)/`credits`(제작진), editor `play`탭→`test`, `music-select`→`song-select`. overlay 정식화(pause=overlay 엔진 살림, result=scene 승격, lead-in 3초 [보존]). 빠른 옵션 패널 5종(scrollSpeed/gaugeMode/mirror/staticShape/autoplay) song-select·test 공유.

> 크레딧·설정 정리: `artist→musicBy`·`charter→chartBy`·`jacketBy` 신규(저장은 값만, "by"는 표시 레이어). 곡별 `jacketBrightness` 폐기→전역 [[settings]]로 통일·개명. `measureLabelOffset` 곡공통 [번복]→에디터 settings. `cmod`·`hidden` 폐기. 설정 단일 출처 [[settings]] 신설(`_meta/`). 근거 [[rationale]].

> chain 평가 통일: `easing===null`=anchor(보간 안 함, 첫 anchor=init 호칭), `easing≠null`=보간. anchor/transition 2종 분리·chain-event.md 신설 **폐기** — 데이터는 1종이라 이름은 예외(anchor)에만. 평가 단일 출처는 [[shape]] §4, lane은 링크. `Step`(=Linear+dur0)·`Arc`는 저장 안 되는 입력 라벨. 근거 [[rationale]].

> 아키텍처: 레이어 7층 `core→env→render→edit/game→scene→app`, 단일 출처 [[architecture]](README·naming은 요약/링크). `plat`→`env` 개명. env=브라우저 API 직접 호출, render=매 프레임 그리기. core는 전역 D 대신 활성 보면 인자 주입 [수정](동작 보존·의존 재배선). CTX 호스트 seam [보존]. editor도 scene 그래프 [수정](game과 형제 두 그래프). 근거 [[rationale]].

> 잔여 일괄 확정(실측 기반): [[records]] 신설(chart당 1기록·5필드·no-record 연동, `_meta/`) · cascade 래칫 + 플레이 중 막대 규칙 + 검증 시나리오([[gauge]] §4) · hold 키 추적/이양·mirror 매핑(1↔4·2↔3)·autoplay 히트음 150ms 사전 스케줄([[judge]] [보존] 명문화) · visualOffset "미배선" 서술 [번복]([보존]으로 정정 — 실측상 이미 배선) · 키 매핑 표 확정([[settings]] §2: pause 메뉴 Resume/Retry/Exit, result Retry F5·Back Enter) · gridDivisor 분음표 표기(V=구N×4, 기본 32, `GRID_DIVISORS` ~256)([[timing]] §6) · symmetry 축 확정(shape: 기본 0·−8~+8 드래그 / lane: 쌍 선택·init 중점) · schemaVersion 시작 `1`. 근거 [[rationale]].

> editor·cfx·영속성 확정(71+12문 배치 Q&A, 실측 기반): **[[persistence]]·[[cfx]]·editor 3문서 신설**. 스토어 4분리·에셋 분리(SHA-256)+sweep GC·autosave 30초·무명 슬롯 소멸 · songId=UUID 불변·chartId=발급 정수(수정 가능, 표기 `1.2`)·records 키 `songId:chartId` · 구 포맷 변환기 미탑재 · 에디터 탭=형제 scene(Tab 순환에서 meta 제외)·세로축 ms 비례 통일 [수정] · 커맨드 [보존]+lane 3종 신설·Flip→Mirror 재명명 · test: Space=씬 내 즉시 재생/Enter=gameplay(3초 lead-in)·에디터 발원 판 무기록(no-record 4조건) · symmetry 축 동적 스냅샷 [번복]·mirror(Ctrl+F) 축 0·Ctrl+D 구간 복제 · textEvent 필드 확정. 근거 [[rationale]].

> **파일 정본 체제 전환**(cfx·persistence 전면 개정 + core 파급): .cfx 통합 컨테이너(song.json+charts/+hash assets) 폐기 `[번복]` → **두 층**(chart `.json` 작업 / .cfx 배포 zip 수동 조립). chart 자립(공통 필드 사본, 불일치=최저 chartId 정본+경고), id 0=init(에디터 전용, 로더 무언 스킵)·1~4 고정 슬롯·5+ 추가, difficulty 6종 enum·subtitle(차분명, `[...]`=표시 규약), version(export+1 `[신규]`)/schemaVersion(파일 단위 `[번복]`). 에셋 접미 규칙 `*_music`/`*_jacket`(content-hash `[번복]`, 권장 접두 `{title}_{musicBy}_`). 스토어 구성 교체 `[번복]`: songs/assets→workspace(단일 슬롯+blob)/library(.cfx blob, GC sweep 폐지). Ctrl+S=workspace·Ctrl+E=export(v+1)·derive(구 duplicate, 새 UUID confirm). start scene(새 곡/파일 열기/이어서 편집)·Ctrl+O=OS 픽커(파일 매니저 overlay 폐지 `[번복]`). 재import=chart별 version 비교 후 덮어쓰기(복제 선택지 폐기 `[번복]`)·디버그 덤프 폐지 `[번복]`. metadata의 `subtitle`·`audioFile` 철회(구 코드에 없음 실측)·`jacketImage` 폐기 `[수정]`(에셋=파일, 참조 필드 없음). 근거 [[rationale]].

> editor 3문서 파급 + 질문지(INT/STR/EDT) 반영: **단일 chart 세션 확정 `[번복]`**(chart 목록·드롭다운·전환 스택 초기화 폐기, 새 난이도 = 세션 교체, 삭제 = OS 소관, chartId는 difficulty·subtitle에서 유도 — init 0/기본 1~4 자동/추가 5+ 입력, 중복은 로더 전담). 에디터 키 유일 출처 = editing §5~§6(STR-1)·툴 naming 색인(STR-3)·start 정식 scene(STR-4). quick-hold 실측 정정 [보존](300ms·savedLNDur 재사용·치환 규칙 — "시작 모드" 서술 폐기)·test idle 구성 실측 기입 [보존]. EDT 확정: A 모디파이어(대체/Shift 추가)·선택/Ctrl+A 서브모드 필터(mirror만 합산)·symmetry 단일 배치 툴만+수동 축 토글 off까지·conflict에 지속 hold 포함·클립보드 textEvents 동반. Ctrl+S=workspace/Ctrl+E=chart export/Ctrl+Shift+S=derive/Ctrl+O=OS 픽커. PC 시리즈 처분: PC-1·2 무효(전제 소멸)·PC-3 로더 검증 대체·PC-4·5(기록 백지)·6은 신판에 기반영. 근거 [[rationale]].

**다음 후보** (명세 다지기 우선, 재구현은 미룸):
- **신설 3+2 문서 검토 1회** — persistence/cfx/editor 3문서 메타 검토(단순화/누락/단일출처/링크)
- scene 잔여 — song-credit 연출 구체값 등 (scene.md §10)
- `_extracted/` 두 문서(EXTRACTED_FACTS·timing-verification) 검토 잔여
- `_plan/build-order.md` — **재구현 직전에** 꺼냄 (전 영역 명세가 모여 이제 준비 가능)
