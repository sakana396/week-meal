import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "coverage", "node_modules"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
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
    files: ["src/core/**/*.ts"],
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
              group: ["../App", "../main", "../*.tsx", "**/*.css"],
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
        {
          name: "localStorage",
          message: "src/core で保存を扱わない（NFR-08）",
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
