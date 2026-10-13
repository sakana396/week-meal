/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["src/**/*.test.ts"],
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      // 網羅率は計算ロジックだけを対象にする（DES-DEV-02、NFR-09）
      include: ["src/core/**/*.{ts,tsx}"],
      exclude: ["src/core/**/*.test.ts"],
      thresholds: {
        statements: 80,
      },
    },
  },
});
