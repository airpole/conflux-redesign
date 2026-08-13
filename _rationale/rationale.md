# 설계 근거 (Rationale)

> 정의 문서는 what만, 이 문서는 why를 기록한다. 최신 spec과 충돌하는 과거 근거는 최신 spec이 우선한다.

---

## 판정·gauge

### judgment을 threshold table로 둔 이유
SYNC/PERFECT/GOOD/MISS는 `abs(diff_ms)` 한 축의 구간이다. wide도 다른 threshold row일 뿐이라 한 table lookup으로 표현한다. FAST/SLOW는 diff 부호라 judgment 종류와 분리한다.

### gaugeMode를 단일 축 6종으로 둔 이유
과거 gaugeType×lockTarget×lockMode 3축은 사용자 선택 하나를 과도하게 분해했다. normal/hard/fc/ap/as/cascade 6종으로 평탄화하면 UI와 engine 분기가 일치한다. terminate는 gauge 0으로 수렴하고 cascade만 강등 규칙을 둔다.

### hold tail 특례를 폐기한 이유
head/tail을 일반 judgment와 같은 SYNC/MISS 규칙으로 처리하면 display·count·terminate·gauge가 한 의미를 공유한다. hard tail 수치는 일부 바뀌지만 예외 signal과 전용 delta가 사라진다.

### hold release 임계를 원본과 같은 150ms로 되돌린 이유 `[번복]`
D-2026-024는 이 임계를 `HOLD_RELEASE_GRACE_MS`(50) 하나로 적으면서 "원본 값 복원"이라고 했지만, 원본을 잘못 읽은 것이었다. 원본은 `tailMs − JUDGE_GOOD − LN_RELEASE_GRACE_MS`, 즉 **150ms**를 임계로 썼고 `LN_RELEASE_GRACE_MS`는 GOOD 창 위에 얹는 추가분이었다(`play-input.js` `handlePlayKeyUp` 실측). `constants.js`만 읽고 사용처를 읽지 않아 관용 폭이 원본의 1/3로 좁아진 채 남아 있었다 — 대장에도 없어 골든이 영원히 드러내지 못하는 자리였다.

당시 근거였던 "grace를 넓히면 손을 뗀 뒤에도 키 점유가 유지된 것처럼 취급돼 lane 수요 계산이 어긋난다"도 key-demand 모델에서는 성립하지 않는다. keyup 즉시 `keysHeld`에서 키가 빠지고 shortage 해소도 그 자리에서 끝나므로, grace는 **점유 기간이 아니라 그 tail을 SYNC로 볼지 MISS로 볼지만 정하는 분류 임계**다. 관용 폭을 넓혀도 수요 계산은 어긋나지 않는다.

behavior-preserving rewrite의 기본값은 보존이고 이 좁힘은 의도된 개선이 아니라 오독의 산물이므로, 원본과 같은 150ms로 되돌린다. 두 상수의 값과 의미는 그대로 두고(골든 대조도 그 둘이 맡는다) 합에만 `HOLD_RELEASE_WINDOW_MS`라는 이름을 준다 — 새 튜닝 수치를 만들지 않으면서 "관용 폭이 얼마인가"가 한 이름으로 읽힌다.

### 후보 순서를 단일 결정론 규칙으로 둔 이유
normal/wide를 별도 풀로 나눠 `bestNormal ?? bestWide`로 고르면 더 이른 wide가 더 늦은 normal에 밀려 버려지는 입력 잡아먹힘이 생긴다. earliest startTick을 최우선으로 하면 이 문제가 사라지고, 같은 tick에서만 normal이 wide를 이긴다. 오래된 미해결 노트를 미래의 노트가 가로채지 않는다는 원칙도 그대로 지켜진다.

### Normal Hold를 lane 익명 수요로 둔 이유
lane 2·3의 두 물리 키는 행동상 완전히 동등하다. Hold를 특정 키에 고정 배정하면 유효한 손가락 선택(짧은 hold는 왼쪽, 긴 hold는 오른쪽 등)을 거부하게 된다. lane 수요를 "몇 개가 활성인가 vs 몇 개가 눌려 있는가"로만 비교하면 개별 노트-키 소유 관계보다 단순하면서도 모든 조합을 허용한다.

### WideHold를 단일 소유·원자적 이양으로 둔 이유
교차 손가락 복구(다른 손가락이 우연히 이어받는 것)를 지원하려면 소유가 이양될 수 있어야 하지만, 동시에 두 키가 같은 WideHold를 소유하면 중복 판정·조기 MISS가 생긴다. Normal 수요를 먼저 만족시키고 남는 키만 Wide 후보로 삼으면 어느 쪽을 우선할지에 대한 모호함이 사라진다.

### 전체 6키 global conflict를 별도 스코프로 둔 이유
lane별·wide별 로컬 capacity 검사는 서로 disjoint한 풀만 본다. 그래서 1+2+2+1+1=7처럼 각 풀은 통과하지만 실제 손가락 6개로는 칠 수 없는 조합을 놓친다. lane 키 집합이 서로소이고 wide 수요가 최대 1이므로, 로컬 부등식 다섯 개에 총합 부등식 하나만 추가하면 현재 6키 설계에 대한 완전한 배정 가능성 검사가 된다.

### Hold head MISS를 2단위로 확정한 이유
Hold의 성공 조건은 head AND tail이다. head를 놓치면 tail은 애초에 성립할 수 없으므로 그 순간 두 단위 모두 실패로 확정하는 것이 논리적으로 맞다. 모든 score/게이지 시스템이 같은 두 단위를 관용 없이 적용해야 head-MISS 한 번이 결과에 미치는 영향이 시스템마다 다르게 계산되지 않는다. combo reset은 1회만 실행하지만(0을 두 번 만들어도 의미가 없으므로) 이것이 페널티를 줄이는 것은 아니다 — score/accuracy/게이지는 여전히 2단위를 모두 반영한다.

### 영속 note ID를 도입하지 않은 이유
판정에 필요한 속성(`startTick`·`lane`·`isWide`·`duration`)이 완전히 같은 노트는 플레이어 입장에서 행동상 구별할 수 없다. 결정론적 후보 순서만으로 어떤 물리 keydown이 어떤 인스턴스를 소비하는지 항상 답을 낼 수 있으므로, 안정적인 신원을 위한 별도 ID는 불필요한 개념 추가다.

---

## 공통 duration·grid

### duration 규칙을 공통으로 올린 이유
note/shape/lane 모두 `duration==0`이면 순간, `>0`이면 지속이다. 같은 조건을 세 문서에 다른 말로 두지 않는다.

### subdivision을 time signature와 분리한 이유
subdivision은 한 beat를 N등분하는 축이고 time signature는 measure boundary 축이다. 입력도 dropdown+typed special value로 분리한다.

### gridDivisor를 분음표 표기로 바꾼 이유
에디터·DAW 관례와 맞추기 위해 구 beat division N을 `N×4` 분음표 값으로 표기한다. 좌표 계산은 동일하다.

### laneGridDivisor를 분리한 이유
시간 subdivision과 공간 subdivision은 의미가 다르다. lane horizontal snap은 별도 2/3/4/6/8/12/16 계열을 사용한다.

---

## shape·lane

### shape 좌표를 -8~+8로 저장하는 이유
표시값과 저장값을 일치시키면 0~64 내부값 환산이 사라진다. 0.25 step과 정밀도도 동일하다.

### init fallback을 -2/+2로 둔 이유
안전 fallback에 비대칭 이유가 없으며 중앙 기준 대칭 mental model이 자연스럽다.

### Step·Arc를 input label로만 둔 이유
Step은 duration 0, Arc는 입력 순간 In/Out-Sine으로 resolve할 수 있어 저장 enum을 늘릴 필요가 없다. 평가기는 절대값만 본다.

### anchor/transition type을 나누지 않은 이유
데이터는 easing 값 하나로 갈리는 같은 event다. 특수한 null만 anchor라 부르고 일반 보간에 새 type 이름을 만들지 않는다.

### isBlue를 chain identity로 둔 이유
Blue/Red는 방향이나 순서가 아니라 독립 chain 식별자다. 교차를 자연스럽게 허용한다.

### lane data를 unconstrained로 둔 이유
표현력을 data에서 막기보다 gameplay projection이 boundary/order/min-gap을 보장한다. editor는 raw truth와 projected difference를 보여준다.

### laneEvents와 shape workflow를 공유하는 이유
평가·cache·editing pattern은 동형이지만 좌표계가 달라 object type은 합치지 않는다.

---

## domain·render 분리

### input과 render를 분리하는 이유
judge는 input→judgment, render는 표시만 담당한다. overlap·shape·lane visual을 judge가 알면 layer dependency가 오염된다.

### overlap/conflict를 derived domain으로 둔 이유
검출은 notes만으로 계산되는 순수 map이고 render는 색을 입히는 소비자다. capacity 이내=overlap, 초과=conflict로 한 검출 뒤 분기한다.

### sweep-line n-way로 확장한 이유
3중 이상 overlap에서 정확한 active set과 초과 수가 필요하다. O(n log n) sweep-line은 정확성과 성능을 동시에 만족한다.

### conflict 삭제가 reverse insertion order인 이유
배치 순서는 항상 total order이고 “나중에 얹은 초과분”을 지우는 편집 직관과 맞다. notes 배열은 insertion order를 보존한다.

---

## settings·theme·scene

### measureLabelOffset을 editor setting으로 옮긴 이유 `[번복]`
measure structure가 아니라 보이는 measure number label만 바꾸는 작업 보조다. chart와 배포할 이유가 없다.

### jacketBrightness를 global setting으로 둔 이유
background brightness는 chart author 연출보다 player visibility preference다. chart별 값과 global 값의 중복을 제거한다.

### credit 값만 저장하는 이유
이름 값과 `Music by` 같은 display label을 분리하면 localization·layout 변경이 data migration이 되지 않는다. 독립 chart 결정 후 musicBy/jacketBy/chartBy 모두 chart가 소유한다 `[번복 반영]`.

### cmod·hidden을 폐기한 이유
cmod는 미출시이면서 ms 등속 scroll과 개념이 겹친다. hidden은 judgeLine raise와 목적이 겹친다.

### song-select 이름을 유지하는 이유 `[번복 반영]`
저장 `song` 객체는 사라졌지만 사용자는 같은 `songId` chart group을 하나의 곡 단위로 탐색한다. `song-select`는 UI group 이름이고 data container를 뜻하지 않는다.

### scene graph를 통일한 이유
editor도 notes/shapes/test/meta scene graph를 사용하면 구 tab mechanism이 사라지고 game/editor가 같은 scene manager를 재사용한다. game은 stack형, editor는 flat형이다.

### play mode와 gameplay scene을 가른 이유
mode와 active play scene의 namespace 충돌을 피하고 editor test host까지 같은 engine으로 설명하기 위함이다.

### song-credit과 credits를 가른 이유
chart credit와 project staff credit은 data와 transition이 다르다. song-credit은 선택 playable chart의 credit를 첫 진입에 보장한다.

### overlay를 scene-owned로 둔 이유
pause는 engine을 살려야 하며 모든 현재 overlay가 특정 scene 소속이다. global modal host를 미리 만들지 않는다.

### quick options를 공유하는 이유
song-select와 editor test가 같은 persistent settings subset을 편집하므로 component 하나가 자연스럽다.

### quick options 배치를 host 소유로 둔 이유
song-select는 탐색 중 일시 진입(overlay), editor test는 charting 중 상시 접근(panel)으로 접근 패턴이 다르다. component는 값 편집만 담당하고 layer를 강제하지 않는다.

### settings를 category별 4 scene으로 나눈 이유
editor tab 폐기와 같은 방향의 mechanism 통일이다. 구 단일 scene + 4 tab을 같은 scene manager 위의 평면 graph로 옮기면 별도 tab 장치가 사라진다.

### theme를 별도 source로 둔 이유
색·draw order·치수·font는 표현 값이고 constants의 logic 수치와 다르다.

### judge line raise 때 HUD strip도 이동하는 이유
line과 strip 사이 dead space와 두 기준선을 없애되 strip 내부 높이는 고정해 stretch를 피한다.

### H와 F state color를 분리한 이유
song-select badge에서 색이 식별 축이므로 hard clear와 fail이 같은 빨강이면 구분되지 않는다.

---

## records·settings

### no-record gate를 하나로 수렴한 이유
과거 여러 미배선 조건을 합쳐 autoplay/staticShape/mid-start/editorOrigin 한 predicate로 두면 소비처마다 다른 적격 판정이 생기지 않는다.

### state P를 F로 흡수한 이유
완주 미달과 중도 실패는 사용자에게 모두 clear failure다. `F>N`으로 두어 play한 기록은 no-play보다 높게 유지한다.

### records를 별도 문서로 둔 이유
settings는 사용자 입력, records는 game output이다. gauge/core에 persistence를 섞지 않는다.

### automatic chartId migration을 제거한 이유 `[번복]`
본문 비교로 rename을 추론하면 timing·music이 독립인 새 chart model에서 잘못 연결될 위험이 더 커진다. `.cfx`와 library가 records를 이동하지 않는 단순 경계를 우선한다. 수정 chart의 연결은 fingerprint를 포함한 records/game-library 문제로 별도 review한다.

### 기록을 identity에 유지하고 수동 초기화로 돌린 이유 `[번복 반영 — 구 fingerprint 보류]`
fingerprint는 key 확장 하나처럼 보이지만 canonical 직렬화 규칙·해시 캐시·표시 분기가 함께 딸려 온다. 리차팅 후 옛 best가 남는 문제는 유저 본인이 가장 잘 인지하며 초기화 한 번으로 끝난다. 조건 판별을 시스템에서 제거하고 유저 관리로 돌리는 것이 Reduce Concepts에 맞다. maxCombo 초과 같은 stale 값은 검증하지 않고 수용한다.

### 기록 초기화를 internal 빌드로 게이트한 이유
records는 로컬 개인 데이터라 타인의 기록을 건드릴 수 없지만, 공개 빌드 유저에게 삭제 UI를 노출할 이유도 없다. 권한·인증 시스템을 새로 만들지 않고 기존 빌드 게이트 축(`FEATURES`)으로 노출만 가른다.

### 다운그레이드 reimport를 confirm 후 허용한 이유
배포자 본인의 의도적 롤백이 정당한 유스케이스이고, 차단해도 "song 삭제 후 재import" 우회로가 항상 열려 있어 보호 효과는 절차 추가뿐이다. 실수 import는 confirm의 downgrade 표시가 방어한다. library가 blob 전체 교체 구조라 부분 수용은 애초에 존재하지 않는다.

### 서버 기반 기록을 보류한 이유
신뢰 가능한 기록(조작 방지·전체 유저 관리·리더보드)은 신뢰 경계 바깥(서버)의 검증으로만 성립한다. 현행 records는 로컬 개인 best 계약이며, 서버가 생겨도 identity key·초기화·reimport 결정과 충돌하지 않으므로 지금 확정할 필요가 없다.

### constants와 settings의 분류 기준
logic calculation range는 constants, visual value는 theme, user preference/current value는 settings다.

---

## architecture

### plat을 env로 개명한 이유
env는 core의 environment-independence와 대조되어 browser API boundary를 분명히 한다. host는 CTX 의미로 이미 사용한다.

### architecture를 layer source로 둔 이유
README·naming에 중복된 layer diagram을 한 곳으로 모아 dependency, env/render boundary, CTX seam, build gate를 함께 정의한다.

### core가 global data 대신 active chart를 받는 이유 `[번복 반영]`
core가 editor global이나 library song group에 결합되지 않아 Node test와 one-way dependency가 가능하다. 새 model에서는 active chart가 timing까지 모두 소유한다.

### gameplay를 test의 restriction으로 보는 이유
판정·gauge·render engine은 하나이고 game/editor host가 context만 다르게 주입한다.

---

## persistence·cfx

### store를 4분리한 이유
workspace/library/records/settings의 성격이 달라 key collision·reserved name을 구조적으로 없앤다. user file이 canonical이라 editor database를 두지 않는다.

### chart JSON과 `.cfx` 두 층을 유지한 이유
editor는 chart 하나를 자주 수정하고 game은 관련 chart 집합을 배포한다. 작업 파일과 배포 container를 분리하면 매 저장 zip rewrite와 canonical duplication이 사라진다.

### independent chart ownership으로 번복한 이유 `[번복]`
chart별 metadata·music·jacket·timing을 허용하려면 song-common copy 동기화와 “최저 chartId 정본”이 거짓이 된다. chart 자체를 완전한 작업 문서로 두고 songId는 grouping만 담당하는 것이 결정과 구조가 직접 대응한다.

### persisted song container를 없앤 이유 `[번복]`
공통 소유 state가 없는데 `{songId, charts[]}`를 canonical로 저장하면 group-by로 파생 가능한 wrapper를 중복 저장한다. loader/UI가 필요할 때만 view를 만든다.

### explicit asset file reference가 필요한 이유 `[번복]`
package-wide `*_music` 하나를 suffix로 찾는 규칙은 chart별 asset을 연결할 수 없다. chart가 file name을 저장하면 관계가 명시적이고 공유도 같은 name 참조로 표현된다.

### flat ZIP + global file-name uniqueness를 선택한 이유
per-chart folder는 collision을 없애지만 package structure와 path semantics를 늘린다. package 생성 빈도가 낮고 user가 input을 명시하므로 flat root와 deterministic reject가 더 단순하다. packager는 자동 rename하지 않는다.

### same-name identical asset만 합치는 이유
여러 chart가 같은 asset을 공유할 수 있게 하되 name이 같은 다른 binary를 조용히 선택하지 않는다. 다른 이름의 같은 binary까지 dedup하지 않아 content-address store를 되살리지 않는다.

### user-selected packaging을 기본으로 둔 이유
folder 전체 inference는 무관 JSON·여러 songId·version·asset association을 추론하게 해 format semantics를 복잡하게 만든다. 선택된 input 검증만 core flow로 두고 folder scan은 prefill로 낮춘다.

### re-scan이 latest recommendation으로 돌아가는 이유
package 생성은 드물어 과거 manual old-version selection을 오래 유지할 근거가 약하다. candidate set을 새로 읽으면 최신을 다시 기준으로 삼는다. 이 규칙은 packager 후보 선택에만 해당하며 library의 구버전 reimport 허용 여부는 별도 보류다.

### Representative Chart가 display default만 제공하는 이유
song group list에는 대표 title/jacket/preview가 필요하지만 이를 common canonical source로 만들면 chart independence를 다시 깨뜨린다. 선택 전 display에만 쓰고 선택 후 active chart로 전환한다.

### packaging을 non-destructive로 둔 이유
package는 selected files의 derived output이다. success/cancel/failure가 source version·workspace·JSON을 바꾸면 저장과 package 책임이 섞인다.

### whole-package rejection을 선택한 이유
`.cfx`는 이미 conflict-resolved final unit이다. environment마다 정상 subset이 달라지는 partial load보다 명시적 fail이 재현 가능하다.

### decode validation을 layer별로 나눈 이유
editor는 data recovery가 중요하고 game은 playable guarantee가 중요하다. packager가 cross-environment codec support를 보장할 수는 없다.

### library를 editor workspace와 분리한 이유
초안 chart가 game list에 노출되지 않도록 `.cfx` import라는 명시적 publish boundary를 둔다.

### debug dump를 폐기한 이유
독립 chart JSON이 이미 text canonical document라 별도 dump가 역할 중복이다.

### songId를 UUID로 둔 이유
content change와 identity change를 분리하고 새 song 생성만 새 group UUID를 발급한다 `[번복 반영]`.

### legacy converter를 탑재하지 않는 이유
구 schema와 lane/shape/event 차이가 커 앱 runtime이 두 format을 알게 하는 비용보다 외부 일회 변환이 작다.

### Ctrl+S를 version-gated 저장으로 바꾼 이유 `[번복]`
workspace 즉시 저장은 무음이라 사용자가 정본 파일을 언제 만들었는지 인지하기 어렵다. 저장 창을 매번 띄우고 더 큰 version을 강제하면 파일 계보가 항상 명시적이고 단조 증가한다. 실패·취소 시 version을 바꾸지 않아 정본과 메모리 상태가 어긋나지 않는다.

### Ctrl+E·derive·duplicate-as-new-song을 제거한 이유 `[번복]`
export(Ctrl+E)와 저장(Ctrl+S)이 각각 다른 정본 개념(메모리 vs workspace)을 만들어 어느 파일이 진짜 정본인지 혼동을 낳았다. Ctrl+S 하나로 저장 경로를 통일하면 정본이 하나로 수렴한다. derive는 새 song 시작이라는 같은 결과를 이미 있는 chart를 변형해 만들어 원본과의 관계가 모호했다. 새 song 생성을 “새 chart(init) 만들기” 하나로 단일화하면 새 songId의 시작점이 항상 명시적인 init이다.

### workspace를 dirty 전용 복구 슬롯으로 좁힌 이유 `[번복]`
정본이 파일인 이상 clean 상태의 workspace는 이미 파일과 중복이다. dirty일 때만 유지하면 stale 복구본이 남지 않고, "이어서 편집" 진입점이 항상 실제로 복구할 무언가가 있을 때만 나타난다. `dirty`/`baseVersion`을 chart 스키마 밖에 두는 이유도 같다 — 이 값은 복구 세션의 상태이지 채보 내용이 아니다.

### 세션 전환 시 Save New Version/Discard/Cancel 세 선택지를 둔 이유 `[신규]`
파일이 정본이므로 전환 시 무음 손실이나 무음 자동 저장 모두 위험하다. 세 선택지로 명시하면 사용자가 매 전환마다 “새 정본을 만들지, 현재 변경을 버릴지, 전환을 취소할지”를 능동적으로 결정한다.

### 새 난이도에 Start Blank/Use Current Chart 두 모드를 둔 이유 `[번복]`
chart 독립 소유 결정 이후에도 실제로는 기존 chart를 베이스로 새 난이도를 만드는 경우가 흔하다. 배열 단위 선택(Notes/Shapes/Lanes/Text)을 허용하면 “완전 백지”와 “전부 복사” 사이의 실제 편집 요구를 모두 만족하면서도 복사는 시작값일 뿐이고 이후 완전히 독립적으로 diverge한다는 원칙은 유지된다.

### `.cfx`에서 init을 필수로 바꾼 이유 `[번복]`
Representative Chart가 “없으면 최저 playable chartId로 대체”하는 fallback을 가지면 대표 정보가 매 패키징마다 달라질 수 있어 표시 안정성이 떨어진다. init을 필수로 하면 대표 chart가 항상 명시적으로 작성된 editor-only chart로 고정된다.

### `.cfx` 파일명에 version을 넣은 이유 `[번복]`
파일명만으로 최신 배포본을 구분할 수 있어야 재배포·재import 시 사용자가 혼동하지 않는다. init version이 패키지 대표 기준이며 개별 chart version은 각 JSON 내부에서 별도로 유지되므로 파일명의 version과 chart별 version은 다른 축이다.

### music 없을 때 편집·저장은 허용하고 패키징만 막는 이유
시간축 편집은 오디오 재생과 독립적으로 가능해야 mid-작업 상태도 안전하게 저장할 수 있다. 반면 재생 불가능한 chart를 배포하면 게임에서 사용할 수 없으므로 패키징 시점에만 차단한다.

### jacket 기본을 순수 검정이 아닌 암색으로 둔 이유
완전한 검정은 배경이 없다는 신호와 의도적으로 어두운 자켓을 구분하지 못한다. 눈이 편한 기본 암색을 쓰면 placeholder임이 자연스럽게 드러난다.

### 범용 jacket·미리듣기 기능을 이번 범위에 넣지 않은 이유
둘 다 지금 결정해야 할 저장/패키징 계약과 독립적인 기능 확장이다. 이번 커밋에서 구현 계약을 만들면 아직 논의되지 않은 UI를 암묵적으로 확정하게 된다.

---

## editor

### meta scene을 Tab cycle에서 뺀 이유
tempo·metadata는 편집 hot loop보다 드물게 바뀐다. notes→shapes→test를 빠른 cycle로 유지한다.

### vertical axis를 time-proportional로 둔 이유
editor와 gameplay에서 보이는 시간 밀도를 일치시킨다. grid는 tick 계산 후 ms로 투영한다.

### editor-origin play를 no-record로 둔 이유
workspace chart는 즉시 변하므로 stable library content의 record와 연결할 수 없다. 조건 추론보다 전체 editor-origin을 제외하는 것이 단순하다.

### symmetry axis를 dynamic snapshot으로 둔 이유
배치 tick의 current shape center를 기준으로 하면 현재 형태에 대한 대칭이라는 편집 감각을 유지한다. Ctrl+F mirror는 axis 0의 별 기능이다.

### chart structure edit를 undo 밖에 둔 이유
한 session=한 chart이고 session replacement에서 history가 clear된다. cross-file structure undo stack을 만들지 않는다.

### 붙여넣기를 스크롤 기준으로 두고 충돌을 조용히 스킵하는 이유
스크롤로 위치를 잡고 `Ctrl+V`를 누르는 keyboard-centric flow에 기준점을 맞춘다. cursor 기준은 붙여넣기마다 포인터를 재조준하게 만든다. 충돌 시 whole rejection은 반복 구간 붙여넣기에서 한 개의 충돌이 전체를 막아 마찰이 크다 — skip은 남은 결과를 보고 이어서 고칠 수 있다.

### mirror만 서브모드 필터의 예외로 둔 이유
mirror의 전형적 사용은 "이 구간을 통째로 좌우 반전"이라 shape·lane 구분과 무관하다. 필터를 그대로 적용하면 shape만 뒤집히고 lane이 남은 어긋난 상태가 default 결과가 된다. 예외 하나의 비용이 두 번 실행하는 마찰보다 작다.

### mirror axis를 0으로 고정한 이유
editor mirror는 play mirror와 **같은 변환**이어야 결과를 예측할 수 있다([[judge]] §3 단일 출처). symmetry의 dynamic axis에 연동하면 두 mirror가 갈라진다. `Ctrl+F`를 flip-paste에서 회수한 것은 제자리 반전이 flip-paste보다 고빈도이고, paste 계열은 `Ctrl+V` 문맥에 묶어두는 정리이기도 하다.

### editor를 single-chart session으로 둔 이유
workspace·open·저장이 한 chart 파일과 1:1이면 canonical relation이 명확하다. 새 chart는 같은 songId에서 시작값을 복사하되 이후 독립적으로 diverge한다 `[번복 반영]`.

---

## text event

### transition·mode를 폐기한 이유
appear는 실사용이 없고 mode는 tutorial 하나뿐인 dead axis였다. fade 고정값([[constants]] `TEXT_FADE_MS`)과 `content`·`position`만 유지한다.

---

## 결정 상태

이번 `.cfx` Closure Review에서 다음 근거가 기존 cfx/song-common/record-migration 근거를 대체한다.

- independent chart ownership
- derived songId group
- Representative Chart display-only role
- explicit per-chart asset references
- flat package collision policy
- user-selected packager flow
- no automatic record migration
- modified-chart record linkage Deferred

이번 persistence/cfx meta-review에서 다음 근거가 기존 workspace-save/export/derive 근거를 대체한다.

- version-gated Ctrl+S save, Ctrl+E·derive·duplicate-as-new-song 제거
- workspace를 dirty 전용 복구 슬롯으로 축소, `dirty`/`baseVersion`은 chart 스키마 밖
- 세션 전환 시 Save New Version/Discard/Cancel 확인
- 새 난이도 Start Blank/Use Current Chart 두 모드
- `.cfx` init 필수 포함(Representative Chart fallback 폐기)
- `.cfx` 파일명에 version 포함
- music 누락은 편집·저장 허용·패키징만 차단, jacket 누락은 기본 암색 배경으로 전 과정 허용
- 범용 jacket·미리듣기 기능은 이번 범위에서 미결정

### 하위 폴더 구조와 폴더 우선 진입을 기각한 이유 (D-2026-016 해소)
하위 폴더는 압축을 열어본 사람에게 시각적 정돈만 더할 뿐, chart의 asset 참조가 "경로 성분 없는 파일명만 허용"인 현행 규칙과 정면 충돌해 참조 의미론·loader 경로 규칙을 다시 쓰게 만든다. 충돌 방지는 전역 파일명 유일 검증이 이미 결정적으로 수행한다. 폴더 우선 진입은 무관 JSON·복수 songId·version 추론 문제를 되살리며, 그 편의는 prefill로 이미 확보돼 있다. 이 영역은 전부 `[번복]`/`[신규]`라 동작 보존 압력이 없고, 압축 내용물을 한 층에 두는 쪽이 사용자 직관과도 일치한다 — 단순한 쪽을 확정한다.

이번 records/game-library Closure Review에서 다음 근거가 기존 fingerprint 보류 근거를 대체한다.

- records identity 유지·수동 초기화 (fingerprint 미도입, D-2026-017)
- 기록 초기화의 internal 빌드 게이트
- 다운그레이드 포함 reimport confirm 허용 (D-2026-018)
- 서버 기반 기록 Deferred (D-2026-019)

### pause를 카운트다운 재개로 바꾸고 기록을 유지한 이유 (D-2026-022)
끊어치기의 이득은 두 겹이다 — 되감기(lead-in)가 주는 도움닫기 이득과, 노트 없는 틈에 쉬는 휴식 이득. 되감기를 없앤 카운트다운 재개는 전자를 완전히 제거하고, 후자는 통상 허용 범위라 판단해 기록을 유지한다. 즉시 재개가 아닌 카운트다운을 두는 이유는, 정당한 중단(전화·알림) 후 복귀 시 조작 불능 구간이 재개 직후 노트를 확정으로 흘려 "기록 유지" 취지를 스스로 깨기 때문이다. mid-start no-record는 "시작"으로 좁혀 pause와 분리했다 — 중간 시작은 판의 일부를 아예 치지 않는 것이고, pause는 전 구간을 치되 흐름만 끊는 것이라 성격이 다르다.

### gauge 서술에서 lock 묶음말을 제거한 이유 (D-2026-022)
gauge 문서에 gauge·lock·tier 세 어휘가 겹쳐 있었다. "lock"은 구 코드 lockTarget 유래의 묶음말일 뿐 옵션명도 저장값도 아니어서, `as`/`ap`/`fc` 열거로 대체해도 정의가 짧아지기만 한다. 남는 개념은 gauge(두 값)와 tier(현재 단계) 둘이며, tier를 gauge의 구성 값으로 격상해 한 우산 아래 서술한다. quick options의 영속을 명문화한 것은 "세션 한정 vs 영속" 미명시가 autoplay 잔존 같은 함정 해석을 낳을 수 있어서다 — settings와 같은 필드 하나만 두는 쪽이 단일 출처 원칙과도 맞다.

이번 judgment system 재설계(D-2026-024)에서 다음 근거가 기존 key-owned Hold·tail release grace 폐기 근거를 대체한다.

- 결정론적 후보 순서 단일화(normal/wide 분리 풀 폐기)
- Normal Hold 익명 lane 수요
- WideHold 단일 소유·원자적 이양(Normal 우선)
- tail release 임계 = GOOD 창 + `HOLD_RELEASE_GRACE_MS` (150, 원본과 같음 — D-2026-039에서 정정)
- Hold head MISS 2단위 즉시 확정
- 전체 6키 global conflict 검사
- 영속 note ID 미도입
- mid-start crossing-Hold 시드·pause Resume 비-재시드 분리

---

## song-select 목록 모델 (D-2026-025)

### 왜 row = song, slot = chart인가

목록의 최소 단위를 chart로 두면 같은 곡이 난이도 수만큼 줄을 차지해 목록이 길어지고, 곡을 찾는 동선이 느려진다. row를 song으로 두고 난이도를 가로 slot으로 펼치면 한 줄에서 곡 식별과 난이도 선택이 동시에 끝난다.

groupBy 축이 chart별로 갈리는 값(level·difficulty·state·rank)일 때만 같은 song이 여러 folder에 나뉘어 나타나는데, 이때도 row 단위는 song으로 유지하고 조건에 맞지 않는 slot을 비운다. 규칙을 "folder 조건을 만족하는 slot만 채운다" 하나로 유지하기 위해서다.

### 왜 slot에 state 램프를 넣는가

선곡창에서 가장 빈번한 동선은 특정 레벨의 미클리어 chart를 찾는 것이다. 기록이 정보 패널에만 있으면 커서를 하나씩 옮겨야 상태를 알 수 있어 이 동선이 성립하지 않는다. 목록을 훑는 것만으로 판별 가능해야 한다.

### 왜 preview를 지연 재생하는가

커서 이동마다 즉시 재생하면 목록을 빠르게 훑을 때 음악이 계속 끊긴다. 커서가 멈춘 뒤에만 재생을 시작해 탐색과 감상을 분리한다.

### 왜 정렬 변경 시 커서를 유지하는가

정렬은 "지금 보고 있는 곡을 다른 기준으로 다시 보는" 조작이다. 변경할 때마다 커서가 목록 첫 항목으로 튀면 그 의도가 깨진다.

### 왜 category는 탭이고 groupBy 축이 아닌가

category는 모집단을 정하는 필터이고 groupBy는 모집단 안의 묶음이다. 같은 값을 두 층에서 쓸 수 있게 두면 조합의 절반이 무의미해진다. 탭으로 고정하면 항상 보이므로 접근 비용도 낮다.

---

## records 스키마 (D-2026-026)

accuracy는 score와 판정 가중이 달라([[constants]] §3) 저장된 score에서 역산할 수 없다. percent 표시·judge 분포 표시·percent 정렬을 모두 지원하려면 판정 분포 자체를 저장해야 하며, 분포를 저장하면 score·rank·accuracy가 전부 파생된다. 결과적으로 필드 수는 5개에서 3개로 줄고 파생 필드가 사라져 단일 출처가 강해진다.

`playCount`는 어떤 표시·규칙도 소비하지 않아 제거했다.

---

## chartId 5 = Phase (D-2026-027)

Phase는 subtitle이 없을 때 Flux보다 어려운 최상위 난이도이고, subtitle이 있을 때는 별개 컨셉의 차분이다. 전자를 정규 난이도로 취급하기로 한 이상 고정 슬롯을 주는 것이 데이터 모델과 표시 모델을 일치시킨다. 고정 슬롯 5개는 song-select의 한 화면 slot 수와도 맞아떨어진다.

---

## viewState (D-2026-028)

정렬·탭 같은 화면 상태를 settings에 넣으면 설정 화면 노출·초기화 대상·no-record 게이트 같은 settings의 규칙에 함께 얽힌다. 성격이 다른 데이터이므로 store를 분리해 settings의 정의를 좁게 유지한다.

---

## 탭 백그라운드 auto-pause (D-2026-029)

브라우저가 백그라운드 탭의 오디오·타이머를 억제하면 음악은 멈추고 판정만 흘러 게이지가 전멸한다. pause가 이미 기록을 유지하도록 재설계돼 있어(D-2026-022) auto-pause의 비용이 없다. 창 포커스만 잃은 경우까지 걸면 듀얼 모니터 환경에서 과민하게 동작하므로 `visibilitychange`만 사용한다.

---

## 곡 종료 (D-2026-030)

### 왜 tail을 3000ms 하나로 통일했나

원본은 차트가 더 길면 마지막 이벤트 +4000ms, 음악이 더 길면 음악 끝 +2000ms에서 끝났다. 이 비대칭은 설계값이 아니라 `getChartEndMs()`의 tail(+2000)과 종료 루프의 tail(+2000)이 우연히 겹쳐 생긴 값이다. 어느 쪽이 길든 마지막 판정 뒤의 여운은 같아야 하므로 상수 하나로 접었다. leadIn(3000ms)과 같은 값이 되어 판의 앞뒤 여백도 대칭이 된다.

### 왜 musicEndMs에서 offset을 빼나

chart time 0은 audio position `offset`에 대응한다([[timing]] §8). 원본은 chart time인 재생 위치를 offset 보정 없는 raw audio duration과 비교해서, offset이 0이 아니면 종료 시각이 그만큼 어긋났다. 재설계는 두 값을 같은 축에 놓는다.

### 왜 종료 조건에서 5000ms 하한을 뺐나

원본 `totalMs`는 종료 판정 기준과 에디터 seek bar 분모를 겸했고, 5000ms 하한은 후자를 위한 값이었다 — 빈 차트에서 진행 축이 0으로 붕괴하는 걸 막는 용도다. 두 역할을 분리하면서 하한은 timeline 쪽에만 남겼다.

### 왜 chartEndMs에 laneEvent를 포함했나

원본 `getChartEndMs()`는 note·textEvent·shapeEvent만 훑고 `lineEvents`를 빼먹었다. 마지막 연출이 lane 변형이면 그만큼 잘린다. 세 종류를 훑는 규칙에 예외를 둘 이유가 없어 event 전 종류로 맞췄다.

### 왜 autoplay는 result를 거치지 않나

autoplay 판은 기록이 남지 않고([[settings]] §2) 점수·rank가 플레이어의 성취가 아니다. 원본도 autoplay 종료를 result 없이 정지로 처리했다. 결과 화면을 주면 no-record 표기를 덧붙여야 하고 "기록 아닌 결과"라는 층이 하나 늘어난다.

---

## updatedAt과 lane 매핑 승격 (D-2026-031)

### 왜 updatedAt을 chart JSON 필드로 두었나

후보는 두 개였다 — chart 안의 필드냐, library 항목의 메타냐. library 메타에 두면 값이 import 시각이 되어 사실상 `addedAt`과 같아지고, "최근 작업한 곡"이라는 `updated` 축의 의미가 "최근 받은 곡"으로 뒤바뀐다. chart가 자기 metadata·timing·asset을 모두 소유하는 구조([[data-model]] §1)와도 맞고, `.cfx`에 자연히 실려 배포본에서도 제작 시점이 보존된다.

### 왜 ISO 8601 문자열인가

epoch 정수보다 사람이 파일을 열어 읽을 수 있고, 사전순 비교가 그대로 시간순이라 정렬에 파싱이 필요 없다. chart JSON은 사용자가 직접 다루는 정본 파일이므로 가독성 쪽에 무게를 뒀다.

### 왜 import·패키징이 값을 덮지 않나

덮으면 배포된 `.cfx`를 받은 시점이 전부 같은 값이 되어 축이 무너진다. `updatedAt`은 **제작자가 마지막으로 저장한 시각**이지 수령자의 시각이 아니다. 같은 이유로 갱신 시점을 "저장 성공"에 묶었다 — 저장 창을 취소하거나 실패한 판은 내용이 바뀌지 않았으므로 시각도 바뀌지 않는다.

### 왜 lane 매핑을 settings로 승격했나

`laneOf(key)`는 judge 전체가 전제하는데 실제 값은 `_extracted/EXTRACTED_FACTS.md` §1에만 있었다 — 실측 자료가 스펙 역할을 겸하는 상태였다. 값 자체는 실측 확정이라 결정할 것이 없고 자리만 문제였다. 키 바인딩 표가 이미 settings에 있으므로 같은 표에 lane 열을 붙이면 "어떤 키가 어느 lane인가"를 한 곳에서 읽는다. judge는 링크만 갖는다.

---

## build-order (D-2026-032)

### 왜 milestone 아래 step을 두었나

milestone 6개만으로는 하나가 세션 여러 개 분량이라 "지금 어디까지 됐나"를 말할 단위가 없었다. 반대로 step만 나열하면 큰 능력의 경계가 사라진다. 두 층을 두고 역할을 갈랐다 — milestone은 사람이 확인하는 능력 단위, step은 검증 단위다.

### 왜 step 경계를 소프트하게 두었나

step을 하드 경계로 두면 구현 에이전트가 한 번에 처리할 수 있는 양보다 잘게 끊겨 왕복 비용만 늘어난다. 반대로 전부 유동적이면 gate를 건너뛴 채 진도가 나간다. 그래서 기본은 소프트하게 두되 **gate가 걸린 경계만 하드**로 만들었다. 유동성이 필요한 곳과 통제가 필요한 곳이 다르다.

### 왜 M3와 M4를 뒤집었나

원래 순서(game graph → persistence)면 song-select를 지을 때 목록에 띄울 library도, state 램프에 넣을 records도 없다. 스텁 데이터로 UI를 지은 뒤 다음 milestone에서 같은 화면을 다시 결선해야 한다. 파일·기록 층을 먼저 세우면 song-select가 처음부터 실제 데이터를 읽는다. 비용은 D-2026-021의 결정 시점이 한 단계 앞당겨지는 것인데, 원래도 "M4 전 해소"였으므로 약속이 바뀌는 건 아니다.

### 왜 완료 기준을 동작 문장으로 썼나

"문서를 구현했다"는 통과 여부를 판정할 수 없다. 문서 커버리지나 테스트 개수도 마찬가지로 실제 동작을 보장하지 않는다. 관찰 가능한 문장만 남기면 완료가 논쟁거리가 되지 않는다 — behavior-preserving rewrite에서 지켜야 할 것도 문서가 아니라 동작이다.

### 왜 회귀를 두 층으로 나눴나

core는 순수 함수라 원본에 같은 입력을 넣어 기대값을 고정할 수 있다. 그 위층(렌더·scene·파일)은 원본이 브라우저 앱이라 자동 비교가 어렵고, song-select나 `.cfx`처럼 원본에 대응물이 없는 영역도 있다. 자동화가 되는 곳은 자동화하고 안 되는 곳은 시나리오를 명시해 사람이 돌린다.

---

## M1 진입 gate (D-2026-033)

### 왜 구현 코드를 명세 레포 안에 두나

레포를 가르면 스펙 변경과 그 구현이 다른 레포의 다른 커밋으로 흩어져, "이 코드가 어느 스펙 판을 따랐나"를 사람이 기억해야 한다. 같은 트리에 두면 명세가 source of truth이고 코드가 파생이라는 관계가 커밋에서 그대로 드러난다. 비용은 루트가 문서와 코드로 섞이는 것인데, 문서가 이미 디렉터리로 갈려 있어 `src/`가 하나 늘어도 탐색이 나빠지지 않는다.

### 왜 플래그를 2개로 묶어 두나

플래그는 분기다. 스펙이 요구하지 않은 플래그를 미리 만들면 어느 빌드에서도 켜지지 않는 분기가 코드에 남고, 그 분기는 테스트되지 않은 채 늙는다. 플래그는 스펙이 "이 빌드에선 보이지 않는다"고 말한 자리에만 생긴다. `debugOverlay` 같은 개발 보조는 필요해질 때 스펙에 정의를 먼저 두고 만든다.

### 왜 빌드 프로필 기본값이 public인가

잊었을 때의 결과가 비대칭이다. 개발 빌드를 잊으면 에디터가 안 떠서 즉시 알아차리고 다시 빌드하면 된다. 공개 빌드를 잊으면 에디터가 공개되고, 그건 되돌릴 수 없다 — 이미 받아 간 번들을 회수할 방법이 없다. 개발 환경 설정이 매번 필요한 비용은 `.env.development` 파일 하나로 끝난다.

### 왜 경로 차단이 아니라 코드 제거인가

원본은 플래그로 경로만 잠그고 코드는 그대로 배포했다(구 `config.js`의 *the editor code still ships*). 이 방식은 "플레이어가 클릭으로 도달할 수 없다"까지만 보장하고 번들을 뜯는 사람은 막지 못한다. 에디터 공개가 되돌릴 수 없는 종류의 사고라면 보장 수준을 올려야 한다. lazy mount 구조가 이미 깔려 있어 추가 비용이 거의 없다 — 동적 `import()`의 조건을 빌드 상수에 걸면 번들러가 청크를 제거한다.

### 왜 레포는 안 가르고 빌드만 가르나

에디터와 게임은 판정·게이지·렌더를 공유한다. 원본이 한 코드베이스를 쓴 이유도 그것이다 — 한 번 고친 버그가 양쪽에서 고쳐진다. 레포를 나누면 그 이득이 사라지고 두 곳을 같이 고쳐야 한다. 노출 차단이 목적이라면 빌드 시점 제거로 충분하고, 그게 작동하면 레포를 나눌 이유가 대부분 사라진다.

### 왜 env를 6개로 가르나

가름의 기준을 "기능 종류"가 아니라 **실패 모드**로 잡았다. 오디오 컨텍스트가 suspended된 것, 저장소 quota가 찬 것, 사용자가 파일 선택을 취소한 것은 서로 다른 방식으로 실패하고 서로 다른 복구를 요구한다. 한 파일에 묶으면 그 처리가 섞이고, 호출하는 쪽이 어떤 실패를 받게 되는지 예측하기 어려워진다.

### 왜 골든 데이터를 소스 옆에 두지 않나

테스트 코드는 대상 옆에 있어야 함께 고쳐진다. 하지만 골든 **데이터**는 사람이 쓴 코드가 아니라 원본에서 뜬 관측 자료다 — 성격이 `_extracted/`와 같고, 손으로 고치는 대상이 아니라 재생성하는 대상이다. 둘을 같은 자리에 두면 "이 숫자를 고쳐서 테스트를 통과시킨다"는 유혹이 생긴다.

### 왜 골든 입력을 합성 chart로 만드나

실제 곡은 현실적 조합을 담지만 어느 조건이 실패했는지 좁히기 어렵다. 다중 BPM, 경계 tick, Hold 중첩 같은 조건을 각각 노린 작은 chart는 실패가 곧 원인을 가리킨다. 실곡 회귀는 M2 이후 수동 대조 시나리오가 맡는다.

---

## 골든 하네스 (D-2026-034)

### 왜 스텁을 `audio.js` 하나로 끝냈나

찔러보니 원본 core 모듈은 브라우저 전역을 거의 안 쓴다. `constants.js`의 `$ = id => document.getElementById(id)`도 화살표 함수라 호출 전에는 평가되지 않아 그냥 import된다. 유일한 벽은 `play-judgment.js`가 끌어오는 `playHit`이고, 원본 `audio.js`는 `editor-state.js`를 거쳐 WebAudio로 번진다. 판정 결과는 소리에 의존하지 않으므로 no-op 하나로 끊었다. **스텁이 적을수록 "원본을 돌린 결과"에 가깝다** — 격리를 늘리면 그만큼 내가 만든 환경의 결과가 섞인다.

### 왜 허용 오차를 두 층으로 나눴나

원본에 IEEE 누산 잡음이 있다. `t2ms(1920)`은 `500`이 아니라 `500.00000000000006`이다. 재구현이 다른 순서로 계산하면 이만한 차이가 나는데, 그건 동작이 달라진 게 아니다. 반면 tick·카운트·판정 종류·state·rank는 이산값이라 한 칸이라도 어긋나면 동작이 달라진 것이다. 두 성격에 같은 잣대를 대면 잡음에 걸려 넘어지거나 실제 차이를 놓친다.

### 왜 골든 표에 원본 명칭을 쓰나

표는 관측 자료이고, 관측 자료는 관측 대상의 이름을 쓰는 게 맞다. 추출 시점에 재설계 명칭으로 바꾸면 변환이 스크립트 안에 흩어져 개명이 누락돼도 드러나지 않는다. 매핑을 테스트 한 곳에 모으면 "원본의 이것이 재설계의 저것"이 표로 남는다.

### 왜 빈 표를 실패로 막나

원본 함수는 필드명이 어긋나도 예외를 던지지 않고 `null`이나 `undefined`를 조용히 돌려준다. 실제로 첫 프로브에서 `startTick`을 `tick`으로, `gaugeValue`를 `gauge`로 잘못 써서 전부 빈 값이 나왔는데 아무 경고도 없었다. 이 상태로 표를 굳히면 테스트가 "원본도 null, 재구현도 null"로 전부 통과한다 — 검증이 통째로 무력화되면서 통과 신호는 정상으로 보인다. 가장 위험한 실패 방식이라 절차로 막았다.

### 왜 합성 chart인가

실제 곡은 현실적 조합을 담지만 실패가 어느 조건에서 났는지 좁히기 어렵다. 다중 BPM 경계 직전·직후·정확히 위, 음수 tick, Hold 중첩, 6키 포화를 각각 노린 작은 chart는 실패가 곧 원인을 가리킨다. 실곡 회귀는 M2 이후 수동 대조 시나리오가 맡는다.

---

## 설계 대장 (D-2026-035)

### 왜 골든을 판정자에서 관측자로 낮췄나

처음 구조에는 편향이 숨어 있었다. `[보존]`은 골든이 자동으로 채점하고 `[수정]`은 예외로 빠지는 형태였는데, 그러면 **원본을 따르는 것이 기본이고 개선은 예외**가 된다. 원본은 완결된 설계가 아니다 — 곡 끝 하나만 파봐도 tail 비대칭, offset 미보정, `lineEvents` 누락이 한꺼번에 나왔다. 그런 코드를 정답 자리에 놓으면 재설계가 원본의 결함을 상속하는 쪽으로 끌린다.

그렇다고 표를 버릴 수는 없다. 표가 실제로 잡는 건 "원본을 따르라"가 아니라 **"원본을 제대로 읽었나"**다. 개선인지 아닌지 말하려면 원본이 무엇이었는지는 알아야 한다. 그래서 역할만 낮췄다 — 불일치가 곧 실패가 아니라 질문이 되고, 사람이 개선·버그·몰랐던 차이 셋 중 하나로 처분한다.

### 왜 그래도 실패는 시키나

리포트만 뱉고 실패시키지 않으면 자유롭지만, 읽히지 않는 리포트가 되기 쉽다. 한 번 안 읽기 시작하면 골든 표 전체가 죽은 자산이 된다. 대장 등재를 요구하면 차이가 날 때마다 한 줄 쓰는 마찰이 생기는데, 그 한 줄이 **개선을 기록으로 남기는 유일한 강제**다. 이 프로젝트가 `DECISION_LOG`로 이미 하고 있는 것과 같은 종류의 마찰이다.

다만 등재를 가볍게 뒀다. `DECISION_LOG` 수준의 형식을 요구하면 개선할 때마다 결정 사이클을 돌려야 해서 실제로 개선을 억누른다.

### 왜 `미커버`까지 등재하나

대장을 "골든과 어긋나는 것"만으로 만들면, `[수정]`인데 골든이 닿지 않는 항목은 목록에도 안 오르고 골든도 안 걸려 **아무 검증 없이 통과**한다. 곡 끝 4값, Hold head MISS 2단위, state `P→F`, cascade가 그런 자리였다.

관점을 뒤집으면 이 목록이 곧 **재설계의 실체**다. 원본에 대조할 것이 없으니 오직 스펙만이 판정하는 영역이고, 개선 목록과 검증 공백 목록이 같은 자리에 있다. 어긋남보다 공백이 위험하다.

### 왜 judge 표를 통째로 격하하지 않았나

후보 순서가 `[번복]`이라 2,700건 전부가 무효로 보이지만, 실제로 규칙 변경이 결과를 바꾸는 건 **후보가 둘 이상이고 normal과 wide가 섞인 경우**뿐이다. fixture 6개 중 둘만 해당한다. 나머지 넷은 후보가 하나뿐이라 판정창 경계·lane 매칭·mirror 검증에 그대로 쓸 수 있다. 통째로 버리면 멀쩡한 관측 자료 대부분을 함께 버린다.

새 규칙으로 표를 다시 뽑는 선택지는 배제했다 — 재구현이 자기 답을 채점하는 꼴이라 검증이 아니다.

---

## chart 검증과 settings 기본값 (D-2026-036)

### 왜 검증을 두 층으로 갈랐나

한 층으로 두고 전부 거부하면 에디터가 죽는다. **편집 중 chart는 항상 잠깐 유효하지 않다** — 노트를 놓다 보면 conflict가 생기고, 아직 tempo를 안 넣은 새 chart도 잠시 존재한다. 그 상태를 "열 수 없는 파일"로 다루면 만드는 도중의 chart를 저장도 열지도 못한다.

반대로 전부 경고만 하면, `notes`가 문자열인 파일도 chart라고 주장하며 로드된 뒤 엉뚱한 자리에서 터진다.

두 실패는 **복구 경로가 다르다.** structural 실패는 사용자가 파일을 바꿔야 하고, domain 실패는 에디터 안에서 고칠 수 있다. 복구 경로가 다르면 층도 달라야 한다.

### 왜 검증이 chart를 고치지 않나

결측 필드를 기본값으로 채워 돌려주는 편이 호출측에는 편하다. 하지만 그러면 "검증했다"와 "고쳤다"가 한 호출에 섞여, 이후 어떤 값이 파일에서 온 것이고 어떤 값이 우리가 채운 것인지 구별할 방법이 사라진다. 골든 대조가 무엇을 대조하는지 불분명해지는 것과 같은 종류의 손실이다. 정규화가 필요하면 호출측이 이름 있는 별도 동작으로 한다.

### 왜 `schemaVersion` 마이그레이션 체계를 지금 안 만드나

아직 두 번째 판이 없다. 존재하지 않는 변경을 위해 설계한 체계는 첫 실제 변경에서 거의 반드시 틀린 모양으로 판명된다. 지금 필요한 것은 **거부 지점이 있다**는 것뿐이고, 그 지점이 있으면 판을 올릴 때 무엇을 고쳐야 하는지가 저절로 드러난다.

### 왜 알 수 없는 키를 버리나

원본은 저장본을 기본값 위에 그대로 펼쳤다. 그래서 폐기한 `cmod`가 남은 저장본에서 조용히 살아남는다. 읽는 코드가 없으니 당장은 무해하지만, 폐기한 이름이 데이터에 계속 도는 상태는 나중에 같은 이름을 다른 뜻으로 쓸 때 정확히 한 번 아프다. 폐기가 폐기이려면 실제로 사라져야 한다.

### 왜 클램프가 아니라 되돌리나

`scrollSpeed: 99`를 `10.0`으로 깎으면 값은 유효해지지만 사용자는 자기가 넣은 적 없는 숫자를 보게 되고, 왜 그렇게 됐는지 설명할 자리가 없다. 기본값으로 되돌리면 "이 설정은 읽을 수 없어 초기화했다"고 말할 수 있다. 되돌림은 **보고 가능하고** 클램프는 조용하다.

객체 전체가 아니라 필드 단위로 되돌리는 것은 손해의 비대칭 때문이다. 한 필드가 깨졌다고 전체를 버리면 rebinding한 키 배치까지 함께 날아간다.

### 왜 `constants`를 골든으로 뜨나

다른 표는 함수를 돌려 얻은 결과지만 이건 선언된 값 자체다. 그래도 표로 두는 이유는 **이 값들이 나머지 표를 만든 입력**이기 때문이다. 판정창이 틀리면 judge 2,700건이 통째로 무의미해진다. 손으로 옮겨 적으면 그 순간이 오염 지점이 되고, 의심이 들 때 재확인하는 비용도 매번 같다.

---

## 중간 시작·Resume (D-2026-040)

### 왜 카운트다운 진입점이 시각을 받지 않나

중간 시작과 pause Resume에는 chart 시간이 흐르지 않는데 키는 눌리고 떼지는 구간이 있다. 기존 진입점 셋은 전부 시각을 받아 시간을 진행시키므로, 그 구간의 입력을 그리로 흘리면 **pause 중에 tail이 자동 완료되고 head가 만료된다.**

대안은 셋이었다. `JudgeState`에 phase를 두고 분기하면 프레임마다 도는 최내곽 루프에 상태와 갈래가 하나씩 더 붙는다. host가 자기 쪽에 키를 모으면 `keysHeld`가 두 벌이 되고, anchor에서 어느 쪽이 진짜인지 맞춰야 한다.

시각을 받지 않는 진입점을 따로 두면 **"이 구간에는 시간이 없다"가 시그니처에 적힌다.** 잘못 쓸 수 있는 인자가 없으므로 카운트다운 중에 시간이 흐르는 배선을 만들 방법이 없다. `visualOffset`을 진입 경계로 밀어올려 "keydown만 보정하는 오류"를 표현 불가능하게 만든 것(D-2026-038)과 같은 종류의 처리다.

판정 경로가 같은 두 함수를 호출하도록 한 것은 등록 절차가 두 벌이 되는 것을 막기 위해서다 — press serial을 매기는 규칙이 두 군데 있으면 언젠가 갈린다.

### 왜 시드 절차를 §6 재조정으로 접었나

원래 `judge` §10은 anchor에서 할 일을 여섯 단계로 적었는데, 그중 셋(Normal 수요 먼저 해소 → 남는 키로 Wide 배정 → 유지 못 하는 Hold의 tail 해소)이 §6의 재조정과 **문장까지 같았다.** 같은 규칙이 두 문서 자리에 있으면 한쪽만 고쳐지는 날이 온다.

접고 나면 시드는 두 가지만 한다 — 과거 노트를 SYNC로 놓고, crossing Hold를 활성 수요로 여는 것. 그다음은 평소의 재조정이다. **정의가 짧아졌을 뿐 아니라 시드가 특별한 경로가 아니게 됐다** — anchor는 "손 상태와 활성 수요가 처음 만나는 시각"일 뿐이고, 그 만남을 처리하는 규칙은 판 중간이든 시작이든 하나다.

### 왜 anchor 근처 crossing Hold의 tail SYNC를 받아들이나

접은 대가로 §10이 "유지될 수 없는 crossing Hold는 tail MISS"라고 못박던 자리가 §7의 임계를 타게 됐다. tail이 anchor로부터 `HOLD_RELEASE_WINDOW_MS`(150ms) 안쪽이면, 키를 잡고 있지 않아도 tail SYNC가 나온다.

이것을 막으려면 시드 경로 전용 tail 분류를 하나 더 둬야 한다. 그러면 **같은 사건(Hold를 놓았다)에 두 개의 분류 규칙**이 생기고, 어느 쪽이 걸리는지가 "판이 언제 시작했나"에 달린다. 설명할 수 없는 종류의 분기다.

한편 받아들이는 쪽의 손해는 좁다 — anchor 직전 150ms 안에 끝나는 crossing Hold 하나가 관대하게 처리될 뿐이고, 그것은 §7이 실제 플레이에서 이미 허용하는 폭과 정확히 같다. anchor에 손을 얹은 것을 그 시각의 release로 보는 셈이라 해석도 일관된다.

### 왜 시드가 이벤트로 나가나

시드된 판정을 상태에만 적고 이벤트를 내지 않으면, 게이지·score·combo가 각자 "시드분"을 따로 계산해야 한다. 그러면 판정 회계가 두 경로로 갈리고, `JudgmentEvent.units`를 단일 회계 단위로 삼은 계약(GA-5)이 시드에서만 성립하지 않는다.

같은 열로 내보내면 소비자는 시드를 알 필요조차 없다. 중간 시작이 no-record 판이라는 사실도 여기에 영향을 주지 않는다 — 기록 적격성은 판정 회계가 아니라 `settings` §2의 게이트가 정한다.

### 왜 시드가 사전조건을 던지나

"Resume은 시드를 부르지 않는다"는 문장은 지키기 쉬운 만큼 어기기도 쉽다 — 어겼을 때 나는 증상이 **조용하다.** 과거 노트가 두 번 계상되고 활성 Hold가 중복되지만 예외는 나지 않고, 화면에는 게이지가 이상하게 높은 판이 뜬다.

생성자 변형으로 만들어 아예 표현 불가능하게 두는 쪽이 더 강하지만, 카운트다운 등록이 state를 먼저 만들어야 성립하므로 이 자리에서는 쓸 수 없다. 그래서 **조용한 오작동을 즉시 터지는 실패로 바꾸는** 차선을 택했다. `keysHeld`는 검사에서 뺀다 — 카운트다운 등록으로 차 있는 것이 정상이다.

### 왜 global 6키 conflict를 M1-8로 옮겼나

build-order는 global 부등식을 M1-6(judge)에, 로컬 overlap 검출을 M1-8에 갈라 놨다. 그런데 `data-model` §5.1은 둘을 **하나의 파생 속성**(`noteOverlapMap`), 하나의 sweep으로 정의한다 — global은 별도 패스가 아니라 같은 sweep에서 tick별 수요를 합산한 것이다. 갈라 두면 sweep을 두 번 짓거나, M1-6에서 반쪽을 짓고 M1-8에서 뜯어야 한다.

게다가 `judge` §11이 "겹침 검출은 judge 밖"이라고 못박고 있어서, judge step인 M1-6에 넣으면 그 step이 자기 문서를 벗어난다. 검출이 domain 소관이라는 결정과 그것을 짓는 자리가 어긋나 있었을 뿐이다.

TM-5(Resume에 leadIn 미적용)를 M2-5로 옮긴 것도 같은 종류의 정정이다. core에는 `LEAD_IN_MS` 상수 하나뿐이고 "Resume에는 적용하지 않는다"는 play loop의 성질이라, M1에서는 확인할 대상 자체가 없다. 대장에 배정만 남고 검증이 없는 행은 **검증 공백을 덮어 가린다**(D-2026-035) — 배정을 실제로 확인할 수 있는 step으로 옮기는 편이 정직하다.
