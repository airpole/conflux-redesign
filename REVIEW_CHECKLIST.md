# REVIEW CHECKLIST

이 문서는 Conflux spec을 닫기 전에 적용하는 공통 리뷰 기준이다.

## Severity

- 🔴 **Must Fix** — 커밋 전에 반드시 해결
- 🟡 **Needs Decision** — 사용자 결정 또는 명시적 보류 필요
- 🟢 **Pass** — 현재 기준에서 문제 없음

문제가 없는 항목을 장황하게 보고하지 않는다.

---

## 1. Behavior

- [ ] 정상 흐름의 입력, 상태 변화, 출력이 완결되어 있다.
- [ ] 실패, 취소, 중단, 재시도 등 필요한 비정상 흐름이 정의되어 있다.
- [ ] 경계값, 시간 경계, 동시 이벤트의 우선순위가 명확하다.
- [ ] `[보존]` 항목은 실측 또는 이미 검증된 근거와 일치한다.
- [ ] `[수정]`, `[신규]`, `[번복]`이 의식적인 결정으로 구분되어 있다.
- [ ] 구현 차이로 사용자 경험이 우연히 바뀌지 않는다.

## 2. Simplicity

- [ ] 같은 행동을 더 적은 개념으로 설명할 수 없는지 검토했다.
- [ ] 새 필드, enum, 타입, 추상화, 문서가 실제로 필요하다.
- [ ] 제거하거나 통합할 수 있는 역사적 구조가 남아 있지 않다.
- [ ] 파생 가능한 상태를 중복 저장하지 않는다.
- [ ] 불필요한 계층과 간접 참조가 없다.
- [ ] 축약 때문에 동작이나 의미가 숨겨지지 않는다.
- [ ] 프로젝트 소유자가 구조와 데이터 흐름을 장기적으로 이해할 수 있다.

## 3. Single Source and Vocabulary

- [ ] 각 개념은 한 문서에서만 정의된다.
- [ ] 다른 문서는 정의를 복제하지 않고 링크로 참조한다.
- [ ] 하나의 개념에 하나의 영어 이름만 사용한다.
- [ ] 상수, enum, 필드 구조가 여러 위치에 중복되지 않는다.
- [ ] 링크와 파일명이 실제 구조와 일치한다.
- [ ] dangling reference는 의도된 상태다.

## 4. Responsibility and Dependencies

- [ ] 데이터 구조가 표현하려는 행동과 직접 대응한다.
- [ ] 함께 변하는 상태와 독립적인 책임이 적절히 묶이거나 분리되어 있다.
- [ ] 필드와 모듈의 소유권이 명확하다.
- [ ] 레이어 의존 방향과 값의 주입 위치가 명확하다.
- [ ] 변경 영향이 필요 이상으로 여러 영역에 퍼지지 않는다.
- [ ] 구현 편의가 행동 모델을 왜곡하지 않는다.

## 5. Specification Completeness

- [ ] 문서의 범위와 범위 밖 항목이 명확하다.
- [ ] 입력, 출력, 상태 전이, 기본값, 허용값, 단위가 필요한 만큼 정의되어 있다.
- [ ] 무효 입력, 오류, 누락, 마이그레이션 처리 방식이 필요한 만큼 정의되어 있다.
- [ ] 예시가 정의를 대신하지 않는다.
- [ ] why는 필요한 경우 rationale에 있고, spec에는 what만 남는다.
- [ ] 구현 세부를 과도하게 고정하지 않으면서 구현자의 추측도 요구하지 않는다.

## 6. Implementation Readiness

- [ ] Implementation Agent가 추가 제품 결정을 하지 않고 구현할 수 있다.
- [ ] Acceptance Criteria가 관찰 가능하고 검증 가능하다.
- [ ] 정상 흐름과 edge case를 테스트로 변환할 수 있다.
- [ ] 완료 여부를 코드, 테스트, 문서 상태로 확인할 수 있다.
- [ ] Discussion Scope와 Change Scope가 모두 식별되었다.

---

## Closure Gate

다음 조건을 모두 만족할 때만 문서를 닫는다.

- [ ] 🔴 항목이 없다.
- [ ] 🟡 항목이 결정되었거나 명시적으로 보류되었다.
- [ ] 정의가 완결되었다.
- [ ] 파급 파일이 식별되었다.
- [ ] Implementation Agent 지시와 Acceptance Criteria를 작성할 수 있다.
- [ ] 마지막 단순화 검토를 마쳤다.

---

## Review Output

```md
# Review: <document>

- Result: PASS | NEEDS DECISION | MUST FIX
- Discussion Scope:
- Change Scope:

## 🔴 Must Fix
- 없음

## 🟡 Needs Decision
- 없음

## Improvements Applied
- 없음

## Closure Gate
- [ ] Behavior
- [ ] Structure
- [ ] Simplicity
- [ ] Implementation Readiness
- [ ] Change Scope
```
