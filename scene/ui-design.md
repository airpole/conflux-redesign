# ui-design — tokens + result·song-select·settings·title 레이아웃

status: Accepted (D-2026-051) — §6(scene.md §9 필드 추가)은 D-2026-054, §7-3(티어 색 대 실패 적색)은 D-2026-055로 닫혔다. §7-2(티어 색 대 Shape 색)는 결정이 아니라 scene 축 분리 확인으로 해소— 별도 D-log 없음. §2.5(곡 선택 레이아웃)는 D-2026-072(M3.5-1)로 확정, 빈 library 항목은 D-2026-073으로 해소 — M3.5-1은 §2.5.7-1(overlay 진입 키 게이트의 마우스+휠 확장)만 남기고 닫혔다. §2.6(settings 레이아웃)은 D-2026-076(M3.5-2)으로 확정 — scene 구조 변경(GAUGE→OPTION 병합, SOUND 신설)은 D-2026-074·D-2026-075. M3.5-2는 완전히 닫혔다 — 남은 항목(key rebinding UI 캡처 흐름, volume 조작 단위, `volEffect` 실제 의미)은 모두 이 레이아웃 범위 밖의 별도 게이트(M4-6 前 등)로 이미 분리돼 있다. §2.5·§2.6의 화면 텍스트는 D-2026-077로 "공용 영어 vs 실제 번역" 구분에 맞춰 소급 재정리됐다 — `src/core/core-i18n.ts` 참조. §2.7(title 레이아웃)은 D-2026-079(M3.5-3)로 확정 — 클릭 포함 입력 규칙은 `scene.md` §3에 D-2026-078로 반영, `prefers-reduced-motion` 대응(정지 최종 프레임, 별도 D-log 없이 §2.7.5-2에 해소로 기록)까지 정리돼 M3.5-3은 완전히 닫혔다
supersedes: D-2026-051 초안 (원본 `play-result.js` 계승안)
scope: UI 토큰 세트 + result 화면 레이아웃 + 곡 선택 화면 레이아웃(§2.5, M3.5-1) + settings 화면 레이아웃(§2.6, M3.5-2) + title 화면 레이아웃(§2.7, M3.5-3). credits는 범위 밖(M3.5-4)

원본 계승안에서 출발해 반복 수정한 결과물. 그룹 순서·토큰·타이포·간격이
모두 바뀌었으므로 원본과의 diff가 아니라 이 문서를 기준으로 구현한다.

---

## 1. 토큰

### 1.1 표면 / 텍스트 / 괘선

| 토큰 | 값 | 용도 |
|---|---|---|
| `--bg` | `#050508` | 스테이지 배경(공용 — result·song-select·settings·title 등 §2 이하 전 레이아웃이 공유) |
| `--text` | `#ececf4` | 본문 |
| `--dim` | `#9a9ab4` | 라벨, 보조 수치 |
| `--dimmer` | `#6b6b84` | 최하위 보조 |
| `--rule` | `#1e1e30` | 헤어라인 |
| `--rule-strong` | `#3a3a54` | 버튼 테두리, σ 구간선 |
| `--cyan` | `#4fbcd0` | 액센트 |
| `--on-accent` | `#04040a` | 액센트 위 글자 |

`--cyan`은 `theme.md`의 `WIDE_COLOR`(`#4AE8FF`)·`TEXT_COLOR`(`#4ae0ff`)와 같은
색상 계열이되 채도와 명도를 낮춘 값이다. 원본 초안의 보라 액센트는 채택하지
않았다. note 팔레트와 색상은 공유하고 톤으로 분리한다.

### 1.2 판정색 (파생의 뿌리)

| 토큰 | 값 |
|---|---|
| `--j-sync` | `#ffffff` |
| `--j-perfect` | `#ffd23f` |
| `--j-good` | `#5cff96` |
| `--j-miss` | `#ff5f70` |

### 1.3 게이지

| 토큰 | 값 |
|---|---|
| `--gauge-NORMAL` | `#4aa870` |
| `--gauge-HARD` | `#ffa63d` |
| `--gauge-FC` | `var(--j-good)` |
| `--gauge-AP` | `var(--j-perfect)` |
| `--gauge-AS` | `var(--j-sync)` |

### 1.4 클리어 상태 — 파생

| 상태 | 토큰 |
|---|---|
| AS | `var(--j-sync)` |
| AP | `var(--j-perfect)` |
| FC | `var(--j-good)` |
| H | `var(--gauge-HARD)` |
| C | `var(--gauge-NORMAL)` |
| P | `#8a8aa4` |
| N | `#6b6b84` |
| F | `var(--j-miss)` |

규칙: state 색을 독립 정의하지 않는다. AS/AP/FC/F는 판정색, H/C는 게이지색을
참조한다. 같은 클리어 조건은 어느 화면에서든 같은 색으로 나타난다.

`theme.md`에 state 색이 이미 정의돼 있으면 이 규칙으로 대체한다. 중복 정의
금지 원칙은 유지하되, 참조 방향이 판정 → state → 게이지가 되도록 한다.

### 1.5 난이도 티어 — B G R W D

| 티어 | `--tier-*` | `--ink-*` |
|---|---|---|
| TRACE | `#4a9eff` | `#050508` |
| DRIFT | `#4ade80` | `#050508` |
| SURGE | `#ff4d5e` | `#050508` |
| FLUX | `#ffffff` | `#050508` |
| PHASE | `#22222e` | `#ececf4` |

색은 글자가 아니라 박스 배경에 칠하고 글자를 반전한다. D(PHASE)가 어두운
배경에 묻히지 않게 하기 위한 필수 조건이며, 다섯 티어 모두 동일 방식으로
표기한다.

### 1.6 랭크

| 랭크 | 토큰 |
|---|---|
| U | `var(--cyan)` |
| S+, S | `#ffd23f` |
| A+, A | `#ececf4` |
| B | `#b0b0c8` |
| C, D, E | `#8a8aa4` |
| F | `var(--j-miss)` |

`E`는 초안에 없었다(`RANK_TABLE`엔 있음) — 표가 이미 인접 랭크를 그룹으로
묶는 구조라(S+/S, A+/A) 그 패턴을 한 칸 더 밀어 `C`/`D` 그룹에 넣었다
`[정정]` (D-2026-056).

### 1.7 FAST / SLOW

| 토큰 | 값 |
|---|---|
| `--fast` | `#ff6b7a` |
| `--slow` | `#6aa8ff` |

값이 0이면 `--dimmer`로 표시한다.

### 1.8 타이포

```
--sans: "Pretendard Variable", Pretendard, ui-sans-serif, system-ui,
        -apple-system, "Segoe UI", Roboto, "Helvetica Neue",
        "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif;
--mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas,
        "Liberation Mono", "Roboto Mono", monospace;
```

- 모든 수치는 `--mono` + `font-variant-numeric: tabular-nums`
- 곡 제목/아티스트/버튼은 `--sans`
- 마이크로 라벨: `font-size: max(9px, .82cqw)`, `letter-spacing: .18em`, 대문자
- 하한(`max()`) 필수. cqw 단독은 좁은 스테이지에서 9px 이하로 내려간다

---

## 2. 레이아웃

스테이지 16:9 고정, `container-type: size`, 내부 단위는 `cqw`.
780px 이하에서 비율 고정을 풀고 세로 스택 + px 타이포로 전환한다.

```
┌─ 곡 (4.4fr) ─┬─ 결과 (11.6fr) ──────────────────────────┐
│ 자켓          │ [1] score  rank  state                   │
│ 제목 (2줄)    │     accuracy (라벨 없음)                  │
│ 아티스트      │ ─────────────────────────────────────── │
│ BPM · 길이    │ [2] Best score / Best acc / Max combo    │
│ (spacer)      │ ─────────────────────────────────────── │
│ 티어 칩 [부제]│ [3] Judgment      │ Timing               │
│ Gauge/Mods/   │     + 게이지 그래프│ + 분포 + FAST/SLOW   │
│ Played        │                   │                      │
├───────────────┴──────────────────────────────────────────┤
│                        [선택으로 BACKSPACE] [다시 ENTER] │
└──────────────────────────────────────────────────────────┘
```

### 2.1 [1] 성적

- `score` · `rank` · `state` 세 요소가 **같은 폰트 크기**(3.7cqw)로 한 줄.
  색으로만 구분한다. state는 테두리 박스 없이 풀네임(FULL COMBO, ALL SYNC,
  ALL PERFECT, HARD CLEAR, CLEAR, FAILED)으로 표기한다 `[정정 — 초안에 AP
  누락]` (D-2026-056, `ALL SYNC`와 동형). 약어(FC/AS)는 곡 선택창 전용.
- `accuracy`는 그 아래 2.1cqw, 라벨 없이 값만. 색 `--dim`.
- 명칭은 **Accuracy**. Sync%가 아니다. SYNC는 판정 이름으로만 쓴다.

### 2.2 [2] 기록

3열 그리드 — 라벨 / 값 / 델타. 세 행 모두 같은 축에 정렬.

| 행 | 값 | 델타 |
|---|---|---|
| Best score | 갱신 전 최고 점수 | 현재 − 이전 |
| Best acc | 갱신 전 최고 정확도 | 현재 − 이전 |
| Max combo | 이번 판 최대 콤보 | 없음 |

- 기록이 없으면 기준선을 `0` / `0.00%`로 두고 전체 값이 델타가 된다
- 델타 색: 양수 `--cyan`, 음수 `--j-miss`, 동률 `--dim` (`+0` 표기)
- NEW 배지 없음. 부호가 갱신 여부를 말한다
- 정렬: 값은 우측(min-width 7cqw), 델타는 좌측. 라벨–값 1.6cqw,
  값–델타 1cqw. 세로는 baseline이 아니라 `center`
- 부동소수점 방지: 델타 부호 판정 전에 표시 자릿수로 반올림한다

### 2.3 [3] 판정 · 타이밍

**판정 열** — 숫자만. 바·비율 없음.

```
Judgment
SYNC          842
PERFECT        36
GOOD            4
MISS            0
─────────────────
TOTAL NOTES   882
```

전부 `--text` 단색. TOTAL NOTES는 목록 하단에 헤어라인으로 분리.

**게이지 그래프** — 판정 목록 아래, 열 바닥에 붙임.

- 라벨은 `Gauge`만. 종류는 좌측 옵션 패널에 이미 있다
- 라인 색 = `--gauge-{종류}`
- 우측에 종료 시점 잔량 %
- 임계선·실패 마커 없음. 실패 시 궤적이 중단 지점에서 끝난다
- 높이 5.6cqw

**타이밍 열**

- 히스토그램 막대를 판정 창별로 칠한다. 텍스트 라벨 없음
  - `|오차| ≤ 25` → `--j-sync`
  - `≤ 50` → `--j-perfect`
  - `≤ 100` → `--j-good`
  - 초과 → `--j-miss`
- Wide는 제외하지 않는다. 판정 창이 넓을 뿐 SYNC로 들어가므로 같은 분포
- 축 `±110ms`, 눈금은 `−50 / 0 / +50` 숫자만
- 통계 라벨은 `Average` / `Spread` (Mean / σ 아님)
- 하단 FAST/SLOW 균형 바 + 좌우 텍스트. 화살표 기호 없음

### 2.4 곡 열

- 제목 2줄 클램프, `word-break: keep-all`
- 티어 칩: 배경 `--tier-*`, 글자 `--ink-*`, 콘텐츠 폭. `TIER LEVEL`까지만 포함
- 부제는 칩 **밖**, 같은 폰트 크기, `--text`. 표기 `[Subtitle]`
- 옵션: Gauge / Mods / Played. **오디오 오프셋은 표시하지 않는다**
- Cascade는 표기하지 않는다. 확정된 게이지 이름과 색만 쓴다

---

## 2.5 곡 선택 레이아웃 (M3.5-1)

디자인 리뷰로 확정된 방향이다 — 아래는 재설계 대상이 아니라 그 결과의 문서화다.
행동 규칙(탭 파생, groupBy·sort 축, search 매칭, 커서 이동 등)의 단일 출처는
여전히 [[song-select]]이며, 여기는 그 규칙이 화면에 어떻게 배치·채색되는지만
다룬다.

스테이지는 §2와 같은 16:9 고정 + `container-type: size` + `cqw` 단위,
780px 이하 세로 스택 + px 타이포 전환을 그대로 재사용한다 — 이 화면 전용
컨테이너 쿼리 메커니즘을 새로 만들지 않는다.

화면 텍스트는 D-2026-077의 "공용 영어 vs 실제 번역" 구분을 따른다 — 짧은
라벨류는 locale과 무관한 canonical English를 코드에 직접 쓰고, 이해가
목적인 문장만 `src/core/core-i18n.ts`의 조회를 거친다. 이 절의 문서
서술(구조 설명)은 계속 한국어지만, **화면에 실제로 표시되는 문자열**은
아래 각 항목에서 이 구분에 따라 표기한다.

```
┌─ 탭 ────────────────────────┬─ 검색 ──────────────────┐
├─ Sort · Level ─────┬─ Group · None ───────────────────┤
├─ 정보 패널 (4fr) ─┬─ 목록 (6fr) ─────────────────────┤
│ 자켓(대, 패널 높  │ [폴더] All 128 · 42/128 CLEAR     │
│  이 기준)         │  ▸ row: 자켓 제목/아티스트 12345  │
│ 제목/아티스트     │  ▸ row: ...                       │
│ BPM · 길이        │                                    │
│ 2×2 기록 격자     │                                    │
├───────────────────┴────────────────────────────────────┤
│  ↑↓ Move   ←→ Difficulty   Space Quick Options   Any Key: Search │
└───────────────────────────────────────────────────────┘
```

### 2.5.1 탭 · 검색 (상단 바)

- category 탭은 pill 형태(테두리 있는 캡슐, 단순 텍스트 라벨 아님). 지금은
  `All` 하나만 배치하지만 [[song-select]] §2의 `metadata.category` 파생 탭이
  늘어나도 같은 pill을 가로로 추가하는 구조로 그린다. 활성 탭 표시는
  `--cyan` 밑줄/배경.
- 검색은 우측, 3-상태:
  - idle: 아이콘(`--dim`) + 힌트 텍스트 `Type to search`(공용 영어 — 짧은
    패턴 라벨이라 조회 테이블을 거치지 않고 코드에 직접 쓴다). `검색` 같은
    일반 라벨을 쓰지 않는다.
  - 입력 중: 실제 입력된 검색어 + 매치 수(`fo · 2` 형식 — 개수 뒤에 단위
    단어를 붙이지 않는다. "개"/"results" 같은 카운터 단어는 언어마다 복수
    규칙이 갈려 숫자만 보여주는 쪽이 plural 처리 없이도 어느 locale에서든
    그대로 맞는다). 아이콘·텍스트 `--cyan`.
  - 결과 없음: 입력 중과 같은 배치지만 매치 수와 아이콘이 `--j-miss`로
    바뀐다(기존 실패 상태 색을 attention 색으로 겸용 — 새 토큰 아님). 이때
    목록 영역은 row 대신 가운데 정렬된 안내(아이콘 + 문구)로 바뀐다 —
    이 문구는 **실제 번역이 필요한 문장**(D-2026-077 기준, 이해가 목적)이라
    `translate('songSelect.search.noResults', locale)`을 거친다(en 기본값
    "No results found", ko "검색 결과가 없습니다" — `src/core/core-i18n.ts`).
    [[song-select]] §6의 "결과 없음"이 이 표시를 가리킨다.
- 목록에 포커스가 있는 상태에서 바로 타이핑하면 검색이 시작된다
  ([[song-select]] §6 진입 규칙 그대로, 레이아웃에서 새로 정의하지 않음).

### 2.5.2 정렬 · 그룹 바

탭 바로 아래, 목록·정보 패널 위에 걸치는 얇은 띠. 두 항목을 클릭 가능한
칩으로 표시한다.

- `Sort · {sortKey 표시명}` — 클릭하면 목록 옵션 overlay를 연다
  ([[song-select]] §8). "Sort"는 공용 영어 라벨(D-2026-077) — 조회 테이블을
  거치지 않고 코드에 직접 쓴다. `{sortKey 표시명}`(9축 각각의 표시 이름)도
  같은 원칙으로 공용 영어를 쓴다 — 구체적인 9개 표시명 자체는 이 절이
  아니라 [[song-select]] §5의 축 목록을 옮기는 구현 시점에 정해진다.
- `Group · {groupBy 표시명, 없으면 "None"}` — 같은 overlay의 다른
  탭/섹션을 연다. "Group"·"None"도 공용 영어.
- 두 칩 모두 **클릭과 휠 스크롤 둘 다** 값을 순환한다. 키보드 단축 전환과
  나란한 1급 입력이며 부수적 기능이 아니다 — §2.5.7-1에서 이것이 여는 게이트
  범위를 명시한다.
- 아이콘·hover 색 `--cyan`.

### 2.5.3 목록 (우측, ~60%)

BMS 클라이언트형 밀도 — DJMAX/EZ2ON류의 큰 타일이 아니라 한 줄 row다.

- row 구성(좌→우): 작은 정사각 자켓 썸네일 → 제목+아티스트(세로로 쌓되
  **둘 다 같은 밝은 텍스트 색**, 아티스트를 흐리게 하지 않는다 — 곡과
  아티스트를 동등하게 읽히게 한다) → 난이도 slot 5개
  (`SLOTS_PER_ROW`, [[constants]]) 가로 배열.
- slot: level 숫자를 담은 작은 박스. 배경/글자색은 §1.5 티어 토큰
  그대로(`--tier-*` 배경, `--ink-*` 글자) — 새 색 아님. 박스 오른쪽에
  얇은 세로 막대를 붙인다(EZ2ON 스타일). 막대 색은 그 chart의 best
  `state`([[song-select]] §3 slot 표시값의 램프)를 §1.4 파생 색으로
  칠한다 — **높이가 아니라 색으로만** 구분한다. 기록 없음(`N`)은 막대를
  그리지 않는다.
  - 리뷰에서 색약 접근성을 위한 높이 차등 안이 검토됐으나 채택하지
    않았다 — 시각적 단순함을 우선한 결정이며, 이 트레이드오프는 여기
    기록만 하고 별도 D-log를 만들지 않는다(§7 패턴과 동일하게 "검토 후
    미채택"로 남긴다).
- 라이선스 트랙에 별도 배지·태그를 붙이지 않는다. 아티스트 이름 텍스트
  자체가 크레딧이다 — "Licensed"/"Original" 같은 표식은 어디에도 없다.
- 검색하지 않을 때: folder 헤더가 count + 클리어 진척을 보여준다
  (`All 128` / `42/128 CLEAR`, [[song-select]] §4 — "곡" 같은 단위 단어
  없이 숫자만 붙인다, §2.5.1의 매치 수 표기와 같은 이유). 접힌 folder는
  헤브론(`▸`) + 헤더 줄만 표시한다.
- 검색 중: folder 헤더를 전부 숨기고 매치된 row를 평평한 목록으로
  표시한다. 매치된 부분 문자열은 제목 텍스트 안에서 `--cyan`으로
  강조한다.
- 선택된 row: 좌측 테두리 + 자켓 링을 `--cyan`으로 강조.
- 빈 category 탭이나 빈 group folder를 열어 표시할 row가 없을 때는
  전용 안내 레이아웃을 두지 않는다 — §2.5.1의 검색 결과 없음과 같은
  빈 목록 표시를 그대로 재사용한다(§2.5.7-2).

### 2.5.4 정보 패널 (좌측, ~40%)

- 자켓이 패널의 지배적 요소다 — 패널 **높이**의 60%+ 를 차지하도록 자켓을
  정사각으로 키운다. **폭이 아니라 높이 기준**으로 크기를 정한다 — 16:9
  프레임을 넘치지 않게 하기 위해서다.
- 제목 + 아티스트: 촘촘한 행간, 서로 같은 밝은 텍스트 색(목록 row와 같은
  원칙).
- BPM + 길이: 그 아래 작은 `--dim` mono 한 줄.
- 2×2 기록 격자(rank/score 윗줄, state/accuracy 아랫줄, 우하단 칸이
  accuracy ↔ judgment 전환) — [[song-select]] §9 그대로. 자켓이
  주인공이 됐으므로 격자는 남는 공간에 맞춰 컴팩트하게 그린다(result
  화면 §2.2/2.3 같은 넓은 그리드가 아니다).

### 2.5.5 하단 바

상시 표시 키 힌트 한 줄: `↑↓ Move`, `←→ Difficulty`, `Space Quick Options`,
`Any Key: Search`. [[song-select]] §7/§13의 키 목록을 그대로 옮긴 표시이며
새 키 규칙이 아니다. 표시 문구는 공용 영어(D-2026-077) — 짧고 한 번
익히면 되는 패턴 라벨이라 키 힌트 바는 UI locale과 무관하게 영어 단문으로
쓰는 다른 리듬 게임들의 관행과 같다. 조회 테이블을 거치지 않는다.

### 2.5.6 `--cyan` 사용처

이 화면에서 `--cyan`(§1.1, 브랜드 액센트)이 쓰이는 자리:

- 활성 탭 표시
- 검색 아이콘/텍스트(입력 중 상태)
- 선택 row 좌측 테두리 + 자켓 링
- 정렬·그룹 바 아이콘 및 hover
- SCORE 값 텍스트
- folder 헤브론 아이콘

`state` 파생 색(§1.4)에는 쓰지 않는다 — §1.4를 다시 확인한 결과 `C`
state는 `--gauge-NORMAL`(`#4aa870`, 녹색 계열)을 참조하고 `--cyan`을
쓰는 state 값은 없으므로 **충돌 없음**. rank `U`가 `--cyan`을 쓰는 건
§1.6에 이미 있는 기존 참조이며 이 절에서 새로 추가한 용법이 아니다.

### 2.5.7 미해결 / 확인 필요

1. **[게이트 확장 필요]** [[song-select]] §14 잔여의 "목록 옵션 overlay
   진입 키 · `sortDir` 단축 전환 키 · 가속 스크롤 수치"([[settings]] §2
   key binding 소관, 아직 미정)는 지금까지 키보드 입력만 염두에 둔
   문면이다. 이 레이아웃은 정렬·그룹 바의 클릭·휠 스크롤을 키보드와
   동등한 1급 입력으로 요구하므로, 그 게이트가 닫힐 때 마우스 클릭과
   휠 스크롤 값을 명시적으로 포함해야 한다 — 지금 여기서 결정하지 않고
   게이트 쪽에 요구사항만 남긴다.
2. ~~**[디자인 공백 — 방향 필요]** 빈 library 레이아웃~~ **해소.** 전용
   guidance/import 레이아웃은 두지 않는다 — Conflux는 아직 사용자 chart
   import UI를 제공하지 않으므로(그런 화면 자체가 없다), `game-public`
   빌드는 `_meta/persistence.md` §12·D-2026-059에 따라 **첫 실행부터
   항상 번들 curated `.cfx` 세트가 library에 채워진 채** 시작한다.
   "진짜로 텅 빈 library"가 실제로 발생하는 최초 진입 경로가 없다.
   목록이 비어 보이는 경우는 이미 스펙에 있는 두 edge case뿐이다 —
   ① 검색 매치 0건(§2.5.1의 "검색 결과가 없습니다"), ② 빈 category
   탭이나 빈 group folder를 연 경우. 둘 다 **별도 안내 레이아웃 없이
   같은 빈 목록 영역**(§2.5.1의 결과 없음 표시를 그대로 재사용)으로
   충분하다 — 새 레이아웃을 만들지 않는다. [[song-select]] §11의
   "안내 문구 + import 진입점" 요구는 `game-public`에는 적용되지
   않는 경로(import UI가 없는 빌드)이므로 이 레이아웃 범위에서
   더 다루지 않는다.
3. **[백로그 — 이번 범위 아님]** row 정보 밀도가 높아 최초 진입 시
   온보딩 툴팁이 필요할 수 있다 — UX 후속 과제, 레이아웃 변경이 아니다.
4. **[백로그 — M4 구현 관심사]** BMS 수준 곡 수에서는 목록 가상화(보이는
   row만 렌더링)가 필요하다 — 스펙/레이아웃 문제가 아니라 M4 구현
   문제로 남긴다.
5. **[확인 필요]** §2의 16:9 / ≤780px 스택 전환 패턴이 이 2열(정보
   패널 좌 / 목록 우) 배치에서도 깨지지 않는지 좁은 폭에서 실제로
   확인해야 한다 — 지금은 재사용을 전제로만 문서화했다.
6. **tutorial 탭 관련**: 사용자 요청에 "tutorial 탭 제거"가 충돌 예시로
   언급됐으나, [[song-select]] 전문(§1–14)에 tutorial 탭에 대한 언급이
   없다 — 현재 스펙에 그런 탭이 없으므로 이 항목은 충돌이 아니라
   해당사항 없음으로 확인했다.
7. 토큰 공백: 이 레이아웃에 필요한 색 전부(§1.1 표면/텍스트, §1.4 state,
   §1.5 tier, §1.6 rank 중 `--cyan`)가 기존 §1 토큰으로 커버된다 — 새
   토큰이 필요한 지점을 찾지 못했다.

---

## 2.6 settings 레이아웃 (M3.5-2)

스테이지는 §2·§2.5와 같은 16:9 + `container-type: size` + `cqw` + 780px 이하
스택 폴백을 그대로 재사용한다.

행동 규칙(어떤 필드가 어느 category에 속하는지, no-record gate, quick
options와의 관계 등)의 단일 출처는 여전히 [[settings]]다. 여기는 그 필드가
scene 4개에 어떻게 배치·표현되는지만 다룬다.

화면 텍스트는 §2.5와 같은 D-2026-077 구분을 따른다 — nav 라벨·필드
라벨·짧은 상태 표시는 공용 영어를 코드에 직접 쓰고, 이해가 목적인 문장만
`src/core/core-i18n.ts` 조회를 거친다.

### 2.6.1 scene 구조 — 4-scene, GAUGE는 OPTION에 병합

settings graph는 `play ↔ visual ↔ sound ↔ option` **4개의 독립 flat
scene**이다([[scene]] §3). `[[settings]]` §2의 category 분류(PLAY/VISUAL/
GAUGE/SOUND/OPTION, 5종)와 scene 경계가 더 이상 1:1이 아니다 — `option`
scene 하나가 GAUGE·OPTION **두 category**를 함께 표시한다.

- **GAUGE → OPTION 병합** (D-2026-074): D-2026-020의 실제 근거는 "settings를
  tab에서 editor와 같은 flat scene mechanism으로 통일한다"는 mechanism
  결정이었지 카테고리 개수·경계를 새로 설계한 근거가 아니었다. GAUGE가
  독립 scene이어야 할 다른 의존(키 바인딩·quick options 배치·no-record
  gate 등)도 찾지 못했다 — 오히려 quick options overlay가 이미 `gaugeMode`를
  `mirror`/`staticShape`/`autoplay`와 같은 5종 안에 나란히 두고 있어
  자연스러운 짝이다. `settings.md` §2에서 GAUGE만 PLAY/OPTION과 달리
  성격을 설명하는 소제목이 없다는 점도 정황이다.
- **SOUND 신설** (D-2026-075): `volMaster`/`volMusic`/`volEffect`(구 PLAY
  소속)를 분리했다 — input·key mapping과 성격 축이 달라 PLAY 아래 묶여
  있을 근거가 약했다.
- 이 4-scene은 D-2026-020이 원래 정한 4-scene(play/visual/gauge/option)과
  **다른 구성**이다 — 우연히 다시 4개가 됐을 뿐 원래대로 돌아간 게 아니다.

### 2.6.2 상단 nav 바

```
┌─ PLAY ─┬─ VISUAL ─┬─ SOUND ─┬─ OPTION ────────────────┐
│                                                          │
│                     (scene 본문)                        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- 4개 scene 이름을 §2.5.1 category pill과 같은 스타일로 상단에 나열한다.
  활성 scene은 `--cyan` 밑줄/배경, 비활성은 `--dim` 텍스트.
- **클릭**으로 즉시 그 scene으로 전환한다(`goScene`).
- **`Tab`/`Shift+Tab`이 `PLAY → VISUAL → SOUND → OPTION → PLAY` 순으로
  전체 4개를 순환한다** — editor의 `notes → shapes → test → notes`
  Tab 순환(`meta`는 click 진입만, [[editor-graph]] §1)과 달리 settings는
  세 scene 중 하나를 예외로 뺄 근거가 없어 **4개 전부를 순환 대상으로
  둔다** — editor의 비대칭을 그대로 옮기지 않는다는 뜻의 의도적 결정이다.
  순환 순서는 nav 바의 좌→우 배치 순서를 그대로 따른다.
- 진입 scene은 `settings-play`([[scene]] §4).

### 2.6.3 필드 표현 어휘 (4개 scene 공용)

song-select에는 없던 컴포넌트 유형이라 여기서 새로 정의한다. 값은 모두
[[settings]] §2/§4가 단일 출처 — 아래는 표현만 다룬다.

- **toggle** (boolean): 캡슐형 스위치. on = `--cyan` 채움, off = `--dim`
  외곽선, thumb `--text`.
- **slider** (number, 연속 범위): 가로 트랙 `--rule` 배경, 채워진 구간
  `--cyan`, 핸들 `--text` 원. 라벨 좌측, 실시간 값 우측 `--mono`.
- **select** (닫힌 소수 enum — `noteSkin`/`frameCap`): 인라인 세그먼트
  컨트롤(옵션 2~3개라 드롭다운 오버레이를 열 필요가 없다).
- **number** (`audioOffset`/`visualOffset`/`noteThickness`): `--mono`
  텍스트 필드, 단위(`ms`)는 `--dim`으로 뒤에 붙인다.
- **key-rebind**: 현재 키 이름을 `--mono`로 보여주는 버튼형 필드. **시각
  상태 3종만** 정의한다 — 캡처 흐름 자체(즉시 확정인지 확인 단계가
  있는지, `Esc` 취소, 충돌 처리 규칙)는 이 레이아웃의 범위 밖이며
  `settings.md` §5 잔여의 "key rebinding UI"(M4-6 前 게이트)가 정한다.
  - idle: `--rule-strong` 테두리, 키 이름 `--text`.
  - capturing: 테두리 `--cyan`, 키 이름 자리에 `Press a key` placeholder
    (공용 영어, D-2026-077 — 짧은 상태 라벨이라 조회 테이블을 거치지
    않는다. 정확한 애니메이션은 구현 시점 결정, 레이아웃 관심사 아님).
  - conflict: 테두리·텍스트 `--j-miss`(§2.5.1 검색 결과 없음과 같은
    attention 색 재사용 — 새 토큰 아님).

### 2.6.4 PLAY scene

볼륨 3필드가 SOUND로 빠져 8개 필드만 남는다 — 다른 scene보다 짧아졌다고
빈 자리를 채우는 padding을 넣지 않는다(§2.5.3의 색약 높이-차등 미채택과
같은 원칙: 짧으면 짧은 대로 둔다).

- 그룹 1 — slider: `scrollSpeed`.
- 그룹 2 — number: `audioOffset`, `visualOffset`.
- 그룹 3 — key-rebind ×6, lane 1~4 슬롯으로 배치. **lane 2·3은 슬롯 하나에
  key-rebind 버튼 2개를 세로로 쌓는다**(`key2`+`key4`가 lane 2, `key3`+
  `key5`가 lane 3에 물린다, [[settings]] §2) — "이 lane은 둘 중 아무 키나
  받는다"는 것을 6칸이 4칸에 어색하게 우겨넣힌 모양이 아니라 시각적으로
  드러낸다. key → lane 매핑 자체는 고정이고 rebind는 그 슬롯의 키만
  바꾼다는 점을 그대로 반영한다.

### 2.6.5 VISUAL scene

- 그룹 1 — select: `noteSkin`, `frameCap`. 화면에서 가장 먼저 눈에 띄는
  값이라 상단에 둔다.
- 그룹 2 — number: `noteThickness` (select 그룹과 인접).
- 그룹 3 — slider: `laneOpacity`, `judgeLinePos`, `sudden`,
  `jacketBrightness`.
- 그룹 4 — toggle: `hitEffect`, `showCombo`, `showJudgment`,
  `showFastSlow`.

**`judgeLinePos`의 raise-only 예외**: 다른 slider와 같은 컴포넌트를 쓰되,
드래그 가능한 트랙 범위가 고정된 하한이 아니라 **현재 저장값에서
시작**한다 — 값을 올릴 수만 있고 트랙 자체가 그 이하로 안 내려간다는
것을 슬라이더 모양으로 보여준다. 이 필드만의 예외이며 다른 slider는
고정 범위([[settings]] §4)를 그대로 쓴다.

### 2.6.6 SOUND scene (신규)

3개 slider만 있는 짧은 화면 — 헤더 구획 없이 나열한다.

| 필드 | 라벨 |
|---|---|
| `volMaster` | Master |
| `volMusic` | Music |
| `volEffect` | **Effect** |

`volEffect`의 라벨을 "Hitsound"로 하지 않고 **"Effect"**로 둔다 —
`volEffect`가 정확히 무엇의 볼륨인지 이 레포 어디에도 텍스트로 정의된
적이 없고(D-2026-075), `render/theme.md`의 "hit effect"(판정선 시각
물결, VISUAL `hitEffect` 토글의 대상)와 용어가 겹쳐 이미 모호한 이름에
"Hitsound"라는 더 구체적인 의미를 얹어 확정하는 건 근거 없는 단정이다.
**막지 않고 남겨두는 항목**: 실제 오디오 배선/설계(M4+/M5+)가 이뤄질 때
`volEffect`의 실제 의미를 확정하고 이 라벨을 재검토한다 — 지금 결정하지
않는다.

### 2.6.7 OPTION scene (GAUGE + OPTION)

병합된 scene이라 시각적으로 두 구획을 명확히 가른다.

```
┌─ Gauge ──────────────────────────────────────────┐
│ [NORMAL] [HARD] [FC] [AP] [AS]      ┊  [CASCADE]  │
└────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────┐
│ Mirror              ⬤────                          │
│ Autoplay            ────⬤                          │
│ Static Shape         ────⬤                          │
│  Autoplay and Static Shape plays are not recorded.  │
└────────────────────────────────────────────────────┘
```

- **gauge 선택 스트립** — 상단, 6칸이지만 5+1 비대칭 배치:
  - 5개 실제 모드(`normal`/`hard`/`fc`/`ap`/`as`)는 각자 §1.4 파생 색으로
    채워진 peer 박스(`--gauge-NORMAL`/`--gauge-HARD`/`--gauge-FC`(=
    `--j-good`)/`--gauge-AP`(=`--j-perfect`)/`--gauge-AS`(=`--j-sync`)) —
    새 토큰 아님, §1.3/§1.4 그대로 참조.
  - **`cascade`는 6번째 peer가 아니라 별도 칸**이다 — 작은 구분선(`┊`,
    `--rule`)으로 5개 묶음과 시각적으로 떼어 놓고, **자기 색을 칠하지
    않는다**(`--rule-strong` 외곽선 + `--text` 라벨만). cascade는 5개
    조건을 전부 병렬로 태우다가 깨진 조건만큼 관대한 tier로 강등되며
    끝까지 가는 모드이고([[gauge]] §4), 최종 표시(result 게이지 막대
    등)는 항상 **정착한 tier 자신의 색**을 쓴다([[gauge]] §4 "result
    게이지 막대는 최종 생존 tier 기준") — cascade 자체가 독립된 6번째
    색을 가질 개념적 근거가 없다. "5개를 가로질러 실행되는 모드"라는
    성격을 peer 색 대신 구분선 + 무채색 외곽선으로 표현한다.
- **toggle 3종** — `mirror`/`autoplay`/`staticShape`, §2.6.3의 toggle
  컴포넌트. 그 아래 `--dimmer` 텍스트로 한 줄 안내 — no-record gate
  인지를 위한 것으로, 별도 아이콘/배지 체계는 두지 않는다. 이 문장은
  **실제 번역이 필요한 문장**(D-2026-077 — 결과를 이해해야 하는 안내이지
  패턴 라벨이 아니다)이라 `translate('settings.option.noRecordNotice',
  locale)`을 거친다(en 기본값 "Autoplay and Static Shape plays are not
  recorded.", ko "autoplay·staticShape는 기록에 반영되지 않습니다." —
  `src/core/core-i18n.ts`). `mirror`는 기록에 영향을 주지 않으므로 이
  안내에서 제외한다([[settings]] §2 "mirror: record 유지").

### 2.6.8 재사용 토큰 vs 신규

기존 §1 토큰으로 대부분 커버되지만(표면/텍스트/괘선, §1.4 state 파생 =
gauge peer 색, `--cyan`, `--mono`/`--sans`), **이 절에서 처음 쓰는 컴포넌트
색**이 있다 — toggle on/off, slider 트랙/핸들, key-rebind idle/capturing/
conflict. 전부 §2.6.3에 명시한 대로 기존 토큰(`--cyan`/`--dim`/`--rule`/
`--rule-strong`/`--text`/`--j-miss`)의 새 용법이며 새 색값을 만들지
않았다.

---

## 2.7 title 레이아웃 (M3.5-3)

디자인 리뷰로 확정된 방향이다 — 아래는 재설계 대상이 아니라 그 결과의
문서화다. title scene 자체의 행동 규칙(입력→전환)의 단일 출처는
[[scene]] §3이며(D-2026-078로 클릭 포함이 명확해졌다 — 아래 2.7.3),
여기는 그 화면의 시각 표현만 다룬다.

스테이지는 §2/§2.5/§2.6과 같은 16:9 + `container-type: size` + `cqw`
단위를 그대로 재사용한다. title은 정적 프레임 하나뿐이라 780px 이하
스택 폴백 자체가 적용될 대상(다열 레이아웃)이 없다 — 타이포만 다른
화면과 같은 하한(`max()`, §1.8) 규칙을 따른다.

### 2.7.1 전경 — wordmark · tagline · 힌트

프레임 중앙에 세로로 쌓은 3개 요소, 전부 가로·세로 중앙 정렬:

| 요소 | 텍스트 | 크기 | 색 | 분류(D-2026-077) |
|---|---|---|---|---|
| wordmark | `Conflux` (첫 글자만 대문자) | ~8cqw | `--text` | 공용 영어 — 고유명사, `translate()` 안 거침 |
| tagline | `Two movements to One.` (확정 캐치프레이즈 대소문자 그대로) | ~1.8cqw | `--dim` | 공용 영어 — 고정 브랜드 문구 |
| 하단 힌트 | `Press anywhere to start` | ~1.7cqw | `--dim`, 하단 anchor | 공용 영어 — 짧은 패턴 라벨 |

- wordmark·tagline은 화면 텍스트가 아니라 **고정 브랜드 자산**에 가깝다
  — locale이 바뀌어도 절대 안 바뀌는 문자열이라 `translate()` 조회
  대상이 아니다(D-2026-077의 "공용 영어" 분류가 커버하는 범위를 UI
  라벨에서 고유명사/고정 문구로 넓힌 사례).
- 하단 힌트는 §2.5.5의 하단 키 힌트 바와 같은 이유로 공용 영어다 — 짧고
  패턴으로 읽는 문구.
- 하단 힌트에 **느린 pulse 애니메이션**을 건다 — opacity가 대략 0.45↔1.0
  사이를 ease-in-out으로 약 2.6초 주기 무한 반복. 정적 텍스트가 아니라
  "지금 입력을 기다리는 중"이라는 능동 프롬프트로 읽히게 하기 위함이다.
  정확한 주기·완화 곡선은 이 문서가 규정하는 디자인값이지 다른 로직이
  참조하는 게이트 수치가 아니다 — `core/constants.md`의 `CREDIT_*`/
  `TEXT_FADE_MS`처럼 다른 코드가 타이밍을 맞춰야 하는 상수가 아니라
  순수 장식이므로 `constants.md`에 올리지 않고 여기 근사값으로만 둔다
  (§2.3의 hit effect 반지름·지속시간이 `render/theme.md`에 남는 것과
  같은 분류 판단).

### 2.7.2 배경 — wave field + bubble

전경 텍스트 뒤, 프레임 전체를 채우는 두 겹의 애니메이션 레이어. 물을
표현하는 컨셉 요소이며 다른 화면(§2.5/§2.6/§2)에는 아직 적용하지
않는다 — title 전용이다.

**레이어 1 — wave field** (전체 높이, 5개 수평 밴드)

- 5개 밴드를 위→아래로 쌓는다. 각 밴드는 독립적인 위상 속도·방향으로
  움직인다(다른 밴드와 동기화하지 않는다).
- amplitude·opacity가 위(멀리·잔잔)에서 아래(가깝고·밀도 높음)로
  증가한다 — 깊이감을 준다.
  - 최상단 밴드: amplitude ~4, opacity ~0.05.
  - 최하단 밴드: amplitude ~12, opacity ~0.13.
  - 중간 3개 밴드는 그 사이를 선형 또는 유사하게 보간한다(정확한
    보간 곡선은 구현 시점 재량 — 레이아웃이 확정하는 건 양 끝값과
    "위→아래 증가"라는 순서뿐이다).
- 색: `--cyan`(§1.1, 이미 §2.5 cyan 사용처 목록에 있는 브랜드 액센트
  토큰 재사용 — 새 색 아님), 밴드별 opacity는 위 표의 낮은 값을 그대로
  최종 렌더 opacity로 쓴다.

**레이어 2 — bubble** (wave field 위에 겹침)

- 약 30~35개 입자, 크기 3~24px 범위.
- 각 입자는 **임의 방향**으로 움직인다(위로만이 아니다) — 속도도
  입자마다 다르다.
- 네 화면 경계 전부에서 wrap한다(한 방향 흐름이 아니라 화면 전체
  범위를 continuous하게 순환).
- 크기가 작을수록(9px 미만) 느리고 더 투명하다 — "멀리 있다"로 읽힌다.
  큰 입자는 더 빠르고 더 불투명하다 — "가깝다".
- 색: `--cyan` 기반.
- **중앙 텍스트 영역과 겹치지 않도록 감쇠**한다 — wordmark+tagline의
  대략적 풋프린트에 맞춘 타원형 감쇠 구역을 두고, 구역 밖에서는 입자가
  정상 opacity, 구역 중심으로 갈수록 거의 투명해지도록 fade한다. 텍스트
  가독성을 가리지 않기 위한 조치다.

### 2.7.3 입력 — 클릭 포함 확정 (D-2026-078)

`scene.md` §3의 title 행 "아무 입력 → mode-select"는 원래 "입력"이
키보드만 뜻하는지 클릭도 포함하는지 명시하지 않았다 — `scene.md`
전문을 확인한 결과 이 화면 자체에 대한 입력 규칙은 그 한 줄이 전부였고
다른 어디서도 보완되지 않았다. "Press anywhere to start" 힌트 문구가
클릭이 유효 입력임을 명시적으로 전제하므로, 이 절이 그 공백을 실제
스펙 변경으로 닫는다 — **키보드 아무 키 OR 마우스 클릭 모두 title →
mode-select를 트리거**한다. `scene.md` §3 id 표를 그에 맞춰 수정했다
(D-2026-078) — 단순 표기 정리가 아니라 이전에 미정이던 입력 종류를
확정하는 행동 변경이라 DECISION_LOG에 남긴다.

### 2.7.4 재사용 토큰 vs 신규

`--text`(wordmark)·`--dim`(tagline·힌트)·`--cyan`(wave·bubble) 전부
§1 기존 토큰이다. 새 색 토큰을 만들지 않았다. wave/bubble의 정확한
amplitude·opacity·개수·크기 값은 색 토큰이 아니라 이 절 고유의 장식
파라미터이므로 §1에 올리지 않는다.

### 2.7.5 미해결 / 확인 필요

1. **[확인 필요]** wave 밴드 3개(중간)의 정확한 보간 곡선, bubble의
   속도·크기 분포(균등/가우시안 등), 감쇠 타원의 정확한 치수는 이
   레이아웃이 근사값·순서 관계만 정하고 정확한 수식은 구현 시점으로
   남겼다 — 시각 결과가 확연히 다르면 구현 후 재검토가 필요할 수 있다.
2. ~~**[백로그]** `prefers-reduced-motion` 대응~~ **해소.** §5(result
   접근성)의 같은 원칙을 title에도 적용한다 — `prefers-reduced-motion`이
   설정되면 별도 대체 레이아웃을 만들지 않고 pulse·wave·bubble
   애니메이션을 그대로 끈 **정지 최종 프레임**으로 둔다(힌트 텍스트는
   최대 opacity 고정, wave·bubble은 움직임 없이 정지). 새 레이아웃
   설계가 아니라 애니메이션 유무만 가르는 스위치다.

---

## 3. 좌표 유도

플롯 좌표를 상수로 박지 않는다.

```js
export const WINDOW = { SYNC: 25, PERFECT: 50, GOOD: 100 }  // ms
export const AXIS = 110                                      // ±ms
export const msToPct = ms => ((ms + AXIS) / (AXIS * 2)) * 100
```

밴드·평균선·눈금 위치는 전부 위 상수에서 계산한다. 판정 창을 조정하면
그래프가 자동으로 따라간다.

---

## 4. 키 바인딩

| 키 | 동작 |
|---|---|
| BACKSPACE | 선택으로(Back → song-select) |
| ENTER | 다시 하기(Retry) |

Space는 result에서 쓰지 않는다.

**Back = Backspace, Retry = Enter** (D-2026-053, D-2026-052 정정) — 1차
근거는 **일관성**이다: D-2026-052가 Backspace를 전 씬 공통 "한 화면 뒤로"로
통일했으므로, result도 그 의미를 따른다. Back이 Enter였다면 그 통일에
result만 예외로 남았을 것이다. Backspace를 Back에 두면 예외가 사라지고,
남은 Enter가 자연스럽게 실행/재시도가 된다. 2차 근거는 반사 입력 차단 —
곡 종료 직후 손이 아직 lane 키(Space 포함) 위에 있어 마지막 노트에 대한
연타 관성이 재시작으로 흘러들 수 있다. F5는 브라우저 새로고침 단축키와
겹쳐 애초에 후보가 아니었다.

result 화면은 ESC를 쓰지 않는다. `scene.md`의 기존 ESC 바인딩은 이 문서의
범위 밖이었으나 D-2026-052로 결정됐다 — §9 참조.

구현 조건:
- `keydown`에서 `preventDefault()`. `keyup`은 늦다
- 키 핸들러는 document 레벨, 버튼은 `tabindex="-1"`.
  포커스된 `<button>`이 Enter를 클릭으로 소비하는 것을 막는다
- 진입 후 400ms 입력 락아웃 → 첫 입력은 연출 스킵으로 소비 → 두 번째부터 동작.
  마지막 노트 직후의 반사적 연타를 흡수한다

---

## 5. 접근성 / 기타

- 버튼은 실제 `<button>`, `:focus-visible` 링 필수
- `--st-F` 대비 5.0:1 이상 유지. 원본 계열의 어두운 적색은 2.3:1로 미달
- 마이너스 부호는 U+2212(`−`)로 통일. 하이픈 혼용 금지
- FAST/SLOW를 색으로만 구분하지 않는다. 위치와 텍스트를 함께 쓴다
- 등장 연출: 점수 카운트업 → rank/state 스탬프. `prefers-reduced-motion` 대응
- 결과 요약을 `aria-live="polite"`로 한 문장 제공

---

## 6. scene.md §9 개정 필요 [계획]

§9 `result` 표시 목록과 대조해 실제로 빠진 다섯 필드만 남긴다(재검토 경과는
DECISION_LOG D-2026-0xx). `chart.subtitle`·`fast`/`slow`(표시)·`prevBest`(표시
자체)는 이미 §9 "result 표시" 줄에 있어 제외했다 — `prevBest`는 필드 추가가
아니라 §9 문면에 **null 허용과 0 기준선 동작**을 명시하는 문제로 남는다(§6.1).
`options.settled`는 §6.2에서 확인한 대로 `tier` 전달 경로 문제이지 result의
표시 필드 문제가 아니다.

| 필드 | 타입 | 용도 | 수집 시점 / 보관 위치 |
|---|---|---|---|
| `gaugeTrace` | `number[]` | 게이지 궤적 그래프 | §6.3 |
| `progress` | `number` (0~1) | 실패 시 중단 지점. clear 시 항상 `1` | 세션 종료(`finalize`) 시 1회 계산 — `forceEnded ? (종료 tick / songEnd tick) : 1` |
| `timingErrors` | `Float32Array` | 타이밍 오차 분포 원자료(§6.4) — 통계(`mean`/`sigma`)는 result 화면이 계산한다 | 판정마다 1개 push, `playState`에 노트 수만큼 누적 |
| `fastCount` / `slowCount` | `number` | 균형 바 | 이미 `playState.fastCount`/`slowCount`([[naming]] §4, D-2026-039) — **신규 필드 아님**, §9 result 표시 줄의 "FAST·SLOW"가 이 값을 읽는다고 명시만 하면 된다 |
| `playedAt` | `number` (epoch ms) | 플레이 시각 | 세션 종료 시 1회, `Date.now()` |

### 6.1 `prevBest` — null 기준선 [계획]

기록이 없는 chart(M3 이전 전부, M3 이후에도 최초 플레이)는 `prevBest: null`을
정상 값으로 받는다. result 화면은 `prevBest == null`일 때 `0`/`0.00%`를
기준선으로 NEW BEST 델타를 계산한다 — M3(기록 저장)를 기다릴 필요 없이 지금
붙여도 동작한다. §9 "best record" 줄에 이 문장을 추가한다.

### 6.2 `options.settled` — 필드 아닌 전달 경로 문제 [확인 완료]

`PlayResult`(`src/core/core-gauge.ts:246`)에 `tier`가 없다. `evaluateState`가
`GaugeState.tier`를 내부에서 소비해 `state`를 산출하지만 `tier` 자체는
`computeResult` 반환값에서 버려진다 — result가 필요한 것은 `state`(마크)가
아니라 게이지 종류(`Tier`) 자체이므로 지금은 정말로 얻을 방법이 없다.

→ **새 result 필드가 아니라 `PlayResult.tier: Tier`를 core에 추가하는
문제**다. `render/theme.md`의 `--gauge-{tier}` 토큰과 옵션 패널의 게이지
이름 표시가 이 값을 그대로 쓴다. `game-session.ts`에서 `computeResult`
호출부 수정이 필요하다 — Change Scope에 포함한다.

### 6.3 `gaugeTrace` — 샘플링과 Cascade 범위 [계획]

- **샘플 개수·간격**: 고정 200포인트, **진행률(songEnd 200등분) 간격**이다
  `[번복 — 초안의 ms 간격 폐기]`. 고정 개수와 ms 간격은 같이 성립하지 않는다
  — ms 간격을 쓰려면 곡 길이로 나눠 정해야 하는데 그게 곧 진행률 간격이고,
  실패로 중간에 끊기면 ms 간격은 200개가 안 차 화면이 `progress`로 가로
  폭을 잡는 방식과 어긋난다. 진행률 간격은 곡이 끝나면 정확히 200개, 실패
  시 앞쪽 일부만 차 `progress` 폭 계산과 그대로 맞는다. pause·카운트다운은
  tick이 안 흐르므로 애초에 샘플이 밀리지 않는다 — ms 간격을 골랐던 이유
  자체가 사라진다.
- **Cascade 범위**: 게이지 종류별로 각각 200포인트 배열을 기록하다가, 세션
  종료 시 **확정된 tier의 배열만 남기고 나머지는 버린다** `[번복 — 초안의
  "매 샘플 최고 tier 하나" 폐기]`. "매 샘플 시점의 최고 tier"를 한 배열에
  이어붙이면 HARD 구간과 NORMAL 구간이 한 선으로 이어지며 확정색(하나) 아래
  값이 도약한다 — 화면은 단색 라인으로 확정돼 있어(§1) 전환 지점을 데이터로
  얹는 쪽(색이 중간에 바뀌는 안)은 그 레이아웃을 다시 여는 것이라 채택하지
  않는다. 메모리는 200 × 게이지 종류 수로 여전히 사소하다.

### 6.4 `timingErrors` — MISS 처리 [계획]

MISS는 오차 없는 판정이라 `NaN`으로 push한다. `0`으로 넣으면 분포 정가운데
가짜 봉우리가 생긴다 — result 화면의 히스토그램/σ 계산은 `NaN`을 표본에서
제외한다(개수 자체는 judgment count 쪽에 이미 집계됨, `fastCount`/`slowCount`와
동일하게 SYNC·MISS·wide·autoplay는 여기서도 제외 대상 — [[glossary]] §2 규칙과
정합).

**소비 쪽 주의 — 그대로 포팅하면 걸린다.** 원본 `js/judgment.js`의
`histogram()`은 범위 검사만 하고 `NaN`을 그대로 통과시켜 인덱스가 `NaN`이
되고, `timingStats()`는 평균이 통째로 `NaN`이 된다. 재구현하는 두 함수 모두
진입부에서 `Number.isFinite()`로 걸러야 한다 — Change Scope에 포함한다.

---

## 7. 미해결 [보류]

1. ~~note 팔레트 충돌~~ **해소.** `#4ae8ff`가 `WIDE_COLOR`와 완전히 같은
   값임이 확인되어 `#4fbcd0`으로 교체했다. `--gauge-NORMAL`도 `#5ad1ff`가
   `TEXT_COLOR`와 가까워 초록 계열 `#4aa870`으로 옮겼다.
2. **티어 색 대 Shape 색 [해소].** DRIFT `#4a9eff` / SURGE `#ff4d5e`가 Shape의
   Blue/Red 계열(`theme.md` §2 `#6bb5ff`/`#ff6b8a`)과 색상 계열은 겹치지만,
   Shape 경계는 `drawGameFrame`(gameplay 캔버스, editor test-play 공유)에서만
   그려지고 티어 칩은 song-select·result 두 scene에서만 노출된다 — `scene.md`
   §9 mode graph가 한 번에 한 scene만 활성화하므로 두 색이 같은 화면에
   동시에 뜨는 경로 자체가 없다(scene 축 분리). 코드로 확인됨 — `theme.md`
   §2 draw order·`scene.md` §9 mode graph 대조.
3. **SURGE 대 실패 적색 [수용]** (D-2026-055). `#ff4d5e`와 `--j-miss`
   `#ff5f70`이 가깝지만 렌더 형태가 다르다 — 티어 칩은 배경이 칠해진 박스,
   실패 표시는 작은 글자·아이콘이라 나란히 놓여도 형태로 갈린다. §7-5(CLEAR
   대 FULL COMBO)와 같은 논리 — 거기는 풀네임 텍스트가, 여기는 박스 대
   표식이 구분을 담당한다. 두 색이 실제로 만나는 조건(곡 선택창 실패 기록
   표시)은 M3(기록 저장) 이후에나 성립하므로 여기서 확정해 M3에서 재론하지
   않는다.
4. ~~`theme.md` 중복~~ **해소.** state·게이지 색은 §1.4 파생 규칙을 단일
   출처로 삼는다. `theme.md`에 중복 정의가 있으면 제거한다.
5. **CLEAR 대 FULL COMBO [수용].** `--st-C` `#4aa870`과 `--st-FC` `#5cff96`가
   같은 색상 계열이다. 명도·채도로 갈리고 배지가 풀네임을 쓰므로 수용한다.
   기본 상태를 어둡게 두어 FC/AP/AS가 도드라지는 것이 의도다.

---

## 8. 이관 메모

프로토타입은 React로 작성됐다. 코드는 그대로 이관되지 않는다.

| 대상 | 이관 |
|---|---|
| CSS 토큰 + 시맨틱 클래스 | 그대로 |
| `WINDOW` / `AXIS` / 포맷터 | `.js`로 그대로 |
| 렌더 | 플랫 ES 모듈 + `data-action` 패턴으로 재작성 |

---

## 9. ESC — 결정됨 (D-2026-052)

**안 A 채택** — 모든 ESC 바인딩에 비-ESC 대체키를 추가한다. `scene.md`에
반영됐다.

| 위치 | 기존 | 대체키 |
|---|---|---|
| credits → title | Esc | **Backspace** |
| song-select → mode-select | Esc | **Backspace** |
| gameplay → pause overlay | Esc | **Backspace** (다른 화면의 Back과 같은 키로 통일 — gameplay에서도 "뒤로"가 pause를 연다) |
| song-select quick options 닫기 | Esc/Space | 이미 Space가 있어 추가 불필요 |

B(`navigator.keyboard.lock`)는 Chromium 전용이라 채택하지 않았다 — Firefox·
Safari에서 결국 A로 폴백해야 해 대체키를 두 벌 유지하는 비용이 더 크다.

부수 확인: result가 D-2026-053으로 Space를 완전히 놓으면서(Back=Backspace,
Retry=Enter) 이 항목은 자동으로 해소됐다 — result에 더 이상 Space가 없다.

song-select의 quick options 닫기(`Esc/Space`)를 Backspace로도 옮길지는
**이 게이트의 범위 밖**이다(D-2026-053). result의 반사 입력 근거(곡 종료
직후 손이 lane 키 위)는 song-select에는 없는 조건이라 그대로 옮길 수 없고,
Backspace-as-back 통일 관점에서 바꾸려면 "오버레이 닫기가 화면 뒤로가기인지
패널 닫기인지"부터 song-select UX를 보고 정해야 한다. song-select 작업 때
별도로 처리한다.
