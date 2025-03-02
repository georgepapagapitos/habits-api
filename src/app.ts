import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

const app: Express = express();

// Middleware
app.use(helmet()); // Security headers
// Configure CORS to allow requests from any origin in development
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://yourproductiondomain.com"] // Restrict in production
        : ["http://localhost:3000", "http://192.168.0.20:3000"], // Allow local development
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Mount routes
app.use(routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
