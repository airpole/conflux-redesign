# persistence — 영속성 단일 출처

> editor workspace(복구)·autosave·game library·열기/export/패키징의 계약을 정의한다.
> 정본은 유저의 chart JSON·asset 파일과 `.cfx`다([[cfx]]). 로컬 영속은 복구·library·records·settings만 담당한다.
> 저장 설비는 env 소관([[architecture]]). 파일 포맷은 [[cfx]], 기록은 [[records]], 설정은 [[settings]].

---

## 1. 스토어 4분리 `[수정]`

`workspace / library / records / settings`.

- workspace: editor의 마지막 chart 작업 복구.
- library: game-internal에서 import한 `.cfx` blob.
- records/settings: 각 문서가 스키마 단일 출처.
- 에디터 정본용 songs/assets store는 두지 않는다.

---

## 2. workspace — 단일 chart 슬롯 `[번복]`

마지막 작업 chart 하나만 저장한다.

```text
chart data
+ connected music blob + original file name (optional)
+ connected jacket blob + original file name (optional)
```

- chart가 metadata·timing·asset 참조를 독립 소유한다([[data-model]]).
- 파일명과 blob을 함께 저장해 재시작 시 자동 복원한다.
- `.cfx`를 열어도 사용자가 선택한 chart 하나와 그 chart의 asset만 복원한다.
- 새 파일/다른 chart를 열면 workspace를 새 작업으로 교체한다.

---

## 3. autosave

- 마지막 command dispatch/undo/redo 30초 후 workspace 저장.
- editor → mode-select/title 이탈 시 즉시 저장.
- chart metadata·asset 재연결처럼 command 밖에서 바뀌는 editor 상태도 autosave를 schedule해야 한다.
- 실패는 indicator로 표시하고 throw하지 않는다.

---

## 4. 저장·export·derive

| 키 | 동작 | 결과 |
|---|---|---|
| Ctrl+S | workspace 즉시 저장 | local |
| Ctrl+E | 현재 chart JSON export, `version +1` | download |
| Ctrl+Shift+S | derive: 새 `songId` UUID | 상태 변경 |

- export는 현재 메모리 상태 기준(WYSIWYG), workspace 선저장 불필요.
- 연결 music/jacket의 원본 파일명을 `musicFile`/`jacketFile`에 기록한다.
- music 없이도 작업 chart export 허용(`musicFile: null`).
- asset 재지정 후 다음 export는 새 원본 파일명을 사용한다.
- derive는 기록 단절을 뜻하므로 confirm 후 실행한다. UUID 재발급의 유일 경로다.
- metadata.title 변경은 일반 chart 필드 편집이며 파일명은 export 시 파생한다.

---

## 5. editor 진입·열기

start scene:

- 새 chart(init) 만들기;
- chart JSON 열기;
- `.cfx` 열기;
- 이어서 편집(workspace가 있을 때만).

`Ctrl+O`는 OS file picker.

### chart JSON

- chart 데이터를 연다.
- asset은 workspace의 연결 또는 사용자가 선택한 파일로 해소한다.
- music decode 실패에도 데이터는 열고 수동 재지정 허용.
- jacket 실패는 placeholder + 재지정 허용.

### `.cfx`

1. package 전체 검증;
2. init 포함 chart 목록 표시;
3. chart 하나 선택;
4. 그 chart + 참조 asset만 workspace 복원;
5. 화면 동기화·history baseline clear·toast.

`.cfx` 전체를 multi-chart workspace로 복원하지 않는다. `.cfx` 직접 덮어쓰기 없음.

---

## 6. `.cfx` 패키징 UX `[신규]`

기본 입력은 user-selected chart JSON이다([[cfx]] §9).

- 선택 chart를 `songId`별 그룹화.
- `chartId`별 최고 version을 기본 추천.
- equal-version duplicate는 사용자 해소 필요.
- missing referenced asset만 추가 선택.
- 다른 파일명 asset으로 참조를 바꾸지 않는다. 정확한 이름의 파일만 허용.
- re-scan/rebuild 시 수동 구버전 선택을 버리고 최신을 다시 추천.
- group별 독립 검증·생성.
- unused asset 표시 후 제외.
- output 기본 이름 충돌은 사용자가 수정.

패키징은 비파괴다. 성공·취소·실패 모두 workspace/version/source file 불변이며 취소는 무변경 종료다.

---

## 7. game library — editor와 분리

- game-public: bundled curated `.cfx`만.
- game-internal: bundled + library store.
- library value: `.cfx` blob 통째, key=`songId`.
- import는 [[cfx]] 구조 검증 + playable music decode 검증을 통과해야 등록.
- jacket decode 실패는 placeholder와 경고.

### 같은 songId reimport

confirm UI에서:

- playable chart version 비교;
- init/Representative 항목 별도 비교;
- 추가·삭제·upgrade·downgrade를 표시한다.

**구버전 reimport 정책은 보류한다.** 가져온 chart version이 보유 version보다 낮을 때 허용할지 거부할지는 persistence 후속 review에서 결정한다. 현재 단계에서는 자동 overwrite하지 않고 비교 결과를 사용자에게 표시한다.

**records migration은 수행하지 않는다.** chartId rename 감지·본문 비교·record key 이동을 하지 않는다([[records]]).

### 삭제

song-select에서 confirm 후 `.cfx` blob 삭제. records 삭제 여부는 [[records]]의 고아 기록 정책을 따른다.

---

## 8. records 경계

persistence와 `.cfx` loader는:

- record를 이동하거나 rewrite하지 않음;
- init을 records 대상으로 만들지 않음;
- 수정 chart content의 기록 연결을 판단하지 않음.

content fingerprint와 수정 chart 연결 정책은 [[records]] 후속 review로 보류한다.

---

## 9. 결정 완료 / 잔여

확정:
- [x] workspace/library/records/settings 4분리
- [x] workspace = 독립 chart 하나 + asset blob·원본 파일명
- [x] autosave 30초·이탈 저장·실패 indicator
- [x] Ctrl+S workspace / Ctrl+E chart export / Ctrl+Shift+S derive
- [x] start scene·Ctrl+O·single-chart open
- [x] user-selected `.cfx` packaging UX·비파괴 상태 전이
- [x] library `.cfx` blob·version 비교 UI
- [x] reimport records migration 폐기

잔여 `[보류]`:
- [ ] 구버전 `.cfx` reimport 허용/거부 정책
- [ ] records의 content 변경 연결/fingerprint([[records]] 후속 review)
