# core — 순수 로직·계산

파일 접두사 `core-*`. 브라우저 API를 **하나도** 쓰지 않는다. Node 하네스에서 import해 돈다.

전역 상태를 import하지 않고 활성 chart를 인자로 받는다. 캐싱이 필요하면 호출측이 메모이즈한다.

정의·의존 규칙 → `_plan/architecture.md` §1·§2
