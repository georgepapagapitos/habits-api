import { Response } from "express";
import { AppError } from "../middleware/error.middleware";

/**
 * Sends a standardized error response
 * @param res - Express response object
 * @param statusCode - HTTP status code
 * @param message - Error message to display to the client
 * @param error - Optional error object or details
 * @returns The response object
 */
export const sendErrorResponse = (
  res: Response,
  statusCode: number,
  message: string,
  error?: unknown
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: error || "Server Error",
  });
};

/**
 * Creates a new AppError for resource not found scenarios
 * @param resourceName - Name of the resource that was not found
 * @param id - ID that was searched for
 * @returns AppError with 404 status
 */
export const createNotFoundError = (
  resourceName: string,
  id?: string
): AppError => {
  const message = id
    ? `${resourceName} with ID ${id} not found`
    : `${resourceName} not found`;
  return new AppError(message, 404);
};

/**
 * Creates a new AppError for validation error scenarios
 * @param message - Validation error message
 * @returns AppError with 400 status
 */
export const createValidationError = (message: string): AppError => {
  return new AppError(message, 400);
};

/**
 * Creates a new AppError for unauthorized access
 * @param message - Custom message (defaults to "Unauthorized access")
 * @returns AppError with 401 status
 */
export const createUnauthorizedError = (
  message = "Unauthorized access"
): AppError => {
  return new AppError(message, 401);
};

/**
 * Creates a new AppError for forbidden access
 * @param message - Custom message (defaults to "Forbidden: You don't have permission to access this resource")
 * @returns AppError with 403 status
 */
export const createForbiddenError = (
  message = "Forbidden: You don't have permission to access this resource"
): AppError => {
  return new AppError(message, 403);
};

/**
 * Creates a new AppError for conflict scenarios (e.g., duplicate resources)
 * @param message - Custom message explaining the conflict
 * @returns AppError with 409 status
 */
export const createConflictError = (message: string): AppError => {
  return new AppError(message, 409);
};
