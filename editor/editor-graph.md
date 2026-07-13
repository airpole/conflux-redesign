# editor-graph — 에디터 씬 그래프

> editor 모드의 화면 구조·전환·공유 상태를 정의한다. 상위 그래프(title → mode-select → editor)는 [[scene]]이 단일 출처.
> 편집 커맨드는 [[editor-commands]], 툴·키는 [[editor-editing]], 저장은 [[persistence]].
> 출처: `main.js`·`keyboard.js`·`tab-nav.js` 실측. 태그 명시 없으면 `[보존]`.

---

## 1. 그래프 — start + 형제 scene 4개 `[신규]`

```
editor 진입 ─▶ start (정식 scene, 진입 1회: 새 곡 / 파일 열기 / 이어서 편집 → persistence §5)
                 └▶ notes ⟷ shapes ⟷ meta ⟷ test   (형제 scene 4개)
                                        test ─▶ gameplay (전체화면) ─ 종료/result ─▶ test
```

- **start는 정식 scene** `[신규]` — 진입 시 1회만 거치고 이후 start로 돌아가지 않는다. 파일 열기는 이후 어디서나 Ctrl+O = OS 파일 픽커([[persistence]] §5).
- **Tab 순환 = notes → shapes → test → notes** `[수정]`. **meta는 순환에서 제외** — 마우스 클릭으로만 진입(초기 입력 후 잘 안 바꾸는 영역). → [[rationale#meta 탭을 Tab 순환에서 뺀 이유]]
- 에디터 단축키의 **유일 출처는 [[editor-editing]] §5~§6** — 이 문서는 동작 정의만 갖고 키는 링크한다.
- scene 전환은 **상태를 리셋하지 않는다** — 공유 상태(§2)는 editor 그래프 공용이다. (game 그래프의 전환 의미론과 다름을 명시.)
- 이탈(→ mode-select/title) 시 **즉시 autosave** ([[persistence]] §3).

## 2. 공유 상태 (editorState)

- **스크롤·줌**: notes/shapes **공유** — 한쪽에서 움직이면 다른 쪽도 같은 위치.
- **선택**: 탭별 독립(selectedNotes / selectedShapeEvts·selectedLaneEvts).
- 편집 대상은 **chart 하나** — 세션 = chart 파일 1개(§4). currentChartIndex·드롭다운 전환은 폐기 `[번복]`.

## 3. 세로축 — 시간(ms) 비례로 통일 `[수정]`

에디터 캔버스의 세로축을 tick 비례에서 **시간(ms) 비례**로 바꾼다 — play 스크롤 방식([[timing]] §3)과 통일.

- 줌 = **viewMs**(화면에 담기는 시간) 조절. 스텝 ×1.35 `[보존값]`.
- 그리드·스냅·배치는 **tick으로 계산**하고 화면에는 ms로 투영한다(tick↔ms 변환은 [[timing]] §2). BPM 변속 구간에서 그리드 간격이 화면상 달라지는 것은 의도된 결과다.
- `[수정]` 근거: 구 에디터는 tick 비례(tpp)라 같은 노트 밀도가 BPM에 따라 다른 시각 밀도로 보였다. 시간 비례면 "화면에서 노트가 나오는 시간"이 항상 같다. → [[rationale#에디터 세로축을 시간 비례로 바꾼 이유]]
- 잔여: viewMs 기본값·줌 범위는 재구현 시 play의 SCROLL_VIEW_MS 실측과 함께 확정.

## 4. meta 탭 — 단일 chart 세션 `[번복]`

> meta 씬에는 **'에디터 설정' 구역** `[신규]`이 있다 — 에디터 전용 설정([[settings]] §3, 현재 `measureLabelOffset`)의 유일한 UI 노출 지점. 게임 settings 씬에는 나타나지 않는다.

에디터 세션은 **chart 파일 하나**를 편집한다 — 이전 확정(chart 목록·드롭다운 전환·전환 시 스택 초기화)을 폐기한다 `[번복]`. 난이도 이동 = 다른 파일 열기, 또는 **새 난이도**(아래). → [[rationale#에디터를 단일 chart 세션으로 둔 이유]]

- 상단 = **chart 소속**(chartId·difficulty·subtitle·level·chartBy), 하단 = **song 공통**(metadata·tempos·timeSignatures). 한 화면 + 구획 표시 `[수정]`.
- **chartId는 difficulty·subtitle에서 유도** `[신규]`: init 선택 = 0 자동 / Trace~Flux + subtitle 없음(기본 채보) = 해당 고정 슬롯 1~4 자동 / 그 외(추가 채보) = **5+ 직접 입력**(5 미만 입력은 거부 + 토스트). 곡 내 중복 검증은 에디터가 할 수 없다(다른 파일을 모름) — **로더 검증이 전담**([[cfx]] §8).
- **새 난이도** 액션 `[신규]`: 현재 chart에서 곡 공통 필드를 상속하고 노트를 백지로 새 chart 편집을 시작한다(커맨드 아님 — 세션 교체, 실행 전 workspace 저장). init 워크플로([[cfx]] §5)와 같은 일을 에디터 안에서 한다.
- chart 메타 필드 편집은 즉시 적용(undo 밖 — [[editor-commands]] §7). chart 삭제는 에디터 기능이 아니다 — 파일 삭제는 OS 소관.

## 5. test 탭과 gameplay

test는 판정·게이지가 도는 **실제 플레이 엔진**을 쓴다. gameplay는 "test에서 에디터 기능을 빼고 제약(전체화면 등)을 더한 것" — 같은 엔진을 공유하고 호스트만 다르다. → [[rationale#gameplay를 test의 제약형으로 보는 이유]]

- **idle 구성** `[보존]`(실측: play-render.js drawPlayIdle): 16:9 게임 프레임에 현재 위치의 **정지 프리뷰**(노트·shape·판정선, conflict 경고 표시 유지) + HUD(직전 세션 값) + 시크 바. 여기에 빠른 옵션 패널([[scene]] §9)이 추가된다 `[수정]`.
- 재생 두 경로: **씬 안 즉시 재생**(현재 위치부터, lead-in 없음, 판정·게이지 있음 `[수정 — 구는 3초 lead-in]`)과 **gameplay 진입**(전체화면, 현재 위치부터 3초 lead-in `[수정]`). 키는 [[editor-editing]] §5의 test 씬 표.
- 구 idle 단축키 중 `M`(mirror)·`F`(Fast/Slow)는 **삭제** `[수정]` — 빠른 패널([[scene]] §9)이 대체.
- gameplay가 곡 끝에 닿으면 result를 띄우고 Back으로 test에 복귀.
- **에디터 발원 판(test 내 재생·gameplay 진입 모두)은 항상 무기록** `[수정]` — 게이트 정의는 [[settings]] §2 (4번째 조건), 근거 → [[rationale#에디터 발원 판을 항상 무기록으로 둔 이유]].

## 6. 결정 완료 / 잔여

확정:
- [x] 탭 4 scene + start 정식 scene(진입 1회·복귀 없음)·Tab 순환(meta 제외)·전환 무리셋·이탈 autosave
- [x] 스크롤·줌 공유 / 선택 독립 / 세로축 ms 비례(viewMs 줌)
- [x] meta 한 탭 + 구획(chart 상단·song 하단), **단일 chart 세션**(드롭다운·chart 목록 폐기 `[번복]`)
- [x] chartId 유도 규칙(init 0 / 기본 채보 1~4 / 추가 5+ 직접 입력)·새 난이도 액션·삭제는 OS 소관
- [x] test: 씬 내 즉시 재생·gameplay(3초 lead-in)·M·F 삭제·idle 구성 [보존] 기입
- [x] 에디터 발원 판 무기록
- [x] chart 메타 편집 = 즉시 적용(undo 밖)

잔여:
- [ ] viewMs 기본값·줌 범위 (재구현 시 실측 확정)
