import cors from "cors";
import express, { Express } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import routes from "./routes";

const app: Express = express();

// Middleware
app.use(helmet()); // Security headers
// Configure CORS to allow requests from any origin in development
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["http://habits.rubygal.com", "https://habits.rubygal.com"] // Production
        : ["http://localhost:3000", "http://192.168.0.20:3000"], // Allow local development
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message:
      "Too many requests from this IP, please try again after 15 minutes",
  },
});

// Apply rate limiter to all routes
app.use(globalLimiter);

// Mount routes
app.use(routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
