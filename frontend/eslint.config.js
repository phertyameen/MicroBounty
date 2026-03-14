import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import globals from "globals";


export default tseslint.config(
  js.configs.recommended,

  ...tseslint.configs.recommended,

  {
    plugins: { react: reactPlugin },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off", // Not needed in Next.js
      "react/prop-types": "off",         // Using TypeScript instead
    },
  },

  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },

  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",        // warn 
      "@typescript-eslint/no-unused-vars": "warn",         // warn
      "@typescript-eslint/no-require-imports": "warn",
      "no-console": "warn",
    },
  },

  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "public/**",
    ],
  }
);