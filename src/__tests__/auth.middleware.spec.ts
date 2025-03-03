import { Response } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest, protect } from "../middleware/auth.middleware";
import { User } from "../models/user.model";

// Mock jsonwebtoken
jest.mock("jsonwebtoken");

describe("Auth Middleware", () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    // Reset mocks for each test
    mockRequest = {
      headers: {},
      user: undefined,
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  // Mock User model
  jest.mock("../models/user.model", () => ({
    User: {
      findById: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: "user123",
          username: "testuser",
          email: "test@example.com",
        }),
      }),
    },
  }));

  test("should return 401 if no token is provided", async () => {
    // Set up request with no authorization header
    mockRequest.headers = {};

    // Call middleware
    await protect(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      nextFunction
    );

    // Expectations
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      message: "Not authorized, no token",
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test("should return 401 if token is invalid", async () => {
    // Set up mock to return a Bearer token
    mockRequest.headers = {
      authorization: "Bearer invalidToken",
    };

    // Mock jwt.verify to throw an error
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error("Invalid token");
    });

    // Call middleware
    await protect(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      nextFunction
    );

    // Expectations
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      message: "Not authorized, token failed",
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test("should set req.user and call next() if token is valid", async () => {
    // Set up mock to return a Bearer token
    mockRequest.headers = {
      authorization: "Bearer validToken",
    };

    // Mock jwt.verify to return a decoded token
    const mockDecodedToken = {
      id: "user123",
      username: "testuser",
      email: "test@example.com",
    };
    (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);

    // Mock User.findById
    const mockUser = {
      _id: "user123",
      username: "testuser",
      email: "test@example.com",
    };

    const selectMock = jest.fn().mockResolvedValue(mockUser);
    const findByIdMock = jest.fn().mockReturnValue({ select: selectMock });
    (User.findById as jest.Mock) = findByIdMock;

    // Call middleware
    await protect(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      nextFunction
    );

    // Expectations
    expect(mockRequest.user).toEqual({
      id: "user123",
      username: "testuser",
      email: "test@example.com",
    });
    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });
});
