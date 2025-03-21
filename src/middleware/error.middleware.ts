import { NextFunction, Request, Response } from "express";
import { sendErrorResponse } from "../utils/error.utils";
import { logger } from "../utils/logger";

// Custom error class
export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error middleware
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  // Default error values
  let statusCode = 500;
  let message = "Something went wrong";
  const stack = process.env.NODE_ENV === "production" ? undefined : err.stack;

  // If it's our custom error, use its properties
  if ("statusCode" in err) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.name === "ValidationError") {
    statusCode = 400;
    message = err.message;
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID format";
  }

  // Log the error with appropriate severity
  if (statusCode >= 500) {
    logger.error(`[${statusCode}] ${message}`, {
      path: req.path,
      method: req.method,
      stack,
      error: err,
    });
  } else {
    // Client errors (4xx) as warnings
    logger.warn(`[${statusCode}] ${message}`, {
      path: req.path,
      method: req.method,
    });
  }

  // Use the sendErrorResponse utility
  const errorDetails =
    process.env.NODE_ENV === "development"
      ? { stack, originalError: err }
      : undefined;

  sendErrorResponse(res, statusCode, message, errorDetails);
};

// 404 handler - called when no routes match
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new AppError(
    `Cannot find ${req.originalUrl} on this server`,
    404
  );
  next(error);
};
