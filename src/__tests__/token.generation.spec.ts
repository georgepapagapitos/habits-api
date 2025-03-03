import jwt from "jsonwebtoken";

// Mock jsonwebtoken
jest.mock("jsonwebtoken");

// Token generation utility function to test
const generateToken = (
  userId: string,
  username: string,
  email: string
): string => {
  // Set the JWT secret key
  const jwtSecret = process.env.JWT_SECRET || "test-secret-key";

  // Generate and return the token
  return jwt.sign(
    {
      id: userId,
      username,
      email,
    },
    jwtSecret,
    {
      expiresIn: "30d", // Token expires in 30 days
    }
  );
};

describe("JWT Token Generation", () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock implementation for jwt.sign
    (jwt.sign as jest.Mock).mockReturnValue("mocked-jwt-token-value");
  });

  test("should call jwt.sign with correct payload", () => {
    // Test data
    const userId = "user123";
    const username = "testuser";
    const email = "test@example.com";

    // Call the function
    const token = generateToken(userId, username, email);

    // Expectations
    expect(jwt.sign).toHaveBeenCalledWith(
      {
        id: userId,
        username,
        email,
      },
      "test-secret-key",
      {
        expiresIn: "30d",
      }
    );
    expect(token).toBe("mocked-jwt-token-value");
  });

  test("should use environment JWT secret if available", () => {
    // Set environment variable for test
    const originalJwtSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "env-secret-key";

    // Test data
    const userId = "user123";
    const username = "testuser";
    const email = "test@example.com";

    // Call the function
    generateToken(userId, username, email);

    // Expectations
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.any(Object),
      "env-secret-key",
      expect.any(Object)
    );

    // Restore original env value
    process.env.JWT_SECRET = originalJwtSecret;
  });

  test("should use default expiration time", () => {
    // Test data
    const userId = "user123";
    const username = "testuser";
    const email = "test@example.com";

    // Call the function
    generateToken(userId, username, email);

    // Expectations
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(String),
      {
        expiresIn: "30d",
      }
    );
  });

  test("should include all user properties in token payload", () => {
    // Test data
    const userId = "user123";
    const username = "testuser";
    const email = "test@example.com";

    // Call the function
    generateToken(userId, username, email);

    // Check that all properties are included in payload
    const payload = (jwt.sign as jest.Mock).mock.calls[0][0];
    expect(payload).toEqual({
      id: userId,
      username,
      email,
    });
  });

  test("should handle empty values gracefully", () => {
    // Test with empty values
    const userId = "";
    const username = "";
    const email = "";

    // Call the function
    generateToken(userId, username, email);

    // Expectations - should still create token with empty values
    expect(jwt.sign).toHaveBeenCalledWith(
      {
        id: "",
        username: "",
        email: "",
      },
      expect.any(String),
      expect.any(Object)
    );
  });
});
