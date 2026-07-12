# persistence — 영속성 단일 출처

> 에디터 workspace(복구)·autosave·게임 라이브러리·열기/export의 계약을 정의한다.
> **정본은 유저의 파일이다**([[cfx]]) — 로컬 영속은 복구·라이브러리·기록·설정만 담당한다.
> 저장 설비 자체는 env 소관([[architecture]]) — 이 문서는 계약(스토어 구성·키·갱신 규칙)만 정한다. 권장 매체: IndexedDB(바이너리 blob 저장 — 아래 §2).
> 파일 포맷은 [[cfx]], 기록 스키마는 [[records]], 설정 스키마는 [[settings]].
> 출처: `file-manager.js`·`autosave.js`·`import-export.js` 실측. 태그 명시 없으면 `[보존]`.

---

## 1. 스토어 4분리 `[수정]`

`workspace / library / records / settings` 네 스토어로 분리한다.

- 구성 `[번복]`: 이전 결정(songs/assets — 에디터 정본 저장소 + 공유 에셋)을 폐기한다. 정본이 파일로 이동해([[cfx]] §1) "저장소"가 필요 없어졌고, 남는 로컬 영속은 성격이 다른 넷뿐이다: 에디터 복구(workspace) / 게임의 import 곡(library) / 기록(records) / 설정(settings).
- **[수정] 근거**(유지): 구 코드는 localStorage 한 접두사를 차트·설정·기록·autosave가 공유해 예약 이름 로직(`FM_RESERVED`, `score_*` 금지)이 필요했다. 스토어 분리로 이름 충돌이 원천 소멸한다. → [[rationale#스토어를 4분리한 이유]]
- records·settings의 스키마는 각자 문서가 단일 출처([[records]], [[settings]]).

## 2. workspace — 단일 슬롯 `[번복]`

에디터의 **마지막 작업 하나**만 담는 복구 슬롯. 곡별 다중 저장을 두지 않는다 — 정본이 둘(파일 vs 슬롯)이 되어 어긋남 관리가 생기는 것을 차단한다.

- 내용: 편집 중인 chart 문서(자립 — 공통 필드 포함, [[cfx]] §2) + **music·jacket 바이너리 blob**.
  - `[수정]` 바이너리 포함: 구 코드는 파일명 문자열만 저장해 재시작마다 오디오 수동 재로드가 필요했다. blob 보존으로 세션 이어가기 시 자동 복원. (구판이 우려한 직렬화 정지·QuotaExceeded는 data URL 인라인 + localStorage의 문제 — IndexedDB blob에는 해당 없음.)
- 곡 전환 = 파일 열기(§5). workspace는 그때 새 작업으로 교체된다.

## 3. autosave

- 마지막 편집(커맨드 dispatch, [[editor-commands]]) **30초** 후 workspace에 저장.
- 에디터 이탈(editor → mode-select/title) 시 즉시 저장.
- 실패(용량 등)는 인디케이터로 표시하고 throw하지 않는다.
- 슬롯이 하나뿐이라 구판의 무명 슬롯(`__autosave__`) 문제는 성립 자체가 안 한다.

## 4. 저장·export·파생 UX

| 키 | 동작 | 나가는 곳 |
|---|---|---|
| **Ctrl+S** | workspace 즉시 저장 (안심 버튼) | 로컬 (다운로드 아님) |
| **Ctrl+E** | chart `.json` export — `version` +1, 파일명 `_v{n}` ([[cfx]] §7) | 다운로드 |
| **Ctrl+Shift+S** | **derive(파생)** `[수정]` — 현재 곡의 songId를 새 UUID로 재발급 | (상태 변경만) |

- export는 **현재 메모리 상태 기준**(WYSIWYG — 저장을 강제하지 않는다).
- derive = 리믹스 시작점. 새 UUID = 기록 단절이므로 confirm 후 실행. UUID 재발급의 유일한 경로다(구 duplicate 개명 — "복제 저장"은 저장소가 없어 무의미).
- 이름 변경 = `metadata.title` 수정으로 갈음 — 파일명은 export 시 유도([[cfx]] §1).

## 5. 진입·열기

- **start scene** `[신규]` (정식 scene, 진입 1회 — [[scene]]): **새 곡** / **파일 열기** / **이어서 편집**(workspace가 있을 때만 표시).
  - 새 곡 = init(id 0) 생성 플로우([[cfx]] §5) — metadata 입력부터.
  - 파일 열기 = chart `.json` 또는 `.cfx`. `.cfx`는 내부 chart 선택 + music·jacket 자동 로드. 단 저장은 chart export로 나간다([[cfx]] §1 — .cfx 직접 덮어쓰기 없음).
- 이후 **Ctrl+O = OS 파일 픽커 직행**. 구판의 파일 매니저 overlay(저장 목록)는 목록의 데이터원이 사라져 폐지 `[번복]`.
- 열기 후처리: 성공 = 로드 → 화면 동기화 → **히스토리 기준선 클리어**([[editor-commands]] §5) → 토스트. 실패(디코딩 등) = 토스트로 에러, music은 수동 재지정 허용([[cfx]] §3).
- 디버그 덤프 폐지 `[번복]` — chart `.json`이 이미 텍스트라 역할을 흡수했다.

## 6. 게임 라이브러리 — 에디터와 완전 분리

- **game-public** 빌드: 번들된 큐레이트 .cfx 정적 목록만.
- **game-internal** 빌드: 번들 + **library 스토어**(사용자가 import한 .cfx).
- 저장 형태 = **.cfx blob 통째** `[신규]` (키 = songId). import 시 로더 검증([[cfx]] §8) 통과분만 등록, 파싱은 로드 시.
  - 에셋 GC(sweep) 폐지 `[번복]` — 에셋이 blob 안에 있으므로 곡 삭제 = blob 삭제 한 방. 참조 관리 개념이 소멸한다.
- **같은 songId 재import** `[번복]`: confirm 다이얼로그로 **chart별 version을 나란히 비교 표시**(예: `보유 Trace v2·Surge v2 / 가져옴 Trace v2·Surge v3`) 후 **덮어쓰기**. records 키(`songId:chartId`)가 유지되므로 기록은 이어진다. chartId가 이동된 chart(본문 동일·id만 다름)는 로더가 기록 키를 이전한다(rename 감지 `[신규]` → [[records]] §1). 구판의 복제(새 UUID) 선택지는 폐기 — 별개 곡을 원하면 에디터의 derive(§4)가 그 경로다.
- **곡 삭제**: song-select에서 confirm 후 blob 삭제. **기록은 잔존**(재import 시 복원 — 고아 기록 규칙([[records]] §1)과 동일 논리).
- song-select 기록 뱃지의 데이터는 [[records]].

## 7. 결정 완료 / 잔여

확정:
- [x] 스토어 4분리 유지, 구성 교체 `[번복]`: workspace/library/records/settings
- [x] workspace = 단일 슬롯(마지막 작업), chart 문서 + music·jacket blob 포함
- [x] autosave 30초·이탈 시 저장·실패 인디케이터
- [x] Ctrl+S = workspace 저장 / Ctrl+E = export(v+1, WYSIWYG) / Ctrl+Shift+S = derive(새 UUID, confirm)
- [x] start scene(새 곡/파일 열기/이어서 편집), Ctrl+O = OS 픽커, 파일 매니저 overlay 폐지 `[번복]`
- [x] library = .cfx blob 통째(키 songId), GC sweep 폐지 `[번복]`
- [x] 재import = version 비교 confirm 후 덮어쓰기(복제 선택지 폐기 `[번복]`), 삭제 = confirm·기록 잔존
- [x] 디버그 덤프 폐지 `[번복]`

잔여:
- (없음 — 스토어 내부 스키마·인덱스는 구현 자유)
