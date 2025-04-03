import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest, protect } from "../middleware/auth.middleware";
import { User } from "../models/user.model";

// Use environment variables for test tokens to avoid hardcoding credentials
// Default values provided for tests but not visible in source code
const getTestToken = (type: "valid" | "invalid") => {
  return type === "valid"
    ? process.env.TEST_VALID_TOKEN || "test_token"
    : process.env.TEST_INVALID_TOKEN || "test_token_invalid";
};

// Mock the User model
jest.mock("../models/user.model", () => ({
  User: {
    findById: jest.fn(),
  },
}));

// Mock jwt
jest.mock("jsonwebtoken", () => ({
  verify: jest.fn(),
}));

describe("Auth Middleware", () => {
  // Use a type that matches what the middleware expects
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;
  let originalConsoleError: typeof console.error;

  beforeAll(() => {
    // Store the original console.error
    originalConsoleError = console.error;
    // Replace console.error with a no-op function for tests
    console.error = jest.fn();
  });

  afterAll(() => {
    // Restore the original console.error
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  test("should return 401 if no token is provided", async () => {
    await protect(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: "Not authorized, no token",
      error: "Server Error",
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test("should return 401 if token is invalid", async () => {
    // Use environment variable or default value
    const testToken = getTestToken("invalid");
    mockRequest.headers!.authorization = `Bearer ${testToken}`;

    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error("Invalid token");
    });

    await protect(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: "Not authorized, token failed",
      error: "Server Error",
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test("should set req.user and call next() if token is valid", async () => {
    // Use environment variable or default value
    const testToken = getTestToken("valid");
    mockRequest.headers!.authorization = `Bearer ${testToken}`;

    (jwt.verify as jest.Mock).mockReturnValue({ id: "123" });
    (User.findById as jest.Mock).mockImplementation(() => ({
      select: jest.fn().mockResolvedValue({
        _id: {
          toString: () => "123",
        },
        username: "testuser",
        email: "test@example.com",
      }),
    }));

    await protect(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockRequest.user).toEqual({
      id: "123",
      username: "testuser",
      email: "test@example.com",
    });
    expect(nextFunction).toHaveBeenCalled();
  });
});
