# DECISION LOG

이 문서는 Conflux의 중요한 설계 결정 상태를 찾기 위한 얇은 색인이다.

정의는 각 spec, 상세 근거는 `_rationale/`가 source of truth다. 이 문서는 정의나 이유를 복제하지 않는다.

## Scope

다음 결정만 기록한다.

- 기존 행동을 의식적으로 바꾼 결정
- 이전 결정을 번복한 결정
- 여러 spec 또는 레이어에 영향을 주는 결정
- 이후 다시 논쟁될 가능성이 높은 비직관적 결정

단순한 문구 수정, 링크 정리, 오탈자, 기존 원칙의 직접 적용은 기록하지 않는다.

## Status

- **Accepted** — 현재 유효
- **Superseded** — 이후 결정으로 대체됨
- **Deferred** — 의도적으로 보류됨

## Decisions

이 운영 체계를 도입한 이후 확정되는 결정부터 기록한다.

기존 결정은 README와 `_rationale/`에 이미 정리되어 있으므로 일괄 소급 등록하지 않는다. 과거 결정이 다시 변경되거나 검토될 때 해당 결정부터 이 로그에 편입한다.

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
