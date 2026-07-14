# PROJECT OPERATING GUIDELINE

이 문서는 Conflux 재설계 작업의 운영 절차와 역할 경계를 정의한다.

설계 판단 기준은 [[DESIGN_PRINCIPLES]], 리뷰 기준은 [[REVIEW_CHECKLIST]], 확정 결정의 상태 추적은 [[DECISION_LOG]]를 따른다.

---

## 1. Source of Truth

정보가 충돌하면 다음 순서를 따른다.

1. `conflux-redesign` 최신 `main`
2. 현재 작업 대상 spec
3. 관련 rationale
4. `conflux-editor` 실제 구현
5. 과거 인수인계와 대화 기록

과거 기록은 특정 시점의 스냅샷이다. 최신 `main`과 충돌하면 사용하지 않는다.

---

## 2. Roles

### User — Product Owner

- 사용자 경험과 제품 방향을 결정한다.
- 기능, 범위, 의식적 동작 변경을 승인한다.
- 여러 설계안 중 최종안을 결정한다.

### Design Steward — Planning and Review

- 최신 `main`에서 현재 상태를 복원한다.
- 기존 구현을 실측하고 보존할 행동을 식별한다.
- 더 단순한 구조와 대안을 적극적으로 제안한다.
- 결정 질문, spec 변경안, Acceptance Criteria를 작성한다.
- Implementation Agent의 커밋 결과를 최신 `main`에서 다시 검증한다.

### Implementation Agent — Implementation and Local Review

- 승인된 설계를 파일에 반영하고 `main`에 커밋한다.
- 링크, 용어, 포맷, 검사 결과를 함께 정리한다.
- 구현 중 발견한 모순과 개선안을 별도로 보고한다.
- 승인 없이 제품 행동이나 데이터 모델을 변경하지 않는다.
- 현재 실행 도구는 README의 `Current implementation agent`를 따른다(역할명은 도구 교체와 무관하게 유지).

### Codex — Supporting Review (optional)

- 필요할 때 보조 리뷰나 구현 관점의 제안을 제공한다.
- 파일 변경이나 커밋을 직접 수행하지 않는다.

---

## 3. Session Boundary

한 세션은 하나의 **논리적 커밋 단위**로 구성한다.

세션은 최신 `main`에서 시작하고, Implementation Agent의 커밋을 최신 `main`에서 검증한 뒤 종료한다. 커밋 이후에는 가능한 한 새 대화를 시작한다.

긴 대화의 연속성보다 최신 레포의 정확성을 우선한다.

한 세션에서 여러 파일을 바꿀 수 있지만, 하나의 목적만 가져야 한다.

---

## 4. Session Startup

1. 최신 `README.md`를 읽는다.
2. 현재 완료 상태와 다음 후보를 확인한다.
3. 관련 운영 문서와 대상 spec을 읽는다.
4. 필요한 rationale만 확인한다.
5. 보존 동작의 확인이 필요할 때만 `conflux-editor`를 실측한다.
6. 이번 세션의 목적, Discussion Scope, Change Scope, 종료 조건을 선언한다.

이미 검증되었고 이번 변경과 무관한 안정된 값은 재사용할 수 있다. 행동 차이를 만들 수 있는 값과 과거에 정정된 항목은 다시 확인한다.

---

## 5. Investigation Model

기존 구현을 정답으로 취급하지 않는다. 항상 다음을 분리한다.

- **Observed** — 기존 구현이 실제로 하는 일
- **Intended** — 보존해야 하는 사용자 경험과 행동
- **Designed** — 그 행동을 가장 단순하고 명확하게 표현하는 새 구조

기존 구조는 보존 대상이 아니다. 사용자 경험의 변경은 의식적인 결정이어야 한다.

---

## 6. Decision Process

다음 순서를 따른다.

1. 조사
2. 문제와 제약 분석
3. 권장안과 대안 제시
4. 사용자 결정
5. spec 확정
6. 리뷰
7. Implementation Agent 커밋
8. 최신 `main` 검증

Design Steward는 결정을 대신하지 않지만, 더 나은 구조가 보이면 명확한 권장안을 제시한다.

### Decision Question

결정 질문에는 다음을 포함한다.

- 현재 문제
- 기존 동작과 현재 spec
- 권장안과 이유
- 현실적인 대안
- 각 안의 영향 범위
- 짧은 답변 코드

사용자는 설명을 다시 요청하지 않고도 짧은 코드로 답할 수 있어야 한다.

---

## 7. Scope

기본적으로 한 번에 한 spec 문서를 논의한다.

- **Discussion Scope** — 현재 정의와 결정을 다루는 중심 문서
- **Change Scope** — 그 결정 때문에 함께 동기화해야 하는 모든 파일

Discussion Scope를 좁게 유지하되, 파급 변경을 누락하지 않는다.

---

## 8. Rationale and Decision Log

rationale은 모든 변경의 의무 기록이 아니다. 다음과 같이 다시 논쟁될 가능성이 높은 결정에 사용한다.

- 기존 행동의 의식적 변경
- 이전 결정의 번복
- 여러 대안이 실제로 경쟁한 결정
- 비직관적이거나 여러 영역에 영향을 주는 결정

`DECISION_LOG.md`는 정의나 근거를 복제하지 않는다. 중요한 결정의 상태와 source 문서만 색인한다.

---

## 9. Implementation Agent Authority

Implementation Agent가 의미 변화 없이 자율 수정할 수 있는 범위:

- 오탈자와 포맷
- 깨진 링크
- 용어의 명백한 불일치
- README와 문서 지도의 누락 동기화
- 승인된 변경의 명백한 누락
- lint와 정적 검사 오류

승인이 필요한 범위:

- 사용자 경험과 행동 변경
- 필드, enum, 데이터 구조 변경
- 새로운 추상화나 문서 소유권 이동
- rationale 또는 확정 결정과 충돌하는 변경
- Acceptance Criteria와 테스트 기대값 변경

Implementation Agent 보고는 다음 형식을 사용한다.

- **Applied** — 승인된 변경
- **Auto-fixed** — 의미 변화 없는 정리
- **Findings** — 임의 반영하지 않은 문제와 제안

---

## 10. Closure

문서를 닫기 전에 [[REVIEW_CHECKLIST]]를 적용한다.

세션 종료 시 다음을 확정한다.

- 결정 사항
- 변경 파일
- Acceptance Criteria
- Implementation Agent 작업 지시
- 권장 커밋 메시지
- 다음 자연스러운 작업 단위

Implementation Agent 커밋 후 최신 `main`에서 다음을 검증한다.

- 승인된 설계가 정확히 반영되었는가
- 링크와 문서 지도가 동기화되었는가
- Implementation Agent Findings에 후속 결정이 필요한가
- README의 현재 상태가 실제 레포와 일치하는가
