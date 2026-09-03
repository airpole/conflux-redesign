# scene — 화면 그래프

> 한 번에 한 scene만 보인다. scene 위에 잠깐 덮는 층은 overlay다.
> 공용 root(title·mode-select) 아래 game/editor/settings 세 mode graph가 형제로 갈린다.
> 짝 문서: [[glossary]], [[architecture]], [[settings]], [[data-model]], [[cfx]], [[song-select]].

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
- settings: `play ↔ visual ↔ sound ↔ option` 4 scene 평면 graph `[수정]` — 구 단일 scene + 4 tab을 editor와 같은 scene mechanism으로 통일. `option` scene은 GAUGE·OPTION 두 category를 함께 표시하고(D-2026-074), `sound` scene은 구 PLAY 소속이던 볼륨 3필드(`volMaster`/`volMusic`/`volEffect`)를 분리한 신규 category다(D-2026-075) — `[[settings]]` §2가 category 정의의 단일 출처. 이 4-scene은 D-2026-020이 원래 정한 4-scene(play/visual/gauge/option)과 **다른 구성**이다 — 근거는 `ui-design.md` §2.6.
- credits: mode graph가 아닌 root 소속 단일 scene(§7).

| id | 화면 |
|---|---|
| title | 아무 키보드 입력 또는 마우스 클릭 → mode-select `[수정]` (D-2026-078 — "아무 입력"이 클릭을 포함하는지 미명시였다) |
| mode-select | play/editor/settings/credits hub |
| song-select | derived song group + playable chart 선택 |
| song-credit | 선택 chart credit 자동 표시 |
| gameplay | active chart gameplay |
| result | result·best 표시 |
| settings-play/-visual/-sound/-option | player settings 4 scene (option = GAUGE + OPTION category) |
| credits | project staff credit `[신규]` |

`song-select`의 song은 persisted 객체가 아니라 같은 `songId` chart들의 파생 group이다([[data-model]]).

---

## 4. mode-select

- play → song-select
- editor → editor start/graph
- settings → settings graph (진입 scene: `settings-play`)
- credits → credits scene. 항상 노출, build gate 없음.
- Back/Esc/Backspace → title `[수정]` (D-2026-052 — 전체화면 중 ESC가 브라우저에 귀속돼 앱에 안 닿는 문제의 대체키)

mode 추가의 단일 확장점이다.

---

## 5. song-select

library의 playable chart를 탐색·선택한다. 화면 구성·목록 모델·정렬·검색·커서 이동·기록 표시·preview 규칙의 단일 출처는 [[song-select]]다.

- 진입: mode-select의 game.
- 나가기: chart 선택 확정 + `Enter` → song-credit.
- overlay: `Space` → quick options.

### quick options

- scrollSpeed
- gaugeMode
- mirror
- staticShape(no-record)
- autoplay(no-record)

**내부 조작**(D-2026-049): 위/아래 화살표 = row 이동. 값 변경은 마우스 클릭(그
값으로 즉시 점프) / 좌우 화살표(한 칸 step) / 스크롤 휠(위아래로 한 칸씩) 셋.
**Enter가 지금 row의 바뀐 값을 확정**한다 — row를 이동하면 그 전 row의
미확정 값은 버려지고 마지막 확정값으로 돌아간다. bool 필드(mirror·
staticShape·autoplay)는 값이 둘뿐이라 방향과 무관하게 토글. 로직은
`src/core/core-quick-options.ts` — 배치·렌더는 host 몫(M4-7·M5-6).

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

- 진입: mode-select. 이탈: Back/Esc/Backspace → mode-select. `[수정]` (D-2026-052)
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
  곡 끝(songEndMs 경과) → clear/fail 평가 → result
  force-end(gauge 0 / lock 파기) → result
  autoplay 판은 result 없이 → song-select
  Esc/Backspace → pause overlay `[수정]` (D-2026-052 — Backspace는 다른 화면의 Back과 같은 키로 통일)
    Resume: 정지 카운트다운 후 pause 지점부터 재개 — 시간 되감기 없음, 기록 유지 (D-2026-022)
    Retry: 처음부터
    Exit: song-select

result
  Retry(Enter): gameplay `[수정]` (D-2026-053 — F5는 브라우저 새로고침으로 소비될 수 있어 배제, Space는 곡 종료 직후 반사 입력 위험이 있어 배제)
  Back(Backspace): song-select `[수정]` (D-2026-053 — D-2026-052가 정한 "Backspace = 전 씬 공통 뒤로" 통일의 예외를 없앤다)
```

곡이 끝나는 시각 `songEndMs`의 정의는 [[timing]] §9다.

autoplay로 돌린 판은 곡이 끝나면 result를 거치지 않고 song-select로 돌아간다 `[신규]`. editor test host에서는 편집 화면으로 복귀한다 `[보존]`.

pause는 engine을 살리는 overlay다. result는 정식 scene이다.

Resume은 **정지 카운트다운 재개**다 `[수정]` (D-2026-022): 화면·시간을 pause 지점에 고정한 채 카운트다운을 표시하고, 끝나면 정확히 그 지점부터 음악·판정이 흐른다. 되감기(lead-in) 없음. pause 사용은 no-record 게이트와 무관하다 — mid-start 정의는 [[settings]] §2.

탭이 백그라운드로 전환되면(`visibilitychange` hidden) gameplay는 자동으로 pause overlay를 연다 `[신규]`. Resume 규칙은 위와 같다. 이 동작은 설정과 무관하게 항상 켜져 있다.

창 포커스만 잃은 경우(blur, 탭은 계속 보임)의 auto-pause는 `Settings.pauseOnBlur`(기본값 `true`)를 따른다 `[수정]` (D-2026-089) — 이전 판은 devtools를 여는 등 탭이 보이는 채로 blur만 뜨는 상황의 오탐을 피하려고 blur를 아예 무시했으나, 기본값을 켜 둔 채로 재검토했다: 플레이어가 자리를 비우거나 다른 창을 볼 때 진행 중인 판이 안전하게 멈추는 쪽을 기본으로 삼는 편이 devtools 오탐(끄면 피할 수 있다)보다 우선한다고 판단했다. `pauseOnBlur`를 끄면 이전 판의 동작(blur 무시)으로 정확히 되돌아간다.

`.cfx` decode·음원 로드 등 비동기 작업이 [[constants]] `LOADING_INDICATOR_DELAY_MS`를 넘기면 로딩 표시를 낸다 `[신규]`.

**Esc 전체화면 충돌과 대체키** `[수정]` (D-2026-052): 전체화면 중에는 Esc가 브라우저의 전체화면 탈출 단축키로 예약되어 앱에 도달하지 않고 `preventDefault()`로도 막을 수 없다. Esc 바인딩이 있던 세 곳(credits→title, song-select→mode-select, gameplay pause)에 비-Esc 대체키를 더한다 — **Backspace**를 "화면 뒤로/일시정지" 전용 대체키로 통일해서 쓴다(gameplay에서도 Backspace를 누르면 pause가 열린다, title·mode-select와 같은 키). song-select의 quick options overlay(Esc/Space로 닫기)는 이미 Space가 있어 추가 대체키가 필요 없다 — 이 overlay의 Space를 Backspace로 옮길지는 별도 사안으로 남는다(D-2026-053 참조).

result는 원래 Esc를 쓰지 않는 화면이라 이 문제와 무관했지만, `Back(Enter)`이 위 통일에서 유일한 예외로 남는 문제가 있었다 — D-2026-053이 result의 Back/Retry 키 배정을 `Back(Backspace)`/`Retry(Enter)`로 정정해 예외를 없앴다. F5(브라우저 새로고침과 충돌 가능)와 Space(곡 종료 직후 반사 입력 위험)는 Retry에서 배제됐다.

Resume은 mid-start 시드 루틴을 호출하지 않는다 `[번복]` (D-2026-024): pause는 기존 head/tail 결과와 활성 Hold를 그대로 보존하고, 카운트다운 중 눌린 lane 키만 모아 pause anchor에서 `reconcileHeldCapacity`를 실행한다. 과거 노트 재시드는 없다. 판정 모델 단일 출처는 [[judge]] §10.

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
- [x] 탭 백그라운드 시 auto-pause(설정과 무관하게 항상) `[신규]` — blur는 `Settings.pauseOnBlur`(기본 `true`)를 따름 `[수정]` (D-2026-089, 최초는 blur 제외였다)
- [x] 로딩 표시 임계 `[신규]`
- [x] 곡 종료 시각·autoplay 종료 전이 — 정의는 [[timing]] §9 (D-2026-030)
- [x] build gate
- [x] 기록 초기화 진입점 — song-select, `FEATURES.recordReset` internal 게이트 (D-2026-017)
- [x] song-credit fade 연출 — 수치는 [[constants]] `CREDIT_*` (D-2026-020)
- [x] settings graph = play/visual/sound/option 4 scene(D-2026-020이 정한 원래 4-scene과는 다른 구성), option scene이 GAUGE+OPTION 두 category를 함께 표시 (D-2026-020, scene 경계는 D-2026-074(GAUGE→OPTION)·D-2026-075(SOUND 분리)로 수정 — M3.5-2)
- [x] credits = root 소속 단일 scene, mode-select 진입 (D-2026-020)
- [x] quick options 배치 = host 소유 — song-select overlay / test embedded panel (D-2026-020)
- [x] pause Resume은 mid-start 시드를 호출하지 않음 — 보존된 활성 Hold를 pause anchor에서 재조정 (D-2026-024)

잔여:
- [ ] credits scene의 `Project Staff` 실제 인원 — M6-1이 `Music`/`Chart`/
  `Jacket` 세 섹션(library 스캔·자동 dedupe, `ui-design.md` §2.8.5)은
  배선했다(`game-credits.ts`, D-2026-107) — `Project Staff`만 여전히
  placeholder다(`scene-credits.ts`의 `PROJECT_STAFF`, 손으로 유지하는
  고정 목록이라는 방향은 이미 정해져 있고 실제 이름만 없다).
