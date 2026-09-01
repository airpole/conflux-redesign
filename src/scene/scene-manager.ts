/**
 * scene 전환 엔진 — `scene.md` §2의 mechanism을 그대로 구현한다.
 *
 * ```js
 * scene = { id, mount(), onEnter(), onExit() }
 * goScene(id)
 * goScene(id, replace)
 * goBack()
 * resetSceneStack()
 * ```
 *
 * **단일 스택 하나만 둔다** — game/editor/settings를 "stack형/평면형"으로
 * 가른 것(§2 "game은 stack형, editor/settings는 평면형")은 엔진이 축마다
 * 다르게 동작해야 한다는 뜻이 아니다. editor/settings의 실제 전환은 형제
 * scene 사이를 직접 `goScene(id)`로 건너뛰는 것뿐이라(예: settings의
 * PLAY↔VISUAL 전환) 그 축에서는 스택이 실질적으로 깊어질 일이 없다 —
 * "평면형"은 이 엔진이 강제하는 제약이 아니라 그 축이 스택을 쓰는
 * 방식에서 저절로 나오는 결과다. 하나의 스택 mechanism으로 두 형태
 * 전부를 설명할 수 있는데 축별로 다른 엔진을 두는 건 불필요한 분기다.
 *
 * **FEATURES 필터링은 이 모듈이 하지 않는다** — `architecture.md` §1의
 * 단방향 의존(`… → scene → app`)에서 `app`이 `scene`보다 위이므로 scene
 * 레이어가 `app`의 `FEATURES`를 import하면 방향이 거꾸로 된다. 대신
 * `createSceneManager`는 **이미 걸러진 scene 목록**을 받는다 — 어떤
 * scene을 켤지는 호출측(app 레이어의 부트스트랩)이 결정해서 넘긴다.
 * 꺼진 축의 scene은 애초에 이 목록에 없으므로 `mount()`가 호출될 방법이
 * 구조적으로 없다(M4-1 Exit 기준 "꺼진 축의 scene은 mount()가 호출되지
 * 않는다").
 *
 * `mount()`는 lazy다 — 그 scene으로 처음 전환될 때 단 한 번만 부른다.
 * 이후 `onEnter()`/`onExit()`만 반복 호출된다. 두 함수 다 매번 다시
 * 불린다(재방문 시 갱신이 필요할 수 있어서 — 예: song-select가 back으로
 * 돌아왔을 때 목록을 다시 그려야 할 수 있다).
 */

export interface Scene {
  readonly id: string;
  mount(): void;
  onEnter(): void;
  onExit(): void;
}

export interface SceneManager {
  /** `id`로 전환한다. 이미 그 scene이 현재 scene이면 no-op(§2). `mode:
   *  'replace'`면 스택 맨 위를 대체한다 — pop 후 push라 그 사이 잠깐도
   *  이전 scene의 `onExit`가 불린다(스택에서 통과점을 지우는 용도,
   *  예: song-credit→gameplay). */
  goScene(id: string, mode?: 'replace'): void;
  /** 스택에서 한 칸 pop해 이전 scene으로 돌아간다. 스택에 하나만 남았으면
   *  더 돌아갈 곳이 없다는 뜻이라 no-op이다(스펙이 이 경계를 명시하지
   *  않아 크래시보다 안전한 쪽을 택함 — Deferred: 실제로 이 경계에
   *  닿는 시나리오가 나오면 재검토). */
  goBack(): void;
  /** 현재 scene은 유지한 채 그 아래 쌓인 스택 history를 전부 비운다.
   *  현재 scene의 `onEnter`/`onExit`는 다시 부르지 않는다(현재 scene
   *  자체는 안 바뀌므로). 정확한 사용 시나리오는 스펙에 함수 이름
   *  이상으로 명시돼 있지 않다 — "스택 초기화"라는 이름 그대로 가장
   *  단순하게 읽은 구현이다(Deferred: 실제 배선 시 재확인). */
  resetSceneStack(): void;
  readonly currentSceneId: string | null;
}

export function createSceneManager(scenes: readonly Scene[]): SceneManager {
  const registry = new Map(scenes.map((scene) => [scene.id, scene]));
  const mounted = new Set<string>();
  const stack: string[] = [];

  function lookup(id: string): Scene {
    const scene = registry.get(id);
    if (scene === undefined) {
      throw new Error(`알 수 없는 scene id: ${id}`);
    }
    return scene;
  }

  function ensureMounted(scene: Scene): void {
    if (!mounted.has(scene.id)) {
      scene.mount();
      mounted.add(scene.id);
    }
  }

  return {
    goScene(id: string, mode?: 'replace'): void {
      const current = stack.at(-1);
      if (current === id) return; // 같은 scene 전환 no-op(§2)

      const next = lookup(id);
      ensureMounted(next);

      if (current !== undefined) {
        lookup(current).onExit();
        if (mode === 'replace') stack.pop();
      }

      stack.push(id);
      next.onEnter();
    },

    goBack(): void {
      if (stack.length <= 1) return; // 더 돌아갈 곳 없음
      const leaving = stack.pop()!;
      lookup(leaving).onExit();
      const target = stack.at(-1)!;
      lookup(target).onEnter();
    },

    resetSceneStack(): void {
      const current = stack.at(-1);
      stack.length = 0;
      if (current !== undefined) stack.push(current);
    },

    get currentSceneId(): string | null {
      return stack.at(-1) ?? null;
    },
  };
}
