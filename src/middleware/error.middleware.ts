import { NextFunction, Request, Response } from "express";

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
  next: NextFunction
): void => {
  // Default error values
  let statusCode = 500;
  let message = "Something went wrong";
  let status = "error";
  let stack = process.env.NODE_ENV === "production" ? {} : err.stack;

  // If it's our custom error, use its properties
  if ("statusCode" in err) {
    statusCode = err.statusCode;
    message = err.message;
    status = err.status;
  } else if (err.name === "ValidationError") {
    statusCode = 400;
    message = err.message;
    status = "fail";
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID format";
    status = "fail";
  }

  res.status(statusCode).json({
    status,
    message,
    ...(process.env.NODE_ENV === "development" && { stack }),
  });
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
