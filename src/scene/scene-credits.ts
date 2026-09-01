/**
 * credits 화면 — 단일 출처 `scene/ui-design.md` §2.8(골격), 행동 규칙은
 * `scene/scene.md` §7.
 *
 * §7: "입력·상호작용 없음(스크롤 제외). engine을 사용하지 않는 정적
 * scene" — 이 모듈에 클릭·키 선택 로직이 없는 건 누락이 아니라 스펙
 * 그대로다. Back/Esc/Backspace만 받는다.
 *
 * **표시 내용은 placeholder다** — 실제 내용(Project Staff 명단,
 * library 스캔 기반 Music/Chart/Jacket 집계)은 M4-2 前 게이트가 열릴
 * 때 배선한다(`ui-design.md` §2.8.5). 여기 채운 값은 §2.8.4가 이미
 * 승인한 골격 시연용 placeholder를 그대로 옮긴 것이며, 실제 project
 * staff나 실제 크레딧이 아니다.
 *
 * bubble 배경 애니메이션은 title과 같은 이유로 Deferred다.
 */
import './scene-credits.css';

export interface CreditsSceneHandle {
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

interface RoleSection {
  readonly heading: string;
  readonly rows: readonly string[];
}

/** §2.8.4의 placeholder 그대로 — 실제 내용 아님. Project Staff는
 *  Music/Chart/Jacket과 다른 종류의 목록이라 이름 계열도 분리한다
 *  (`[Staff N]` vs `[Placeholder N]`) — 겹치면 "이 사람이 project
 *  staff이면서 동시에 어느 chart의 credit이기도 하다"로 잘못 읽힌다. */
const PROJECT_STAFF: readonly { readonly role: string; readonly name: string }[] = [
  { role: 'Direction', name: '[Staff 1]' },
  { role: 'Development', name: '[Staff 2]' },
];

/** §2.8.4: "[Placeholder A]"가 Music·Chart 둘 다에 나오는 건 겸직 표시 규칙(§2.8.1)의 시연이다. */
const ROLE_SECTIONS: readonly RoleSection[] = [
  { heading: 'Music', rows: ['[Placeholder A]', '[Placeholder C]'] },
  { heading: 'Chart', rows: ['[Placeholder A]', '[Placeholder D]'] },
  { heading: 'Jacket', rows: ['[Placeholder E]'] },
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

  for (const section of ROLE_SECTIONS) {
    const sectionEl = el('div', 'credits-section');
    const header = el('div', 'section-header');
    header.textContent = section.heading;
    sectionEl.append(header);
    for (const name of section.rows) {
      const row = el('div', 'credit-row');
      const nameEl = el('span', 'name');
      nameEl.textContent = name;
      row.append(nameEl);
      sectionEl.append(row);
    }
    scroll.append(sectionEl);
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
