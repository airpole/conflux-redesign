# editor-commands — 커맨드·히스토리 계약

> 모든 편집은 커맨드로만 데이터를 바꾼다. undo/redo·자동저장·다시그리기가 전부 이 계약 위에서 돈다.
> 시그니처 대응은 [[naming]] §2가 이 문서를 참조한다. 출처: `commands.js`·`history.js` 실측. 태그 명시 없으면 `[보존]`.

---

## 1. Command

```
Command = { name, apply(), undo(), invalidates[] }
```

`dispatch(command)` = ① apply ② 캐시 invalidate(invalidates) ③ scope 스택에 push ④ 그 scope의 redo 스택 클리어.

## 2. scope 분할 스택

invalidates로 scope를 추론해 **탭별 독립 undo 타임라인**을 유지한다:

| invalidates | scope |
|---|---|
| `notes`, `textEvents` | `n` (notes 탭) |
| `shapeEvents`, `laneEvents` | `s` (shapes 씬) |
| `tempos`, `timeSignatures` | `m` (meta 탭) |

- 스택 깊이 scope당 **60** (초과 시 가장 오래된 것 버림).
- undo/redo 직전 해당 scope의 **선택을 클리어** — 제거된 객체를 선택이 물고 있는 stale 참조 방지.
- **chart 전환 시 n/s 스택 초기화** — 전환은 네비게이션이지 커맨드가 아니다([[editor-graph]] §4).

## 3. onDispatch 리스너

dispatch/undo/redo마다 리스너가 발화한다. **활성 탭 redraw와 autosave 스케줄([[persistence]] §3)은 리스너 구독으로 바깥(edit 레이어 조립부)이 처리** — 커맨드 계층은 렌더·저장을 모른다.

## 4. 드래그 편집의 커맨드화

드래그 중엔 라이브 뮤테이트(스택에 안 쌓음), **drag-end에 old/new 스냅샷을 담은 커맨드 1개**를 dispatch한다(apply는 new 재확정이라 최초 no-op, undo는 old 복원). 노트 이동·shape/lane 위치 수정 공통.

## 5. 히스토리 기준선

곡 로드/임포트 시 전 스택 클리어 — 그 이전으로 undo 불가.

## 6. 커맨드 목록 (구 → 신 재명명)

| 신 이름 | 구 이름 | 비고 |
|---|---|---|
| `AddNotes` / `DeleteNotes` / `MoveNotes` | AddNotes / DeleteNotes / MoveNotes | |
| `MirrorNotes` | FlipNotes | flip → mirror 재명명, 매핑은 [[judge]] §4 단일 출처 |
| `SetNoteDuration` / `ReplaceNotes` | 동일 | |
| `AddTextEvents` / `DeleteTextEvents` / `EditTextEvent` | 동일 | 필드는 [[data-model]] |
| `AddShapeEvents` / `DeleteShapeEvents` / `MutateShapeEvents` | 동일 | |
| `MirrorShapeEvents` | FlipShapeEvents | isBlue 반전 + 위치 대칭([[editor-editing]] §5) |
| `ApplyShapeOps` | 동일 | 여러 op 원자 dispatch(1 undo 단위) |
| `AddLaneEvents` / `DeleteLaneEvents` / `MutateLaneEvents` | (구 AddLineEvent 하나뿐) | `[신규]` — 구엔 AddLineEvent뿐(삭제·수정 공백) |
| `AddTempo` / `DeleteTempo` / `EditTempo` | AddTempo / DeleteTempo / EditTempoBpm | |
| `AddTimeSignature` / `DeleteTimeSignature` / `EditTimeSignature` | AddTimeSig / DeleteTimeSig / EditTimeSig | |

- shape·lane 계열 커맨드는 **apply와 undo 양쪽에서 체인 normalize**를 호출한다 — 체인 순서 불변식 유지, 평가 규칙은 [[shape]] §4 단일 출처.
- Ctrl+D duplicate(선택 구간 복제, [[editor-editing]] §7)는 `AddNotes`/`AddShapeEvents`/`AddLaneEvents` 재사용 — 새 커맨드 없음.

## 7. 결정 완료 / 잔여

확정:
- [x] Command 패턴·dispatch 절차·scope 3분할·깊이 60·redo 클리어·선택 클리어
- [x] onDispatch 훅(redraw·autosave), 드래그 = drag-end 스냅샷 커맨드, 기준선 클리어
- [x] 커맨드 목록·재명명, lane 3종 신설, normalize 양방향

- [x] chart 구조 조작은 **커맨드가 아니다** `[신규]` — 추가·복제·chartId 편집은 즉시 적용(undo 불가), **삭제만 confirm**. scope 신설 없음. 전환 시 스택이 초기화되는 세계에서 구조 조작 undo는 성립하기 어렵고(삭제 undo 시점엔 이력이 이미 소거됨), 파괴적인 건 삭제뿐이라 confirm으로 충분하다. 근거 → [[rationale#chart 구조 조작을 undo 밖에 둔 이유]]

잔여:
- (없음)
