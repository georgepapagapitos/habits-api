// Script to manually refresh Google OAuth tokens
// Can be run from command line: node scripts/refresh-tokens.js
// Or scheduled as a cron job

// Load environment variables
require("dotenv").config();
const path = require("path");
const fs = require("fs");
const { google } = require("googleapis");

console.log("Starting Google OAuth token refresh...");

// Create OAuth2 client with the same settings as the main app
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Update tokens in .env file
function updateEnvFile(tokens) {
  try {
    const envPath = path.resolve(__dirname, "../.env");
    if (!fs.existsSync(envPath)) {
      console.error(".env file not found at:", envPath);
      return false;
    }

    let envContent = fs.readFileSync(envPath, "utf8");

    // Update token values using regex replace
    if (tokens.access_token) {
      envContent = envContent.replace(
        /GOOGLE_ACCESS_TOKEN=.*/,
        `GOOGLE_ACCESS_TOKEN=${tokens.access_token}`
      );
    }

    if (tokens.refresh_token) {
      envContent = envContent.replace(
        /GOOGLE_REFRESH_TOKEN=.*/,
        `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`
      );
    }

    if (tokens.expiry_date) {
      envContent = envContent.replace(
        /GOOGLE_TOKEN_EXPIRY=.*/,
        `GOOGLE_TOKEN_EXPIRY=${tokens.expiry_date}`
      );
    }

    fs.writeFileSync(envPath, envContent);
    console.log("Updated .env file with new token values");
    return true;
  } catch (err) {
    console.error("Error updating .env file:", err);
    return false;
  }
}

async function refreshTokens() {
  try {
    // Check if refresh token exists
    if (!process.env.GOOGLE_REFRESH_TOKEN) {
      console.error("No refresh token found in environment variables");
      process.exit(1);
    }

    // Set credentials with the refresh token
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    console.log("Requesting new access token...");

    // Request new access token
    const { token: accessToken, res } = await oauth2Client.getAccessToken();

    // Prepare tokens object
    const tokens = {
      access_token: accessToken,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN, // Preserve existing refresh token
      expiry_date: Date.now() + 3600 * 1000, // Estimate 1 hour validity
    };

    // If response contains a refresh token, update it too
    if (res && res.data && res.data.refresh_token) {
      tokens.refresh_token = res.data.refresh_token;
      console.log("Received new refresh token");
    }

    // If response contains expiry, use it
    if (res && res.data && res.data.expires_in) {
      tokens.expiry_date = Date.now() + res.data.expires_in * 1000;
    }

    console.log("Successfully obtained new access token");

    // Update .env file
    const updated = updateEnvFile(tokens);

    if (updated) {
      console.log("Token refresh completed successfully");
      // Exit with success code
      process.exit(0);
    } else {
      console.error("Failed to update .env file");
      process.exit(1);
    }
  } catch (error) {
    console.error("Error refreshing tokens:", error);

    // If invalid_grant error, we need to re-authorize
    if (error.message && error.message.includes("invalid_grant")) {
      console.error("\n--------------------------------------------------");
      console.error("REFRESH TOKEN IS INVALID OR REVOKED");
      console.error("You need to re-authorize the application:");
      console.error("1. Run the application");
      console.error(
        "2. Visit /api/photos/auth endpoint to get authorization URL"
      );
      console.error("3. Complete the OAuth flow to get new tokens");
      console.error("--------------------------------------------------\n");
    }

    process.exit(1);
  }
}

// Execute the refresh function
refreshTokens();
