# cfx — chart 파일·.cfx 배포 포맷 단일 출처

> 채보의 파일 형태를 정의한다. 두 층이다: **chart `.json`**(에디터 작업 단위)과 **`.cfx`**(같은 `songId` chart들의 게임 배포 ZIP).
> 내부 데이터 스키마는 [[data-model]]이 단일 출처다. 이 문서는 파일 구성·식별자·패키징·로드 규칙만 정한다.
> workspace/library는 [[persistence]], 기록은 [[records]].

---

## 1. 두 층 구조 `[번복]`

| 층 | 파일 | 단위 | 만드는 곳 |
|---|---|---|---|
| 작업 | `{title}_{musicBy}_{difficulty}[_{subtitle}]_v{n}.json` | 독립 chart 하나 | 에디터 저장([[persistence]] §4) |
| 배포 | `{init.title}_{init.musicBy}_v{init.version}.cfx` | 같은 `songId`의 선택 chart 집합 | 패키징 화면(§8) |

- chart JSON은 metadata·timing·asset 파일명 참조·events를 스스로 소유한다.
- `.cfx`는 선택된 chart JSON과 그 chart들이 참조하는 asset 파일을 평탄 ZIP으로 묶는다.
- `.cfx`를 에디터에서 열어도 저장은 chart JSON 새 version 저장으로 나간다([[persistence]] §4). `.cfx`를 직접 덮어쓰지 않는다.
- outer `.cfx` 파일명은 identity가 아니며 사용자가 자유롭게 수정할 수 있다.

---

## 2. chart `.json` — 독립 작업 문서 `[번복]`

스키마는 [[data-model]] §1~§4.

- 파일명은 편의 규약이다. 내부 `songId + chartId`가 identity다.
- 특정 revision은 `songId + chartId + version`으로 구별한다.
- `musicFile`·`jacketFile`은 경로가 아닌 파일명만 저장한다.
- music 없이 작업 chart를 저장할 수 있다(`musicFile: null`, [[persistence]] §10). jacket은 항상 선택이다.
- JSON 하나가 binary asset을 inline하지는 않는다. 실제 작업 단위는 JSON + 같은 작업 위치의 별도 asset 파일이다.

---

## 3. songId — 파생 그룹의 UUID `[번복]`

` songId`는 서로 관련된 chart들을 그룹화하는 UUID다.

- 별도 persisted `song` 객체는 없다.
- 새 chart를 같은 곡 그룹에 추가하려면 기존 chart(init 포함)에서 새 난이도를 파생해 `songId`를 유지한다([[persistence]] §8).
- 새 곡/리믹스로 분리할 때는 새 song 생성이 새 UUID를 발급한다([[persistence]] §7). derive·duplicate-as-new-song 경로는 없다.
- 패키징 화면은 선택된 chart를 `songId`별로 나누고, 각 그룹을 별도 `.cfx`로 만든다.

---

## 4. chart identity

- chart identity: `songId + chartId`
- revision identity: `songId + chartId + version`
- 저장 `chartId`는 정수, 파일명·UI 표기는 3자리 패딩(`1` → `001`).

| chartId | difficulty | 규칙 |
|---|---|---|
| 0 | init | 에디터 전용, non-playable, 그룹당 최대 1개 |
| 1 | Trace | 고정 대응, 수정 불가 |
| 2 | Drift | 고정 대응, 수정 불가 |
| 3 | Surge | 고정 대응, 수정 불가 |
| 4 | Flux | 고정 대응, 수정 불가 |
| 5+ | Trace/Drift/Surge/Flux/Phase | 추가 chart, id 수정 가능 |

- 구멍을 허용한다.
- 완성 `.cfx`에는 chartId별 선택 revision이 정확히 하나만 존재해야 한다.
- loader는 중복 chartId 중 최신을 고르지 않는다. 최신 추천은 패키징 전 선택 화면의 책임이다.

---

## 5. difficulty·subtitle

- enum: `init / Trace / Drift / Surge / Flux / Phase`.
- `subtitle`: 선택 문자열. 저장 시 대괄호 없음, 표시 시 있으면 항상 `[...]`.
- 같은 `songId` 그룹의 playable chart는 `difficulty + normalized subtitle` 조합이 유일해야 한다.
- normalization: subtitle 없음과 빈 문자열은 동일, 앞뒤 공백 제거. 추가 case folding/Unicode normalization은 하지 않는다.
- init은 이 유일성 검사에서 제외한다.
- 이 조합은 사용자에게 보이는 chart 구분 키이며 identity나 파일명 유일성 자체가 아니다.

---

## 6. init과 Representative Chart `[번복]`

init(`chartId 0`)은:

- 새 chart 파생의 시작점;
- `.cfx`에 **필수로 포함**되는 editor chart;
- gameplay와 records 대상이 아닌 non-playable chart다.

선택한 `songId` 그룹에 init이 없으면 패키징을 차단한다. init은 그룹당 `.cfx`의 고정 Representative Chart다.

Representative Chart는 다음 **표시 기본값만** 제공한다.

- 기본 `.cfx` 파일명의 title·musicBy;
- chart 선택 전 song/library 목록의 title·musicBy·jacket·preview music;
- import/reimport UI의 그룹 이름.

playable chart를 선택한 뒤에는 그 chart의 metadata·jacket·music·timing을 사용한다. Representative Chart는 다른 chart의 정본이 아니며 값을 통일·덮어쓰기하지 않는다.

---

## 7. asset 참조 `[번복]`

```js
musicFile: string | null
jacketFile: string | null
```

- package-local **bare file name**만 허용한다.
- `/`, `\\`, `..` 등 경로 성분을 포함하면 무효다.
- 파일명 비교는 대소문자·Unicode 문자열까지 정확히 일치해야 한다.
- 패키저는 chart JSON의 참조를 수정하거나 파일을 자동 rename하지 않는다.
- 참조 파일이 없을 때 사용자는 **정확히 같은 이름**의 파일을 선택해야 한다. 다른 이름의 파일은 거부한다.
- 여러 chart가 같은 파일명을 참조할 수 있다. 제공된 binary가 모두 동일하면 ZIP에는 한 파일만 넣는다.
- 같은 파일명인데 내용이 다르면 해당 songId 그룹 패키징을 거부한다.
- 같은 binary라도 파일명이 다르면 별개 파일로 유지한다. 일반 content dedup은 하지 않는다.

---

## 8. `.cfx` — 평탄 ZIP `[번복]`

ZIP root 예시:

```text
Chart_A_Trace_v3.json
Chart_A_Surge_v2.json
trace_music.ogg
trace_jacket.png
surge_music.ogg
```

규칙:

- 하위 폴더 없음.
- 선택 chart JSON + 참조되는 asset만 포함.
- ZIP root의 실제 파일명은 종류와 관계없이 전역 유일.
- chart JSON 파일명도 전역 유일. 중복이면 거부.
- 참조되지 않는 선택 asset은 “unused”로 표시하고 package에서 제외한다. 이것만으로 패키징을 막지 않는다.

### `.cfx` 파일명 `[번복]`

기본 제안: `{init.title}_{init.musicBy}_v{init.version}.cfx`.

- 저장 창에서 사용자가 수정할 수 있다.
- 내부 데이터가 정본이다.
- init version은 패키지 대표 기준 version이다.
- 각 playable chart version은 각 chart JSON 내부에 유지된다(§4).
- 기본 이름 충돌 시 처리는 §11.

---

## 9. 패키징 입력·후보 선택 `[신규]`

기본 흐름은 **사용자 선택 중심**이다.

1. 사용자가 chart JSON을 하나 이상 직접 선택한다.
2. 유효한 chart를 `songId`별로 그룹화한다.
3. 그룹 안에서 `chartId`별 최고 `version`을 기본 추천한다.
4. 같은 `songId + chartId + version` 후보가 둘 이상이면 자동 선택하지 않고 충돌로 표시한다.
5. 선택 chart의 `musicFile`·`jacketFile`을 확인한다.
6. 찾지 못한 참조 asset만 사용자가 추가 선택한다.
7. 최종 구성을 보여주고 그룹별 검증 후 생성한다.

- 폴더 탐색은 같은 입력 목록을 미리 채우는 선택적 편의 기능일 뿐 package 의미의 source가 아니다. 사용자가 작업 폴더 하나를 지정하면 접근 권한 범위(하위 폴더 포함)에서 chart JSON·music·jacket asset을 자동 탐색해 위 1~6단계의 선택 목록을 미리 채운다.
- 후보 목록을 다시 scan/rebuild하면 수동으로 고른 구버전을 유지하지 않고 다시 최고 version을 추천한다.
- 서로 다른 `songId` 그룹은 독립 검증·생성한다. 한 그룹의 오류·취소가 다른 그룹을 rollback하지 않는다.

패키징 진입점은 직접 다중 파일 선택 하나다. 폴더 스캔은 진입 경로가 아니라 그 선택 목록을 미리 채우는 편의 기능으로 확정한다 — `DECISION_LOG.md` D-2026-016.

---

## 10. 패키징 검증

하나의 그룹은 다음을 모두 만족해야 한다.

- playable chart가 최소 1개;
- init(Representative Chart) 정확히 1개 포함;
- 포함 playable chart 모두 `musicFile != null`;
- Representative Chart도 `musicFile != null`;
- 모든 non-null asset 참조가 정확한 파일명으로 해소됨;
- 그룹의 모든 chart가 같은 `songId`;
- chartId 중복 없음;
- chartId 1~4와 difficulty 고정 대응 일치;
- playable `difficulty + normalized subtitle` 중복 없음;
- 지원 `schemaVersion`;
- chart JSON 구조 유효;
- chart JSON 파일명과 모든 ZIP root 실제 파일명 전역 유일;
- 동일 이름으로 합쳐지는 asset binary가 동일;
- 경로 성분 없음.

`.cfx` 자체는 이미 충돌이 해소된 최종 배포물이다. loader는 부분 선택이나 revision 해소를 하지 않는다.

---

## 11. 패키징 상태 전이

패키징은 비파괴 작업이다.

성공·취소·실패 모두:

- chart version 불변;
- workspace 불변;
- 원본 JSON·asset 불변;
- 실패한 중간 출력은 완성 `.cfx`로 취급하지 않음.

취소는 오류가 아닌 무변경 종료다. 임시 파일 처리 방식은 env 구현 자유지만 사용자에게 성공/취소/실패를 명확히 표시한다.

여러 output의 기본 파일명이 충돌하면 자동으로 숫자·timestamp·songId를 붙이지 않는다. 사용자가 output 이름을 수정해야 한다.

---

## 12. `.cfx` loader

### 12.1 구조 검증

포함 chart 또는 구조 관계 하나라도 무효면 package 전체를 거부한다.

- malformed JSON / unsupported schema;
- duplicate chartId / duplicate visible combination;
- 고정 chartId-difficulty 불일치;
- missing referenced asset;
- same-name different-content asset;
- invalid path/reference;
- Representative Chart 결정 불가.

정상 chart만 부분 로드하지 않는다.

### 12.2 decode 규칙

**에디터에서 chart JSON 열기**
- music decode 실패에도 chart 데이터는 열 수 있다. 오류 후 수동 재지정 허용.
- jacket decode 실패는 placeholder + 재지정 허용.

**패키징**
- 파일 존재·이름·구조를 검증한다. 모든 환경의 decode 가능성을 보장하지 않는다.

**game/library import·load**
- 모든 playable music을 현재 환경에서 decode 검증한다.
- 하나라도 실패하면 package 전체 거부.
- jacket decode 실패는 경고 + placeholder로 계속.

---

## 13. `.cfx`를 에디터에서 열기

1. package 전체 검증;
2. init을 포함한 chart 목록 표시;
3. 사용자가 chart 하나 선택;
4. 선택 chart + 그 chart가 참조하는 music/jacket만 단일 workspace에 복원;
5. editor history 기준선 clear;
6. 다른 chart는 workspace에 펼치지 않음;
7. 저장은 chart JSON 새 version 저장([[persistence]] §4).

---

## 14. library·records 경계

- `.cfx` packager/loader는 records를 이동·수정·마이그레이션하지 않는다.
- chartId 변경에도 기록을 이전하지 않는다.
- init은 records 대상이 아니다.
- 기록은 chart identity를 따라 유지되며 내용 변경을 판별하지 않는다. fingerprint는 도입하지 않는다([[records]] §1, D-2026-017).

---

## 15. 구 포맷 비호환

구 conflux-editor v1~v3 JSON은 import하지 않는다. 앱 내 변환기를 탑재하지 않는다. 외부 AI/수동 일회 변환으로 처리한다.

---

## 16. 결정 완료 / 잔여

확정:
- [x] 독립 chart JSON / songId 파생 그룹 `[번복]`
- [x] chart별 metadata·timing·asset 참조 `[번복]`
- [x] init `.cfx` 필수 포함, 없으면 패키징 차단 `[번복]`
- [x] 명시적 `musicFile`/`jacketFile`, 정확한 파일명 연결
- [x] 평탄 ZIP·전역 파일명 유일·same-name asset 규칙
- [x] `.cfx` 파일명 = `{init.title}_{init.musicBy}_v{init.version}.cfx` `[번복]`
- [x] 사용자 선택 중심 패키징·최신 revision 추천, 폴더 스캔은 선택 목록 prefill
- [x] 내부 구조 flat 유지·진입점 다중 선택 단일 확정 — 하위 폴더 구조·폴더 우선 진입 기각 (D-2026-016)
- [x] 그룹별 독립 생성·비파괴 상태 전이
- [x] package 전체 구조 거부·decode 계층별 처리
- [x] `.cfx` 편집 시 chart 하나만 workspace 복원
- [x] records migration 미수행

잔여:
- (없음)
