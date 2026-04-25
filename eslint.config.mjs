import js from "@eslint/js";
import globals from "globals";

export default [
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      }
    }
  },
  js.configs.recommended,
  {
    rules: {
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "no-console": "off",
      "prefer-const": "error",
      "no-var": "error",
      "eqeqeq": ["error", "always"],
      "curly": ["error", "all"],
      "semi": ["error", "always"]
    }
  }
];
