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
- settings: visual/sound 등. 값은 [[settings]].

| id | 화면 |
|---|---|
| title | 아무 입력 → mode-select |
| mode-select | play/editor/settings hub |
| song-select | derived song group + playable chart 선택 |
| song-credit | 선택 chart credit 자동 표시 |
| gameplay | active chart gameplay |
| result | result·best 표시 |

`song-select`의 song은 persisted 객체가 아니라 같은 `songId` chart들의 파생 group이다([[data-model]]).

---

## 4. mode-select

- play → song-select
- editor → editor start/graph
- settings → settings graph
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

표시:

- `Music by {selectedChart.metadata.musicBy}`
- `Jacket by {selectedChart.metadata.jacketBy}`
- `Chart by {selectedChart.chartBy}`

저장값에는 `by`를 넣지 않는다.

`song-credit → gameplay`는 `goScene('gameplay', replace)`로 통과점을 stack에서 제거한다. Retry/Back은 credit을 다시 거치지 않는다.

---

## 7. build gate

`FEATURES.*`가 mode item·scene 노출을 결정한다.

- off면 button 미표시, direct start는 title fallback.
- 코드는 제거하지 않으며 lazy mount로 비용을 피한다.
- `FEATURES.editor`가 public/internal build를 가른다.

---

## 8. game transition graph

```text
title → mode-select → song-select → song-credit → gameplay → result

song-select
  Space: quick options overlay
  Enter: selected chart 확정

gameplay
  clear/fail/force-end → result
  Esc → pause overlay
    Resume: 3s lead-in 후 재개
    Retry: 처음부터
    Exit: song-select

result
  Retry(F5): gameplay
  Back(Enter): song-select
```

pause는 engine을 살리는 overlay다. result는 정식 scene이다.

### result 표시

선택 chart의 title·musicBy·difficulty·subtitle·level / rank·state / score·accuracy / NEW BEST / judgment count / FAST·SLOW / max combo / best record / applied options.

records 연결은 [[records]], score/state는 [[constants]]·[[gauge]].

---

## 9. overlay와 host

### overlay

- pause: gameplay-owned interactive DOM overlay.
- text-event: gameplay canvas 표시.
- quick options: song-select/test가 각각 띄우는 shared component.

### engine host seam

engine은 host를 모르고 `CTX` 하나만 본다.

- game host: **선택 playable chart**의 metadata·timing·music과 settings를 주입.
- editor host: 현재 workspace chart를 proxy.
- engine은 Representative Chart나 songId group을 알지 않는다.

CTX 상세 → [[architecture]].

---

## 10. 결정 완료 / 잔여

확정:
- [x] 공용 root + 세 mode graph
- [x] song-select = derived song group + playable chart 선택 `[번복 반영]`
- [x] Representative preview → selected chart preview 전환
- [x] song-credit = selected chart credit
- [x] gameplay host = selected active chart
- [x] quick options 공유·no-record link
- [x] pause overlay·result scene·3s lead-in
- [x] build gate
- [x] 기록 초기화 진입점 — song-select, `FEATURES.recordReset` internal 게이트 (D-2026-017)

잔여:
- [ ] song-credit fade 등 구체 연출
- [ ] settings graph scene 묶음
- [ ] project `credits` scene 귀속
- [ ] quick options component의 정확한 layer 위치
