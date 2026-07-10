# persistence — 영속성 단일 출처

> 에디터 작업 저장소·autosave·게임 라이브러리·import/export의 계약을 정의한다.
> 저장 설비 자체는 env 소관([[architecture]]) — 이 문서는 계약(스토어 구성·키·갱신 규칙)만 정한다. 권장 매체: IndexedDB(대용량 바이너리 실측 문제 — 아래 §2).
> 교환 포맷은 [[cfx]], 기록 스키마는 [[records]], 설정 스키마는 [[settings]].
> 출처: `file-manager.js`·`autosave.js`·`import-export.js` 실측. 태그 명시 없으면 `[보존]`.

---

## 1. 스토어 4분리 `[수정]`

`songs / assets / records / settings` 네 스토어로 분리한다.

- **[수정] 근거**: 구 코드는 localStorage 한 접두사를 차트·설정·기록·autosave가 공유해 예약 이름 로직(`FM_RESERVED`, `score_*` 금지)이 필요했다. 스토어 분리로 이름 충돌 문제가 원천 소멸한다. → [[rationale#스토어를 4분리한 이유]]
- records·settings의 스키마는 각자 문서가 단일 출처([[records]], [[settings]]). 매체 계약은 이 문서와 동일(로컬 영속, env 소관).

## 2. songs / assets 스토어

- **songs**: song 단위 문서([[data-model]] song — charts[] 포함). 키 = `songId`(UUID, [[cfx]] §2). 저장 시각 `_savedAt` 갱신.
- **assets**: 오디오·자켓 바이너리. 키 = content-hash([[cfx]] §4). song 문서는 해시로 참조만 한다.
  - `[수정]` 자켓 인라인 폐지: 구 코드는 자켓을 data URL로 chart JSON에 인라인 — 20MB급에서 저장 직렬화가 메인 스레드를 정지시키고 QuotaExceeded가 실측됐다(autosave.js 주석).
  - `[수정]` 오디오도 보존: 구 코드는 파일명 문자열만 저장해 재시작마다 수동 재로드가 필요했다. 에셋 스토어에 바이너리를 보존해 재시작 후 그대로 재생.
- **에셋 GC — sweep**: 곡 삭제 시 전 곡을 스캔해 어느 곡도 참조하지 않는 에셋을 제거한다. (해시 공유로 두 곡이 같은 오디오를 참조할 수 있으므로 즉시 삭제 불가. 참조 카운트 대신 sweep — 곡 수가 적어 단순함이 이긴다.) `[신규]`

## 3. autosave

- 마지막 편집(커맨드 dispatch, [[editor-commands]]) **30초** 후 자기 `songId`에 저장.
- 에디터 이탈(editor → mode-select/title) 시 즉시 저장.
- 실패(용량 등)는 인디케이터로 표시하고 throw하지 않는다.
- `[수정]` 무명 슬롯(`__autosave__`) 소멸: 새 곡도 생성 즉시 UUID를 받으므로 "무명 작업"이 없다. 복원은 §5의 진입 화면(최근 곡)이 담당.

## 4. 저장 UX

- **Ctrl+S** = 즉시 저장(autosave와 같은 곳 — 안심 버튼).
- **Ctrl+Shift+S** = **duplicate** `[수정]`: 새 UUID로 곡 복제. ("다른 이름으로 저장"은 id 체계에서 무의미 — 이름은 metadata에서 유도.) 노트 구간 복제(Ctrl+D, [[editor-editing]])와 무관.
- 이름 변경 = `metadata.title` 수정으로 갈음. 표시명 = `{title}_{musicBy}` 유도(저장 키 아님).
- 삭제 = confirm 후. 현재 곡이면 편집 상태 해제.

## 5. 진입·파일 매니저

- 에디터 진입 시 **"새 곡 / 불러오기" 화면** `[신규]` (ED-5). 불러오기 = 최근 목록.
- 목록 표시: 표시명(`{title}_{musicBy}`) + **마지막으로 편집한 chart** + 저장 시각. `_savedAt` 최신순 정렬, 현재 편집 중 표시, 삭제 버튼.

## 6. 게임 라이브러리 — 에디터 저장소와 완전 분리

- **game-public** 빌드: 번들된 큐레이트 .cfx 정적 목록만.
- **game-internal** 빌드: 번들 + 게임 라이브러리 스토어(사용자가 import한 .cfx).
- 에디터에서 만든 곡을 게임에서 치는 경로 = **.cfx export → 게임에서 import** (라이브러리 스토어에 등록). 에디터 저장소를 게임이 직접 읽지 않는다. → [[rationale#게임 라이브러리를 에디터 저장소와 분리한 이유]]
- song-select 기록 뱃지의 데이터는 [[records]] (키 = `songId:chartId`).

## 7. import / export

- **.cfx export**: 파일명 `{title}-{musicBy}-YYMMDD_HHMMSS.cfx` ([[cfx]] §6).
- **.cfx import 후처리**: 성공 = 로드 → 화면 동기화 → **히스토리 기준선 클리어**([[editor-commands]] §5) → 토스트. 실패 = 토스트로 에러.
- **같은 songId 재import**: 물어보기 — 덮어쓰기 / 복제(새 UUID 발급) 선택. `[신규]`
- **디버그 덤프** `[수정]`: song 전체를 단일 JSON(에셋 제외, `schemaVersion` 포함)으로 export/import. 구 "chart 단독 JSON"은 신 스키마에서 tempos가 없어 단독 로드 불가한 반쪽이라 폐기. → [[rationale#디버그 덤프를 song 전체로 바꾼 이유]]
- **구 포맷(v1~v3 .json) import: 미지원** — 변환기를 탑재하지 않는다([[cfx]] §7).

## 8. 결정 완료 / 잔여

확정:
- [x] 스토어 4분리(songs/assets/records/settings), 예약 이름 로직 소멸
- [x] song 단위 저장 + 에셋 분리(자켓 인라인 폐지, 오디오 보존), GC = sweep
- [x] autosave 30초·이탈 시 저장·실패 인디케이터, 무명 슬롯 소멸
- [x] Ctrl+S 저장 / Ctrl+Shift+S duplicate / rename = title 수정
- [x] 진입 화면(새 곡/불러오기), 목록 표시·정렬
- [x] 게임 라이브러리 분리, .cfx 경유
- [x] import 후처리·재import 물어보기·디버그 덤프 = song 전체

잔여:
- (없음 — 스토어 내부 스키마·인덱스는 구현 자유)
