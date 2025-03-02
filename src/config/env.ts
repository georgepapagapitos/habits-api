import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Server configuration
export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5050;
export const NODE_ENV = process.env.NODE_ENV || "development";

// MongoDB connection string
export const MONGODB_URI = process.env.MONGODB_URI;
