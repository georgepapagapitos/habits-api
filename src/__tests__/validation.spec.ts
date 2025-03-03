import { NextFunction, Request, Response } from "express";
import Joi from "joi";

// Simple validation middleware implementation to test against
const validateRequest = (schema: Joi.Schema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        error: "Validation Error",
      });
    }

    next();
  };
};

describe("Request Validation Middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    mockRequest = {
      body: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  // Test validation schema
  const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  });

  test("should call next() if validation passes", () => {
    // Valid request body
    mockRequest.body = {
      email: "test@example.com",
      password: "password123",
    };

    // Create and call validation middleware
    const validateMiddleware = validateRequest(loginSchema);
    validateMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    // Expectations
    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });

  test("should return 400 if email is missing", () => {
    // Invalid request body - missing email
    mockRequest.body = {
      password: "password123",
    };

    // Create and call validation middleware
    const validateMiddleware = validateRequest(loginSchema);
    validateMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    // Expectations
    expect(nextFunction).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: expect.stringContaining('"email" is required'),
      error: "Validation Error",
    });
  });

  test("should return 400 if email is invalid", () => {
    // Invalid request body - invalid email format
    mockRequest.body = {
      email: "not-an-email",
      password: "password123",
    };

    // Create and call validation middleware
    const validateMiddleware = validateRequest(loginSchema);
    validateMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    // Expectations
    expect(nextFunction).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: expect.stringContaining('"email" must be a valid email'),
      error: "Validation Error",
    });
  });

  test("should return 400 if password is too short", () => {
    // Invalid request body - password too short
    mockRequest.body = {
      email: "test@example.com",
      password: "12345", // Less than 6 characters
    };

    // Create and call validation middleware
    const validateMiddleware = validateRequest(loginSchema);
    validateMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    // Expectations
    expect(nextFunction).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: expect.stringContaining(
        '"password" length must be at least 6 characters'
      ),
      error: "Validation Error",
    });
  });

  test("should validate complex nested objects", () => {
    // Create a more complex schema
    const userSchema = Joi.object({
      username: Joi.string().alphanum().min(3).max(30).required(),
      password: Joi.string().min(6).required(),
      profile: Joi.object({
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        age: Joi.number().integer().min(18).required(),
      }).required(),
    });

    // Valid request body
    mockRequest.body = {
      username: "testuser",
      password: "password123",
      profile: {
        firstName: "Test",
        lastName: "User",
        age: 30,
      },
    };

    // Create and call validation middleware
    const validateMiddleware = validateRequest(userSchema);
    validateMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    // Expectations
    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });

  test("should validate arrays of items", () => {
    // Create a schema with array validation
    const habitSchema = Joi.object({
      habitName: Joi.string().required(),
      frequency: Joi.array()
        .items(
          Joi.string().valid(
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday"
          )
        )
        .min(1)
        .required(),
    });

    // Valid request body
    mockRequest.body = {
      habitName: "Morning Exercise",
      frequency: ["monday", "wednesday", "friday"],
    };

    // Create and call validation middleware
    const validateMiddleware = validateRequest(habitSchema);
    validateMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    // Expectations
    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });
});
