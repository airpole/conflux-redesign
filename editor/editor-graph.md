# editor-graph — 에디터 씬 그래프

> editor 모드의 화면 구조·전환·공유 상태를 정의한다. 상위 graph(title → mode-select → editor)는 [[scene]]이 단일 출처.
> command는 [[editor-commands]], tool/key는 [[editor-editing]], 저장은 [[persistence]].

---

## 1. graph — start + 형제 scene 4개 `[신규]`

```text
editor 진입 ─▶ start (새 chart / 파일 열기 / .cfx 열기 / 이어서 편집)
                  └▶ notes ⟷ shapes ⟷ meta ⟷ test
                                         test ─▶ gameplay ─ result ─▶ test
```

- start는 정식 scene이며 editor 진입 때 한 번 거친다.
- "새 chart(init) 만들기"는 새 song 생성이다([[persistence]] §7). "이어서 편집"은 유효한 dirty workspace가 있을 때만 노출([[persistence]] §6).
- Ctrl+O는 어디서나 OS file picker([[persistence]] §9).
- Tab 순환: `notes → shapes → test → notes`. meta는 click 진입.
- editor shortcut의 단일 출처는 [[editor-editing]] §5~§6.
- scene 전환은 editorState를 reset하지 않는다.
- editor 이탈 시 dirty라면 즉시 workspace 저장을 시도한다([[persistence]] §6). 다른 세션으로 교체 시 dirty confirm은 [[persistence]] §5.

## 2. shared editorState

- scroll/zoom: notes·shapes 공유.
- selection: scene별 독립.
- 편집 대상: **독립 chart 하나**.
- currentChartIndex·song chart dropdown·multi-chart workspace는 없다 `[번복]`.

## 3. vertical axis — time(ms) proportional `[수정]`

- notes/shapes canvas는 ms 비례.
- zoom=`viewMs`, step ×1.35.
- grid/snap은 tick으로 계산 후 ms로 투영.
- BPM 변경 구간의 시각 간격 변화는 정확한 결과.
- viewMs 기본·범위는 재구현 시 실측 잔여.

## 4. meta scene — 독립 chart session `[번복]`

meta scene 한 화면에서 현재 chart의 모든 편집 필드를 구획한다.

### chart identity·display

- songId(read-only)
- chartId
- difficulty
- subtitle
- level
- chartBy

### chart-owned metadata·timing `[번복]`

- metadata(title/musicBy/jacketBy/offset)
- tempos
- timeSignatures
- connected music/jacket file names

### editor settings

- measureLabelOffset 등 [[settings]] §3.

`chartId` 입력 규칙:

- init → 0 자동;
- subtitle 없는 Trace/Drift/Surge/Flux 기본 chart → 1/2/3/4 자동;
- 추가 chart → 5+ 직접 입력;
- 5 미만의 추가 id 거부.

다른 파일을 모르는 editor는 group-wide duplicate를 최종 보장하지 않는다. `.cfx` packager/loader가 `songId + chartId`와 visible combination을 검증한다([[cfx]]).

### 새 chart 파생

“새 난이도”는 현재 chart에서 같은 `songId`의 새 독립 chart session을 시작한다. `Start Blank`/`Use Current Chart` 모드와 필드·배열 복사 규칙의 단일 출처는 [[persistence]] §8.

- 새 chart는 파생 직후부터 독립적으로 diverge;
- 현재 세션이 dirty면 실행 전 [[persistence]] §5의 확인 절차(Save New Version/Discard/Cancel)를 거친다;
- command가 아니라 session replacement, history clear.

chart field edit는 즉시 적용·undo 밖([[editor-commands]] §7). 삭제는 OS/library 소관.

## 5. test와 gameplay

- 같은 실제 play engine을 사용하고 host만 다르다.
- idle: 16:9 frame, current position static preview, HUD, seek bar, conflict 표시, quick options.
- test scene 즉시 재생: current position, lead-in 없음.
- gameplay 진입: fullscreen, current position, 3초 lead-in.
- M/F 구 shortcut은 quick options가 대체.
- editor-origin play는 항상 no-record([[settings]] §2).
- active chart가 자기 metadata·timing·music을 engine context에 제공한다.

## 6. 결정 완료 / 잔여

확정:
- [x] start + 4 scene graph, Tab cycle(meta 제외)
- [x] single independent chart session `[번복]`
- [x] chart-owned metadata·timing·asset UI `[번복]`
- [x] new chart = same-songId independent derivation, dirty confirm before session switch `[번복]`
- [x] songId read-only in meta scene(derive 제거) `[번복]`
- [x] ms-proportional vertical axis
- [x] test/gameplay shared engine·editor-origin no-record

잔여:
- [ ] viewMs 기본값·zoom 범위
