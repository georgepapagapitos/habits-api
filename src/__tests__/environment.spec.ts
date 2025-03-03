import dotenv from "dotenv";

// Mock dotenv
jest.mock("dotenv", () => ({
  config: jest.fn().mockReturnValue({ parsed: { KEY: "value" } }),
}));

// Simple environment config function to test
const loadEnvironment = () => {
  // Load environment variables from .env file
  dotenv.config();

  // Required environment variables
  const requiredEnvVars = ["JWT_SECRET", "MONGODB_URI"];

  // Check for missing environment variables
  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar as keyof typeof process.env]
  );

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingEnvVars.join(", ")}`
    );
  }

  // Return configuration object
  return {
    port: Number(process.env.PORT) || 5000,
    nodeEnv: process.env.NODE_ENV || "development",
    mongodbUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET,
  };
};

describe("Environment Configuration", () => {
  // Store original environment variables
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset environment for each test
    process.env = { ...originalEnv };

    // Mock environment variables for testing
    process.env.JWT_SECRET = "test-jwt-secret";
    process.env.MONGODB_URI = "mongodb://localhost:27017/test-db";
    process.env.PORT = "5000";
    process.env.NODE_ENV = "test";

    // Clear dotenv mock calls
    (dotenv.config as jest.Mock).mockClear();
  });

  afterAll(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  test("should load environment variables", () => {
    // Call the function
    const config = loadEnvironment();

    // Expectations
    expect(dotenv.config).toHaveBeenCalled();
    expect(config).toEqual({
      port: 5000,
      nodeEnv: "test",
      mongodbUri: "mongodb://localhost:27017/test-db",
      jwtSecret: "test-jwt-secret",
    });
  });

  test("should throw error for missing environment variables", () => {
    // Remove required environment variable
    delete process.env.JWT_SECRET;

    // Expect function to throw error
    expect(() => loadEnvironment()).toThrow(
      "Missing required environment variables: JWT_SECRET"
    );
  });

  test("should throw error for multiple missing environment variables", () => {
    // Remove multiple required environment variables
    delete process.env.JWT_SECRET;
    delete process.env.MONGODB_URI;

    // Expect function to throw error
    expect(() => loadEnvironment()).toThrow(
      "Missing required environment variables: JWT_SECRET, MONGODB_URI"
    );
  });

  test("should use default port if PORT is not defined in the config", () => {
    // Set PORT but make it empty to simulate undefined in config
    process.env.PORT = "";

    // Call the function
    const config = loadEnvironment();

    // Expectations
    expect(config.port).toBe(5000);
  });

  test("should use default NODE_ENV if not set", () => {
    // Remove NODE_ENV environment variable
    delete process.env.NODE_ENV;

    // Call the function
    const config = loadEnvironment();

    // Expectations
    expect(config.nodeEnv).toBe("development");
  });

  test("should convert PORT to number", () => {
    // Set PORT as string
    process.env.PORT = "8080";

    // Call the function
    const config = loadEnvironment();

    // Expectations
    expect(config.port).toBe(8080);
    expect(typeof config.port).toBe("number");
  });
});
