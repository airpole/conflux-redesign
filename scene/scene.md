# scene — 화면 그래프

> 한 번에 한 화면만 보인다. 화면 = **scene**. scene 전환은 최상위 한 겹이고, scene 내부 패널(에디터 탭·옵션 패널)과는 직교한다.
> 기준축: **game 흐름이 1급**. editor는 별도 축이라 본 문서 범위 밖(§8).
> 근거(why)는 → [[rationale]]. 짝 문서: [[glossary]] (scene 용어 색인), [[gauge]] (도전 모드), [[data-model]] (song⊃chart).

---

## 1. scene 와 내부 패널

- **scene** = 사용자에게 한 번에 하나만 보이는 최상위 화면.
- scene 전환은 화면을 **교체**한다 (이전 scene은 안 보이고, 새 scene만 보인다).
- **scene은 내부에 토글 가능한 패널을 가질 수 있다.** scene 축(화면 전환)과 **직교**한다. 패널 토글은 scene을 안 바꾸고, scene 전환은 패널을 안 건드린다.
  - 사례: `editor` scene의 note/shape/play/meta 탭, `song-select` scene의 옵션 패널(§5).
  - 구현상 scene 전환은 mount element의 `display`를, 패널 토글은 패널의 표시 상태를 건드린다 — 같은 DOM 속성을 절대 공유하지 않는다.

---

## 2. scene 메커니즘 `[보존]`

각 scene은 다음으로 등록된다.

```
scene = {
  id,         // 고유 이름
  mount(),    // 최초 진입 1회 — DOM 구축 (lazy)
  onEnter(),  // 보일 때마다 — 리스너 부착·캔버스 리사이즈·포커스
  onExit(),   // 떠날 때마다 — 리스너 해제·재생 정지·대기 취소
}
```

- **lazy mount**: scene은 **처음 보일 때** `mount()`를 1회만 호출한다. 한 번도 안 본 scene은 비용(DOM·메모리)을 치르지 않는다. → §7 빌드 게이트의 토대.
- **단일 가시성**: 항상 정확히 하나의 scene만 보인다. 떠나는 scene은 `onExit()` 후 숨고, 들어오는 scene은 보인 뒤 `onEnter()`.

### 전환 연산

```
goScene(id)            // id로 전환. 직전 scene을 back-stack에 push.
goScene(id, replace)   // push 없이 교체 — "뒤로 갈 수 없는 통과점"용 (§6 credit).
goBack()               // back-stack pop → 이전 scene. 스택이 비면 no-op.
resetSceneStack()      // 스택 비우기 — title을 새 루트로 되돌릴 때.
```

- 같은 scene으로의 `goScene`은 no-op.
- `goBack`은 떠나는 scene을 스택에 다시 넣지 않는다 (단방향 unwind).

---

## 3. scene 목록

| id | 화면 | 태그 |
|---|---|---|
| `title` | 타이틀. 아무 입력 → mode-select | `[보존]` |
| `modeselect` | 허브. PLAY / SETTINGS / EDITOR (§4) | `[보존]` |
| `settings` | 1회 고정 설정 (오프셋·표시·note skin·sudden·judgeLinePos 등) | `[보존]` |
| `song-select` | song+chart 선택. 옵션 패널 내장 (§5) | `[수정]`¹ |
| `credit` | 자동 인터스티셜. 제작자 크레딧 표시 (§6) | `[신규]` |
| `play` | 보면 플레이 | `[수정]`² |
| `result` | 결과 (점수·rank·state·판정 분포) | `[수정]`² |
| `editor` | 차트 에디터. 별도 축 (§8) | `[보존]` |

¹ `song-select`: 코드의 `music-select`를 개명. **왜** — 고르는 대상이 데이터 용어 [[data-model]] `song`이므로 화면 이름도 song으로 통일(한 개념 한 단어). 더해 코드의 toast 플레이스홀더를 정식 화면으로 구현(`[신규]` 부분 포함).
² `play`·`result`: 코드에선 에디터 위에 덮이는 **fullscreen overlay**다. **왜** — overlay라는 별도 레이어 개념을 폐기하고 각각 **정식 scene**으로 승격. game 빌드에서 에디터 없이 곧장 도달하는 경로가 1급이 된다(§9).

---

## 4. modeselect — 허브 `[보존]`

title 다음의 허브. 항목은 두 종류로 갈린다.

- **플레이 모드** (→ song-select로 진입): 현재 `PLAY` 하나. 모드 확장 시 여기 추가.
- **유틸리티** (곡 선택과 무관): `SETTINGS`, `EDITOR`.

전환:
- `PLAY` → song-select
- `SETTINGS` → settings — `goBack`으로 modeselect 복귀
- `EDITOR` → editor (빌드 게이트, §7)
- 로고/BACK/Esc → `goBack` → title

> modeselect를 game 흐름에 유지하는 이유: 모드 추가 확장 여지 + 내부 빌드의 editor 진입 편의. → [[rationale]].

---

## 5. song-select — 곡 선택 + 옵션 패널

곡(song)과 그 안의 보면(chart, 난이도)을 고른다. [[data-model]] `song ⊃ chart[]`.

### 진입 입력

- **Enter** (곡 커서 위에서) → credit 진입 (§6) → play.
- **Space** → 옵션 패널 토글 (아래). scene 내부 패널이라 곡 선택 맥락이 유지된다.
- 입력이 깔끔히 갈린다: Enter=시작, Space=옵션.

### 옵션 패널 (Space 토글, scene 내부)

곡별로 자주 바꾸는 플레이 옵션만 담는다. (1회 고정 설정은 settings scene 소속 — 오프셋·F/S 표시·note skin·sudden·judgeLinePos 등.)

- **최상단** — `hi-speed` (스크롤 속도). 가장 자주 만지는 값.
- **A. 도전** — `gauge mode` (Normal/Hard/AS/AP/FC/Cascade). 무슨 도전인가. → [[gauge]].
- **B. 보조** — `mirror`. 기록 **유지**.
- **C. 연습** — `autoplay`, `static shape`. 켜면 **기록 안 됨**(no-record). 패널에 명시.

> no-record 규칙: 연습 보조(autoplay·static shape)가 켜지면 그 플레이는 기록(rank·state)을 남기지 않는다. 코드 `noRecordOption()`을 UI 원칙으로 승격.

`[폐기]`: `cmod`(등속 스크롤), `hidden`(레인 커버) — 재설계에서 삭제. hidden은 판정선 올리기(judgeLinePos raise)가 대체하므로 불필요.

---

## 6. credit — 자동 인터스티셜 `[신규]`

곡 선택 확정 후 play 직전, 제작자 크레딧을 잠깐 보여주는 통과 화면.

- **자동 진행**: 유저 입력을 받지 않는다. 잠깐 표시 후 play로 자동 전환.
- **되돌아갈 수 없다**: credit 도중 뒤로 가기 없음. song-select→credit 이후는 play까지 직진.
- 표시: `Music by ○○○` / `Jacket by ○○○` / `Chart by ○○○`. 저장 필드는 `musicBy`·`jacketBy`(song 공통) / `chartBy`(chart별) — "by"는 표시 레이어에서 붙인다(저장은 값만). 필드 상세 → §10 열린 이슈, [[data-model]].

### back-stack 처리 (핵심)

credit은 통과점이라 스택에 남으면 안 된다.

- `song-select → credit`: credit은 입력을 안 받아 goBack이 끼어들 여지가 없다.
- `credit → play`: **`goScene('play', replace)`** — credit을 스택에서 치환. 그 결과 play 시점 back-stack의 top은 **song-select**.
- 효과: play의 pause→Exit, result의 Back이 모두 **credit을 건너뛰고 song-select로 직행**(§9).

---

## 7. 빌드 게이트 `[보존]` (+일반화 `[수정]`)

modeselect 항목·scene은 **빌드 플래그**(`FEATURES.*`)로 노출 여부가 결정된다.

- 플래그 `false` → 그 항목의 버튼이 렌더되지 않고, 부팅이 그 scene을 향해도 `title`로 폴백한다.
- 플래그 `true` → 노출.
- 같은 코드베이스에서 **플래그만** 여닫는다(코드를 빼지 않는다). lazy mount(§2)와 맞물려, 숨긴 scene은 `mount()`도 안 돌아 비용을 안 낸다.

활용:
- `FEATURES.editor` — editor 경로 게이트. `false`면 game 전용 공개 빌드(EDITOR 버튼 없음). 내부 빌드는 `true`.
- **미래 모드의 단계적 공개**: 새 모드를 테스트 중엔 플래그 `false`로 숨기고, 검증 후 라이브에서 `true`로 노출. → 빌드 분기 없이 점진 출시.

부팅: `START_SCENE`이 게이트 off인 scene을 가리키면 `title`로 폴백.

> `[수정]` — 코드의 `FEATURES.editor` 단일 플래그를 "각 항목은 빌드 플래그로 게이팅된다"는 일반 규칙으로 추상화. editor는 그 첫 사례. → [[rationale]].

---

## 8. 전환 그래프 (game 흐름)

```
title
  └─(아무 입력)─▶ modeselect
                    ├ PLAY ─────▶ song-select
                    ├ SETTINGS ─▶ settings ──(goBack)─▶ modeselect
                    └ EDITOR ───▶ editor   (빌드 게이트 §7, 별도 축 §9)

song-select
  ├ Space ─▶ 옵션 패널 토글 (scene 내부, 곡 맥락 유지)
  └ Enter ─▶ credit
               └─(자동, 입력 없음)─▶ play     [credit→play 는 replace]

play
  ├ 종료(클리어 / fail / force-end) ─▶ result
  └ pause ─┬ Resume ─▶ play
           ├ Retry  ─▶ play (처음부터)
           └ Exit   ─▶ song-select          [goBack — credit 안 거침]

result
  ├ Retry ─▶ play (처음부터)
  └ Back  ─▶ song-select                    [goBack — credit 안 거침]
```

- **pause / result의 Retry는 같은 동작**: 같은 보면을 처음부터 재시작. credit을 거치지 않는다.
- **Exit / Back**: credit이 replace로 스택에서 빠졌으므로(§6) song-select로 곧장. 방금 친 곡에 커서가 남은 채 복귀(back-stack 자연 복귀).
- play 종료 판정·state 산출은 play 엔진과 [[gauge]] 소관. scene은 "언제 result로 넘어가는가"라는 전환점만 안다.

---

## 9. play 엔진과 호스트 — scene 위가 아니라 안쪽 분리

play scene은 화면 한 겹일 뿐이고, 플레이 로직(엔진)은 **호스트를 모른다**. 엔진은 단일 컨텍스트 `CTX` 하나만 바라본다.

- **game 호스트** (정식): `CTX`가 자기 position·settings를 소유. song-select가 곡 길이·플레이 옵션을 채워 만든다. 쓰기가 에디터로 새지 않는다.
- **editor 호스트** (별도 축): `CTX`가 에디터 상태를 프록시. 에디터 play 탭에서 같은 엔진을 구동(동작 보존).
- 엔진 자신은 어느 호스트인지 모른다. 호스트 주입은 play 진입 시 1회. → 한 방향 의존(아래는 위를 모른다)과 동형.

> play를 정식 scene으로 승격(§3)한다는 건 곧 **game 호스트 경로를 1급으로 만든다**는 뜻이다. editor 안의 play 탭은 같은 엔진의 다른 호스트일 뿐. CTX·호스트 상세는 본 문서 밖(→ 향후 architecture / editor 문서).

---

## 10. 결정 완료 / 잔여

확정:
- [x] 기준축 game 1급, editor 별도 축 (본 문서 밖)
- [x] modeselect 유지 — 모드/유틸 2분류, 확장 대비
- [x] 빌드 플래그 게이트 일반화 (단계적 공개 활용), 부팅 폴백
- [x] song-select 개명(←music-select), song⊃chart 선택
- [x] 옵션 패널 = scene 내부 패널(Space), 곡별 가변만; 1회 고정은 settings
- [x] 옵션 A(gauge)/B(mirror)/C(autoplay·static shape, no-record), 최상단 hi-speed
- [x] cmod·hidden 폐기
- [x] credit 신규 — 자동·되돌리기 불가, credit→play replace
- [x] play/result overlay→정식 scene 승격
- [x] pause = Resume/Retry/Exit, Retry는 result Retry와 동일 동작
- [x] Exit/Back → song-select(곡 커서 유지), credit 건너뜀

잔여 (scene이 부른 후속 작업 — 별도 세션):
- [x] **data-model.md**: `artist→musicBy`·`charter→chartBy`(chart별)·`jacketBy` 신규. `jacketBrightness`(곡별 폐기→settings)·`measureLabelOffset`(→에디터 settings) 제거. 〔필드명 실측 정정: `jacketImageBrightness`가 아니라 `jacketBrightness`〕
- [x] **naming.md**: 필드 개명 반영, §4.5 신설(settings·scene 명칭), credit 추가, music-select→song-select
- [x] **settings 문서 신설**: `_meta/settings.md` 신설 — 플레이어·에디터 설정 단일 출처
- [x] **glossary.md**: 화면/Scene·설정/Settings 색인 추가(song-select/credit/play/result, 크레딧 필드)
- [x] **rationale.md**: measureLabelOffset [번복], jacketBrightness 통일, 크레딧 값/표시 분리, cmod/hidden 폐기, song-select 개명
- [x] **judgeLinePos**: 개명 안 함(이름 유지), settings 소속, raise-only [보존]. 〔lift 개명 폐기〕
- [ ] credit 표시 시간(초)·연출 구체값
- [ ] pause 입력 키(Esc?)·result 입력 매핑
