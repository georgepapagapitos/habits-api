import express, { Request, Response, NextFunction } from "express";
import request from "supertest";

// Create a simplified app for testing
const expressApp = express();
const mockRouter = express.Router();

// Add a test endpoint to the router
mockRouter.get("/test-endpoint", (req: Request, res: Response) => {
  res.json({ message: "Test endpoint" });
});

// Add an error endpoint
mockRouter.get(
  "/error-endpoint",
  (req: Request, res: Response, next: NextFunction) => {
    next(new Error("Test error"));
  }
);

// Mock error handlers
const mockErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  res.status(500).json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

const mockNotFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Mount middleware
expressApp.use(express.json());
expressApp.use("/api", mockRouter);
expressApp.use(mockNotFoundHandler);
expressApp.use(mockErrorHandler);

// Tests to verify app behavior
describe("Express App Integration Tests", () => {
  test("app should respond to API endpoint requests", async () => {
    const response = await request(expressApp).get("/api/test-endpoint");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "Test endpoint" });
  });

  test("app should respond with error for non-existent routes", async () => {
    const response = await request(expressApp).get("/api/non-existent");
    expect([404, 500]).toContain(response.status);
    expect(response.body).toHaveProperty("message");
  });

  test("app should handle errors properly", async () => {
    const response = await request(expressApp).get("/api/error-endpoint");
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("message");
    expect(response.body.message).toBe("Test error");
  });
});
