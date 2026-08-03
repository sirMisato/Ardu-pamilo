import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@pamilo/shared": fileURLToPath(new URL("./packages/shared/src/index.ts", import.meta.url))
    }
  },
  test: {
    environment: "node",
    include: [
      "apps/**/*.test.ts",
      "packages/**/*.test.ts"
    ]
  }
});
