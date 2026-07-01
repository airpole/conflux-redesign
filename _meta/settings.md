# settings — 플레이어 설정 단일 출처

> 저장되는 **곡 데이터**([[data-model]])와 별개로, 플레이어가 1회 정하는 영속 설정을 여기 모은다.
> 곡과 함께 배포되지 않으며(.cfx에 안 실림), 로컬에 한 객체로 영속된다.
> 필드명은 [[naming]], 개념은 [[glossary]]. 근거는 [[rationale]].

---

## 1. 성격 — 곡 데이터가 아니다

settings는 **사람의 환경·취향**이다. 같은 곡을 누가 치든 달라지는 값(스크롤 속도·시야·키 배치·오디오 지연)이라 곡(song)에 묶지 않는다.

- **저장**: 로컬 영속 한 객체(코드 실측: localStorage 단일 키). 기본값 위에 저장값을 병합 → 필드 추가가 자동 하위호환.
- **적용**: 엔진이 읽는 자리에 주입(`applySettings`). settings 모듈은 엔진을 직접 import하지 않는다(저수준 leaf, import 사이클 차단).
- **곡 데이터와의 경계**: 곡 제작자가 정하는 연출은 chart/metadata([[data-model]]), 플레이어가 정하는 환경은 settings. 한쪽에 있던 값이 반대 성격이면 옮긴다(예: 자켓 밝기 → settings, measureLabelOffset → 에디터 settings).

---

## 2. 카테고리

코드의 카테고리 구획을 계승한다(settings 화면 탭과 1:1).

### PLAY — 입력·오디오 동기

- **`scrollSpeed`** — 노트 낙하 속도. [[glossary]] scrollSpeed(playbackRate와 영원히 분리). 구 `hiSpeed`/`ES.pvSpd`. 단위 0.1, 범위 [[constants]] `SCROLL_SPEED_*`.
- **`audioOffset`** (ms) — **음악 시작**을 당기고 민다(+ = 음악 먼저, 오디오 출력 지연 보정). [[glossary]] offset(곡별 `metadata.offset`)과는 **다른 축** — 이건 플레이어 장비 지연 보정.
- **`visualOffset`** (ms) — **판정 시각**을 당기고 민다(+ = 입력을 이르게 처리, 늦게 치는 사람 보정). audioOffset과 독립 튜닝. 판정 diff에 먹는 지점 → [[judge]] §3. (구 코드는 `PS.visualOffset`로 주입만 하고 판정 공식엔 아직 안 물렸다 — 미배선. 재설계에서 judge diff에 반영.)
- **`volMaster` / `volMusic` / `volEffect`** — 음량. (구 `ES.hitVol`은 volEffect로 흡수.)
- 키 배치(`DEFAULT_LANE_KEYS`/`DEFAULT_ACTION_KEYS`)도 PLAY 소속(상세 [[naming]] §3). **전역 입력 매핑의 단일 출처** — lane 타격 키뿐 아니라 pause(Esc)·result(Retry/Back)·메뉴 네비(방향키+Enter) 등 scene 동작 키도 여기서 정의한다. scene 문서는 "어느 동작이 일어나나"만, 키 바인딩은 settings가 소유([[scene]] §8·§10). **[수정]**: 구 코드는 키 매핑을 `PS`(playState)에 뒀다(settings.js "keybindings live in PS") — 재설계에서 settings로 단일화.

### VISUAL — 표시

- **`noteSkin`** — `'bar'` | `'circle'`. 일반 노트만(Wide 제외).
- **`laneOpacity`** — 레인 배경 투명도(0~1, 기본 1.0). [보존].
- **`judgeLinePos`** — 판정선 세로위치(필드 높이 분수). **기본 8/9 = 최하단**, 값이 작아질수록 위로 올라간다(**raise-only**, 기본 아래로는 못 내림). 올리면 콤보 블록도 따라 오르되 하단 HUD 띠는 기본 밴드에 고정. 동작 [보존].
- **`sudden`** (0~90%) — 상단 불투명 레인 커버. (구 `hidden`과 별개. hidden은 폐기.)
- **`jacketBrightness`** (0~100) — 자켓 배경 밝기. 구 전역 `bgBrightness` 개명. **곡별 값 아님** — 곡별 `metadata.jacketBrightness`는 폐기([[rationale]]).
- **`hitEffect`** / **`showCombo`** / **`showJudgment`** / **`showFastSlow`** — 표시 토글.
- **`frameCap`** — 0=무제한(디스플레이 추종), 30/60=상한.
- **`noteThickness`** — 노트 두께(구 `ES.nThk`).

### GAUGE — 도전 사다리

- **`gaugeMode`** — `normal`|`hard`|`fc`|`ap`|`as`|`cascade` 단일 축. 정의·강등·terminate 전체는 → [[gauge]]. (코드의 `gaugeType×lockTarget×lockMode` 직교를 6종 사다리로 평탄화, [[rationale]].)

### OPTION — 곡별로 자주 만지는 변형 (옵션 패널 ↔ settings)

기록 정책이 갈린다. 아래 셋 중 하나라도 해당하면 그 판은 점수를 남기지 않는다(no-record). **이 문서가 no-record 게이트의 단일 출처** — 다른 문서(scene 등)는 여기로 링크한다.

무기록 = `autoplay || staticShape || 중간시작`:
- **`autoplay`** — 자동 플레이. 내가 안 쳤으니 무기록 `[보존]`.
- **`staticShape`** — shape를 고정 -2/+2로 동결(노트 연습용). shape 변형은 Conflux의 핵심 도전이라 고정하면 읽기가 유리 → 무기록 `[보존]`.
- **중간 시작**(`!startedFromBeginning`) — 곡 처음부터가 아니라 중간부터 시작한 판. 온전한 플레이가 아니라 무기록 `[보존]`.

`mirror`는 기록 **유지**(무기록 아님). 배속(`playUsedSlowRate`)도 기록을 막지 않는다 — 에디터에서 늦춰 보는 건 기록돼야 하므로 구 코드가 의식적으로 게이트에서 뺐다.

(구 코드엔 무기록 게이트가 `isRecordingDisabled()`와 `recordEligible` 둘로 갈려 미배선 상태였다. 재설계가 합집합으로 수렴한 근거 → [[rationale#no-record 게이트를 하나로 수렴한 이유]].)

> **폐기**: `cmod`(등속 스크롤, 미출시) — [[rationale]]. 옵션 패널 ↔ 1회 고정 설정의 분담은 [[scene]] §5.

---

## 3. 에디터 settings (곡 데이터 아닌 편집 보조)

플레이어 settings와 별개로, **에디터에서만** 쓰는 1회 보조값. 곡과 함께 저장·교환되지 않는다.

- **`measureLabelOffset`** — 캔버스·tempo/TS 목록·마디 입력칸에 보이는 **마디번호 라벨만** 옮긴다. **내부 마디 인덱싱은 불변**(tick 0 = 내부 1마디). 8/16마디 루프를 눈으로 잡는 편집 도구. (구 `metadata.measureLabelOffset`에서 이전 — 곡 데이터 아님, [[rationale]] [번복].)

---

## 4. 결정 완료 / 잔여

확정:
- [x] settings = 영속 단일 객체(로컬), 기본값 병합으로 하위호환
- [x] 곡 데이터/플레이어 설정 경계 명문화
- [x] `jacketBrightness` 단일화(곡별 폐기, 전역 개명)
- [x] `judgeLinePos` 이름 유지, raise-only [보존]
- [x] `scrollSpeed`로 용어 통일(구 hiSpeed)
- [x] `cmod` 폐기, `sudden` 유지
- [x] `measureLabelOffset` 에디터 settings로 이전

잔여:
- [ ] 키 배치 UI·기본 매핑 상세 (lane 타격 + scene 동작: pause/result/메뉴 네비 포함 — [[scene]]에서 이관)
- [ ] settings 화면(scene-settings) 레이아웃 (→ [[scene]] 연계)
- [ ] frameCap·volume 등 구체 기본/범위 수치 ([[constants]]와 분담 정리)
