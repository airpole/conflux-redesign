# cfx — .cfx 교환 포맷 단일 출처

> 곡 하나를 담는 교환 파일 `.cfx`의 구조·식별자·에셋 규칙을 정의한다.
> 내부 데이터의 스키마는 [[data-model]]이 단일 출처 — 이 문서는 컨테이너와 식별자만 정한다.
> 저장소·라이브러리는 [[persistence]], 기록 키는 [[records]].

---

## 1. 컨테이너

ZIP `[보존]` (구현 참고: fflate). 확장자 `.cfx`. 내용물:

```
song.json              ← schemaVersion, songId, metadata(+tempos/timeSignatures),
                          charts 목록(id·표시 순서), 에셋 참조(해시)
charts/<chartId>.json  ← chart별: difficulty, level, chartBy,
                          notes / shapeEvents / laneEvents / textEvents
assets/<hash>.<ext>    ← 오디오 1개 + 자켓 0~1개 (content-hash 파일명)
```

- `schemaVersion`은 **song.json에 하나**(패키지 단일 — 마이그레이션 단위는 패키지). 시작값 `1` ([[data-model]] §10).

## 2. songId — UUID

곡의 전역 식별자. **최초 생성 시 발급, 이후 불변.** `[신규]`

- 편집·리믹스·메타 수정에도 유지 — 기록 연속성이 유저 기대에 맞다. → [[rationale#song id를 UUID로 둔 이유]]
- duplicate([[persistence]] §4)와 import 복제([[persistence]] §7)만 새 UUID를 발급한다.

## 3. chartId — song 내 발급 정수, **수정 가능**

chart의 식별자이자 정렬 순서. song 안에서만 유일하면 된다. `[신규]`

- **id 수정(재배치) 허용**: 난이도 사이에 새 chart를 끼울 때 id를 다시 매길 수 있다. 예: Trace=1·Drift=2·Surge=3에 Drift와 Surge 사이 Phase를 넣으면 — Phase=3·Surge=4로 밀거나, Phase=4를 부여하고 기존 id를 유지하거나, 둘 다 가능(에디터 meta 탭에서 편집).
- 표시 표기: `songId 종속`으로 `1.2`처럼 읽는다(곡 내 chart 번호 — UI 표기이며 전역 키는 `songId:chartId`).
- **기록과의 관계**: [[records]] 키가 `songId:chartId`이므로, 게임 라이브러리의 곡을 chartId 구성이 바뀐 .cfx로 덮어쓰면 대응 없는 기록은 **표시되지 않는다**(데이터는 잔존, 삭제하지 않음). `[신규]`

## 4. 에셋 — content-hash

- 해시 = **SHA-256**, 파일명 = 해시(+원본 확장자). 중복 제거·무결성 검증 겸용.
- 오디오 포맷은 화이트리스트 없음 — env의 디코딩(decodeAudioData)에 위임하고 실패는 에러로 알린다. `[신규]`
- 자켓은 선택(0~1개). 인라인 data URL 금지 — 근거는 [[persistence]] §2.

## 5. chart JSON

[[data-model]]의 chart 스키마 그대로(추가 필드 없음). 좌표·틱·이벤트 정의는 각 core 문서가 단일 출처.

## 6. export 파일명

`{title}-{musicBy}-YYMMDD_HHMMSS.cfx` `[수정]` (구: `artist-title_difficulty-…json` — chart 전체를 담으므로 difficulty 탈락, title 선행).

## 7. 구 포맷 비호환

구 conflux-editor의 v1~v3 단일 chart JSON은 **import하지 않는다** — 변환기를 탑재하지 않는다. `[수정]`

- 간극(참고): channel→lane / artist→musicBy·charter→chartBy / lineEvents(비율 4개)→laneEvents(구분선별) / shape 내부 0~64→외부 -8~+8 / 단일 chart→charts[] / 자켓 인라인→에셋.
- 기존 자작 차트는 외부에서(AI/수동) 신 규격으로 변환해 들여온다. lineEvents는 구 차트에서 미사용이라 기본값 유지로 충분. → [[rationale#구 포맷 변환기를 탑재하지 않는 이유]]

## 8. 결정 완료 / 잔여

확정:
- [x] ZIP / song.json + charts/ + assets/ / schemaVersion은 패키지에 하나(시작 1)
- [x] songId = UUID 불변, chartId = song 내 발급 정수·수정 가능·`1.2` 표기
- [x] 기록 키 `songId:chartId`, 고아 기록은 숨김·보존
- [x] 에셋 SHA-256 content-hash, 오디오 포맷 위임, 자켓 0~1
- [x] 파일명 `{title}-{musicBy}-타임스탬프.cfx`
- [x] 구 포맷 변환기 미탑재

잔여:
- (없음)
