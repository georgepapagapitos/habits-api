import { Router } from "express";
import { photoController } from "../controllers/photo.controller";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/auth.middleware";

const router = Router();

// Create a more generous rate limiter specifically for photos
// Since these are needed for reward functionality
const photoLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 30, // allow 30 requests per minute
  message: "Too many photo requests, please try again later.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Create a rate limiter for the authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // allow 10 requests per 15 minutes
  message: "Too many authorization requests, please try again later.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Create a rate limiter for admin operations
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // allow 20 requests per 15 minutes
  message: "Too many admin requests, please try again later.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Protected route with generous rate limit - Get a random photo
router.get("/random", photoLimiter, protect, photoController.getRandomPhoto);

// Photo proxy route - serves image data through the API to avoid CORS issues
// This route doesn't require authentication since it just serves images
router.get(
  "/proxy/:photoId/:width?/:height?",
  photoLimiter,
  photoController.proxyPhoto
);

// Admin routes - Used for initial setup only
router.get("/auth", authLimiter, protect, photoController.getAuthUrl);
router.get("/oauth2callback", authLimiter, photoController.handleOAuthCallback);
router.get("/albums", adminLimiter, protect, photoController.listAlbums);

export default router;
