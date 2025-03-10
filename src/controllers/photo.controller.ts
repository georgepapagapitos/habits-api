import { Request, Response } from "express";
import {
  getRandomPhoto,
  getAuthUrl,
  handleOAuth2Callback,
  listAlbums,
} from "../services/google-photos.service";

// Create a controller object following the same pattern as habitController
export const photoController = {
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
      // Check for a seed parameter for deterministic selection
      const seed = req.query.seed ? Number(req.query.seed) : undefined;

      if (seed !== undefined) {
        console.log(`Using deterministic seed for photo selection: ${seed}`);
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
