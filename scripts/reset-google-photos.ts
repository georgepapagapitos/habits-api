#!/usr/bin/env ts-node

/**
 * This script resets a user's Google Photos connection
 * Usage: ts-node reset-google-photos.ts <userId>
 *
 * This is a maintenance script that should only be used by administrators
 * for troubleshooting purposes. Under normal circumstances, the application
 * handles connection status automatically.
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import { User } from "../src/models/user.model";
import tokenManager from "../src/services/token-manager.service";

// Initialize environment variables
dotenv.config();

// Check for userId argument
const userId = process.argv[2];
if (!userId) {
  console.error("Please provide a user ID as an argument");
  console.error("Usage: ts-node reset-google-photos.ts <userId>");
  process.exit(1);
}

async function main() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "");
    console.log("Connected to MongoDB");

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      console.error(`User not found with ID: ${userId}`);
      process.exit(1);
    }

    console.log(`Found user: ${user.username} (${user.email})`);
    console.log("Current Google Photos status:");
    console.log("- Connected:", !!user.googlePhotos);
    console.log("- Has tokens:", !!user.googlePhotos?.tokens);
    console.log(
      "- Has refresh token:",
      !!user.googlePhotos?.tokens?.refresh_token
    );
    console.log(
      "- Connection status:",
      user.googlePhotos?.connectionStatus || "not set"
    );
    console.log(
      "- Last connected:",
      user.googlePhotos?.lastConnected || "never"
    );
    console.log("- Has selected album:", !!user.googlePhotos?.selectedAlbumId);

    // Ask for confirmation
    console.log(
      "\nWARNING: This will completely remove Google Photos data from the user profile."
    );
    console.log(
      "The user will need to reconnect to Google Photos and select an album again."
    );
    console.log(
      "This should only be used as a last resort if the user is experiencing issues."
    );

    // Proceed without confirmation in this example (in a real script, you'd add confirmation)
    console.log("\nProceeding with reset...");

    // Reset Google Photos
    const result = await User.updateOne(
      { _id: userId },
      { $unset: { googlePhotos: "" } }
    );

    // Clear any cached tokens
    tokenManager.clearCache(userId);

    if (result.modifiedCount > 0) {
      console.log(
        "✅ Successfully removed Google Photos data from user profile"
      );
    } else {
      console.log("⚠️ No changes made. User may not have Google Photos data.");
    }

    // Verify the reset
    const updatedUser = await User.findById(userId);
    console.log("New Google Photos status:");
    console.log("- Connected:", !!updatedUser.googlePhotos);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log("Disconnected from MongoDB");
  }
}

main().catch(console.error);
