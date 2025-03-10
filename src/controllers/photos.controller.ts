import { Request, Response, NextFunction } from "express";
import { User } from "../models/user.model";
import googlePhotosService from "../services/google-photos.service";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

// Frontend redirect URL (this should be configurable in environment variables in production)
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

/**
 * Generate Google Photos authorization URL
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

    const authUrl = googlePhotosService.getAuthUrl();

    // Also return the configured redirect URI so user can verify it matches Google Cloud
    res.json({
      authUrl,
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
 */
export const handleAuthCallback = async (
  req: AuthenticatedRequest,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const { code } = req.body;
    const userId = req.user?.id;

    if (!code) {
      res.status(400).json({ message: "Authorization code is required" });
      return;
    }

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Exchange code for tokens
    const tokens = await googlePhotosService.getTokensFromCode(code);

    // Save tokens to user
    await User.findByIdAndUpdate(
      userId,
      { $set: { "googlePhotos.tokens": tokens } },
      { new: true }
    );

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
 */
export const handleAuthCallbackRedirect = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const { code, error: authError, error_description } = req.query;

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

    // Redirect to frontend with the code
    // The frontend will then send this code to the backend with proper authentication
    res.redirect(
      `${FRONTEND_URL}/photos/callback?code=${encodeURIComponent(code)}`
    );
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

    // Get user with tokens
    const user = await User.findById(userId);

    if (!user?.googlePhotos?.tokens) {
      res.status(400).json({
        message:
          "Google Photos not connected. Please connect your account first.",
      });
      return;
    }

    // Set credentials and get albums
    googlePhotosService.setCredentials(user.googlePhotos.tokens);
    const albums = await googlePhotosService.listAlbums();

    res.json(albums);
  } catch (error) {
    console.error("Error listing albums:", error);
    res.status(500).json({ message: "Failed to retrieve albums" });
  }
};

/**
 * Get photos from a specific album
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

    // Get user with tokens
    const user = await User.findById(userId);

    if (!user?.googlePhotos?.tokens) {
      res.status(400).json({
        message:
          "Google Photos not connected. Please connect your account first.",
      });
      return;
    }

    // Set credentials and get photos
    googlePhotosService.setCredentials(user.googlePhotos.tokens);
    const photos = await googlePhotosService.getAlbumPhotos(albumId);

    res.json(photos);
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
 * Get a random photo from user's selected album
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

    // Get user with tokens and selected album
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

    // Set credentials and get photos
    googlePhotosService.setCredentials(user.googlePhotos.tokens);
    const photosResponse = await googlePhotosService.getAlbumPhotos(
      user.googlePhotos.selectedAlbumId
    );

    if (!photosResponse.mediaItems || photosResponse.mediaItems.length === 0) {
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
    console.error("Error retrieving reward photo:", error);
    res.status(500).json({ message: "Failed to retrieve reward photo" });
  }
};
