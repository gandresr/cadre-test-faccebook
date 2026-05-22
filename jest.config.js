/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: "unit",
      testEnvironment: "jsdom",
      testMatch: ["<rootDir>/{app,src}/**/*.test.{ts,tsx}"],
      testPathIgnorePatterns: [
        "/node_modules/",
        "\\.integration\\.test\\.(ts|tsx)$",
      ],
      setupFilesAfterEnv: ["@testing-library/jest-dom"],
      transform: {
        "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "tsconfig.json" }],
      },
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/$1",
      },
    },
    {
      displayName: "integration",
      testEnvironment: "node",
      testMatch: ["<rootDir>/{app,src}/**/*.integration.test.{ts,tsx}"],
      transform: {
        "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "tsconfig.json" }],
      },
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/$1",
      },
    },
  ],
};
