import { coverageConfigDefaults, defineConfig } from "vitest/config";

const config = defineConfig({
  test: {
    environment: "node",
    include: ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[jt]s?(x)"],
    coverage: {
      thresholds: {
        "100": true,
      },
      provider: "v8",
      reporter: ["text"],
      include: ["src/**"],
      exclude: [
        ...coverageConfigDefaults.exclude,
        "src/Container.ts",
        "src/index.ts",
        "src/types.ts",
      ],
    },
  },
});

export default config;
