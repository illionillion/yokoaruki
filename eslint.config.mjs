import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import testingLibrary from "eslint-plugin-testing-library";
import vitest from "@vitest/eslint-plugin";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist/**", "coverage/**"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
  },
  eslintConfigPrettier,
  {
    files: ["**/*.{test,spec}.{ts,tsx}"],
    plugins: {
      "testing-library": testingLibrary,
      vitest,
    },
    rules: {
      "react-refresh/only-export-components": "off",
      /**
       * click / change / keyboard 等は userEvent を優先する。
       * drop / wheel / touch / composition 等に相当 API が無いものはルール対象外。
       */
      "testing-library/prefer-user-event": "error",
      "vitest/no-conditional-expect": "error",
      "vitest/no-conditional-in-test": "error",
      "vitest/no-conditional-tests": "error",
    },
  },
]);
