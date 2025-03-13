import mongoose from "mongoose";
import { logger } from "../utils/logger";
import { MONGODB_URI } from "./env";

// Suppress strictQuery warning
mongoose.set("strictQuery", false);

export const connectDB = async (): Promise<void> => {
  try {
    if (!MONGODB_URI) {
      throw new Error(
        "MongoDB connection string is not defined in environment variables"
      );
    }

    await mongoose.connect(MONGODB_URI);
    logger.info("MongoDB connected successfully");
  } catch (error) {
    logger.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info("MongoDB disconnected");
  } catch (error) {
    logger.error("MongoDB disconnection error:", error);
  }
};
