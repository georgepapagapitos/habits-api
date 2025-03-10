#!/usr/bin/env node

/**
 * This script resets a user's Google Photos connection
 * Usage: node reset-google-photos.js <userId>
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { User } = require("../dist/models/user.model");

// Check for userId argument
const userId = process.argv[2];
if (!userId) {
  console.error("Please provide a user ID as an argument");
  console.error("Usage: node reset-google-photos.js <userId>");
  process.exit(1);
}

async function main() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
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
    console.log("- Has selected album:", !!user.googlePhotos?.selectedAlbumId);

    // Reset Google Photos
    const result = await User.updateOne(
      { _id: userId },
      { $unset: { googlePhotos: "" } }
    );

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
