/**
 * credits 화면 — 단일 출처 `scene/ui-design.md` §2.8(골격), 행동 규칙은
 * `scene/scene.md` §7.
 *
 * §7: "입력·상호작용 없음(스크롤 제외). engine을 사용하지 않는 정적
 * scene" — 이 모듈에 클릭·키 선택 로직이 없는 건 누락이 아니라 스펙
 * 그대로다. Back/Esc/Backspace만 받는다.
 *
 * **M6-1이 §2.8.5 게이트를 배선했다** — `Music`/`Chart`/`Jacket` 세
 * 섹션은 이제 `update(roleNames)`로 받는 실제 library 스캔 결과
 * (`game-credits.ts`의 `loadCreditsRoleNames`, host가 매 `onEnter`마다
 * 다시 읽어 넘긴다 — song-select의 row 재로딩과 같은 관례)를 그린다.
 * **`Project Staff`는 확정됐다**(D-2026-118) — 1인 개발이라 모든 역할이
 * 같은 이름(`airpole`)이다. §2.8.5가 정한 "손으로 유지하는 고정 목록"
 * 방향 그대로, `PROJECT_STAFF` 배열의 값만 채웠다.
 *
 * **섹션은 목록이 비어 있으면 숨긴다**(library가 비었을 때의 처리는
 * §2.8.5가 "여기서 정하지 않는다"고 명시해 둔 자리라 이 라운드가 내린
 * 결정이다) — 빈 헤더만 떠 있는 것보다 자연스럽다고 판단했다. `Project
 * Staff`는 스캔 대상이 아니라 이 규칙과 무관하게 항상 보인다.
 *
 * bubble 배경 애니메이션은 title과 같은 이유로 Deferred다.
 */
import type { CreditsRoleNames } from '../game/game-credits.js';
import './scene-credits.css';

export interface CreditsSceneHandle {
  /** host(`app-main.ts`)가 매 `onEnter`마다 최신 library 스캔 결과를
   *  넘긴다 — `show()`보다 먼저 불려야 한다는 계약은 다른 scene들과 같다. */
  update(roleNames: CreditsRoleNames): void;
  show(): void;
  hide(): void;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  return node;
}

/** 손으로 유지하는 고정 목록(§2.8.5) — 1인 개발이라 모든 역할이 같은
 *  이름이다(D-2026-118). */
const PROJECT_STAFF: readonly { readonly role: string; readonly name: string }[] = [
  { role: 'Direction', name: 'airpole' },
  { role: 'Development', name: 'airpole' },
];

export function mountCreditsScene(target: HTMLElement, onBack: () => void): CreditsSceneHandle {
  const root = el('div', 'credits-scene');
  root.hidden = true;

  const scroll = el('div', 'credits-scroll');
  const heading = el('div', 'credits-heading');
  heading.textContent = 'Credits';
  scroll.append(heading);

  const staffSection = el('div', 'credits-section');
  const staffHeader = el('div', 'section-header');
  staffHeader.textContent = 'Project Staff';
  staffSection.append(staffHeader);
  for (const entry of PROJECT_STAFF) {
    const row = el('div', 'credit-row');
    const role = el('span', 'role');
    role.textContent = entry.role;
    const name = el('span', 'name');
    name.textContent = entry.name;
    row.append(role, name);
    staffSection.append(row);
  }
  scroll.append(staffSection);

  const musicSection = el('div', 'credits-section');
  const chartSection = el('div', 'credits-section');
  const jacketSection = el('div', 'credits-section');
  scroll.append(musicSection, chartSection, jacketSection);

  /** library 스캔 섹션 하나를 다시 그린다 — 이름 목록이 비어 있으면
   *  섹션 전체를 숨긴다(파일 헤더의 결정, §2.8.5가 열어 둔 자리). */
  function renderScanSection(
    sectionEl: HTMLElement,
    heading: string,
    names: readonly string[],
  ): void {
    sectionEl.replaceChildren();
    sectionEl.hidden = names.length === 0;
    if (names.length === 0) return;
    const header = el('div', 'section-header');
    header.textContent = heading;
    sectionEl.append(header);
    for (const name of names) {
      const row = el('div', 'credit-row');
      const nameEl = el('span', 'name');
      nameEl.textContent = name;
      row.append(nameEl);
      sectionEl.append(row);
    }
  }

  root.append(scroll);
  target.append(root);

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' || event.key === 'Backspace') {
      event.preventDefault();
      onBack();
    }
  }

  return {
    update(roleNames: CreditsRoleNames): void {
      renderScanSection(musicSection, 'Music', roleNames.music);
      renderScanSection(chartSection, 'Chart', roleNames.chart);
      renderScanSection(jacketSection, 'Jacket', roleNames.jacket);
    },
    show(): void {
      root.hidden = false;
      document.addEventListener('keydown', onKeyDown);
    },
    hide(): void {
      root.hidden = true;
      document.removeEventListener('keydown', onKeyDown);
    },
  };
}
