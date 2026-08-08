# song-select — 곡 선택 화면

> library의 playable chart를 탐색·선택하는 scene의 단일 출처다.
> scene 그래프상 위치·전이는 [[scene]] §5. 기록 값은 [[records]], 점수식·rank는 [[constants]] §3.
> 짝 문서: [[scene]], [[records]], [[persistence]], [[cfx]], [[data-model]].

---

## 1. 화면 구성

세 층으로 구성한다.

| 층 | 역할 |
|---|---|
| category 탭 | 최상위 분류. 목록의 모집단을 정한다 |
| 목록 | row와 slot으로 chart를 표시한다. groupBy가 만든 folder로 접힌다 |
| 정보 패널 | 커서가 놓인 chart의 metadata·jacket·기록을 표시한다 |

배치·치수는 이 문서의 소관이 아니다.

---

## 2. category 탭 `[신규]`

- 탭 목록은 library에 존재하는 `metadata.category` 값에서 파생한다([[data-model]] §4).
- `All` 탭이 항상 첫 번째이며 전체를 표시한다.
- `metadata.category`가 빈 값인 chart는 `Uncategorized` 탭에 모으고, 이 탭은 항상 마지막이다.
- 탭 선택은 모집단을 좁히는 필터다. groupBy·sort·search는 선택된 탭의 모집단 위에서 동작한다.
- category는 groupBy 축이 아니다.

---

## 3. row와 slot `[신규]`

### slot

한 row는 그 row가 대표하는 song의 playable chart를 slot에 나열한다.

- slot 순서는 `chartId` 오름차순이다.
- `chartId 1~5`는 Trace/Drift/Surge/Flux/Phase의 고정 슬롯이며, **subtitle이 없는 정규 chart**가 여기에 놓인다([[cfx]] §4).
- `chartId 6+`는 subtitle이 있는 추가 chart이며 고정 슬롯 뒤에 이어진다.
- 어떤 difficulty에 subtitle 없는 chart가 없으면 그 고정 슬롯은 빈 슬롯이다.
- `init`(`chartId 0`)은 slot에 표시하지 않는다.

### slot의 표시값 `[수정]`

각 slot은 세 정보를 동시에 담는다.

| 정보 | 표현 |
|---|---|
| `level` | 숫자 |
| `difficulty` | slot의 색 |
| best `state` | slot의 램프(테두리·배경 등 색 신호) |

- 램프는 [[records]]의 `bestState`에서 파생한다. 미플레이는 `N`으로 표현한다.
- 빈 슬롯은 `-`로 표시하며 커서가 들어갈 수 없다.

> 목록을 훑는 것만으로 클리어 상태를 판별할 수 있어야 한다. 커서를 옮겨야 상태를 알 수 있는 구조는 채택하지 않는다.

### 한 화면의 slot 수와 페이지

- 한 row는 `SLOTS_PER_ROW`개의 slot을 표시한다([[constants]]).
- chart가 그보다 많으면 페이지로 나눈다. 마지막 slot에서 `Right`를 누르면 다음 페이지의 첫 slot으로 넘어간다.
- 페이지 상태는 row마다 독립이며, 다른 row로 이동하면 1페이지로 돌아간다.
- 페이지가 둘 이상인 row에만 좌우 인디케이터를 표시한다.

### row의 단위

groupBy 축의 성질이 row 단위를 정한다.

| 축 성질 | 축 | row 단위 | slot |
|---|---|---|---|
| song 공통 | `none`·`updated`·`title` | song | 그 song의 chart 전부 |
| chart 분기 | `level`·`difficulty`·`state`·`rank` | song | **그 folder 조건을 만족하는 chart만** 채우고 나머지는 `-` |

chart 분기 축에서는 같은 song이 여러 folder에 나뉘어 반복 등장한다. 한 folder 안에서 조건을 만족하는 chart가 둘 이상이면 하나의 row에 그 slot들을 모두 채운다.

---

## 4. groupBy와 folder `[신규]`

### 축 목록

| 값 | folder 단위 |
|---|---|
| `none` | folder 없음 (기본값) |
| `updated` | `updatedAt` 날짜 |
| `title` | 제목 첫 글자 |
| `level` | level 수치 |
| `difficulty` | Trace/Drift/Surge/Flux/Phase |
| `state` | AS/AP/FC/H/C/F/N |
| `rank` | RANK_TABLE의 각 등급 |

`updated` 축에서 row의 대표 시각은 그 song에 속한 chart `updatedAt`의 **최대값**이다 `[신규]`. 필드 정의는 [[data-model]] §4.

### 동작

- folder는 접힘 단위다.
- folder 헤더에는 항목 수와 **클리어 진척**(클리어한 chart 수 / 전체)을 표시한다 `[수정]`.
- 진입 시 전부 접힌다. 단 마지막으로 선택한 chart가 속한 folder 하나만 펼친 채 진입한다.
- 아코디언이다 — 하나를 펼치면 다른 folder는 접힌다.
- 접힘 상태는 영속하지 않는다.
- folder 사이의 순서는 축의 자연 순서를 `sortDir`에 따라 적용한다.
- `none`이면 folder 없이 전체를 하나의 목록으로 표시한다.

---

## 5. sort `[신규]`

### 축 목록

`default` · `title` · `musicBy` · `difficulty` · `level` · `score` · `percent` · `rank` · `state`

- `default`는 library 추가순이다.
- `score`·`percent`·`rank`·`state`는 [[records]]의 best 기록에서 파생한다.
- row 단위가 song이므로, chart별로 갈리는 축(`difficulty`·`level`·`score`·`percent`·`rank`·`state`)은 **그 row가 표시하는 slot 중 최상위 값**을 row의 정렬값으로 삼는다.

### 방향

- `sortDir`은 `asc`/`desc` 두 값이며 `sortKey`와 독립이다. 키를 바꿔도 방향은 유지된다.
- 현재 `sortKey`와 `sortDir`은 목록 위에 **항상 보이게** 표시한다 `[수정]`.
- folder 순서에도 같은 `sortDir`을 적용한다(§4).

### groupBy와의 관계

- `groupBy`와 `sortKey`는 독립이며 같은 값이어도 무방하다. 같은 값이면 folder 안의 정렬값이 모두 같으므로 sort는 사실상 무효이며, 아래 tie-break를 따른다.

### 미플레이와 동값

- 기록 기반 축(`score`·`percent`·`rank`·`state`)에서 기록이 없는 대상은 `sortDir`과 무관하게 항상 최하단에 둔다.
- 모든 축의 최종 tie-break는 `default`(library 추가순)다.

---

## 6. search `[신규]`

### 매칭

- 대상 필드: `title`·`musicBy`·`subtitle`.
- row 단위가 song이므로, song의 어느 chart라도 매치되면 그 song을 표시한다.
- 대소문자를 무시하고 NFC 정규화 후 비교한다.
- 부분 문자열 포함으로 판정한다. 초성 검색·퍼지 매칭은 도입하지 않는다.
- **공백 처리**: 대상과 검색어 모두에서 공백을 제거한 형태를 함께 만들어, 다음 둘 중 하나라도 성립하면 매치로 본다.
  1. 검색어를 공백으로 나눈 모든 낱말이 각각 어느 대상 필드에든 포함된다(AND).
  2. 공백을 제거한 검색어가 공백을 제거한 대상 필드에 포함된다.
- 검색 중에는 folder를 무시하고 매치된 항목을 펼친 목록으로 표시한다.
- 검색은 선택된 category 탭의 모집단 안에서 동작한다.
- 결과가 없으면 빈 결과 안내를 표시한다. §11의 빈 library 안내와는 구분한다.

### 진입 `[수정]`

- 목록에 커서가 있는 상태에서 **문자·숫자 키를 누르면 검색이 시작되고 그 글자가 입력된다.** 별도의 검색창 클릭을 요구하지 않는다.
- 검색 중에도 방향키·`Enter`는 목록 조작으로 동작한다. 문자 입력은 검색어로 간다.
- `Esc`는 검색어를 지우고 목록으로 돌아간다.
- 검색어는 영속하지 않는다. scene을 벗어나면 초기화한다.

---

## 7. 커서 이동 `[신규]`

### 키

| 키 | 동작 |
|---|---|
| `Left`/`Right` | 같은 row 안에서 slot 이동. 끝에서 페이지 전환(§3) |
| `Up`/`Down` | 이웃 row로 이동 |
| `PageUp`/`PageDown` | 한 화면 단위 이동 `[수정]` |
| `Home`/`End` | 목록의 처음/끝 `[수정]` |
| `Enter` | 선택 확정 → song-credit([[scene]] §6) |
| `Esc` | 검색 해제, 없으면 이전 scene |

- `Up`/`Down` 길게 누름은 가속 스크롤로 동작한다 `[수정]`.

### 상하 이동의 열 대응

이동 대상 row에서 커서가 놓일 slot을 다음 순서로 정한다.

1. 현재와 같은 열에 chart가 있으면 그 slot.
2. 없으면 그보다 **낮은 열 중 가장 가까운** slot.
3. 그것도 없으면 그보다 **높은 열 중 가장 가까운** slot.

직전 열을 따로 기억하지 않는다. 이동한 결과 열이 곧 다음 이동의 기준이다.

### 마우스

- slot 직접 클릭 = 그 chart 선택. 방향키와 동등한 입력이다.
- 휠 = 목록 상하 스크롤.
- folder 헤더 클릭 = 펼침/접힘.

---

## 8. 목록 옵션 조작 `[신규]`

groupBy·sortKey·sortDir·category는 목록 조작 중 언제든 바꿀 수 있어야 한다.

- 전용 overlay를 열어 변경한다. 진입 키는 [[settings]] §2의 key binding에 정의한다.
- `sortDir` 전환은 overlay를 열지 않는 단축 전환을 둔다.
- 변경 즉시 목록에 반영하며, **변경 전 커서의 chart를 그대로 유지**한 채 새 위치로 따라간다. 그 chart가 현재 조건에서 사라지면 목록 첫 항목으로 간다.

> 정렬을 바꿀 때마다 커서가 맨 위로 튀면 탐색 흐름이 끊긴다.

---

## 9. 정보 패널 `[신규]`

### 표시 대상

커서가 놓인 slot의 chart를 기준으로 한다. 커서가 어느 slot에도 없으면 패널을 표시하지 않는다.

- jacket.
- `title`·`subtitle`·`musicBy`·`chartBy`·`difficulty`·`level`.
- BPM·곡 길이 `[수정]`.
- 기록: 해당 chart의 best 기록([[records]]).

### 기록 표시

2×2 격자로 표시한다.

| | |
|---|---|
| `rank` | `score` |
| `state` | `percent` ↔ `judge` |

- 우하단 칸을 클릭하면 표시가 전환된다.
  - `percent`: accuracy를 소수 2자리 백분율로.
  - `judge`: `sync / perfect / good / miss` 순의 네 값.
- 전환 상태는 `viewState.recordCellMode`로 영속한다(§12).
- 값은 모두 best 기록에서 파생한다([[records]] §2, [[constants]] §3).
- 기록이 없는 chart는 네 칸 모두 미플레이 표기로 둔다.

---

## 10. preview music `[신규]`

- 커서가 놓인 chart의 music을 재생한다.
- **커서 이동 후 `PREVIEW_DELAY_MS` 동안 커서가 멈춰 있을 때만 재생을 시작한다** `[수정]`. 그 전에 커서가 다시 움직이면 재생하지 않는다.
- 재생 중 커서가 다른 chart로 이동하면 즉시 정지하고 위 규칙을 다시 적용한다.
- `metadata.previewStartMs`부터 재생한다([[data-model]] §4).
- `PREVIEW_LOOP_MS` 동안 재생한 뒤 시작 지점으로 돌아가 반복한다.
- fade in은 없다. 구간의 마지막 `PREVIEW_FADE_OUT_MS` 동안 fade out한다.
- 수치는 [[constants]].

---

## 11. 빈 상태와 로딩 `[신규]`

- library가 비어 있으면 목록 대신 안내 문구와 import 진입점을 표시한다.
- `.cfx` decode·음원 로드 등 비동기 작업이 `LOADING_INDICATOR_DELAY_MS`를 넘기면 로딩 표시를 낸다([[constants]]).

---

## 12. viewState `[신규]`

목록 표시 상태는 `viewState` store에 영속한다([[persistence]] §1).

| 키 | 값 |
|---|---|
| `category` | 선택된 탭. 기본 `All` |
| `groupBy` | §4의 축. 기본 `none` |
| `sortKey` | §5의 축. 기본 `default` |
| `sortDir` | `asc`\|`desc`. 기본 `asc` |
| `recordCellMode` | `percent`\|`judge`. 기본 `percent` |
| `lastSelected` | 마지막으로 커서가 놓였던 `songId:chartId` `[수정]` |

- `lastSelected`는 앱을 다시 실행해도 유지하며, 진입 시 그 chart에 커서를 놓고 속한 folder를 펼친다. 대응 chart가 없으면 목록 첫 항목으로 간다.
- 검색어·folder 접힘 상태·페이지 인덱스는 영속하지 않는다.

---

## 13. 그 밖의 입력

- `Space` → quick options overlay. 항목과 no-record 규칙은 [[scene]] §5, [[settings]] §2.
- 기록 초기화 진입점 — 규칙 단일 출처는 [[records]] §4. `FEATURES.recordReset`에서만 노출한다.

---

## 14. 결정 완료 / 잔여

확정:
- [x] category 탭 — `metadata.category` 파생, `All`·`Uncategorized` 고정 `[신규]`
- [x] row = song, slot = chart, 고정 슬롯 1~5 + 추가 6+ `[신규]`
- [x] slot에 level·difficulty·state 램프 동시 표시 `[신규]`
- [x] groupBy 7축·아코디언·비영속 접힘, 헤더에 클리어 진척 `[신규]`
- [x] sortKey 9축, `sortDir` 독립, 현재 상태 상시 표시 `[신규]`
- [x] 상하 이동의 열 대응 규칙(같은 열 → 하위 근접 → 상위 근접, 기억 없음) `[신규]`
- [x] search 대상 3필드, 무공백 매칭 합집합, 타이핑 즉시 검색 `[신규]`
- [x] 목록 옵션 변경 시 커서 chart 유지 `[신규]`
- [x] preview 지연 재생·구간·루프·fade out `[신규]`
- [x] `lastSelected` 영속 복원 `[신규]`

잔여:
- 레이아웃·치수·모션·램프 색: ui-design 소관.
- 목록 옵션 overlay 진입 키·`sortDir` 단축 전환 키 → [[settings]] §2.
- `SLOTS_PER_ROW`·preview 3종·로딩 지연·가속 스크롤 수치 → [[constants]].
