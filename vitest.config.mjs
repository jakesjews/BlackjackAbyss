import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/engine/runtime/__tests__/**/*.test.mjs"],
  },
});
