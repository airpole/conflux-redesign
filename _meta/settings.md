# settings — 플레이어 설정 단일 출처

> 저장되는 **chart 데이터**([[data-model]])와 별개로, 플레이어가 1회 정하는 영속 설정을 여기 모은다.
> chart 또는 `.cfx`와 함께 배포되지 않으며 로컬 한 객체로 영속된다.
> 필드명은 [[naming]], 개념은 [[glossary]], 근거는 [[rationale]].

---

## 1. 성격 — chart 데이터가 아니다 `[번복 반영]`

settings는 사람의 환경·취향이다. 같은 chart를 누가 치든 달라지는 값이라 chart나 songId group에 묶지 않는다.

- 저장: local persistent object 하나, default 위 saved value merge(§4).
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

`DEFAULT_LANE_KEYS` — 물리 6키와 lane 매핑 `[보존]`:

| key | default binding | lane |
|---|---|---|
| `key1` | KeyE | 1 |
| `key2` | KeyR | 2 |
| `key3` | Space | 3 |
| `key4` | ArrowDown | 2 |
| `key5` | Backslash | 3 |
| `key6` | Numpad7 | 4 |

- 이 표가 `laneOf(key)`의 단일 출처다([[judge]] §3).
- lane 2·3은 키 두 개를 받는다. lane별 동시 입력 capacity는 [[data-model]] §5.1.
- 바인딩은 rebinding으로 바뀌지만 **key → lane 매핑은 고정**이다.

| 묶음 | mapping | tag |
|---|---|---|
| DEFAULT_ACTION_KEYS | speedDown F1 · speedUp F2 · restart F5 | 보존 |
| session priority | Esc > action key > lane input | 보존 |
| pause | Esc toggle | key 보존, behavior 수정 |
| menu navigation | arrow + Enter + click | 신규 |
| result | Retry F5 · Back Enter · Esc no-op | 신규 |

### VISUAL

- `noteSkin`: bar|circle.
- `laneOpacity`: 0~1.
- `judgeLinePos`: default 8/9, raise-only. gauge/combo/bottom chart-info strip 함께 이동.
- `sudden`: top opaque cover. 범위 0~90(%) `[보존]`.
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
- mid-start: no-record. **정의 = 곡 처음이 아닌 지점에서 시작한 판**(editor test 중간 시작 등). pause→Resume은 시작이 아니라 같은 판의 계속이므로 이 게이트와 무관하다([[scene]] §9) `[수정]` (D-2026-022).
- editorOrigin: no-record.
- mirror: record 유지.
- slowed editor playback도 gate에 넣지 않는다.
- cmod는 폐기.

quick options([[scene]] §5의 scrollSpeed·gaugeMode·mirror·staticShape·autoplay 5종)는 **이 settings 영속 객체의 같은 필드를 수정하는 빠른 진입점**이다 `[신규]` (D-2026-022). 별도 세션 한정 상태가 아니며, 바꾼 값은 settings 화면에서 바꾼 것과 동일하게 다시 바꿀 때까지 유지된다.

---

## 3. editor settings — chart data가 아닌 editing aid

player settings와 별도로 editor에서만 쓰는 persistent aid. `.cfx`에 포함하지 않는다. UI는 editor meta scene.

- `measureLabelOffset`: 보이는 measure label number만 이동. 내부 measure indexing과 chart timing은 불변.

`gridDivisor`·`laneGridDivisor`는 session toolbar의 editorState이며 persistent settings가 아니다.

---

## 4. 기본값과 병합 (`DEFAULT_SETTINGS`) `[신규]`

기본값의 단일 출처는 이 표다. 별도 태그가 없으면 `[보존]`이며 원본 `settings.js`
`DEFAULT_SETTINGS` 실측이다(D-2026-036).

| 필드 | 기본값 | 허용 | 태그 |
|---|---|---|---|
| `scrollSpeed` | `3.0` | `SCROLL_SPEED_*` 범위 | 보존 |
| `audioOffset` | `0` | 유한 실수 (ms) | 보존 |
| `visualOffset` | `0` | 유한 실수 (ms) | 보존 |
| `volMaster` | `1.0` | 0~1 | 보존 |
| `volMusic` | `1.0` | 0~1 | **수정** — 구 `0.7`. 음악은 감쇠 없이 출발하고 크기는 master로 잡는다 |
| `volEffect` | `1.0` | 0~1 | 보존 |
| `keyBindings` | `DEFAULT_LANE_KEYS`의 binding 열 | 6키 전부 빈 문자열 아님 | **신규** — 배치 자체는 보존이나 거처가 런타임 상태에서 영속 settings로 옮겼다. rebinding이 영속하려면 여기 있어야 한다 |
| `noteSkin` | `'bar'` | `bar`\|`circle` | 보존 |
| `laneOpacity` | `1.0` | 0~1 | 보존 |
| `jacketBrightness` | `100` | 0~100 | 보존 |
| `sudden` | `0` | 0~90 (%) | 보존 |
| `hitEffect` | `true` | boolean | 보존 |
| `frameCap` | `0` | 0\|30\|60 (0 = uncapped) | 보존 |
| `noteThickness` | `15` | 양수 | 보존 |
| `judgeLinePos` | `8/9` | `0 < v ≤ 8/9` (raise-only) | 보존 |
| `showCombo` / `showJudgment` / `showFastSlow` | `true` | boolean | 보존 |
| `gaugeMode` | `'normal'` | [[gauge]] 6종 | 보존 |
| `mirror` / `autoplay` / `staticShape` | `false` | boolean | 보존 |
| `measureLabelOffset` | `0` | 정수 | 보존 |

- `judgeLinePos`의 기본값은 동시에 **가장 낮은 허용 위치**다. 올리기만 된다.
- `cmod`는 폐기했으므로 기본값에 없다.
- 모든 필드에 허용 판정이 하나씩 있어야 한다 — 판정 없는 필드는 검증 공백이다.

### 병합 `[수정]`

저장본은 기본값 **위에** 얹는다. 저장본이 무엇이든(파싱 실패, 배열, 문자열)
온전한 settings 하나가 나온다.

- **알 수 없는 키는 버린다.** 기본값에 있는 키만 취한다. 원본은 저장본을 그대로
  펼쳐 폐기된 설정이 조용히 살아남았다 — 폐기가 폐기이려면 실제로 사라져야 한다.
- **허용 밖 값은 필드 단위로 기본값으로 되돌린다.** settings 객체 전체를 버리지
  않는다. 클램프하지도 않는다 — 되돌림은 사용자에게 보고할 수 있지만 조용한
  클램프는 값이 왜 달라졌는지 설명할 자리가 없다.
- 버린 키와 되돌린 필드는 **보고**한다. 표시 여부는 호출측이 정한다.

---

## 5. 결정 완료 / 잔여

확정:
- [x] settings = local persistent object
- [x] independent chart data / player settings 경계 `[번복 반영]`
- [x] jacketBrightness global
- [x] judgeLinePos raise-only
- [x] scrollSpeed term
- [x] cmod 폐기, sudden 유지
- [x] measureLabelOffset editor setting
- [x] no-record gate single source
- [x] `laneOf(key)` 매핑을 DEFAULT_LANE_KEYS 표로 승격 — judge는 링크 (D-2026-031)
- [x] settings graph = category별 4 scene — 정의는 [[scene]] §3 (D-2026-020)
- [x] 기본값 표와 병합 규칙 — 알 수 없는 키 폐기·필드 단위 되돌림 §4 (D-2026-036)

잔여:
- [ ] key rebinding UI · volume 슬라이더 조작 단위
