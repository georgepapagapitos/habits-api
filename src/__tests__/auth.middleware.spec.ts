import { Response } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest, protect } from "../middleware/auth.middleware";
import { User } from "../models/user.model";

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
  let mockRequest: any;
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
    await protect(mockRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: "Not authorized, no token",
      error: "Server Error",
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test("should return 401 if token is invalid", async () => {
    mockRequest.headers.authorization = "Bearer invalidtoken";
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error("Invalid token");
    });

    await protect(mockRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: "Not authorized, token failed",
      error: "Server Error",
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test("should set req.user and call next() if token is valid", async () => {
    const mockUser = {
      _id: "123",
      username: "testuser",
      email: "test@example.com",
      toString: () => "123",
    };
    mockRequest.headers.authorization = "Bearer validtoken";
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

    await protect(mockRequest, mockResponse as Response, nextFunction);

    expect(mockRequest.user).toEqual({
      id: "123",
      username: "testuser",
      email: "test@example.com",
    });
    expect(nextFunction).toHaveBeenCalled();
  });
});
