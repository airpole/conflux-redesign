# editor-graph — 에디터 씬 그래프

> editor 모드의 화면 구조·전환·공유 상태를 정의한다. 상위 그래프(title → mode-select → editor)는 [[scene]]이 단일 출처.
> 편집 커맨드는 [[editor-commands]], 툴·키는 [[editor-editing]], 저장은 [[persistence]].
> 출처: `main.js`·`keyboard.js`·`tab-nav.js` 실측. 태그 명시 없으면 `[보존]`.

---

## 1. 그래프 — 탭 4개는 형제 scene `[신규]`

```
editor 진입 ─▶ start (새 곡 / 불러오기·최근 목록 → persistence §5)
                 └▶ notes ⟷ shapes ⟷ meta ⟷ test   (형제 scene 4개)
                                        test ─ Enter ─▶ gameplay (전체화면) ─ 종료/result ─▶ test
```

- **Tab 순환 = notes → shapes → test → notes** `[수정]`. **meta는 순환에서 제외** — 마우스 클릭으로만 진입(초기 입력 후 잘 안 바꾸는 영역). → [[rationale#meta 탭을 Tab 순환에서 뺀 이유]]
- scene 전환은 **상태를 리셋하지 않는다** — 공유 상태(§2)는 editor 그래프 공용이다. (game 그래프의 전환 의미론과 다름을 명시.)
- 이탈(→ mode-select/title) 시 **즉시 autosave** ([[persistence]] §3).

## 2. 공유 상태 (editorState)

- **스크롤·줌**: notes/shapes **공유** — 한쪽에서 움직이면 다른 쪽도 같은 위치.
- **선택**: 탭별 독립(selectedNotes / selectedShapeEvts·selectedLaneEvts).
- **currentChartIndex**: 편집 대상 chart. 상단 바 드롭다운으로 전환(§4).

## 3. 세로축 — 시간(ms) 비례로 통일 `[수정]`

에디터 캔버스의 세로축을 tick 비례에서 **시간(ms) 비례**로 바꾼다 — play 스크롤 방식([[timing]] §3)과 통일.

- 줌 = **viewMs**(화면에 담기는 시간) 조절. 스텝 ×1.35 `[보존값]`.
- 그리드·스냅·배치는 **tick으로 계산**하고 화면에는 ms로 투영한다(tick↔ms 변환은 [[timing]] §2). BPM 변속 구간에서 그리드 간격이 화면상 달라지는 것은 의도된 결과다.
- `[수정]` 근거: 구 에디터는 tick 비례(tpp)라 같은 노트 밀도가 BPM에 따라 다른 시각 밀도로 보였다. 시간 비례면 "화면에서 노트가 나오는 시간"이 항상 같다. → [[rationale#에디터 세로축을 시간 비례로 바꾼 이유]]
- 잔여: viewMs 기본값·줌 범위는 재구현 시 play의 SCROLL_VIEW_MS 실측과 함께 확정.

## 4. meta 탭

- 상단 = **chart 소속**(difficulty·level·chartBy + chart 목록: 추가/삭제/복제/**chartId 편집** — [[cfx]] §3), 하단 = **song 공통**(metadata·tempos·timeSignatures). 한 화면 + 구획 표시 `[수정]`.
- chart 전환은 상단 바 드롭다운(모든 탭에서 노출) `[신규]`. 전환 시 undo 스택 초기화(잠정).
- 잔여(보류 — 토의 필요): chart 전환의 undo 정책 구체화, chart 추가/삭제/복제 커맨드의 스코프([[editor-commands]] §7).

## 5. test 탭과 gameplay

test는 판정·게이지가 도는 **실제 플레이 엔진**을 쓴다. gameplay는 "test에서 에디터 기능을 빼고 제약(전체화면 등)을 더한 것" — 같은 엔진을 공유하고 호스트만 다르다. → [[rationale#gameplay를 test의 제약형으로 보는 이유]]

| 입력 | 동작 |
|---|---|
| `Space` | **test 씬 안**에서 현재 스크롤 위치부터 즉시 재생(lead-in 없음). 판정·게이지 있음 `[수정 — 구는 3초 lead-in]` |
| `Enter` | **gameplay scene 진입**(전체화면 전환) 후 현재 위치부터 **3초 lead-in** 재생 `[수정]` |
| `Esc` | 세션 중단 → test idle 복귀 |
| `A` | autoplay 토글 (idle) |
| 액션 키(F1/F2/F5) | idle에서도 동작 `[보존]` |

- 구 idle 단축키 중 `M`(mirror)·`F`(Fast/Slow)는 **삭제** `[수정]` — 빠른 패널([[scene]] §9)이 대체.
- gameplay가 곡 끝에 닿으면 result를 띄우고 Back으로 test에 복귀.
- **에디터 발원 판(test 내 재생·gameplay 진입 모두)은 항상 무기록** `[수정]` — 게이트 정의는 [[settings]] §2 (4번째 조건), 근거 → [[rationale#에디터 발원 판을 항상 무기록으로 둔 이유]].

## 6. 결정 완료 / 잔여

확정:
- [x] 탭 4 scene·Tab 순환(meta 제외)·전환 무리셋·이탈 autosave
- [x] 스크롤·줌 공유 / 선택 독립 / 세로축 ms 비례(viewMs 줌)
- [x] meta 한 탭 + 구획(chart 상단·song 하단), chart 드롭다운 전환
- [x] test: Space=씬 내 즉시 재생, Enter=gameplay(3초 lead-in), Esc 복귀, M·F 삭제
- [x] 에디터 발원 판 무기록

잔여:
- [ ] chart 전환 undo 정책·chart 구조 커맨드 스코프 (보류 — 토의)
- [ ] viewMs 기본값·줌 범위 (재구현 시 실측 확정)
