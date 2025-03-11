/**
 * @type {import('@jest/types').Config.InitialOptions}
 */
module.exports = {
  projects: [
    {
      displayName: "controllers",
      testMatch: ["<rootDir>/src/controllers/**/*.spec.ts"],
      testPathIgnorePatterns: ["<rootDir>/node_modules/"],
    },
    {
      displayName: "services",
      testMatch: ["<rootDir>/src/services/**/*.spec.ts"],
      testPathIgnorePatterns: ["<rootDir>/node_modules/"],
    },
    {
      displayName: "middleware",
      testMatch: ["<rootDir>/src/middleware/**/*.spec.ts"],
      testPathIgnorePatterns: ["<rootDir>/node_modules/"],
    },
    {
      displayName: "utils",
      testMatch: ["<rootDir>/src/utils/**/*.spec.ts"],
      testPathIgnorePatterns: ["<rootDir>/node_modules/"],
    },
    {
      displayName: "routes",
      testMatch: ["<rootDir>/src/routes/**/*.spec.ts"],
      testPathIgnorePatterns: ["<rootDir>/node_modules/"],
    },
    {
      displayName: "models",
      testMatch: ["<rootDir>/src/models/**/*.spec.ts"],
      testPathIgnorePatterns: ["<rootDir>/node_modules/"],
    },
  ],
};
