import { Auth } from "googleapis";
import { User } from "../models/user.model";
import { GoogleTokens } from "../types/user.types";
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
} from "../config/env";
import { google } from "googleapis";

/**
 * Token Manager Service
 *
 * This service centralizes OAuth token management for different providers.
 * It handles:
 * - Token retrieval with automatic refresh when needed
 * - Token refresh monitoring
 * - Token validation
 * - Token caching for performance
 *
 * @example
 * // Get a valid access token for a user's Google Photos
 * const accessToken = await tokenManager.getGoogleAccessToken(userId);
 */
class TokenManagerService {
  private oauth2Client: Auth.OAuth2Client;
  private tokenCache: Map<string, { token: string; expiry: number }>;

  constructor() {
    // Initialize Google OAuth client
    this.oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    // Initialize token cache
    this.tokenCache = new Map();
  }

  /**
   * Get a valid Google access token for a user
   * Automatically refreshes if needed
   *
   * @param userId The user ID to get tokens for
   * @returns A valid access token
   * @throws Error if user is not connected to Google or refresh fails
   */
  async getGoogleAccessToken(userId: string): Promise<string> {
    const cacheKey = `google:${userId}`;

    // Check cache first for performance
    if (this.tokenCache.has(cacheKey)) {
      const cachedToken = this.tokenCache.get(cacheKey);
      if (cachedToken && cachedToken.expiry > Date.now() + 60000) {
        // 1 minute buffer
        return cachedToken.token;
      }
      // Token expired or close to expiry, remove from cache
      this.tokenCache.delete(cacheKey);
    }

    // Get user with tokens
    const user = await User.findById(userId);
    if (!user?.googlePhotos?.tokens) {
      throw new Error(
        "Google Photos not connected. Please connect your account."
      );
    }

    const tokens = user.googlePhotos.tokens;

    // Check if token is valid and not expired
    if (
      tokens.access_token &&
      tokens.expiry_date &&
      tokens.expiry_date > Date.now() + 60000
    ) {
      // Cache and return valid token
      this.tokenCache.set(cacheKey, {
        token: tokens.access_token,
        expiry: tokens.expiry_date,
      });
      return tokens.access_token;
    }

    // Token expired or missing, try to refresh
    if (!tokens.refresh_token) {
      throw new Error(
        "No refresh token available. Please reconnect your Google Photos account."
      );
    }

    try {
      // Set current tokens to enable refresh
      this.oauth2Client.setCredentials(tokens);

      // Refresh token
      const response = await this.oauth2Client.getAccessToken();

      // Get refreshed tokens from client
      const newTokens = this.oauth2Client.credentials as GoogleTokens;

      // Make sure we keep the refresh token if it's not returned in the refresh response
      if (!newTokens.refresh_token && tokens.refresh_token) {
        newTokens.refresh_token = tokens.refresh_token;
      }

      // Update user in database
      await User.findByIdAndUpdate(userId, {
        $set: { "googlePhotos.tokens": newTokens },
      });

      // Cache new token
      if (newTokens.access_token && newTokens.expiry_date) {
        this.tokenCache.set(cacheKey, {
          token: newTokens.access_token,
          expiry: newTokens.expiry_date,
        });
        return newTokens.access_token;
      }

      throw new Error("Failed to refresh access token");
    } catch (error) {
      console.error("Error refreshing token:", error);

      // Mark user as needing reconnection
      await User.findByIdAndUpdate(userId, {
        $set: { "googlePhotos.connectionStatus": "needs_reconnect" },
      });

      throw new Error(
        "Failed to refresh access token. Please reconnect your Google Photos account."
      );
    }
  }

  /**
   * Exchange authorization code for tokens
   *
   * @param code The authorization code from OAuth flow
   * @param codeVerifier Optional PKCE code verifier
   * @returns The OAuth tokens
   */
  async exchangeGoogleCode(
    code: string,
    codeVerifier?: string
  ): Promise<GoogleTokens> {
    try {
      console.log("Exchanging code for tokens");

      // For PKCE, we need to pass the code_verifier directly to getToken
      // instead of setting it in credentials
      const { tokens } = await this.oauth2Client.getToken({
        code,
        ...(codeVerifier ? { codeVerifier } : {}),
      });

      console.log("Received tokens:", {
        access_token: tokens.access_token ? "PRESENT" : "MISSING",
        refresh_token: tokens.refresh_token ? "PRESENT" : "MISSING",
        expiry_date: tokens.expiry_date,
      });

      if (!tokens.refresh_token) {
        console.warn(
          "WARNING: No refresh token received from Google. This will cause authentication problems later."
        );
      }

      return tokens as GoogleTokens;
    } catch (error) {
      console.error("Error exchanging code for tokens:", error);
      throw error;
    }
  }

  /**
   * Clear cached tokens for a user
   *
   * @param userId The user ID to clear cache for
   * @param provider Optional provider name, defaults to "google"
   */
  clearCache(userId: string, provider = "google"): void {
    const cacheKey = `${provider}:${userId}`;
    this.tokenCache.delete(cacheKey);
  }
}

export default new TokenManagerService();
