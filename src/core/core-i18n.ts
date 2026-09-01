/**
 * i18n 문자열 조회 — **real per-locale content**만 다룬다(D-2026-0xx,
 * `ui-design.md` §2.5/§2.6 재정리). 짧은 UI 라벨(버튼·필드·nav 이름·판정/
 * state/tier/rank 이름·고유명사)은 여기 오지 않는다 — 그런 문자열은 locale과
 * 무관한 canonical English로 화면 코드에 직접 쓴다(조회 불필요, `ui-design.md`
 * §2.5/§2.6이 그 목록의 단일 출처).
 *
 * 이 테이블에 오는 것은 **이해가 목적인** 문자열뿐이다 — 에러 메시지, 안내
 * 문장, 향후 라이선스/약관, 온보딩 툴팁. plural rule·RTL·날짜/숫자 포맷 같은
 * 전체 i18n 런타임은 두지 않는다 — 지금 실제 번역 대상 표면이 이 정도로
 * 작아 그 기계장치가 정당화되지 않는다(근거 필요해지면 별도 결정).
 *
 * locale 감지(브라우저 locale)는 env 레이어 몫이다 — 여기는 브라우저 API를
 * 하나도 쓰지 않는 순수 조회만 제공한다(`architecture.md` §1).
 */

export const LOCALES = ['en', 'ko'] as const;
export type LocaleCode = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: LocaleCode = 'en';

export type StringKey = 'songSelect.search.noResults' | 'settings.option.noRecordNotice';

/** `DEFAULT_LOCALE`(en)은 항상 전체 키를 채운다 — fallback의 fallback이
 *  없으므로 여기 구멍이 있으면 `translate`가 최종적으로 실패한다. 다른
 *  locale은 아직 번역이 못 따라간 키가 있을 수 있어 partial을 허용한다. */
const STRINGS: { readonly en: Readonly<Record<StringKey, string>> } & Readonly<
  Partial<Record<LocaleCode, Readonly<Partial<Record<StringKey, string>>>>>
> = {
  en: {
    'songSelect.search.noResults': 'No results found',
    'settings.option.noRecordNotice': 'Autoplay and Static Shape plays are not recorded.',
  },
  ko: {
    'songSelect.search.noResults': '검색 결과가 없습니다',
    'settings.option.noRecordNotice': 'autoplay·staticShape는 기록에 반영되지 않습니다.',
  },
};

export interface TranslateResult {
  readonly text: string;
  /** 요청한 locale 테이블에 키가 없어 `DEFAULT_LOCALE`로 대체됐다. 조용히
   *  넘어가지 않고 호출측이 보고할 수 있게 알려준다([[settings]] §4의
   *  "되돌림은 보고한다"와 같은 원칙). */
  readonly usedFallback: boolean;
}

export function translate(key: StringKey, locale: LocaleCode): TranslateResult {
  const table = STRINGS[locale];
  const value = table?.[key];
  if (value !== undefined) {
    return { text: value, usedFallback: false };
  }
  return { text: STRINGS.en[key], usedFallback: true };
}
