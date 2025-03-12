import cors from "cors";
import express, { Express } from "express";
import helmet from "helmet";
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

// Health check endpoint for deployment verification
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", environment: process.env.NODE_ENV });
});

// Mount routes
app.use(routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
