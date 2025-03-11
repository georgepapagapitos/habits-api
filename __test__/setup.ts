// Global Jest setup for tests
// Using optimized mocking for better performance

// Set up environment variables for testing
process.env.JWT_SECRET = "test-secret-key";
process.env.MONGODB_URI = "mongodb://test:test@localhost:27017/test-db";
process.env.NODE_ENV = "test";

// Performance optimization: Reduce timer precision for faster tests
jest.setTimeout(30000); // Global timeout to prevent hanging tests

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  // Keep error logging but make other logs silent during tests
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  error: console.error,
};

// Mock MongoDB interactions - simplified to reduce overhead
jest.mock("mongoose", () => {
  const originalModule = jest.requireActual("mongoose");

  return {
    ...originalModule,
    connect: jest.fn().mockResolvedValue({}),
    disconnect: jest.fn().mockResolvedValue({}),
  };
});

// Clean up resources before all tests
beforeAll(() => {
  // Clear all mocks before tests run
  jest.clearAllMocks();
});

// Clean up resources after all tests
afterAll(() => {
  // Clean up any remaining mocks or resources
  jest.resetAllMocks();
});
