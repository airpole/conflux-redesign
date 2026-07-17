# scene — 화면 그래프

> 한 번에 한 scene만 보인다. scene 위에 잠깐 덮는 층은 overlay다.
> 공용 root(title·mode-select) 아래 game/editor/settings 세 mode graph가 형제로 갈린다.
> 짝 문서: [[glossary]], [[architecture]], [[settings]], [[data-model]], [[cfx]].

---

## 1. scene · overlay · mode graph

- **scene**: 최상위 화면. 전환하면 이전 scene은 숨는다.
- **overlay**: 현재 scene과 engine을 살린 채 위에 덮는다. pause·text-event·quick options.
- **mode graph**: 여러 scene의 묶음. game/editor/settings는 형제다.

editor의 notes/shapes/test/meta도 scene이며 구 내부 tab 개념은 폐기했다.

---

## 2. scene mechanism `[보존]`

```js
scene = {
  id,
  mount(),
  onEnter(),
  onExit(),
}
```

- lazy mount: 첫 진입 1회.
- 단일 가시성: 항상 하나의 scene.

```js
goScene(id)
goScene(id, replace)
goBack()
resetSceneStack()
```

- 같은 scene 전환 no-op.
- game은 stack형, editor/settings는 평면형.

---

## 3. 공용 root + 세 graph

```text
                       title
                         │
                    mode-select
       ┌─────────────────┼─────────────────┐
     play              editor            settings
       │                  │                 │
 game graph          editor graph      settings graph
```

- game: `song-select → song-credit → gameplay → result`.
- editor: `notes ↔ shapes ↔ test ↔ meta` + start scene. 상세 [[editor-graph]].
- settings: `play ↔ visual ↔ gauge ↔ option` 4 scene 평면 graph `[수정]` — 구 단일 scene + 4 tab을 editor와 같은 scene mechanism으로 통일. category·값 정의는 [[settings]] §2.
- credits: mode graph가 아닌 root 소속 단일 scene(§7).

| id | 화면 |
|---|---|
| title | 아무 입력 → mode-select |
| mode-select | play/editor/settings/credits hub |
| song-select | derived song group + playable chart 선택 |
| song-credit | 선택 chart credit 자동 표시 |
| gameplay | active chart gameplay |
| result | result·best 표시 |
| settings-play/-visual/-gauge/-option | player settings 4 category |
| credits | project staff credit `[신규]` |

`song-select`의 song은 persisted 객체가 아니라 같은 `songId` chart들의 파생 group이다([[data-model]]).

---

## 4. mode-select

- play → song-select
- editor → editor start/graph
- settings → settings graph (진입 scene: `settings-play`)
- credits → credits scene. 항상 노출, build gate 없음.
- Back/Esc → title

mode 추가의 단일 확장점이다.

---

## 5. song-select — group + chart 선택 `[번복 반영]`

library의 `.cfx` 하나를 derived song group으로 표시하고 그 안의 playable chart를 선택한다.

### 표시·preview

- chart 선택 전: Representative Chart의 title·musicBy·jacket·preview music.
- playable chart 선택 후: 선택 chart의 metadata·jacket·music·timing.
- chart 변경 시 preview music을 해당 chart music으로 전환한다.
- init은 playable 목록에 표시하지 않는다.
- chart별 `bestState`·`bestRank` badge는 [[records]].

### 입력

- chart 선택 확정 + Enter → song-credit → gameplay.
- Space → quick options overlay.
- 기록 초기화: 선택 playable chart의 record 삭제 진입점. `FEATURES.recordReset`(game-internal)에서만 노출 — 규칙 단일 출처는 [[records]] §4.

### quick options

- scrollSpeed
- gaugeMode
- mirror
- staticShape(no-record)
- autoplay(no-record)

song-select와 editor test가 같은 component를 사용한다. no-record 단일 출처는 [[settings]] §2.

`cmod`·`hidden`은 폐기. F/S·judge line·volume은 full settings 소관.

---

## 6. song-credit

선택한 playable chart의 credit를 gameplay 직전에 5초 표시하고 자동 진행한다. 입력·skip·back 없음.

연출 `[신규]`: fade-in → 유지 → fade-out. 텍스트 3줄 동시 fade, 배경은 gameplay와 같은 검정. 수치는 [[constants]] `CREDIT_*` 단일 출처.

표시:

- `Music by {selectedChart.metadata.musicBy}`
- `Jacket by {selectedChart.metadata.jacketBy}`
- `Chart by {selectedChart.chartBy}`

저장값에는 `by`를 넣지 않는다.

`song-credit → gameplay`는 `goScene('gameplay', replace)`로 통과점을 stack에서 제거한다. Retry/Back은 credit을 다시 거치지 않는다.

---

## 7. credits `[신규]`

project staff credit scene. chart credit(song-credit)과 별개 — 근거는 [[rationale#song-credit과 credits를 가른 이유]].

- 진입: mode-select. 이탈: Back/Esc → mode-select.
- 입력·상호작용 없음(스크롤 제외). engine을 사용하지 않는 정적 scene.
- 표시 내용은 미확정(placeholder) — scene 골격만 확정하고 내용은 후속 결정으로 채운다.

---

## 8. build gate

`FEATURES.*`가 mode item·scene 노출을 결정한다.

- off면 button 미표시, direct start는 title fallback.
- 코드는 제거하지 않으며 lazy mount로 비용을 피한다.
- `FEATURES.editor`가 public/internal build를 가른다.

---

## 9. game transition graph

```text
title → mode-select → song-select → song-credit → gameplay → result

song-select
  Space: quick options overlay
  Enter: selected chart 확정

gameplay
  clear/fail/force-end → result
  Esc → pause overlay
    Resume: 정지 카운트다운 후 pause 지점부터 재개 — 시간 되감기 없음, 기록 유지 (D-2026-022)
    Retry: 처음부터
    Exit: song-select

result
  Retry(F5): gameplay
  Back(Enter): song-select
```

pause는 engine을 살리는 overlay다. result는 정식 scene이다.

Resume은 **정지 카운트다운 재개**다 `[수정]` (D-2026-022): 화면·시간을 pause 지점에 고정한 채 카운트다운을 표시하고, 끝나면 정확히 그 지점부터 음악·판정이 흐른다. 되감기(lead-in) 없음. pause 사용은 no-record 게이트와 무관하다 — mid-start 정의는 [[settings]] §2.

### result 표시

선택 chart의 title·musicBy·difficulty·subtitle·level / rank·state / score·accuracy / NEW BEST / judgment count / FAST·SLOW / max combo / best record / applied options.

records 연결은 [[records]], score/state는 [[constants]]·[[gauge]].

---

## 10. overlay와 host

### overlay

- pause: gameplay-owned interactive DOM overlay.
- text-event: gameplay canvas 표시.
- quick options: layer-agnostic shared component. 배치는 host 소유 —
  - song-select: Space로 여닫는 interactive DOM overlay(pause와 같은 층). 열림 중 scene 입력 차단, Esc/Space로 닫기. `[신규]`
  - editor test: scene embedded 상시 panel. `[보존]` (구 Play-tab option bar 계승)

### engine host seam

engine은 host를 모르고 `CTX` 하나만 본다.

- game host: **선택 playable chart**의 metadata·timing·music과 settings를 주입.
- editor host: 현재 workspace chart를 proxy.
- engine은 Representative Chart나 songId group을 알지 않는다.

CTX 상세 → [[architecture]].

---

## 11. 결정 완료 / 잔여

확정:
- [x] 공용 root + 세 mode graph
- [x] song-select = derived song group + playable chart 선택 `[번복 반영]`
- [x] Representative preview → selected chart preview 전환
- [x] song-credit = selected chart credit
- [x] gameplay host = selected active chart
- [x] quick options 공유·no-record link
- [x] pause overlay·result scene·정지 카운트다운 재개(기록 유지) `[수정]` (D-2026-022)
- [x] build gate
- [x] 기록 초기화 진입점 — song-select, `FEATURES.recordReset` internal 게이트 (D-2026-017)
- [x] song-credit fade 연출 — 수치는 [[constants]] `CREDIT_*` (D-2026-020)
- [x] settings graph = play/visual/gauge/option 4 scene (D-2026-020)
- [x] credits = root 소속 단일 scene, mode-select 진입 (D-2026-020)
- [x] quick options 배치 = host 소유 — song-select overlay / test embedded panel (D-2026-020)

잔여:
- [ ] credits scene 표시 내용 (scene 골격은 확정, 내용은 후속 결정)
