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

---

## 문서 지도

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
| [constants](core/constants.md) | 튜닝 수치 단일 출처 (판정창·게이지 증감·rank 임계) |

### `render/` — 렌더
| 문서 | 내용 |
|---|---|
| [colors](render/colors.md) | 모든 색 단일 출처 |

### 받침 문서
| 문서 | 내용 |
|---|---|
| [_extracted/EXTRACTED_FACTS](_extracted/EXTRACTED_FACTS.md) | 현재 코드 실측치 (옛 용어 사용, 참조용) |
| [_extracted/timing-verification](_extracted/timing-verification.md) | timing 재설계 검증 (현재 코드와 수치 1:1 대조) |
| [_rationale/rationale](_rationale/rationale.md) | 설계 결정 근거 모음 |

---

## 확정된 핵심 결정 (요약)

**데이터 구조**
- `song ⊃ chart[]` 2층. tempos/timeSignatures/audioFile/offset는 곡 공통, notes/events는 chart별.
- 노트 4종 = `isWide` × `duration` (Tap / Hold / WideTap / WideHold).
- `channel` 폐기 → `lane`(1~4) 통일. `key`(1~6)는 물리 입력만.

**판정 / 게이지**
- judgment = `abs(diff)` 임계 (SYNC 25 / PERFECT 50 / GOOD 100). wide는 SYNC/MISS만.
- gaugeMode(normal/hard/AS/AP/FC) → state(C/H/AS/AP/FC/F/N) 한 표로. rank는 독립 축.
- terminate = "게이지 즉시 0" 단일 메커니즘.

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

---

## 아키텍처 방향 (재구현 시)

```
core/    순수 로직 (DOM·캔버스·전역상태 없음, Node 하네스 import 가능)
plat/    브라우저 환경 래핑 (IndexedDB/audio/canvas/input)
render/  캔버스 드로잉 (core 지오메트리를 받아 칠하기만)
edit/    에디터 인터랙션
game/    게임 인터랙션
scene/   화면 그래프
app/     부트스트랩 / 빌드별 진입점
```
import은 위→아래 한 방향만. core는 위를 모른다.

---

## 작업 방식

- **기획·검토**: 채팅 (대화형 의사결정). 세션 시작 시 이 레포를 fetch해 최신부터.
- **재구현**: Claude Code on the Web (파일 생성·PR).
- **검토 루프**: 큰 작업 하나 완료 → 비판적 검토(단순화/누락/개선) → 다음. 문어발 확장 방지.

---

## 진행 상태

**완료**: naming, glossary, data-model, timing, judge, lane-events, shape, colors, constants + 받침 문서

> 게이지(gaugeMode 6종·terminate·Cascade·state)는 별도 `gauge.md` 없이 **정의는 [[glossary]], 수치는 [[constants]]**로 단일 출처화. AS/AP/FC/Cascade 단일 축 평탄화는 [수정](코드의 gaugeType×lock 직교를 유저 관점 1축으로). 근거 [[rationale]].

**다음 후보**:
- `_plan/build-order.md` — 재구현 수직 슬라이스 순서 (재구현 직전)
