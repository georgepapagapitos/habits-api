/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  collectCoverageFrom: ["**/*.(t|j)s"],
  coverageDirectory: "../coverage",
  testPathIgnorePatterns: ["/node_modules/"],
  // Setup MongoDB Memory Server for tests
  setupFilesAfterEnv: ["../__test__/setup.ts"],
  // Automatically clear mock calls between tests
  clearMocks: true,
  // Mock modules
  moduleNameMapper: {
    "^../models/user.model$": "<rootDir>/__tests__/mocks/user.model.mock.ts",
  },
};
