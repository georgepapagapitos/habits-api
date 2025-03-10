import express from "express";
import { protect } from "../middleware/auth.middleware";
import * as photosController from "../controllers/photos.controller";

const router = express.Router();

/**
 * @route   GET /api/photos/auth-url
 * @desc    Get Google Photos authorization URL
 * @access  Private
 */
router.get("/auth-url", protect, photosController.getAuthUrl);

/**
 * @route   POST /api/photos/auth-callback
 * @desc    Handle Google OAuth callback and exchange code for tokens
 * @access  Private
 */
router.post("/auth-callback", protect, photosController.handleAuthCallback);

/**
 * @route   GET /api/photos/auth-callback
 * @desc    Handle Google OAuth redirect with code in query parameters
 * @access  Public - but in production should use state parameter for security
 */
router.get("/auth-callback", photosController.handleAuthCallbackRedirect);

/**
 * @route   GET /api/photos/albums
 * @desc    Get list of albums
 * @access  Private
 */
router.get("/albums", protect, photosController.listAlbums);

/**
 * @route   GET /api/photos/albums/:albumId/photos
 * @desc    Get photos from a specific album
 * @access  Private
 */
router.get("/albums/:albumId/photos", protect, photosController.getAlbumPhotos);

/**
 * @route   POST /api/photos/select-album
 * @desc    Select an album to use for rewards
 * @access  Private
 */
router.post("/select-album", protect, photosController.saveSelectedAlbum);

/**
 * @route   GET /api/photos/reward
 * @desc    Get a random photo from the selected album as a reward
 * @access  Private
 */
router.get("/reward", protect, photosController.getRandomRewardPhoto);

/**
 * @route   GET /api/photos/debug
 * @desc    Debug route to check OAuth configuration (REMOVE IN PRODUCTION)
 * @access  Private
 */
router.get("/debug", protect, (req, res) => {
  // Don't expose full secret, just first/last characters
  const clientId = process.env.GOOGLE_CLIENT_ID || "not set";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "not set";
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "not set";

  const maskedClientId =
    clientId.length > 8
      ? `${clientId.substring(0, 4)}...${clientId.substring(clientId.length - 4)}`
      : "(invalid)";

  const maskedClientSecret =
    clientSecret.length > 8
      ? `${clientSecret.substring(0, 2)}...${clientSecret.substring(clientSecret.length - 2)}`
      : "(invalid)";

  res.json({
    config: {
      clientId: maskedClientId,
      clientSecret: maskedClientSecret,
      redirectUri,
      clientIdLength: clientId.length,
      clientSecretLength: clientSecret.length,
    },
    photosApiEnabled: !!process.env.GOOGLE_CLIENT_ID,
  });
});

export default router;
