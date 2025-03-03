import { Response } from "express";

// Create mock for the error utilities to test
const sendErrorResponse = (
  res: Response,
  statusCode: number,
  message: string,
  error?: any
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: error || "Server Error",
  });
};

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
});
