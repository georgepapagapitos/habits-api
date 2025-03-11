/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: ".*(spec|test)\\.ts$", // Match both .spec.ts and .test.ts files
  transform: {
    "^.+\\.(t|j)s$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.test.json",
        // Speed up tests by disabling type checking during testing
        isolatedModules: true,
      },
    ],
  },
  collectCoverageFrom: [
    "**/*.(t|j)s",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/dist/**",
  ],
  coverageDirectory: "../coverage",
  coverageReporters: ["json", "lcov", "text", "clover"],
  // Coverage thresholds - starting with current values and we'll increase them over time
  coverageThreshold: {
    global: {
      statements: 15,
      branches: 15,
      functions: 25,
      lines: 15,
    },
    // Set targets for critical modules based on current coverage
    "./src/controllers/**/*.ts": {
      statements: 45,
      branches: 45,
      functions: 55,
      lines: 45,
    },
    "./src/services/**/*.ts": {
      statements: 70,
      branches: 55,
      functions: 55,
      lines: 70,
    },
  },
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  // Setup MongoDB Memory Server for tests
  setupFilesAfterEnv: ["../__test__/setup.ts"],
  // Automatically clear mock calls between tests
  clearMocks: true,
  // Mock modules
  moduleNameMapper: {
    "^../models/user.model$": "<rootDir>/__tests__/mocks/user.model.mock.ts",
  },
  // Add maxWorkers to limit CPU usage
  maxWorkers: "50%",
  // Add watchman for faster watch mode
  watchman: true,
  // Cache babel transformations
  cache: true,
  // Verbose output helps identify which tests need improvement
  verbose: true,
};
