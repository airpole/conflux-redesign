import { defineConfig } from 'vitest/config';

// core는 브라우저 없이 돈다 — environment: 'node'가 그 규율의 실제 검증이다.
// → _plan/build-order.md §1
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
  },
});
