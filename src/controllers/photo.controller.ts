import axios from "axios";
import { Request, Response } from "express";
import {
  getAuthUrl,
  getPhotoById,
  getRandomPhoto,
  handleOAuth2Callback,
  listAlbums,
} from "../services/google-photos.service";
import { oauth2Client } from "../services/google-photos.service";

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
      const { photoId } = req.params;

      // Input validation to prevent SSRF
      if (
        !photoId ||
        typeof photoId !== "string" ||
        !/^[a-zA-Z0-9\-_]+$/.test(photoId)
      ) {
        res.status(400).json({ message: "Invalid photo ID format" });
        return;
      }

      // Sanitize the photo ID
      const sanitizedPhotoId = photoId.replace(/[^a-zA-Z0-9\-_]/g, "");

      // Optimize the URL for better performance
      const optimizedUrl = `https://lh3.googleusercontent.com/${sanitizedPhotoId}=w1200-h800`;

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
            Referer:
              process.env.APP_URL ||
              "http://localhost:5050" ||
              "http://localhost:5051",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          },
          timeout: 5000,
        });

        // Set appropriate headers for the image
        res.set(
          "Content-Type",
          imageResponse.headers["content-type"] || "image/jpeg"
        );
        res.set("Cache-Control", "public, max-age=86400");
        res.set("Access-Control-Allow-Origin", "*");

        // Send the image data
        res.send(Buffer.from(imageResponse.data));
        console.log("Successfully proxied photo", {
          photoId: sanitizedPhotoId,
        });
      } catch (error: unknown) {
        const axiosError = error as {
          response?: { status: number };
          message?: string;
        };

        // If we get an invalid_grant error, try to refresh the token
        if (axiosError.message?.includes("invalid_grant")) {
          try {
            console.log("Token invalid, attempting to refresh...");
            // Get a fresh token
            const { token: accessToken } = await oauth2Client.getAccessToken();

            if (accessToken) {
              console.log("Token refreshed successfully, retrying request...");
              // Retry the request with the new token
              const retryResponse = await axios.get(optimizedUrl, {
                responseType: "arraybuffer",
                headers: {
                  Referer:
                    process.env.APP_URL ||
                    "http://localhost:5050" ||
                    "http://localhost:5051",
                  "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                },
                timeout: 5000,
              });

              // Set appropriate headers for the image
              res.set(
                "Content-Type",
                retryResponse.headers["content-type"] || "image/jpeg"
              );
              res.set("Cache-Control", "public, max-age=86400");
              res.set("Access-Control-Allow-Origin", "*");

              // Send the image data
              res.send(Buffer.from(retryResponse.data));
              console.log("Successfully proxied photo after token refresh", {
                photoId: sanitizedPhotoId,
              });
              return;
            }
          } catch (refreshError) {
            console.error("Failed to refresh token:", refreshError);
          }
        }

        // If we get here, either the refresh failed or it wasn't a token error
        console.error("Error proxying photo:", error);
        res.status(500).json({
          message: "Failed to fetch photo",
          error: axiosError.message || "Unknown error",
        });
      }
    } catch (error) {
      console.error("Error in photo proxy handler:", error);
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

  // Get Google Photos auth URL
  getAuthUrl: async (req: Request, res: Response): Promise<void> => {
    try {
      const authUrl = getAuthUrl();
      res.status(200).json({ url: authUrl });
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
