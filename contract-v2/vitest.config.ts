// Compact runtime 0.21 runs circuits more slowly than v1's 0.16, so a test gets longer
// than vitest's 5 s default. The limit still catches a hang.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
