import axios from "axios";
import { Request, Response } from "express";
import {
  getAuthUrl,
  getPhotoById,
  getRandomPhoto,
  handleOAuth2Callback,
  listAlbums,
} from "../services/google-photos.service";

// Create a controller object following the same pattern as habitController
export const photoController = {
  // Test endpoint to verify daily photo rotation
  testDailyRotation: async (req: Request, res: Response): Promise<void> => {
    try {
      // Extract habit ID and number of days to simulate
      const { habitId = "test-habit", days = 7 } = req.query;
      const today = new Date();

      // Validate and limit days to prevent excessive computation
      const daysToSimulate = Math.min(
        Math.max(1, Number(days) || 7), // Default to 7 if NaN, minimum 1
        30 // Cap at 30 days for safety
      );

      // Generate results for each day
      const results = [];

      for (let i = 0; i < daysToSimulate; i++) {
        // Create a date for each day
        const testDate = new Date(today);
        testDate.setDate(today.getDate() + i);
        const dateString = testDate.toISOString().split("T")[0];
        const dateNumber = parseInt(dateString.replace(/-/g, ""));

        // Generate a consistent habit hash (same as the UI would)
        let habitHash = 0;
        // Limit and sanitize habitId to prevent loop bound injection
        const habitIdStr = String(habitId)
          .replace(/[^\w-]/g, "")
          .substring(0, 100);
        // Safety check: set a reasonable max length for the loop
        const maxLength = Math.min(habitIdStr.length, 100);
        for (let j = 0; j < maxLength; j++) {
          habitHash = (habitHash << 5) - habitHash + habitIdStr.charCodeAt(j);
          habitHash |= 0;
        }
        const scaledHabitHash = Math.abs(habitHash) * 1000000;

        // Generate the seed as the UI would
        const seed = scaledHabitHash + dateNumber;

        // Get photo for this seed
        const photo = await getRandomPhoto(seed);

        // Store result
        results.push({
          day: i + 1,
          date: dateString,
          seed,
          photoId: photo?.id || "none",
          // Include truncated URL to verify difference
          photoUrlPreview: photo?.url
            ? `${photo.url.substring(0, 30)}...`
            : "none",
        });
      }

      // Return all results
      res.status(200).json({
        message: `Photo rotation test for ${daysToSimulate} days`,
        results,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        message: "Error in rotation test",
        error: errorMessage,
      });
    }
  },
  // Proxy a Google Photos image to avoid CORS issues
  proxyPhoto: async (req: Request, res: Response): Promise<void> => {
    try {
      const { photoId, width, height } = req.params;
      // Sanitize inputs for logging
      const sanitizedPhotoId = photoId.replace(/[^\w-]/g, "");
      const sanitizedWidth = width ? width.replace(/\D/g, "") : "default";
      const sanitizedHeight = height ? height.replace(/\D/g, "") : "default";
      console.log(
        "Proxying photo", // Fixed string without interpolation
        {
          photoId: sanitizedPhotoId,
          width: sanitizedWidth,
          height: sanitizedHeight,
        } // Pass as object
      );

      // Get photo details from Google Photos API
      const photo = await getPhotoById(photoId);

      if (!photo) {
        // Use sanitized ID for logging with fixed format
        console.error("Photo not found", { photoId: sanitizedPhotoId });
        res.status(404).json({ message: "Photo not found" });
        return;
      }

      // Construct the optimized URL with parameters
      const w = width || "400";
      const h = height || "400";
      const optimizedUrl = `${photo.baseUrl}=d-w${w}-h${h}-c`;
      console.log(
        `Using Google Photos URL: ${optimizedUrl.substring(0, 100)}...`
      );

      try {
        // Ensure our Google credentials are fresh
        if (
          process.env.GOOGLE_ACCESS_TOKEN &&
          process.env.GOOGLE_REFRESH_TOKEN
        ) {
          console.log("Using stored Google credentials for photo proxy");
        } else {
          console.error("Missing Google credentials for photo proxy");
          res.status(500).json({ message: "Google credentials not available" });
          return;
        }

        // Fetch the image data from Google Photos
        const imageResponse = await axios.get(optimizedUrl, {
          responseType: "arraybuffer",
          headers: {
            // Set proper referer to avoid Google Photos blocking the request
            Referer:
              process.env.APP_URL ||
              "http://localhost:5050" ||
              "http://localhost:5051",
            // Use a common user agent
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          },
          // Add a timeout to prevent hanging requests
          timeout: 5000,
        });

        // Set appropriate headers for the image
        res.set(
          "Content-Type",
          imageResponse.headers["content-type"] || "image/jpeg"
        );
        res.set("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
        res.set("Access-Control-Allow-Origin", "*"); // Allow any origin to access this image

        // Send the image data
        res.send(Buffer.from(imageResponse.data));
        console.log("Successfully proxied photo", {
          photoId: sanitizedPhotoId,
        });
      } catch (fetchError: unknown) {
        // Type check the error
        const axiosError = fetchError as {
          message?: string;
          response?: { status: number };
          request?: unknown;
        };

        // Sanitize the photo ID to prevent injection in logs
        // Use a fixed format string and ensure the message is not user-controlled
        const sanitizedPhotoId = photoId.replace(/[^\w-]/g, "");
        console.error(
          "Error proxying photo ID", // Fixed string without interpolation
          {
            photoId: sanitizedPhotoId,
            errorMessage: axiosError.message || "Unknown error",
          } // Pass as object
        );

        // Provide different error responses based on error type
        if (axiosError.response) {
          // The request was made and the server responded with a non-2xx status
          const status = axiosError.response?.status || 0;
          console.error("Google Photos API error", { statusCode: status });
          res.status(axiosError.response.status).json({
            message: "Google Photos returned an error",
            status: axiosError.response.status,
          });
        } else if (axiosError.request) {
          // The request was made but no response was received
          console.error("No response received from Google Photos API", {
            proxyFor: sanitizedPhotoId,
          });
          res.status(504).json({ message: "No response from Google Photos" });
        } else {
          // Something else caused the error
          res
            .status(502)
            .json({ message: "Failed to proxy photo from Google Photos" });
        }
      }
    } catch (error: unknown) {
      // Type check the error
      const err = error as { message?: string };
      console.error("Error in photo proxy handler", {
        error: err.message || "Unknown error",
      });
      res.status(500).json({ message: "Internal server error" });
    }
  },
  // List all albums
  listAlbums: async (req: Request, res: Response): Promise<void> => {
    try {
      const albums = await listAlbums();
      res.status(200).json({
        success: true,
        count: albums.length,
        data: albums,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        message: "Error listing albums",
        error: errorMessage,
      });
    }
  },
  // Get a random photo from the configured album
  getRandomPhoto: async (req: Request, res: Response): Promise<void> => {
    try {
      // Check if a seed parameter was provided
      const seed = req.query.seed ? Number(req.query.seed) : undefined;

      if (seed !== undefined) {
        console.log(
          `Using provided seed for deterministic photo selection: ${seed}`
        );
      } else {
        console.log(`No seed provided, using random photo selection`);
      }

      const photo = await getRandomPhoto(seed);

      if (!photo) {
        res.status(404).json({ message: "No photos found in the album" });
        return;
      }

      res.status(200).json(photo);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        message: "Error fetching random photo",
        error: errorMessage,
      });
    }
  },

  // Get OAuth URL for initial setup (admin use only)
  getAuthUrl: (req: Request, res: Response): void => {
    try {
      const authUrl = getAuthUrl();
      res.status(200).json({ authUrl });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        message: "Error generating auth URL",
        error: errorMessage,
      });
    }
  },

  // Handle OAuth callback (admin use only)
  handleOAuthCallback: async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.query;

      if (!code || typeof code !== "string") {
        res.status(400).json({ message: "Authorization code is required" });
        return;
      }

      await handleOAuth2Callback(code);

      res.status(200).json({
        message:
          "Authorization successful. Check server logs for tokens to add to environment variables.",
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        message: "Error handling OAuth callback",
        error: errorMessage,
      });
    }
  },
};
