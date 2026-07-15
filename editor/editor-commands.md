# editor-commands — 커맨드·히스토리 계약

> 모든 note/event 편집은 command로만 데이터를 바꾼다. undo/redo·autosave·redraw가 이 계약 위에서 돈다.
> 시그니처 대응은 [[naming]] §2가 이 문서를 참조한다. 태그 명시 없으면 `[보존]`.

---

## 1. Command

```js
Command = { name, apply(), undo(), invalidates[] }
```

`dispatch(command)` = apply → cache invalidate → scope stack push → 해당 scope redo clear.

## 2. scope 분할 stack

| invalidates | scope |
|---|---|
| notes, textEvents | n |
| shapeEvents, laneEvents | s |
| tempos, timeSignatures | m |

- scope당 깊이 60.
- undo/redo 직전 해당 scope selection clear.
- editor session은 chart 하나다([[editor-graph]] §4).
- 파일 열기·새 chart 파생 등 session 교체 시 §5 baseline 규칙을 적용한다.

## 3. onDispatch listener

dispatch/undo/redo마다 listener가 발화한다. active scene redraw, dirty 표시([[persistence]] §5), autosave schedule([[persistence]] §6)은 edit layer 조립부가 구독한다. command layer는 render/storage를 모른다.

## 4. drag command

drag 중 live mutate, drag-end에 old/new snapshot command 1개를 dispatch한다. note 이동·shape/lane 위치 수정 공통.

## 5. history baseline

다른 chart 파일 열기, `.cfx`에서 다른 chart 선택, 새 chart 파생처럼 session이 교체되면 모든 scope stack을 clear한다. 이전 chart로 undo할 수 없다.

## 6. command 목록

| 신 이름 | 구 이름 | 비고 |
|---|---|---|
| AddNotes / DeleteNotes / MoveNotes | 동일 | |
| MirrorNotes | FlipNotes | mapping은 [[judge]] §4 |
| SetNoteDuration / ReplaceNotes | 동일 | |
| AddTextEvents / DeleteTextEvents / EditTextEvent | 동일 | 필드는 [[data-model]] |
| AddShapeEvents / DeleteShapeEvents / MutateShapeEvents | 동일 | |
| MirrorShapeEvents | FlipShapeEvents | isBlue 반전 + 위치 대칭 |
| ApplyShapeOps | 동일 | 여러 op = 1 undo |
| AddLaneEvents / DeleteLaneEvents / MutateLaneEvents | 구 AddLineEvent | `[신규]` |
| AddTempo / DeleteTempo / EditTempo | EditTempoBpm 등 | |
| AddTimeSignature / DeleteTimeSignature / EditTimeSignature | Add/EditTimeSig 등 | |

- shape/lane command는 apply·undo 양쪽에서 chain normalize.
- Ctrl+D는 기존 Add* command를 재사용한다.

## 7. chart field 편집·파생

chart identity·metadata·asset 연결 필드 편집은 command가 아니다 `[신규]`.

- 대상: `chartId`·`difficulty`·`subtitle`·`level`·`chartBy`·metadata·music/jacket 연결.
- 즉시 적용, undo 불가, 별도 scope 없음.
- autosave는 command listener가 아닌 해당 editor state change에서도 schedule한다.

“새 난이도”는 현재 chart에서 **새 독립 chart를 파생하여 session을 교체**한다. `Start Blank`/`Use Current Chart` 모드와 복사 대상 배열 선택의 단일 출처는 [[persistence]] §8.

- 같은 `songId` 유지, 새 `chartId`·difficulty·subtitle·level·chartBy 지정;
- 파생 이후 모든 metadata·timing·asset은 독립적으로 수정 가능;
- 영구적인 song-common 동기화는 없음.
- 현재 세션이 dirty면 [[persistence]] §5의 확인 절차(Save New Version/Discard/Cancel)를 먼저 거친다.

삭제는 OS 파일/library package 관리 소관이며 editor command가 아니다.

## 8. 결정 완료 / 잔여

확정:
- [x] command/dispatch·scope 3분할·깊이 60
- [x] listener·drag snapshot·session baseline
- [x] command 목록과 normalize
- [x] chart field는 undo 밖
- [x] 새 chart = 같은 songId의 독립 chart 파생, Start Blank/Use Current Chart 모드는 [[persistence]] §8 단일 출처 `[번복 반영]`

잔여:
- (없음)
