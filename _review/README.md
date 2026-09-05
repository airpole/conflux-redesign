# `_review/` — 외부 검토 파이프라인

상위 모델(외부 검토자)을 **Design Steward** 자리에 두고, 구현은 하위 모델이 맡는 구성의 계약 파일이 여기 산다.

`CLAUDE.md` §1이 이미 그 자리를 정의한다 — *"최종 제품 결정은 사용자가 하며, 설계 해석과 범위 판정은 Design Steward가 담당한다."* 이 디렉터리는 그 자리를 파일로 고정한 것이다.

선례: `D-2026-045` — M1 외부 검토 지적 다섯 건을 결정으로 승격했다.

---

## 1. 계층

| 계층 | 역할 | 산출물 |
|---|---|---|
| 사용자 | 최종 제품 결정 (승인·거부) | — |
| 외부 검토자 | 판정·AC 작성·모호성 해소·gate 통과 여부. **코드를 쓰지 않는다.** | `VERDICT-*.md` |
| Orchestrator | 판정을 작업으로 분해, 배정, `npm run check` 실행, 올릴 것만 추려 상신 | 커밋 |
| Implementer | 좁은 Change Scope + AC 안에서만 수정 | 커밋 |

**핵심 규약: 판정은 채팅이 아니라 레포 파일로 내려온다.** 검토자를 tool 로 감싸 호출하면 그 순간 호출당하는 쪽이 되어 위상이 뒤집힌다. `VERDICT` 가 하위 계층의 입력 명세다.

## 2. 파일 규약

| 파일 | 내용 |
|---|---|
| `REQ-*.md` | 리뷰 요청서 — 범위·질문·첨부. 붙여넣기용 전문. |
| `VERDICT-*.md` | 검토자 판정 — 🔴/🟡/🟢 + Acceptance Criteria. |
| `QUESTIONS.md` | Question Card 대기열 (Implementer → 검토자). |
| `DOSSIER.md` `INDEX-*.md` | 기계 생성 색인. 손으로 고치지 않는다. |

판정 중 채택된 것은 **`DECISION_LOG` 항목으로 승격**한다. `VERDICT` 는 근거 스냅샷으로 남고, 규범적 정의는 언제나 spec + `DECISION_LOG` 한 곳에만 둔다.

## 3. Question Card

Implementer 는 막히면 **결정하지 않는다.** `QUESTIONS.md` 에 카드를 쌓는다.

```text
QC-NNN | 발신: <작업> | 막힌 지점: <파일:줄>
관측: <스펙이 무엇이라고 하는가>
왜 막혔나: <해석 A와 B가 관측 가능하게 다른 결과를 낸다>
A안 / B안 / 각각의 영향 범위
막힌 작업: <이 답 없이 진행 불가한 항목>
```

Orchestrator 가 **모았다가 배치로** 올린다. 카드 하나마다 즉시 질의하지 않는다 — 그것도 검토자를 워커로 만드는 경로다.

## 4. 호출 시점

검토자는 이때만 돈다.

1. 리뷰 라운드 (§5)
2. Milestone gate 통과 판정
3. Question Card 배치
4. 커밋 전 최종 대조 — diff + 해당 VERDICT 의 AC 만. 레포 전체가 아니다.

커밋마다 부르지 않는다. 기계로 판정되는 실패(`npm run check`)는 검토자가 볼 이유가 없다.

## 5. 라운드

| 라운드 | 질문 | 첨부 |
|---|---|---|
| **R1** | 스펙↔구현 drift · 개념 감축 · DECISION_LOG 정합 · 모호성 인벤토리 | `DOSSIER.md` (+ 요청 시 `INDEX-*.md`, 원문) |
| **R2** | 검증 공백 — `DIVERGENCES` §7 미커버/없음, 동등 뮤턴트 사유의 정당성 | `DOSSIER.md` §5·§6 + `src/core` 원문 |
| **R3** | 경계 조건 — 시간 경계, 동시 이벤트 우선순위, hold 중첩, gauge terminate | `core/*.md` + `src/core` + `_extracted/` |
| **R4** | 레이어 규율 — `architecture` §1 준수, `format` 존치 타당성 | `DOSSIER.md` §3 + `_plan/architecture.md` + `eslint.config.js` |
| **R5** | undo 합침을 일반 규칙으로 승격 가능한가 | `editor/editor-commands.md` + `src/edit` |

## 6. 색인 재생성

```sh
node tools/review/dossier.mjs [ref]
```

`ref` 는 raw base 에 쓸 git ref (기본값: 현재 브랜치). 산출물 3개는 요약이 아니라 **기계 추출 색인**이다 — 필드 추출·헤딩 수집·시그니처 수집·grep 뿐이라 판단이 개입한 압축이 없다. 여기 없는 것은 중요하지 않은 것이 아니라 **원문에만 있는 것**이고, 모든 항목에 경로가 붙어 있어 검토자가 raw URL 로 직접 가져간다.

| 파일 | 내용 | 크기 |
|---|---|---|
| `DOSSIER.md` | 인벤토리 · DECISION_LOG 색인 · 레이어 매트릭스 · 표지 grep · 대장 전문 | ~75KB |
| `INDEX-SPEC.md` | 문서 헤딩 트리 — 정의가 어디 사는지 | ~36KB |
| `INDEX-CODE.md` | 구현 export 시그니처 · 테스트 인벤토리 | ~47KB |

문서 원문 전체는 860KB, 구현은 723KB다. 한 번에 넣는 것을 전제하지 않는다.
