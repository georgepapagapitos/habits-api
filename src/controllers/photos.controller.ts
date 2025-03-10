import { Request, Response, NextFunction } from "express";
import { User } from "../models/user.model";
import googlePhotosService from "../services/google-photos.service";
import tokenManager from "../services/token-manager.service";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import crypto from "crypto";

// Frontend redirect URL (configurable via environment variable)
// Production example: https://habits.rubygal.com
// Development example: http://localhost:3000
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Important: The frontend OAuth callback must be configured in Google Cloud Console exactly as:
// "{FRONTEND_URL}/photos/callback" e.g., "https://habits.rubygal.com/photos/callback"
// And this MUST match the frontend route in AppRoutes.tsx that renders GoogleCallbackHandler

// Redis/Session client for storing PKCE verifiers (defined in app.ts)
// For simplicity, we're using a Map for in-memory storage in this example
// In production, use Redis or another session store
const codeVerifierStore = new Map<
  string,
  { verifier: string; expires: number }
>();

/**
 * Store a code verifier with TTL
 * @param state The state parameter to use as key
 * @param verifier The code verifier to store
 * @param ttlSeconds Time to live in seconds (default: 10 minutes)
 */
function storeCodeVerifier(
  state: string,
  verifier: string,
  ttlSeconds = 600
): void {
  codeVerifierStore.set(state, {
    verifier,
    expires: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Get and delete a code verifier
 * @param state The state parameter used as key
 * @returns The code verifier or undefined if not found or expired
 */
function getAndDeleteCodeVerifier(state: string): string | undefined {
  const entry = codeVerifierStore.get(state);

  if (!entry) {
    return undefined;
  }

  // Clean up expired entries
  if (entry.expires < Date.now()) {
    codeVerifierStore.delete(state);
    return undefined;
  }

  // Delete after retrieval
  codeVerifierStore.delete(state);
  return entry.verifier;
}

/**
 * Generate Google Photos authorization URL
 * Implements PKCE for enhanced security
 */
export const getAuthUrl = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  try {
    console.log("Google API configuration:");
    console.log("- Client ID exists:", !!process.env.GOOGLE_CLIENT_ID);
    console.log("- Client Secret exists:", !!process.env.GOOGLE_CLIENT_SECRET);
    console.log("- Redirect URI:", process.env.GOOGLE_REDIRECT_URI);

    // Generate a random state parameter for CSRF protection
    const state = crypto.randomBytes(16).toString("hex");

    // Get auth URL with PKCE
    const { authUrl, codeVerifier } =
      googlePhotosService.getAuthUrlWithPKCE(state);

    // Store the code verifier temporarily
    storeCodeVerifier(state, codeVerifier);

    // Return auth URL with state parameter
    res.json({
      authUrl,
      state,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
      note: "Make sure this redirectUri exactly matches what's configured in Google Cloud Console",
    });
  } catch (error) {
    console.error("Error generating auth URL:", error);
    res.status(500).json({ message: "Failed to generate authorization URL" });
  }
};

/**
 * Handle OAuth callback and save tokens to user (from request body)
 * Supports PKCE for enhanced security
 */
export const handleAuthCallback = async (
  req: AuthenticatedRequest,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const { code, state } = req.body;
    const userId = req.user?.id;

    if (!code) {
      res.status(400).json({ message: "Authorization code is required" });
      return;
    }

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // We're not using PKCE anymore, just exchange the code for tokens
    // This simpler approach is more reliable for getting refresh tokens
    console.log("Processing auth callback for code, exchanging for tokens");
    const tokens = await googlePhotosService.getTokensFromCode(code);

    if (!tokens.refresh_token) {
      console.warn(
        "No refresh token received. This will cause authentication issues later."
      );
    }

    // Save tokens to user with updated timestamp
    console.log("Saving tokens to user:", userId);
    console.log("Tokens to save:", {
      access_token: tokens.access_token ? "PRESENT" : "MISSING",
      refresh_token: tokens.refresh_token ? "PRESENT" : "MISSING",
      expiry_date: tokens.expiry_date,
    });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          "googlePhotos.tokens": tokens,
          "googlePhotos.connectionStatus": "connected",
          "googlePhotos.lastConnected": new Date(),
        },
      },
      { new: true }
    );

    console.log("Updated user GooglePhotos data:", {
      connected: !!updatedUser?.googlePhotos,
      hasTokens: !!updatedUser?.googlePhotos?.tokens,
      hasRefreshToken: !!updatedUser?.googlePhotos?.tokens?.refresh_token,
      connectionStatus: updatedUser?.googlePhotos?.connectionStatus,
      lastConnected: updatedUser?.googlePhotos?.lastConnected,
      selectedAlbumId: updatedUser?.googlePhotos?.selectedAlbumId || "none",
    });

    // Clear any cached tokens
    tokenManager.clearCache(userId);

    res.json({
      success: true,
      message: "Google Photos connected successfully",
    });
  } catch (error) {
    console.error("Error processing auth callback:", error);
    res
      .status(500)
      .json({ message: "Failed to authenticate with Google Photos" });
  }
};

/**
 * Handle OAuth callback with query parameters (for direct browser redirects)
 * Redirects back to the frontend with the authorization code or error
 * Supports PKCE by preserving state parameter
 */
export const handleAuthCallbackRedirect = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const { code, state, error: authError, error_description } = req.query;

    // Check if Google returned an error
    if (authError) {
      console.error("Google Auth Error:", authError, error_description);
      // Redirect to frontend with error information
      const errorMessage = encodeURIComponent(
        `Auth Error: ${authError}${error_description ? ` - ${error_description}` : ""}`
      );
      res.redirect(`${FRONTEND_URL}/photos/callback?error=${errorMessage}`);
      return;
    }

    if (!code || typeof code !== "string") {
      // Redirect to frontend with error
      res.redirect(
        `${FRONTEND_URL}/photos/callback?error=Authorization code is missing or invalid`
      );
      return;
    }

    console.log(
      "Received authorization code in redirect. Length:",
      code.length
    );

    // Build redirect URL with code and state (if available)
    let redirectUrl = `${FRONTEND_URL}/photos/callback?code=${encodeURIComponent(code)}`;

    // Include state parameter if provided (needed for PKCE)
    if (state && typeof state === "string") {
      redirectUrl += `&state=${encodeURIComponent(state)}`;
    }

    // Redirect to frontend with the code (and state if available)
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Error processing auth callback redirect:", error);

    // Create sanitized error message
    let errorMessage = "Failed to authenticate with Google Photos";
    if (error instanceof Error) {
      errorMessage += ": " + encodeURIComponent(error.message);
    }

    // Redirect to frontend with error
    res.redirect(`${FRONTEND_URL}/photos/callback?error=${errorMessage}`);
  }
};

/**
 * List user's Google Photos albums
 * Uses token manager for automatic token refresh
 */
export const listAlbums = async (
  req: AuthenticatedRequest,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Get user to check connection status
    const user = await User.findById(userId);

    console.log("User GooglePhotos status:", {
      userId,
      connected: !!user?.googlePhotos,
      hasTokens: !!user?.googlePhotos?.tokens,
      connectionStatus: user?.googlePhotos?.connectionStatus || "unknown",
      hasRefreshToken: !!user?.googlePhotos?.tokens?.refresh_token,
      selectedAlbumId: user?.googlePhotos?.selectedAlbumId || "none",
    });

    if (!user?.googlePhotos?.tokens) {
      res.status(400).json({
        message:
          "Google Photos not connected. Please connect your account first.",
      });
      return;
    }

    // Check connection status
    if (user.googlePhotos.connectionStatus === "needs_reconnect") {
      res.status(401).json({
        message:
          "Your Google Photos connection needs to be refreshed. Please reconnect.",
        needsReconnect: true,
      });
      return;
    }

    // Get albums using token manager for authentication
    try {
      const albums = await googlePhotosService.listAlbums(userId);
      res.json(albums);
    } catch (error) {
      // If the error is related to authentication
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (
        errorMessage.includes("refresh") ||
        errorMessage.includes("reconnect")
      ) {
        // Update user status to needs_reconnect
        await User.findByIdAndUpdate(userId, {
          $set: { "googlePhotos.connectionStatus": "needs_reconnect" },
        });

        res.status(401).json({
          message:
            "Your Google Photos connection needs to be refreshed. Please reconnect.",
          needsReconnect: true,
        });
      } else {
        throw error; // Re-throw for general error handling
      }
    }
  } catch (error) {
    console.error("Error listing albums:", error);
    res.status(500).json({ message: "Failed to retrieve albums" });
  }
};

/**
 * Get photos from a specific album
 * Uses token manager for automatic token refresh
 */
export const getAlbumPhotos = async (
  req: AuthenticatedRequest,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const { albumId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Get user to check connection status
    const user = await User.findById(userId);

    if (!user?.googlePhotos?.tokens) {
      res.status(400).json({
        message:
          "Google Photos not connected. Please connect your account first.",
      });
      return;
    }

    // Check connection status
    if (user.googlePhotos.connectionStatus === "needs_reconnect") {
      res.status(401).json({
        message:
          "Your Google Photos connection needs to be refreshed. Please reconnect.",
        needsReconnect: true,
      });
      return;
    }

    // Get photos using token manager for authentication
    try {
      const photos = await googlePhotosService.getAlbumPhotos(userId, albumId);
      res.json(photos);
    } catch (error) {
      // If the error is related to authentication
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (
        errorMessage.includes("refresh") ||
        errorMessage.includes("reconnect")
      ) {
        // Update user status to needs_reconnect
        await User.findByIdAndUpdate(userId, {
          $set: { "googlePhotos.connectionStatus": "needs_reconnect" },
        });

        res.status(401).json({
          message:
            "Your Google Photos connection needs to be refreshed. Please reconnect.",
          needsReconnect: true,
        });
      } else {
        throw error; // Re-throw for general error handling
      }
    }
  } catch (error) {
    console.error("Error retrieving album photos:", error);
    res.status(500).json({ message: "Failed to retrieve album photos" });
  }
};

/**
 * Save selected album for rewards
 */
export const saveSelectedAlbum = async (
  req: AuthenticatedRequest,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const { albumId } = req.body;
    const userId = req.user?.id;

    if (!albumId) {
      res.status(400).json({ message: "Album ID is required" });
      return;
    }

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Save selected album to user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { "googlePhotos.selectedAlbumId": albumId } },
      { new: true }
    );

    if (!updatedUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json({
      success: true,
      message: "Album selected successfully",
      selectedAlbumId: updatedUser.googlePhotos?.selectedAlbumId,
    });
  } catch (error) {
    console.error("Error saving selected album:", error);
    res.status(500).json({ message: "Failed to save selected album" });
  }
};

/**
 * Disconnect Google Photos by clearing saved tokens
 */
export const disconnectGooglePhotos = async (
  req: AuthenticatedRequest,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // First check if the user has googlePhotos data
    const user = await User.findById(userId);

    console.log("Before disconnect - User Google Photos status:", {
      userId,
      hasGooglePhotos: !!user?.googlePhotos,
      beforeData: user?.googlePhotos
        ? JSON.stringify(user.googlePhotos)
        : "none",
    });

    if (!user?.googlePhotos) {
      console.log("User has no Google Photos data to disconnect:", userId);
      res.json({
        success: true,
        message: "Google Photos already disconnected",
      });
      return;
    }

    // Try a different approach - Update directly
    const result = await User.updateOne(
      { _id: userId },
      { $unset: { googlePhotos: "" } }
    );

    console.log("MongoDB update result:", result);

    // Clear token cache if we had a token manager
    try {
      if (tokenManager) tokenManager.clearCache(userId);
    } catch (e) {
      console.warn("Failed to clear token cache:", e);
    }

    // Verify by fetching the user again
    const verifiedUser = await User.findById(userId);
    const disconnected = !verifiedUser?.googlePhotos;

    console.log("After disconnect - User Google Photos status:", {
      userId,
      hasGooglePhotos: !!verifiedUser?.googlePhotos,
      afterData: verifiedUser?.googlePhotos
        ? JSON.stringify(verifiedUser.googlePhotos)
        : "none",
      disconnectSuccess: disconnected,
    });

    res.json({
      success: true,
      message: "Google Photos disconnected successfully",
    });
  } catch (error) {
    console.error("Error disconnecting Google Photos:", error);
    res.status(500).json({ message: "Failed to disconnect Google Photos" });
  }
};

/**
 * Get a random photo from user's selected album
 * Uses token manager for automatic token refresh
 */
export const getRandomRewardPhoto = async (
  req: AuthenticatedRequest,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Get user to check connection status
    const user = await User.findById(userId);

    if (!user?.googlePhotos?.tokens) {
      res.status(400).json({
        message:
          "Google Photos not connected. Please connect your account first.",
      });
      return;
    }

    if (!user.googlePhotos.selectedAlbumId) {
      res.status(400).json({
        message: "No album selected for rewards. Please select an album first.",
      });
      return;
    }

    // Check connection status
    if (user.googlePhotos.connectionStatus === "needs_reconnect") {
      res.status(401).json({
        message:
          "Your Google Photos connection needs to be refreshed. Please reconnect.",
        needsReconnect: true,
      });
      return;
    }

    // Get photos using token manager for authentication
    try {
      const photosResponse = await googlePhotosService.getAlbumPhotos(
        userId,
        user.googlePhotos.selectedAlbumId
      );

      if (
        !photosResponse.mediaItems ||
        photosResponse.mediaItems.length === 0
      ) {
        res
          .status(404)
          .json({ message: "No photos found in the selected album" });
        return;
      }

      // Get a random photo
      const randomIndex = Math.floor(
        Math.random() * photosResponse.mediaItems.length
      );
      const randomPhoto = photosResponse.mediaItems[randomIndex];

      res.json({ photo: randomPhoto });
    } catch (error) {
      // If the error is related to authentication
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (
        errorMessage.includes("refresh") ||
        errorMessage.includes("reconnect")
      ) {
        // Update user status to needs_reconnect
        await User.findByIdAndUpdate(userId, {
          $set: { "googlePhotos.connectionStatus": "needs_reconnect" },
        });

        res.status(401).json({
          message:
            "Your Google Photos connection needs to be refreshed. Please reconnect.",
          needsReconnect: true,
        });
      } else {
        throw error; // Re-throw for general error handling
      }
    }
  } catch (error) {
    console.error("Error retrieving reward photo:", error);
    res.status(500).json({ message: "Failed to retrieve reward photo" });
  }
};
