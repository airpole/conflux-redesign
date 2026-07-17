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

### tail release grace를 폐기한 이유
GOOD window가 이미 성공 허용 범위이므로 추가 50ms grace는 중복이다. tail도 같은 window를 사용한다.

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

### editor를 single-chart session으로 둔 이유
workspace·open·저장이 한 chart 파일과 1:1이면 canonical relation이 명확하다. 새 chart는 같은 songId에서 시작값을 복사하되 이후 독립적으로 diverge한다 `[번복 반영]`.

---

## text event

### transition·mode를 폐기한 이유
appear는 실사용이 없고 mode는 tutorial 하나뿐인 dead axis였다. fade 300ms 고정과 `content`·`position`만 유지한다.

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
