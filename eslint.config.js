import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "coverage",
      "node_modules",
      "test-results",
      "playwright-report",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{js,ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // any を使わない（DES-DEV-04、NFR-10）
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    // src/core は React と画面に依存しない（DES-PKG-01, 05、NFR-08）
    files: ["src/core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react/*", "react-dom", "react-dom/*"],
              message: "src/core から React を import しない（NFR-08）",
            },
            {
              group: [
                "**/App",
                "**/App.tsx",
                "**/main",
                "**/main.tsx",
                "**/*.tsx",
                "**/ui/**",
                "**/*.css",
              ],
              message:
                "src/core から画面のモジュールを import しない（NFR-08）",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        { name: "window", message: "src/core で DOM を使わない（NFR-08）" },
        { name: "document", message: "src/core で DOM を使わない（NFR-08）" },
        { name: "navigator", message: "src/core で DOM を使わない（NFR-08）" },
        {
          name: "localStorage",
          message: "src/core で保存を扱わない（NFR-08）",
        },
        {
          name: "sessionStorage",
          message: "src/core で保存を扱わない（NFR-08）",
        },
        {
          name: "globalThis",
          message: "src/core で実行環境のグローバルを使わない（NFR-08）",
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: "src/core で実時間を使わない",
        },
        {
          selector: "ImportExpression",
          message: "src/core で動的 import を使わない（NFR-08）",
        },
        {
          selector: "TSImportType",
          message: "src/core で import 型を使わない（import type を使う）",
        },
      ],
      "no-restricted-properties": [
        "error",
        {
          object: "Date",
          property: "now",
          message: "src/core で実時間を使わない",
        },
        {
          object: "Math",
          property: "random",
          message: "src/core で乱数を使わない",
        },
      ],
    },
  },
);
