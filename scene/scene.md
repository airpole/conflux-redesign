# scene — 화면 그래프

> 한 번에 한 화면만 보인다. 화면 = **scene**. scene 전환은 최상위 한 겹이고, scene 위에 잠깐 덮는 **overlay**(§9)와, 여러 scene을 묶는 **모드 그래프**(§3)와는 직교한다.
> 기준축: 공용 루트(title·mode-select) + 세 모드 그래프(game·editor·settings). game 그래프를 1급으로 적고, editor·settings 그래프의 내부 전환은 각자 문서가 소유한다(§3).
> 근거(why)는 → [[rationale]]. 짝 문서: [[glossary]] (scene 용어 색인), [[architecture]] (레이어·CTX·overlay 귀속), [[gauge]] (도전 모드), [[settings]] (옵션 값), [[data-model]] (song⊃chart).

---

## 1. scene · overlay · 모드 그래프

세 축이 직교한다.

- **scene** = 사용자에게 한 번에 하나만 보이는 최상위 화면. 전환하면 이전 scene은 숨고 새 scene만 보인다.
- **overlay** (§9) = 한 scene **위에** 그 scene을 살린 채 잠깐 덮는 층. scene-manager를 거치지 않는다. 엔진·하위 상태가 계속 살아있다(예: pause, text-event). overlay를 띄운 주체는 그 scene이고, overlay의 내용물은 공유 부품일 수 있다(§5 빠른 패널).
- **모드 그래프** (§3) = 여러 scene을 묶는 묶음. game/editor/settings 세 그래프가 공용 루트 아래 형제로 갈린다.

> 구 모델의 "scene 내부 토글 패널(에디터 탭)"은 폐기됐다. 에디터 탭은 이제 각각 scene이다(editor 그래프, §3). 화면 위에 덮는 건 overlay로 일원화한다.

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
goScene(id, replace)   // push 없이 교체 — "뒤로 갈 수 없는 통과점"용 (§6 song-credit).
goBack()               // back-stack pop → 이전 scene. 스택이 비면 no-op.
resetSceneStack()      // 스택 비우기 — title을 새 루트로 되돌릴 때.
```

- 같은 scene으로의 `goScene`은 no-op.
- `goBack`은 떠나는 scene을 스택에 다시 넣지 않는다 (단방향 unwind).
- 전환 방식은 그래프마다 다르다(§3): game은 **스택형**(goBack 의미 있음), editor·settings는 **평면형**(자유 전환).

---

## 3. 공용 루트 + 세 모드 그래프

```
                       title
                         │  (아무 입력)
                    mode-select  ── 공용 진입 scene. 모드 추가로 확장 (§4)
        ┌────────────────┼────────────────┐
      play             editor            settings   (모드)
        │                │                 │
   [game 그래프]    [editor 그래프]    [settings 그래프]
     스택형             평면형             평면형
```

- **공용 루트**: `title`, `mode-select`. 어느 모드도 아닌 최상위 진입 scene.
- **game 그래프** (스택형 드릴다운): `song-select → song-credit → gameplay → result`. 정의·전환은 본 문서(§5~§8).
- **editor 그래프** (평면형 자유 전환): `notes ↔ shapes ↔ test ↔ meta`. 구체 전환은 **향후 editor 문서**가 소유. ([수정] 구 코드의 "1 editor scene + 내부 탭"을 scene 그래프로 — [[architecture]] §5.)
- **settings 그래프** (평면형): `visual ↔ sound ↔ …`. 설정값 정의는 [[settings]], 화면 묶음은 settings 문서가 소유.

세 그래프는 **형제 축**이고 mode-select에서 빌드 게이트(§7)로 갈린다. 한 트리에 섞지 않는다 → [[architecture]] §5.

### game 그래프 scene 목록

| id | 화면 | 태그 |
|---|---|---|
| `title` | 타이틀. 아무 입력 → mode-select | `[보존]` |
| `mode-select` | 허브. play / editor / settings (§4) | `[보존]` |
| `song-select` | song+chart 선택. 빠른 옵션 패널 띄움 (§5) | `[수정]`¹ |
| `song-credit` | 자동 인터스티셜. 이 곡의 크레딧 표시 (§6) | `[신규]` |
| `gameplay` | 보면 플레이 (구 play scene) | `[수정]`² |
| `result` | 결과 (점수·rank·state·판정 분포) | `[수정]`² |

¹ `song-select`: 코드의 `music-select` 개명. 고르는 대상이 [[data-model]] `song`이므로 화면 이름도 song으로 통일(한 개념 한 단어).
² `gameplay`·`result`: 코드에선 에디터 위에 덮이는 fullscreen overlay다. 각각 **정식 scene으로 승격** — game 호스트 경로를 1급으로(§9). `play`라는 이름은 **모드** 자리에 두고, 곡을 치는 scene은 `gameplay`로 분리(이름공간 충돌 제거). → [[rationale]].

> `credits`(프로젝트 제작진 — 게임 개발자·엔진·디자인)은 곡 단위 `song-credit`과 다른 화면이다. title/settings 어딘가에 두며 본 문서 game 그래프 밖. 곡 크레딧(§6)과 혼동 금지.

---

## 4. mode-select — 공용 허브 `[보존]`

title 다음의 공용 진입 scene. 세 모드로 갈린다.

- `play` → game 그래프 (song-select)
- `editor` → editor 그래프 (빌드 게이트, §7)
- `settings` → settings 그래프
- 로고/BACK/Esc → `goBack` → title

> mode-select를 공용 루트로 두는 이유: **모드 추가 확장의 단일 지점**. 새 플레이 모드가 생기면 여기 항목만 추가한다. → [[rationale]].

---

## 5. song-select — 곡 선택 + 빠른 옵션 패널

곡(song)과 그 안의 보면(chart, 난이도)을 고른다. [[data-model]] `song ⊃ chart[]`.

### 진입 입력

- **Enter** (곡 커서 위에서) → song-credit 진입 (§6) → gameplay.
- **Space** → 빠른 옵션 패널 토글 (아래).
- 입력이 깔끔히 갈린다: Enter=시작, Space=옵션.

### 빠른 옵션 패널 (Space 토글)

판마다 바뀔 수 있는 옵션만 빠르게 만진다. 1회 정하면 잘 안 바꾸는 값은 settings 그래프 소속([[settings]]).

담는 5개 (전부 [[settings]] 영속 값의 부분집합):

- **scrollSpeed** — 스크롤 속도. 가장 자주 만짐.
- **gaugeMode** — Normal/Hard/AS/AP/FC/Cascade. 무슨 도전인가 → [[gauge]].
- **mirror** — 레인 미러. 기록 **유지**.
- **staticShape** — shape 고정(연습). 켜면 **기록 안 됨**.
- **autoplay** — 자동 플레이. 켜면 **기록 안 됨**.

> **공유 부품**: 이 패널은 컴포넌트 하나로, `song-select`와 editor `test`가 **똑같이** 띄운다(§9 overlay). 값은 [[settings]] 한 곳에 있어 어디서 바꾸든 동기된다. 컴포넌트는 edit/game 공용이라 그보다 아래 레이어 → [[architecture]].
> **no-record**: staticShape·autoplay 중 하나라도 켜지면 그 판은 기록(rank·state)을 안 남긴다. 단일 판정(코드 `noRecordOption()` 승격). mirror는 기록 유지.

`[폐기]`: `cmod`(등속 스크롤), `hidden`(레인 커버). hidden은 judgeLinePos raise가 대체. F/S 표시는 빠른 패널이 아니라 settings(visual) 소속(1회 정하면 고정).

---

## 6. song-credit — 자동 인터스티셜 `[신규]`

곡 선택 확정 후 gameplay 직전, 이 곡의 크레딧을 잠깐 보여주는 통과 화면.

- **자동 진행**: 유저 입력을 받지 않는다. **5초** 표시 후 gameplay로 자동 전환 [신규]. (scene 내부에서 다른 scene으로 직접 전환 불가 — 타이머가 끝내는 통과점.) 스킵 불가: 재시작(Retry/Back)은 gameplay로 직행해 song-credit을 다시 안 거치므로(§6 back-stack), 반복 대기가 없어 스킵이 불필요하다.
- **되돌아갈 수 없다**: 도중 뒤로 가기 없음. song-select 이후는 gameplay까지 직진.
- 표시: `Music by ○○○` / `Jacket by ○○○` / `Chart by ○○○`. 저장 필드는 `musicBy`·`jacketBy`(song 공통) / `chartBy`(chart별) — "by"는 표시 레이어가 붙인다(저장은 값만). → [[data-model]].

### back-stack 처리 (핵심)

song-credit은 통과점이라 스택에 남으면 안 된다.

- `song-select → song-credit`: 입력을 안 받아 goBack이 끼어들 여지가 없다.
- `song-credit → gameplay`: **`goScene('gameplay', replace)`** — song-credit을 스택에서 치환. play 시점 back-stack의 top은 **song-select**.
- 효과: gameplay의 pause→Exit, result의 Back이 모두 **song-credit을 건너뛰고 song-select로 직행**(§8).

---

## 7. 빌드 게이트 `[보존]` (+일반화 `[수정]`)

mode-select 항목·scene은 **빌드 플래그**(`FEATURES.*`)로 노출 여부가 결정된다.

- 플래그 `false` → 그 항목 버튼이 렌더되지 않고, 부팅이 그 scene을 향해도 `title`로 폴백.
- 같은 코드베이스에서 **플래그만** 여닫는다(코드를 빼지 않는다). lazy mount(§2)와 맞물려, 숨긴 scene은 `mount()`도 안 돌아 비용을 안 낸다.

활용:
- `FEATURES.editor` — editor 그래프 게이트. `false`면 game 전용 공개 빌드. 내부 빌드는 `true`.
- **미래 모드의 단계적 공개**: 새 모드를 테스트 중엔 `false`로 숨기고 검증 후 `true`로 노출. 빌드 분기 없이 점진 출시.

부팅: `START_SCENE`이 게이트 off인 scene을 가리키면 `title`로 폴백. → [[architecture]] §4.

---

## 8. 전환 그래프 (game 흐름)

```
title
  └─(아무 입력)─▶ mode-select
                    ├ play ─────▶ song-select        (game 그래프)
                    ├ editor ───▶ editor 그래프        (빌드 게이트 §7)
                    └ settings ─▶ settings 그래프

song-select
  ├ Space ─▶ 빠른 옵션 패널 토글 (overlay, 곡 맥락 유지)
  └ Enter ─▶ song-credit
               └─(자동, 입력 없음)─▶ gameplay   [song-credit→gameplay 는 replace]

gameplay
  ├ 종료(클리어 / fail / force-end) ─▶ result
  └ pause (overlay, 엔진 살림) ─┬ Resume ─▶ gameplay (lead-in 3초 후 재개)
                                └ Exit   ─▶ song-select   [song-credit 안 거침]

result
  ├ Retry ─▶ gameplay (처음부터)
  └ Back  ─▶ song-select                          [song-credit 안 거침]
```

- **pause는 overlay**(§9): gameplay 엔진을 죽이지 않고 멈춘다. **Esc로 토글** ([보존] 키 + [수정] 동작: 현재 코드 Esc는 `stopPlay`(완전 정지)이나, 재구현에선 pause overlay 토글로). Resume은 멈춘 지점 **3초 전부터 lead-in**(노트가 안 내려오는 무음 run-up) 후 재개 `[보존]`(`LEAD_IN_MS`=3000). Exit는 그때 비로소 song-select로 scene 전환.
- **Retry**(result)와 **Resume**(pause)은 다르다: Retry=처음부터 새 판, Resume=멈춘 지점 이어서.
- **Exit / Back**: song-credit이 replace로 빠졌으므로(§6) song-select로 곧장. 방금 친 곡에 커서가 남은 채 복귀.
- gameplay 종료 판정·state 산출은 엔진과 [[gauge]] 소관. scene은 "언제 result로 넘어가는가"라는 전환점만 안다.

---

## 9. overlay, 그리고 엔진과 호스트

### overlay — scene을 살린 채 덮는 층

scene 전환은 이전 화면을 내리지만, overlay는 **그 scene을 살린 채 위에 덮는다**. scene-manager를 거치지 않는다.

- **pause** — gameplay scene이 자기 위에 띄우는 overlay. 엔진은 멈추되(paused) mount 유지. Resume이 걷는다. 인터랙티브(버튼)라 캔버스 위 DOM 층.
- **text-event** — gameplay가 곡 진행 중 그리는 비인터랙티브 표시. 캔버스 패스로 그린다(별도 DOM 없음).
- **빠른 옵션 패널**(§5) — song-select·test가 각자 자기 위에 띄우는 overlay. 내용물은 공유 부품.
- overlay는 새 레이어가 아니다. 상태·인터랙션은 game(또는 edit), 그리기는 render가 나눠 맡고, 기능별로 한 파일에 응집한다 → [[architecture]].

z-층(한 화면 안 쌓임): 캔버스 패스 순서(배경 < playfield < notes < text-event < HUD)로 쌓고, pause만 그 위 DOM 1층. draw order 단일 출처 → [[theme]].

### 엔진은 호스트를 모른다 `[보존]`

gameplay 로직(엔진)은 **호스트를 모른다**. 단일 컨텍스트 `CTX` 하나만 본다.

- **game 호스트** (정식): `CTX`가 자기 position·settings 소유. song-select가 곡 길이·옵션을 채워 만든다.
- **editor 호스트**: `CTX`가 에디터 상태를 프록시. editor `test` scene에서 같은 엔진을 구동(동작 보존).
- 엔진은 어느 호스트인지 모른다. 주입은 gameplay 진입 시 1회. CTX 필드·seam 상세 → [[architecture]] §3.

> gameplay(game 호스트)와 test(editor 호스트)는 **같은 엔진의 두 호스트**다. 그래서 빠른 옵션 패널도 둘이 공유한다(§5).

---

## 10. 결정 완료 / 잔여

확정:
- [x] 공용 루트(title·mode-select) + 세 모드 그래프(game 스택 / editor·settings 평면)
- [x] mode-select = 모드 확장 단일 지점
- [x] 빌드 플래그 게이트 일반화, 부팅 폴백
- [x] 용어: `gameplay`(scene)/`play`(모드), `song-credit`(곡)/`credits`(제작진), editor `play`탭→`test`, `song-select`(←music-select)
- [x] 빠른 옵션 패널 5종(scrollSpeed/gaugeMode/mirror/staticShape/autoplay), song-select·test 공유, no-record(staticShape·autoplay)
- [x] F/S·cmod·hidden은 빠른 패널서 제외(F/S→settings, cmod/hidden 폐기)
- [x] song-credit 신규 — 자동·되돌리기 불가, →gameplay replace
- [x] gameplay/result overlay→정식 scene 승격
- [x] pause = overlay(엔진 살림), Resume(lead-in 3초)/Exit. result = Retry/Back
- [x] overlay = scene 소유 층(공유 부품 예외), game+render 분담, 새 레이어 아님
- [x] song-credit 표시 5초, 스킵 불가(재시작은 gameplay 직행이라 반복 대기 없음)
- [x] pause = Esc 토글([보존] 키 + [수정] stopPlay→pause)

잔여:
- [ ] result/pause 메뉴의 전체 키 매핑(방향키+Enter+클릭) → **settings 키 배치 단일 출처로 이관** (여기서 단발로 안 정함, [[settings]] 잔여)
- [ ] song-credit 연출 구체값(페이드 등)
- [ ] editor 그래프 내부 전환 규칙 (→ 향후 editor 문서)
- [ ] settings 그래프 scene 묶음(visual/sound…) 구체 (→ settings 문서)
- [ ] 빠른 패널 공유 컴포넌트의 정확한 레이어 위치 (→ architecture/settings)
