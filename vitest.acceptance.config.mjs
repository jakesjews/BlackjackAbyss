import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/acceptance/**/*.spec.mjs"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 120_000,
    teardownTimeout: 30_000,
  },
});
