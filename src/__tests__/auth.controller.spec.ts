import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  loginUser,
  registerUser,
  getCurrentUser,
} from "../controllers/auth.controller";
import { User } from "../models/user.model";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

// Mock bcrypt and jsonwebtoken
jest.mock("bcryptjs", () => ({
  genSalt: jest.fn().mockResolvedValue("mock-salt"),
  hash: jest.fn().mockResolvedValue("hashed-password"),
  compare: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn().mockReturnValue("mock-token"),
}));

// Mock the User model
jest.mock("../models/user.model", () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
    findById: jest.fn().mockImplementation(() => ({
      select: jest.fn().mockResolvedValue({
        _id: "user123",
        username: "testuser",
        email: "test@example.com",
      }),
    })),
  },
}));

describe("Auth Controller", () => {
  let mockRequest: Partial<Request>;
  let mockAuthRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockUser: {
    _id: string;
    username: string;
    email: string;
    password: string;
    toString: () => string;
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    mockRequest = {
      body: {
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      },
    };

    mockAuthRequest = {
      user: {
        id: "user123",
        username: "testuser",
        email: "test@example.com",
      },
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockUser = {
      _id: "user123",
      username: "testuser",
      email: "test@example.com",
      password: "hashed-password",
      toString: jest.fn().mockReturnValue("user123"),
    };
  });

  describe("registerUser", () => {
    test("should register a new user successfully", async () => {
      // Mock User.findOne to return null (user doesn't exist)
      (User.findOne as jest.Mock).mockResolvedValue(null);

      // Mock User.create to return the new user
      (User.create as jest.Mock).mockResolvedValue(mockUser);

      // Call the controller
      await registerUser(mockRequest as Request, mockResponse as Response);

      // Verify bcrypt was called to hash the password
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith("password123", "mock-salt");

      // Verify User.create was called with the right data
      expect(User.create).toHaveBeenCalledWith({
        username: "testuser",
        email: "test@example.com",
        password: "hashed-password",
      });

      // Verify JWT was generated
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: "user123", username: "testuser", email: "test@example.com" },
        expect.any(String),
        { expiresIn: "30d" }
      );

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        token: "mock-token",
        user: {
          id: "user123",
          username: "testuser",
          email: "test@example.com",
        },
      });
    });

    test("should return 409 if user with email already exists", async () => {
      // Mock User.findOne to return an existing user with the same email
      (User.findOne as jest.Mock).mockResolvedValue({
        _id: "existinguser",
        email: "test@example.com",
        username: "differentuser",
      });

      // Call the controller
      await registerUser(mockRequest as Request, mockResponse as Response);

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "User with this email already exists",
        error: { field: "email" },
      });

      // Verify User.create was not called
      expect(User.create).not.toHaveBeenCalled();
    });

    test("should return 409 if user with username already exists", async () => {
      // Mock User.findOne to return an existing user with the same username but different email
      (User.findOne as jest.Mock).mockResolvedValue({
        _id: "existinguser",
        email: "different@example.com",
        username: "testuser",
      });

      // Call the controller
      await registerUser(mockRequest as Request, mockResponse as Response);

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "User with this username already exists",
        error: { field: "username" },
      });

      // Verify User.create was not called
      expect(User.create).not.toHaveBeenCalled();
    });

    test("should handle database errors during registration", async () => {
      const dbError = new Error("Database error");
      // Mock User.findOne to throw an error
      (User.findOne as jest.Mock).mockRejectedValue(dbError);

      // Call the controller
      await registerUser(mockRequest as Request, mockResponse as Response);

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Server error during registration",
        error: dbError,
      });
    });
  });

  describe("loginUser", () => {
    beforeEach(() => {
      // Set up login request body
      mockRequest.body = {
        email: "test@example.com",
        password: "password123",
      };
    });

    test("should login user successfully with correct credentials", async () => {
      // Mock User.findOne to return the user
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      // Mock bcrypt.compare to return true (password match)
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Call the controller
      await loginUser(mockRequest as Request, mockResponse as Response);

      // Verify User.findOne was called with the right email
      expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });

      // Verify bcrypt.compare was called to check the password
      expect(bcrypt.compare).toHaveBeenCalledWith(
        "password123",
        "hashed-password"
      );

      // Verify JWT was generated
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: "user123", username: "testuser", email: "test@example.com" },
        expect.any(String),
        { expiresIn: "30d" }
      );

      // Verify response
      expect(mockResponse.json).toHaveBeenCalledWith({
        token: "mock-token",
        user: {
          id: "user123",
          username: "testuser",
          email: "test@example.com",
        },
      });
    });

    test("should return 401 if user not found", async () => {
      // Mock User.findOne to return null (user not found)
      (User.findOne as jest.Mock).mockResolvedValue(null);

      // Call the controller
      await loginUser(mockRequest as Request, mockResponse as Response);

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid credentials",
        error: { field: "email" },
      });

      // Verify bcrypt.compare was not called
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    test("should return 401 if password is incorrect", async () => {
      // Mock User.findOne to return the user
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      // Mock bcrypt.compare to return false (password mismatch)
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Call the controller
      await loginUser(mockRequest as Request, mockResponse as Response);

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid credentials",
        error: { field: "password" },
      });
    });

    test("should handle database errors during login", async () => {
      const dbError = new Error("Database error");
      // Mock User.findOne to throw an error
      (User.findOne as jest.Mock).mockRejectedValue(dbError);

      // Call the controller
      await loginUser(mockRequest as Request, mockResponse as Response);

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Server error during login",
        error: dbError,
      });
    });
  });

  describe("getCurrentUser", () => {
    test("should get current user successfully", async () => {
      // Mock User.findById to return a user
      (User.findById as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockResolvedValue({
          _id: "user123",
          username: "testuser",
          email: "test@example.com",
        }),
      }));

      // Call the controller
      await getCurrentUser(
        mockAuthRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: "user123",
          username: "testuser",
          email: "test@example.com",
        },
      });
    });

    test("should return 401 if user is not authenticated", async () => {
      // Remove user from request
      mockAuthRequest.user = undefined;

      // Call the controller
      await getCurrentUser(
        mockAuthRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Not authorized",
        error: "Server Error",
      });

      // Verify User.findById was not called
      expect(User.findById).not.toHaveBeenCalled();
    });

    test("should return 404 if user not found", async () => {
      // Mock User.findById.select to return null (user not found)
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      // Call the controller
      await getCurrentUser(
        mockAuthRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "User not found",
        error: "Server Error",
      });
    });

    test("should handle database errors during user fetch", async () => {
      const dbError = new Error("Database error");
      // Mock User.findById to throw an error
      (User.findById as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockRejectedValue(dbError),
      }));

      // Call the controller
      await getCurrentUser(
        mockAuthRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Server error fetching user",
        error: dbError,
      });
    });
  });
});
