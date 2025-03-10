import express from "express";
import { protect } from "../middleware/auth.middleware";
import * as photosController from "../controllers/photos.controller";
import rateLimit from "express-rate-limit";

// Rate limiting for photo routes to prevent abuse
const photoLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per minute
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    status: 429,
    message: "Too many requests, please try again later",
  },
  skipSuccessfulRequests: false, // Don't skip successful requests
  skipFailedRequests: false, // Don't skip failed requests
});

// More strict rate limiter for sensitive endpoints
const authCallbackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per 15 minutes
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    status: 429,
    message: "Too many auth requests, please try again after 15 minutes",
  },
  skipSuccessfulRequests: false, // Don't skip successful requests
  skipFailedRequests: false, // Don't skip failed requests
});

const router = express.Router();

/**
 * @route   GET /api/photos/auth-url
 * @desc    Get Google Photos authorization URL
 * @access  Private
 */
router.get(
  "/auth-url",
  protect,
  authCallbackLimiter,
  photosController.getAuthUrl
);

/**
 * @route   POST /api/photos/auth-callback
 * @desc    Handle Google OAuth callback and exchange code for tokens
 * @access  Private
 */
router.post(
  "/auth-callback",
  protect,
  authCallbackLimiter,
  photosController.handleAuthCallback
);

/**
 * @route   GET /api/photos/auth-callback
 * @desc    Handle Google OAuth redirect with code in query parameters
 * @access  Public - but in production should use state parameter for security
 */
router.get(
  "/auth-callback",
  authCallbackLimiter,
  photosController.handleAuthCallbackRedirect
);

/**
 * @route   GET /api/photos/albums
 * @desc    Get list of albums
 * @access  Private
 */
router.get("/albums", protect, photoLimiter, photosController.listAlbums);

/**
 * @route   GET /api/photos/albums/:albumId/photos
 * @desc    Get photos from a specific album
 * @access  Private
 */
router.get(
  "/albums/:albumId/photos",
  protect,
  photoLimiter,
  photosController.getAlbumPhotos
);

/**
 * @route   POST /api/photos/select-album
 * @desc    Select an album to use for rewards
 * @access  Private
 */
router.post(
  "/select-album",
  protect,
  photoLimiter,
  photosController.saveSelectedAlbum
);

/**
 * @route   GET /api/photos/reward
 * @desc    Get a random photo from the selected album as a reward
 * @access  Private
 */
router.get(
  "/reward",
  protect,
  photoLimiter,
  photosController.getRandomRewardPhoto
);

/**
 * @route   POST /api/photos/disconnect
 * @desc    Disconnect Google Photos by clearing saved tokens
 * @access  Private
 */
router.post(
  "/disconnect",
  protect,
  authCallbackLimiter,
  photosController.disconnectGooglePhotos
);

/**
 * @route   GET /api/photos/disconnect
 * @desc    Alternative endpoint to disconnect Google Photos (for debugging)
 * @access  Private
 */
router.get(
  "/disconnect",
  protect,
  authCallbackLimiter,
  photosController.disconnectGooglePhotos
);

/**
 * @route   GET /api/photos/oauth-debug
 * @desc    Debug route to check OAuth configuration (keep for troubleshooting)
 * @access  Private
 */
router.get("/oauth-debug", protect, (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || "not set";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "not set";
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "not set";
  const frontendUrl = process.env.FRONTEND_URL || "not set";
  const nodeEnv = process.env.NODE_ENV || "not set";

  // Don't expose full credentials, just for diagnostic purposes
  const maskedClientId =
    clientId.length > 8
      ? `${clientId.substring(0, 4)}...${clientId.substring(clientId.length - 4)}`
      : "(invalid)";
  const maskedClientSecret =
    clientSecret.length > 8
      ? `${clientSecret.substring(0, 2)}...${clientSecret.substring(
          clientSecret.length - 2
        )}`
      : "(invalid)";

  // Critical to check - must match Google Cloud Console exactly
  const expectedFrontendCallback = `${frontendUrl}/photos/callback`;

  res.json({
    environment: nodeEnv,
    oauth: {
      clientId: maskedClientId,
      clientIdValid: clientId !== "not set" && clientId.length > 20,
      clientSecretValid: clientSecret !== "not set" && clientSecret.length > 10,
      redirectUri,
      frontendUrl,
      expectedFrontendCallback,
    },
    important_notes: [
      "GOOGLE_REDIRECT_URI must match exactly what's in Google Cloud Console",
      "Frontend callback URL must ALSO be added to authorized redirects in Google Console",
      "Both frontend and backend callback URLs must use the same protocol (http or https)",
      "For refresh tokens, your OAuth config MUST use access_type=offline AND prompt=consent",
    ],
  });
});

export default router;
