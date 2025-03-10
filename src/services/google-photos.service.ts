import { google, Auth } from "googleapis";
import axios from "axios";
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
} from "../config/env";
import { GoogleTokens } from "../types/user.types";

// Constants for Google Photos API
const PHOTOS_API_BASE_URL = "https://photoslibrary.googleapis.com/v1";

class GooglePhotosService {
  private oauth2Client: Auth.OAuth2Client;

  constructor() {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
      throw new Error("Google Photos API credentials are not configured");
    }

    this.oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );
  }

  /**
   * Generate a URL for the user to authenticate with Google
   * @param {string} state Optional state parameter for security
   * @returns {string} The authorization URL
   */
  getAuthUrl(state?: string): string {
    const scopes = ["https://www.googleapis.com/auth/photoslibrary.readonly"];

    return this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent",
      state: state, // Include state if provided
    });
  }

  /**
   * Exchange authorization code for tokens
   * @param {string} code The authorization code
   * @returns {Promise<GoogleTokens>} Token response
   */
  async getTokensFromCode(code: string): Promise<GoogleTokens> {
    try {
      console.log(
        "Exchanging code for tokens. Redirect URI:",
        GOOGLE_REDIRECT_URI
      );
      console.log("Code length:", code.length);

      // Log first and last few characters of code for debugging
      const maskedCode =
        code.substring(0, 5) + "..." + code.substring(code.length - 5);
      console.log("Code preview:", maskedCode);

      const { tokens } = await this.oauth2Client.getToken(code);
      return tokens as GoogleTokens;
    } catch (error) {
      console.error("Detailed token exchange error:", error);
      throw error;
    }
  }

  /**
   * Set the credentials for the OAuth2 client
   * @param {GoogleTokens} tokens The tokens to set
   */
  setCredentials(tokens: GoogleTokens): void {
    this.oauth2Client.setCredentials(tokens);
  }

  /**
   * List albums for the authenticated user
   * @returns {Promise<{albums?: Array<{id: string, title: string, productUrl: string, coverPhotoBaseUrl?: string}>}>} List of albums
   */
  async listAlbums(): Promise<{
    albums?: Array<{
      id: string;
      title: string;
      productUrl: string;
      coverPhotoBaseUrl?: string;
      mediaItemsCount?: string;
    }>;
  }> {
    try {
      // Get a fresh access token if needed
      const accessToken = await this.getAccessToken();

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
   * @param {string} albumId The ID of the album
   * @returns {Promise<{mediaItems?: Array<{id: string, baseUrl: string, productUrl: string, mimeType: string, filename: string, mediaMetadata?: object}>}>} List of media items in the album
   */
  async getAlbumPhotos(albumId: string): Promise<{
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
      // Get a fresh access token if needed
      const accessToken = await this.getAccessToken();

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

  /**
   * Helper method to get a current access token
   * @returns {Promise<string>} The access token
   */
  private async getAccessToken(): Promise<string> {
    try {
      // If we don't have credentials or they're expired, this will throw an error
      const accessToken = await this.oauth2Client.getAccessToken();

      // Check if we got a token
      if (!accessToken.token) {
        throw new Error("No access token available");
      }

      return accessToken.token;
    } catch (error) {
      console.error("Error getting access token:", error);
      throw new Error(
        "Failed to get access token, re-authentication may be required"
      );
    }
  }
}

export default new GooglePhotosService();
