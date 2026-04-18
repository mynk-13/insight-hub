import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import importX from "eslint-plugin-import-x";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      "import-x": importX,
    },
    rules: {
      // No circular imports between modules
      "import-x/no-cycle": ["error", { maxDepth: 5, ignoreExternal: true }],
      // No raw SQL in application code
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.property.name='$queryRaw'], CallExpression[callee.property.name='$executeRaw']",
          message: "Raw SQL is prohibited. Use Prisma ORM query methods (parameterized) only.",
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    "coverage/**",
    "prisma/migrations/**",
  ]),
]);

export default eslintConfig;
