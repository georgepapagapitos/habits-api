import { google, Auth } from "googleapis";
import { CodeChallengeMethod } from "google-auth-library";
import axios from "axios";
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
} from "../config/env";
import { GoogleTokens } from "../types/user.types";
import crypto from "crypto";
import tokenManager from "./token-manager.service";

/**
 * Constants for Google Photos API
 */
const PHOTOS_API_BASE_URL = "https://photoslibrary.googleapis.com/v1";

/**
 * Google Photos Service
 *
 * This service handles interactions with the Google Photos API:
 * - Authentication with OAuth 2.0 and PKCE
 * - Album listing and photo retrieval
 * - Token management through the TokenManager service
 *
 * @example
 * // Get authentication URL for user
 * const authUrl = googlePhotosService.getAuthUrl();
 *
 * // List user's albums
 * const albums = await googlePhotosService.listAlbums(userId);
 */
class GooglePhotosService {
  private oauth2Client: Auth.OAuth2Client;

  /**
   * Create a new GooglePhotosService
   * Validates required environment variables
   */
  constructor() {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
      throw new Error("Google Photos API credentials are not configured");
    }

    // Log environment configuration to help with debugging
    console.log("GooglePhotosService - Environment Configuration");
    console.log("- NODE_ENV:", process.env.NODE_ENV || "not set");
    console.log("- GOOGLE_REDIRECT_URI:", GOOGLE_REDIRECT_URI);
    console.log("- FRONTEND_URL:", process.env.FRONTEND_URL || "not set");

    // IMPORTANT: These must align with Google Cloud Console
    console.log(
      "- Expected frontend callback URL: (Frontend URL)/photos/callback"
    );
    console.log(
      "- Expected Google redirect: (same as GOOGLE_REDIRECT_URI)",
      GOOGLE_REDIRECT_URI
    );

    // Create OAuth client with proper credentials
    this.oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );
  }

  /**
   * Generate a secure random string for PKCE
   * @returns Random string suitable for code_verifier
   */
  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString("base64url");
  }

  /**
   * Generate a code challenge from a verifier for PKCE
   * @param verifier Code verifier
   * @returns Code challenge
   */
  private generateCodeChallenge(verifier: string): string {
    return crypto
      .createHash("sha256")
      .update(verifier)
      .digest()
      .toString("base64url");
  }

  /**
   * Generate a URL for the user to authenticate with Google
   * Implements PKCE for enhanced security
   *
   * @param state Optional state parameter for CSRF protection
   * @returns Object with auth URL and code verifier to store
   */
  getAuthUrlWithPKCE(state?: string): {
    authUrl: string;
    codeVerifier: string;
  } {
    const scopes = ["https://www.googleapis.com/auth/photoslibrary.readonly"];
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent", // Always show consent screen to get refresh token
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256" as unknown as CodeChallengeMethod, // Type assertion for GoogleAuth
      include_granted_scopes: true,
    });

    return { authUrl, codeVerifier };
  }

  /**
   * Generate an auth URL to authenticate with Google
   *
   * @param state Optional state parameter for security
   * @returns The authorization URL
   */
  getAuthUrl(state?: string): string {
    const scopes = ["https://www.googleapis.com/auth/photoslibrary.readonly"];

    // CRITICAL: DO NOT USE PKCE AT ALL, it's causing problems
    // The key to getting refresh tokens is using both:
    // 1. access_type=offline
    // 2. prompt=consent
    console.log(
      "Generating standard OAuth URL (NO PKCE), with state:",
      state || "none"
    );

    return this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent", // Critical - forces consent screen to get refresh token
      state: state,
      include_granted_scopes: true,
      // NO CODE CHALLENGE OR PKCE PARAMETERS
    });
  }

  /**
   * Exchange authorization code for tokens
   *
   * @param code The authorization code
   * @param codeVerifier Optional PKCE code verifier
   * @returns Promise resolving to OAuth tokens
   */
  async getTokensFromCode(
    code: string,
    codeVerifier?: string
  ): Promise<GoogleTokens> {
    try {
      console.log("Exchanging code for tokens directly in GooglePhotosService");
      console.log("Code length:", code.length);

      // Log first and last few characters of code for debugging
      const maskedCode =
        code.substring(0, 5) + "..." + code.substring(code.length - 5);
      console.log("Code preview:", maskedCode);

      console.log("OAuth2Client config:", {
        clientId: GOOGLE_CLIENT_ID ? "PRESENT" : "MISSING",
        clientSecret: GOOGLE_CLIENT_SECRET ? "PRESENT" : "MISSING",
        redirectUri: GOOGLE_REDIRECT_URI,
      });

      // IMPORTANT: Create a fresh oauth2client for this exchange to avoid any
      // lingering state or code verifier expectations
      const freshOAuth2Client = new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_REDIRECT_URI
      );

      // Direct token exchange with fresh client
      console.log(
        "Token exchange with codeVerifier:",
        codeVerifier ? "PRESENT" : "MISSING"
      );

      const { tokens } = codeVerifier
        ? await freshOAuth2Client.getToken({
            code,
            codeVerifier,
          })
        : await freshOAuth2Client.getToken(code);

      console.log("Received tokens:", {
        access_token: tokens.access_token ? "PRESENT" : "MISSING",
        refresh_token: tokens.refresh_token ? "PRESENT" : "MISSING",
        scope: tokens.scope,
        token_type: tokens.token_type,
        expiry_date: tokens.expiry_date,
      });

      if (!tokens.refresh_token) {
        console.warn(
          "WARNING: No refresh token received from Google. This will cause authentication problems later."
        );
        // Possible causes:
        // 1. The user has already granted access to this application
        // 2. prompt=consent was not included in the authorization URL
        // 3. access_type=offline was not included in the authorization URL
        // 4. The user is using the same Google account across multiple auth attempts
        console.log(
          "Possible solution: User may need to revoke access to the app in their Google account and try again."
        );
      }

      return tokens as GoogleTokens;
    } catch (error) {
      console.error("Error exchanging code for tokens:", error);
      throw error;
    }
  }

  /**
   * List albums for a user
   * Uses tokenManager to handle authentication and token refresh
   *
   * @param userId The user ID to get albums for
   * @returns List of albums
   */
  async listAlbums(userId: string): Promise<{
    albums?: Array<{
      id: string;
      title: string;
      productUrl: string;
      coverPhotoBaseUrl?: string;
      mediaItemsCount?: string;
    }>;
  }> {
    try {
      // Get a fresh access token from the token manager
      const accessToken = await tokenManager.getGoogleAccessToken(userId);

      console.log("Making request to Google Photos API to list albums");
      const response = await axios.get(`${PHOTOS_API_BASE_URL}/albums`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      return response.data;
    } catch (error) {
      console.error("Error listing albums:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }
      throw error;
    }
  }

  /**
   * Get photos from a specific album
   *
   * @param userId The user ID to get photos for
   * @param albumId The ID of the album
   * @returns List of media items in the album
   */
  async getAlbumPhotos(
    userId: string,
    albumId: string
  ): Promise<{
    mediaItems?: Array<{
      id: string;
      baseUrl: string;
      productUrl: string;
      mimeType: string;
      filename: string;
      mediaMetadata?: {
        creationTime?: string;
        width?: string;
        height?: string;
      };
    }>;
    nextPageToken?: string;
  }> {
    try {
      // Get a fresh access token from the token manager
      const accessToken = await tokenManager.getGoogleAccessToken(userId);

      console.log(
        `Making request to Google Photos API to get photos from album: ${albumId}`
      );
      const response = await axios.post(
        `${PHOTOS_API_BASE_URL}/mediaItems:search`,
        {
          albumId: albumId,
          pageSize: 25,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Error getting album photos:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }
      throw error;
    }
  }
}

export default new GooglePhotosService();
