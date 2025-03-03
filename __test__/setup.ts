// Global Jest setup for tests
// Here we could initialize a MongoDB memory server for tests
// We are mocking most dependencies for unit tests

// Set up environment variables for testing
process.env.JWT_SECRET = "test-secret-key";
process.env.MONGODB_URI = "mongodb://test:test@localhost:27017/test-db";
process.env.NODE_ENV = "test";

// Mock MongoDB interactions
jest.mock("mongoose", () => {
  const originalModule = jest.requireActual("mongoose");

  return {
    ...originalModule,
    connect: jest.fn().mockResolvedValue({}),
    disconnect: jest.fn().mockResolvedValue({}),
  };
});
