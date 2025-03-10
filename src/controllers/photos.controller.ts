import { Request, Response, NextFunction } from "express";
import { User } from "../models/user.model";
import googlePhotosService from "../services/google-photos.service";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

// Simple HTML page for showing success or error message
const getResponseHtml = (success: boolean, message: string) => `
<!DOCTYPE html>
<html>
<head>
  <title>Google Photos Authorization</title>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
    .success { color: green; }
    .error { color: red; }
  </style>
</head>
<body>
  <h1 class="${success ? "success" : "error"}">${success ? "Success!" : "Error!"}</h1>
  <p>${message}</p>
  <p>You can close this window now and return to the app.</p>
</body>
</html>
`;

/**
 * Generate Google Photos authorization URL
 */
export const getAuthUrl = (
  req: Request,
  res: Response,
  next: NextFunction
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
  next: NextFunction
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
 * This is a simplified version that doesn't require authentication
 * In a production app, you would want to use sessions or a temporary token to link this to a user
 */
export const handleAuthCallbackRedirect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { code, error: authError, error_description } = req.query;

    // Check if Google returned an error
    if (authError) {
      console.error("Google Auth Error:", authError, error_description);
      res.setHeader("Content-Type", "text/html");
      res
        .status(400)
        .send(
          getResponseHtml(
            false,
            `Auth Error: ${authError} - ${error_description || "No description provided"}`
          )
        );
      return;
    }

    if (!code || typeof code !== "string") {
      res.setHeader("Content-Type", "text/html");
      res
        .status(400)
        .send(
          getResponseHtml(false, "Authorization code is missing or invalid")
        );
      return;
    }

    console.log(
      "Received authorization code in redirect. Length:",
      code.length
    );

    // Instead of trying to exchange the code here, show a success page with instructions
    // This avoids using the code twice (once here and once in the POST endpoint)
    res.setHeader("Content-Type", "text/html");
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Google Photos Authorization</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; margin: 30px; line-height: 1.6; }
        .success { color: green; }
        .code { background: #f0f0f0; padding: 10px; border-radius: 4px; word-break: break-all; margin: 15px 0; font-family: monospace; text-align: left; }
        .instructions { text-align: left; max-width: 600px; margin: 0 auto; }
      </style>
    </head>
    <body>
      <h1 class="success">Authorization Successful!</h1>
      <p>Google has provided the following authorization code:</p>
      <div class="code">${code}</div>
      
      <div class="instructions">
        <h3>To complete the connection:</h3>
        <ol>
          <li>Copy the authorization code above</li>
          <li>Return to Postman or your application</li>
          <li>Make a POST request to <code>/api/photos/auth-callback</code> with:
            <ul>
              <li>Your JWT auth token in the header</li>
              <li>The code in the request body: <code>{ "code": "${code}" }</code></li>
            </ul>
          </li>
        </ol>
      </div>
      
      <p><strong>Note:</strong> This code can only be used once and expires in a few minutes.</p>
    </body>
    </html>
    `);
  } catch (error) {
    console.error("Error processing auth callback redirect:", error);

    // Create detailed error message for debugging
    let errorMessage = "Failed to authenticate with Google Photos";
    if (error instanceof Error) {
      errorMessage += `: ${error.message}`;
    }

    res.setHeader("Content-Type", "text/html");
    res.status(500).send(getResponseHtml(false, errorMessage));
  }
};

/**
 * List user's Google Photos albums
 */
export const listAlbums = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
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
  next: NextFunction
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
  next: NextFunction
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
  next: NextFunction
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
