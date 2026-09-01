import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, LOCALES, translate } from './core-i18n.js';

describe('core-i18n', () => {
  it('DEFAULT_LOCALE이 en이다', () => {
    expect(DEFAULT_LOCALE).toBe('en');
  });

  it('LOCALES가 en·ko 둘뿐이다', () => {
    expect(LOCALES).toEqual(['en', 'ko']);
  });

  it('ko locale에서 실제 번역값을 돌려준다', () => {
    const result = translate('songSelect.search.noResults', 'ko');
    expect(result.text).toBe('검색 결과가 없습니다');
    expect(result.usedFallback).toBe(false);
  });

  it('en locale에서 실제 번역값을 돌려준다', () => {
    const result = translate('songSelect.search.noResults', 'en');
    expect(result.text).toBe('No results found');
    expect(result.usedFallback).toBe(false);
  });

  it('두 번째 키(no-record notice)도 en·ko 모두 채워져 있다', () => {
    expect(translate('settings.option.noRecordNotice', 'en').text).toBe(
      'Autoplay and Static Shape plays are not recorded.',
    );
    expect(translate('settings.option.noRecordNotice', 'ko').text).toBe(
      'autoplay·staticShape는 기록에 반영되지 않습니다.',
    );
  });
});
