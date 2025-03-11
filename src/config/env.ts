import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Server configuration
export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5050;
export const NODE_ENV = process.env.NODE_ENV || "development";

// MongoDB connection string
export const MONGODB_URI = process.env.MONGODB_URI;

// Google Photos API configuration
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
export const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ||
  "http://localhost:5050/api/photos/oauth2callback";
export const GOOGLE_PHOTOS_ALBUM_ID = process.env.GOOGLE_PHOTOS_ALBUM_ID;
