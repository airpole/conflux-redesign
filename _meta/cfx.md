# cfx — chart 파일·.cfx 배포 포맷 단일 출처

> 채보의 파일 형태를 정의한다. 두 층이다: **chart `.json`**(에디터 작업 단위, 자립 파일)과 **`.cfx`**(게임 배포 단위, 수동 조립 ZIP).
> 내부 데이터의 스키마는 [[data-model]]이 단일 출처 — 이 문서는 파일 구성·식별자·조립/로드 규칙만 정한다.
> 저장소·라이브러리는 [[persistence]], 기록 키는 [[records]].

---

## 1. 두 층 구조 `[번복]`

| 층 | 파일 | 단위 | 만드는 곳 |
|---|---|---|---|
| 작업 | `{title}_{musicBy}_{difficulty}[_{subtitle}]_v{n}.json` | chart 하나 | 에디터 export |
| 배포 | `{title}_{musicBy}.cfx` (ZIP) | 곡 하나 | **수동 zip 조립** |

- `[번복]` 이전 결정("단일 .cfx가 교환·저장을 겸함, 내부 `song.json`+`charts/`+content-hash `assets/`") 폐기. 에디터는 chart 낱개로 일하고, 완성된 난이도 파일을 모아 zip으로 묶은 것이 .cfx다. → [[rationale#cfx를 두 층으로 나눈 이유]]
- 에디터의 export = 다운로드(파일 핸들 저장 없음). .cfx를 열어 수정해도 저장은 chart `.json` export로 나간다 — .cfx를 직접 덮어쓰지 않는다(재조립은 수동).

## 2. chart `.json` — 자립 파일 `[보존]`

chart 파일 하나에 그 채보의 전부가 들어간다(구 에디터의 단일 JSON 감각 계승, 스키마는 신규).

- **곡 공통 필드 사본 포함**: `songId`·`metadata(title·musicBy·…)`·`tempos`·`timeSignatures`·`offset`·`schemaVersion`을 모든 chart 파일이 갖는다. 논리 소유는 여전히 song([[data-model]] — 에디터 안에선 한 곳에만 존재), 파일은 직렬화 사본이다.
- chart 고유 필드: `chartId`·`difficulty`·`subtitle`·`level`·`chartBy`·`version`·notes/shapeEvents/laneEvents/textEvents.
- 파일명은 편의 규약이고 **정본은 내부 필드다**(파일명을 바꿔도 정체성 불변).

## 3. `.cfx` — 배포 ZIP `[신규]`

내용물 (내부 폴더 없음, 평탄):

```
*_music.<ext>   ← 오디오 (필수, 정확히 1개)
*_jacket.<ext>  ← 자켓 (0~1개)
*.json          ← chart 파일 × N (§2 그대로)
```

- 에셋 식별은 **접미 규칙** `[번복]`: 확장자를 뗀 파일명이 `music` / `jacket`으로 끝나면 해당 에셋으로 인식한다(`music.ogg`도, 권장형 `{title}_{musicBy}_music.ogg`도 성립). content-hash는 폐기(dedup할 스토어가 없다).
- **권장 명명**은 chart 파일과 같은 접두 `{title}_{musicBy}_`를 공유 — 작업 폴더에서 곡 단위로 정렬되고, 조립 시 rename이 필요 없다. 에셋 참조 필드는 두지 않는다(파일 존재 = 참조, [[data-model]] §2).
- 확장자는 원본 유지, 오디오 포맷 화이트리스트 없음 — env의 디코딩에 위임, 실패는 에러 + 에디터에선 music 수동 재지정 허용. 자켓 인라인 금지는 유지.
- 조립은 사람이 한다: 폴더에 최종 파일을 모아 압축, 확장자만 `.cfx`. 검증은 로더가 한다(§8).
- .cfx 파일명에 버전 없음 — 최신 여부는 내부 chart들의 `version`이 말한다.

## 4. songId — UUID `[보존]`

곡의 전역 식별자. 최초 생성 시 발급, 이후 불변. 모든 chart 파일에 사본으로 들어간다.

- 편집·리믹스·메타 수정에도 유지 — 기록 연속성. → [[rationale#song id를 UUID로 둔 이유]]
- **주의(명세 필수 문구)**: 새 난이도를 "새 곡 생성"으로 각자 만들면 UUID가 서로 달라 조립이 거부된다(§8). 반드시 기존 chart 파일(init 포함)에서 **파생**해 만든다.

## 5. chartId — 고정 슬롯 + 추가 채보 `[수정]`

song 안에서 유일한 정수. **저장은 정수, 파일명·UI 표기는 3자리 패딩**(`1` → `001`).

| id | difficulty | 성격 |
|---|---|---|
| 0 | init | **에디터 전용 템플릿** — metadata만 입력된 백지 채보. 게임에 넣지 않으며, .cfx에 섞여 들어오면 로더가 조용히 스킵(§8) `[신규]` |
| 1~4 | Trace / Drift / Surge / Flux **고정 대응** | 기본 채보(subtitle 없음). 구멍 허용(Trace+Surge만 있는 곡 OK), id 수정 불가 |
| 5+ | 5종 중 선택(기본 Phase) | 추가 채보. id 수정 가능 |

- 기록 키는 `songId:chartId`([[records]]) — 정수 형태(`songId:1`). 고아 기록 숨김·보존 규칙 유지.
- 권장 워크플로: **init(id 0)을 먼저 만들어 저장 → 복사/파생으로 Trace·Drift·Surge 생성**. 에디터의 "새 난이도" 커맨드(현재 chart에서 공통 필드 상속 + 노트 백지)도 같은 일을 한다([[editor-commands]]).

## 6. difficulty·subtitle `[신규]`

- `difficulty` = **6종 enum**: `init`(에디터 전용) / `Trace` / `Drift` / `Surge` / `Flux` / `Phase`. 자유 문자열 아님.
- `subtitle` = 선택 문자열. 두 용도 — 같은 difficulty 간 구분(BMS 차분명 격) + 채보 용도의 간략 설명. 저장은 순수 문자열(`GIMMICK`), `[...]` 대괄호는 **표시 규약**.
- 개념: subtitle 없는 채보 = 기본 채보(난이도당 하나), subtitle 있는 채보 = 기본이 채우지 못하는 부분을 채우는 추가 채보. Phase는 개념상 추가 채보라 subtitle 동반이 자연스럽지만 **강제 아님**.
- 파일명 유일성은 `difficulty + subtitle` 조합이 담당(id는 파일명에 안 붙는다).

## 7. version / schemaVersion — 두 축 `[신규]`

| 필드 | 뜻 | 증가 |
|---|---|---|
| `version` | **내용의 판** (chart별 정수, 시작 1) | export할 때마다 +1. 파일명 `_v{n}` |
| `schemaVersion` | **그릇의 규격** (JSON 필드 구성의 세대, 시작 1) | 스키마 변경 시에만, 명세가 올림 |

- `schemaVersion`은 파일마다 들어간다 — 마이그레이션 단위 = 파일 `[번복]` (구 결정 "패키지 단일" 폐기).
- 파일명의 subtitle 자리: subtitle 있으면 `…_{difficulty}_{subtitle}_v{n}.json`, 없으면 `…_{difficulty}_v{n}.json`.

## 8. 로더 규칙 — .cfx 검증·해소 `[신규]`

게임 로더는 .cfx를 열 때:

**스킵**: `chartId 0`(init)은 조용히 건너뛴다(경고 없음 — 플레이에 무영향).

**거부** (로드 실패 + 에러 명시):
- chart 파일 간 `songId` 불일치
- `chartId` 중복 (init 제외 후 판정)
- music 에셋(§3 접미 규칙) 부재

**해소** (로드 계속 + 경고):
- 곡 공통 필드(§2) 사본이 chart 간 불일치 → **최저 chartId 파일이 정본**, 나머지는 정본 값으로 통일 로드.

## 9. 구 포맷 비호환 `[수정]`

구 conflux-editor의 v1~v3 단일 chart JSON은 **import하지 않는다** — 변환기를 탑재하지 않는다.

- 간극(참고): channel→lane / artist→musicBy·charter→chartBy / lineEvents(비율 4개)→laneEvents(구분선별) / shape 내부 0~64→외부 -8~+8 / 자유 difficulty→enum / 타임스탬프 파일명→v{n}.
- 기존 자작 차트는 외부에서(AI/수동) 신 규격으로 변환해 들여온다. → [[rationale#구 포맷 변환기를 탑재하지 않는 이유]]

## 10. 결정 완료 / 잔여

확정:
- [x] 두 층: chart `.json`(작업, 자립) / `.cfx`(배포, 수동 zip) — 단일 통합 컨테이너 폐기 `[번복]`
- [x] 곡 공통 필드는 chart마다 사본, 논리 소유는 song 유지. 불일치 = 최저 chartId 정본 + 경고
- [x] songId UUID 불변 / chartId 정수 저장·3자리 표기 / 기록 키 `songId:chartId` 유지
- [x] id 0 = init(에디터 전용, 로더 무언 스킵) / 1~4 = Trace·Drift·Surge·Flux 고정 슬롯 / 5+ = 추가 채보
- [x] difficulty 6종 enum, subtitle = 순수 문자열(+표시 대괄호), 파일명 유일성 = difficulty+subtitle
- [x] version(내용, export마다 +1) / schemaVersion(규격, 파일 단위) 두 축
- [x] 에셋 접미 규칙(`*_music`/`*_jacket`, 권장 접두 `{title}_{musicBy}_`), content-hash 폐기 `[번복]`, 포맷 디코딩 위임
- [x] 로더 검증: songId 불일치·chartId 중복·music 부재 = 거부
- [x] .cfx 파일명 `{title}_{musicBy}.cfx`(버전 없음), 타임스탬프 폐기 `[번복]`
- [x] 구 포맷 변환기 미탑재

잔여:
- (없음)
