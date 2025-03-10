import { google } from "googleapis";
import axios from "axios";
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  GOOGLE_PHOTOS_ALBUM_ID,
} from "../config/env";
import {
  GooglePhoto,
  PhotoResponse,
  GoogleAlbum,
  AlbumResponse,
} from "../types/photo.types";

// Create OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

// Set credentials from environment variables
const setCredentialsFromEnv = () => {
  // In a real app, you would securely retrieve the tokens from a database or another secure location
  // For development, we'll use environment variables
  if (process.env.GOOGLE_ACCESS_TOKEN && process.env.GOOGLE_REFRESH_TOKEN) {
    oauth2Client.setCredentials({
      access_token: process.env.GOOGLE_ACCESS_TOKEN,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      expiry_date: process.env.GOOGLE_TOKEN_EXPIRY
        ? parseInt(process.env.GOOGLE_TOKEN_EXPIRY, 10)
        : undefined,
    });
    return true;
  }
  return false;
};

// Enhanced in-memory cache for photos with timestamp for TTL
// Key is the seed, value contains the photo response and timestamp
interface CachedPhoto {
  photo: PhotoResponse;
  timestamp: number;
}

const photoCache: Map<number, CachedPhoto> = new Map();

// Cache TTL in milliseconds (24 hours)
const PHOTO_CACHE_TTL = 24 * 60 * 60 * 1000;

// Cache for media items to avoid frequent Google API calls
// This will be refreshed periodically
let cachedMediaItems: GooglePhoto[] = [];
let mediaItemsLastFetchTime = 0;
const MEDIA_ITEMS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Flag to track if we're currently fetching media items
// This prevents multiple concurrent fetches
let isFetchingMediaItems = false;
// Queue of functions to call when media items are fetched
let mediaItemsFetchQueue: ((items: GooglePhoto[]) => void)[] = [];

// Function to fetch media items with enhanced caching and concurrency control
const fetchMediaItems = async (): Promise<GooglePhoto[]> => {
  const now = Date.now();

  // Return cached items if they're still valid
  if (
    cachedMediaItems.length > 0 &&
    now - mediaItemsLastFetchTime < MEDIA_ITEMS_CACHE_TTL
  ) {
    return cachedMediaItems;
  }

  // If we're already fetching media items, return a promise that resolves when the fetch completes
  if (isFetchingMediaItems) {
    return new Promise((resolve) => {
      mediaItemsFetchQueue.push((items) => {
        resolve(items);
      });
    });
  }

  // Mark that we're fetching media items
  isFetchingMediaItems = true;

  try {
    // Ensure credentials are set
    if (!setCredentialsFromEnv()) {
      throw new Error("Google credentials not available");
    }

    // Get a fresh token
    const token = await oauth2Client.getAccessToken();
    const accessToken = token.token;

    if (!GOOGLE_PHOTOS_ALBUM_ID) {
      throw new Error("Album ID not configured");
    }

    // Use axios to make the request directly
    const response = await axios.post(
      "https://photoslibrary.googleapis.com/v1/mediaItems:search",
      {
        albumId: GOOGLE_PHOTOS_ALBUM_ID,
        pageSize: 100, // Max 100 items per request
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const mediaItems = response.data.mediaItems || [];

    // Update the cache if we got items
    if (mediaItems.length > 0) {
      cachedMediaItems = mediaItems;
      mediaItemsLastFetchTime = now;
    }

    // Call all queued functions with the fetched items
    mediaItemsFetchQueue.forEach((callback) => {
      callback(mediaItems);
    });

    // Clear the queue
    mediaItemsFetchQueue = [];

    return mediaItems;
  } catch (error) {
    // Clear the queue with an empty array on error
    mediaItemsFetchQueue.forEach((callback) => {
      callback([]);
    });
    mediaItemsFetchQueue = [];

    throw error;
  } finally {
    // Mark that we're done fetching
    isFetchingMediaItems = false;
  }
};

// Get a random photo from the album with improved caching
// If seed is provided, use it for deterministic selection
export const getRandomPhoto = async (
  seed?: number
): Promise<PhotoResponse | null> => {
  try {
    // If a seed is provided, check the cache first
    if (seed !== undefined && photoCache.has(seed)) {
      const cached = photoCache.get(seed);
      const now = Date.now();

      // Check if the cached photo is still valid
      if (cached && now - cached.timestamp < PHOTO_CACHE_TTL) {
        return cached.photo;
      }

      // If expired, remove from cache
      photoCache.delete(seed);
    }

    // Fetch media items (uses caching internally)
    const mediaItems = await fetchMediaItems();

    if (mediaItems.length === 0) {
      return null;
    }

    // If seed is provided, use it for deterministic selection
    let randomIndex;

    if (seed !== undefined) {
      // Use a deterministic approach based on the seed
      // This ensures the same habit + date combo always gets the same photo
      randomIndex = Math.abs(seed) % mediaItems.length;
    } else {
      // Otherwise use true random selection
      randomIndex = Math.floor(Math.random() * mediaItems.length);
    }

    const randomPhoto = mediaItems[randomIndex] as GooglePhoto;

    // Create a modified URL with optimized parameters
    // =d -> download parameter (avoids CORS issues)
    // =w400-h400 -> resize to more optimized dimensions (loads faster)
    // =c -> crop to requested size
    const baseUrl = randomPhoto.baseUrl;
    const optimizedUrl = `${baseUrl}=d-w400-h400-c`;

    // Create the response object with scaled dimensions
    const photoResponse = {
      id: randomPhoto.id,
      url: optimizedUrl,
      thumbnailUrl: `${baseUrl}=d-w100-h100-c`, // Add a smaller thumbnail for faster initial loading
      width: randomPhoto.mediaMetadata
        ? parseInt(randomPhoto.mediaMetadata.width || "0", 10)
        : 0,
      height: randomPhoto.mediaMetadata
        ? parseInt(randomPhoto.mediaMetadata.height || "0", 10)
        : 0,
    };

    // Add to cache if seed is provided
    if (seed !== undefined) {
      photoCache.set(seed, {
        photo: photoResponse,
        timestamp: Date.now(),
      });

      // Prune cache if it gets too large (keep most recent 500 items)
      if (photoCache.size > 500) {
        // Convert to array to sort by timestamp
        const cacheEntries = Array.from(photoCache.entries());
        cacheEntries.sort((a, b) => a[1].timestamp - b[1].timestamp);

        // Remove oldest entries (keep the newest 500)
        const entriesToRemove = cacheEntries.slice(
          0,
          cacheEntries.length - 500
        );
        for (const [key] of entriesToRemove) {
          photoCache.delete(key);
        }
      }
    }

    return photoResponse;
  } catch (error) {
    console.error("Error fetching random photo:", error);
    return null; // Return null instead of throwing to prevent client errors
  }
};

// Generate an authorization URL
export const getAuthUrl = (): string => {
  const scopes = ["https://www.googleapis.com/auth/photoslibrary.readonly"];

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent", // Force to get refresh token
  });
};

// Handle OAuth callback
export const handleOAuth2Callback = async (code: string): Promise<void> => {
  try {
    const { tokens } = await oauth2Client.getToken(code);

    // In a real application, you would securely store these tokens
    // For simplicity, we'll log them so they can be added to environment variables
    console.log("Access Token:", tokens.access_token);
    console.log("Refresh Token:", tokens.refresh_token);
    console.log("Expiry Date:", tokens.expiry_date);

    oauth2Client.setCredentials(tokens);

    // Log instructions for the next step
    console.log("\n");
    console.log("----------------------------------------");
    console.log("IMPORTANT: Add these tokens to your .env file:");
    console.log("----------------------------------------");
    console.log(`GOOGLE_ACCESS_TOKEN=${tokens.access_token}`);
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    if (tokens.expiry_date) {
      console.log(`GOOGLE_TOKEN_EXPIRY=${tokens.expiry_date}`);
    }
    console.log(
      "\nNext step: Find your album ID and add it as GOOGLE_PHOTOS_ALBUM_ID"
    );
    console.log("Use the /api/photos/albums endpoint to list your albums");
    console.log("----------------------------------------");
  } catch (error) {
    console.error("Error handling OAuth callback:", error);
    throw error;
  }
};

// List all albums from Google Photos
export const listAlbums = async (): Promise<AlbumResponse[]> => {
  try {
    if (!setCredentialsFromEnv()) {
      throw new Error("Google credentials not available");
    }

    const token = await oauth2Client.getAccessToken();
    const accessToken = token.token;

    const response = await axios.get(
      "https://photoslibrary.googleapis.com/v1/albums",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        params: {
          pageSize: 50, // Get up to 50 albums
        },
      }
    );

    const albums = response.data.albums || [];

    // Transform to our response format
    return albums.map((album: GoogleAlbum) => ({
      id: album.id,
      title: album.title,
      itemCount: parseInt(album.mediaItemsCount || "0", 10),
      coverUrl: album.coverPhotoBaseUrl,
    }));
  } catch (error) {
    console.error("Error listing albums:", error);
    throw error;
  }
};
