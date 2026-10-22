import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    ".venv/**",
    ".playwright-cli/**",
    "out/**",
    "build/**",
    "artifacts/**",
    "data/**",
    "docs/**",
    "ml/**",
    "tests/**",
    "public/**",
    "next-env.d.ts",
    "src/lib/model/__fixtures__/**",
  ]),
]);
