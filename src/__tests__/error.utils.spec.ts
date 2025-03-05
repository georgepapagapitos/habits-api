import { Response } from "express";
import {
  sendErrorResponse,
  createNotFoundError,
  createValidationError,
  createUnauthorizedError,
  createForbiddenError,
  createConflictError,
} from "../utils/error.utils";

describe("Error Utilities", () => {
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Reset mock before each test
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  test("should send error response with default error message", () => {
    // Call the function with just status code and message
    sendErrorResponse(mockResponse as Response, 500, "Something went wrong");

    // Expectations
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: "Something went wrong",
      error: "Server Error",
    });
  });

  test("should send error response with custom error object", () => {
    // Custom error object to include
    const customError = {
      field: "username",
      detail: "Username is already taken",
    };

    // Call the function with custom error
    sendErrorResponse(
      mockResponse as Response,
      400,
      "Validation failed",
      customError
    );

    // Expectations
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: "Validation failed",
      error: customError,
    });
  });

  test("should handle different status codes", () => {
    // Test with a 404 status
    sendErrorResponse(mockResponse as Response, 404, "Resource not found");

    // Expectations
    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: "Resource not found",
      error: "Server Error",
    });
  });

  test("should handle error objects with message properties", () => {
    // Create an error object with message
    const errorWithMessage = new Error("Database connection failed");

    // Call the function with the error
    sendErrorResponse(
      mockResponse as Response,
      500,
      "Internal server error",
      errorWithMessage
    );

    // Expectations
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: "Internal server error",
      error: errorWithMessage,
    });
  });

  // Test the error creator functions
  describe("Error Creator Functions", () => {
    test("createNotFoundError should create a 404 AppError with resource name", () => {
      const error = createNotFoundError("User");
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("User not found");
    });

    test("createNotFoundError should include ID if provided", () => {
      const error = createNotFoundError("Habit", "123");
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("Habit with ID 123 not found");
    });

    test("createValidationError should create a 400 AppError", () => {
      const error = createValidationError("Name is required");
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("Name is required");
    });

    test("createUnauthorizedError should create a 401 AppError", () => {
      const error = createUnauthorizedError();
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe("Unauthorized access");
    });

    test("createUnauthorizedError should accept custom message", () => {
      const error = createUnauthorizedError("Invalid credentials");
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe("Invalid credentials");
    });

    test("createForbiddenError should create a 403 AppError", () => {
      const error = createForbiddenError();
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe(
        "Forbidden: You don't have permission to access this resource"
      );
    });

    test("createConflictError should create a 409 AppError", () => {
      const error = createConflictError("Username already exists");
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe("Username already exists");
    });
  });
});
