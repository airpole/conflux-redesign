# settings — 플레이어 설정 단일 출처

> 저장되는 **chart 데이터**([[data-model]])와 별개로, 플레이어가 1회 정하는 영속 설정을 여기 모은다.
> chart 또는 `.cfx`와 함께 배포되지 않으며 로컬 한 객체로 영속된다.
> 필드명은 [[naming]], 개념은 [[glossary]], 근거는 [[rationale]].

---

## 1. 성격 — chart 데이터가 아니다 `[번복 반영]`

settings는 사람의 환경·취향이다. 같은 chart를 누가 치든 달라지는 값이라 chart나 songId group에 묶지 않는다.

- 저장: local persistent object 하나, default 위 saved value merge.
- 적용: engine이 읽는 자리에 injection. settings module은 engine을 import하지 않는다.
- 경계: chart 제작자가 정하는 metadata·timing·events는 [[data-model]], player 환경은 settings.

---

## 2. category

### PLAY — input·audio sync

- `scrollSpeed` — note visual scroll density. 범위 [[constants]] `SCROLL_SPEED_*`.
- `audioOffset`(ms) — player device audio output compensation. active chart의 `metadata.offset`과 다른 축.
- `visualOffset`(ms) — judgment clock compensation. press/release input timestamp에 적용 `[보존]`.
- `volMaster / volMusic / volEffect`.
- key mapping도 PLAY 소속.

| 묶음 | mapping | tag |
|---|---|---|
| DEFAULT_LANE_KEYS | key1 KeyE · key2 KeyR · key3 Space · key4 ArrowDown · key5 Backslash · key6 Numpad7 | 보존 |
| DEFAULT_ACTION_KEYS | speedDown F1 · speedUp F2 · restart F5 | 보존 |
| session priority | Esc > action key > lane input | 보존 |
| pause | Esc toggle | key 보존, behavior 수정 |
| menu navigation | arrow + Enter + click | 신규 |
| result | Retry F5 · Back Enter · Esc no-op | 신규 |

### VISUAL

- `noteSkin`: bar|circle.
- `laneOpacity`: 0~1.
- `judgeLinePos`: default 8/9, raise-only. gauge/combo/bottom chart-info strip 함께 이동.
- `sudden`: top opaque cover.
- `jacketBrightness`: global player preference. chart metadata field가 아니다.
- `hitEffect / showCombo / showJudgment / showFastSlow`.
- `frameCap`: 0/30/60.
- `noteThickness`.

### GAUGE

- `gaugeMode`: normal|hard|fc|ap|as|cascade. 정의 [[gauge]].

### OPTION — quick per-play changes

no-record gate의 single source:

```text
autoplay OR staticShape OR mid-start OR editorOrigin
```

- autoplay: no-record.
- staticShape: no-record.
- mid-start: no-record.
- editorOrigin: no-record.
- mirror: record 유지.
- slowed editor playback도 gate에 넣지 않는다.
- cmod는 폐기.

---

## 3. editor settings — chart data가 아닌 editing aid

player settings와 별도로 editor에서만 쓰는 persistent aid. `.cfx`에 포함하지 않는다. UI는 editor meta scene.

- `measureLabelOffset`: 보이는 measure label number만 이동. 내부 measure indexing과 chart timing은 불변.

`gridDivisor`·`laneGridDivisor`는 session toolbar의 editorState이며 persistent settings가 아니다.

---

## 4. 결정 완료 / 잔여

확정:
- [x] settings = local persistent object
- [x] independent chart data / player settings 경계 `[번복 반영]`
- [x] jacketBrightness global
- [x] judgeLinePos raise-only
- [x] scrollSpeed term
- [x] cmod 폐기, sudden 유지
- [x] measureLabelOffset editor setting
- [x] no-record gate single source
- [x] settings graph = category별 4 scene — 정의는 [[scene]] §3 (D-2026-020)

잔여:
- [ ] key rebinding UI
- [ ] frameCap·volume 구체 default/range
