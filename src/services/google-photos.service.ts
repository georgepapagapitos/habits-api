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
  photoIndex: number; // Store which index was used
  previousPhotoIndex?: number; // Store the previous day's photo index
}

const photoCache: Map<number, CachedPhoto> = new Map();

// Cache TTL in milliseconds (24 hours)
const PHOTO_CACHE_TTL = 24 * 60 * 60 * 1000;

// A map to track previous day's photo indexes for each habit (by seed base)
// Format: { habitKey -> { photoIndex, date } }
interface PreviousPhotoRecord {
  photoIndex: number;
  date: string; // YYYY-MM-DD format
}

const previousDayPhotos: Map<string, PreviousPhotoRecord> = new Map();

// Function to check and clean up outdated photo records
const cleanupOldPhotoRecords = (): void => {
  const today = new Date();
  const todayString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

  // No need to clean if we haven't accumulated records
  if (previousDayPhotos.size === 0) return;

  console.log(`Checking for old photo records. Today is ${todayString}`);

  // Keep track of records to remove from other days
  const recordsToUpdate: Array<{ key: string; record: PreviousPhotoRecord }> =
    [];

  // Find records from previous days
  previousDayPhotos.forEach((record, key) => {
    if (record.date !== todayString) {
      recordsToUpdate.push({ key, record });
    }
  });

  // Process any found records
  if (recordsToUpdate.length > 0) {
    console.log(
      `Found ${recordsToUpdate.length} photo records from previous days`
    );

    for (const { key, record } of recordsToUpdate) {
      // Move the record to the actual previousDay tracking
      console.log(
        `Updating record for ${key}: ${record.photoIndex} from ${record.date} -> ${todayString}`
      );
      previousDayPhotos.set(key, {
        photoIndex: record.photoIndex,
        date: todayString,
      });
    }
  }
};

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

// Get a photo by ID
export const getPhotoById = async (
  photoId: string
): Promise<GooglePhoto | null> => {
  try {
    // Ensure credentials are set
    if (!setCredentialsFromEnv()) {
      throw new Error("Google credentials not available");
    }

    // Get a fresh token
    const token = await oauth2Client.getAccessToken();
    const accessToken = token.token;

    // Use axios to make the request directly to Google Photos API
    const response = await axios.get(
      `https://photoslibrary.googleapis.com/v1/mediaItems/${photoId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error fetching photo by ID:", error);
    return null;
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

    // Get a photo that's different from yesterday if possible
    let photoIndex;
    let previousIndex: number | undefined;

    if (seed !== undefined) {
      // First, extract the habit ID portion from the seed
      // The seed is typically a hash combining habit ID and date
      // We need to identify which habit this is for tracking previous photos
      const currentDate = new Date();
      const dateString = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`;

      // Create a unique key for this habit by removing the date component
      // This is based on how the seed is generated on the client (habit ID + date hash)
      const habitKey = `habit-${Math.floor(seed / 1000000)}`; // Simplified extraction

      // Run cleanup to check for date changes
      cleanupOldPhotoRecords();

      // Check if we have a record of yesterday's photo for this habit
      if (previousDayPhotos.has(habitKey)) {
        const prevRecord = previousDayPhotos.get(habitKey);
        previousIndex = prevRecord?.photoIndex;
        console.log(
          `Previous day photo index for ${habitKey}: ${previousIndex} from ${prevRecord?.date}`
        );
      }

      // Generate a deterministic index for today based on seed
      const baseIndex = Math.abs(seed) % mediaItems.length;

      // If we have a previous index and there are enough photos, ensure we pick a different one
      if (previousIndex !== undefined && mediaItems.length > 1) {
        // If the deterministic index would give the same photo as yesterday, shift it
        if (baseIndex === previousIndex) {
          // Pick a completely different photo instead of just the next one
          // Create a random offset between 1 and half the collection size
          const offset = Math.max(
            1,
            Math.floor(Math.random() * (mediaItems.length / 2))
          );
          photoIndex = (baseIndex + offset) % mediaItems.length;
          console.log(
            `Avoiding repeat photo. Shifted from ${baseIndex} to ${photoIndex} with offset ${offset}`
          );
        } else {
          photoIndex = baseIndex;
        }
      } else {
        photoIndex = baseIndex;
      }

      // Store this photo index for tomorrow's reference
      // We store it with today's date so we know when to update it
      previousDayPhotos.set(habitKey, {
        photoIndex,
        date: dateString,
      });
      console.log(
        `Set photo index ${photoIndex} for ${habitKey} on ${dateString}`
      );
    } else {
      // For truly random selection (no seed), just pick any random photo
      photoIndex = Math.floor(Math.random() * mediaItems.length);
    }

    const randomPhoto = mediaItems[photoIndex] as GooglePhoto;

    // Create the proxy URLs instead of direct Google Photos URLs
    const baseUrl = `/api/photos/proxy/${randomPhoto.id}`;
    const optimizedUrl = `${baseUrl}/400/400`;
    const thumbnailUrl = `${baseUrl}/100/100`;

    // Create the response object with scaled dimensions
    const photoResponse = {
      id: randomPhoto.id,
      url: optimizedUrl,
      thumbnailUrl: thumbnailUrl,
      width: randomPhoto.mediaMetadata
        ? parseInt(randomPhoto.mediaMetadata.width || "0", 10)
        : 0,
      height: randomPhoto.mediaMetadata
        ? parseInt(randomPhoto.mediaMetadata.height || "0", 10)
        : 0,
      // Include the original Google Photos baseUrl for reference but don't expose to frontend
      _originalBaseUrl: randomPhoto.baseUrl,
    };

    // Add to cache if seed is provided - still keep the cache for performance
    if (seed !== undefined) {
      photoCache.set(seed, {
        photo: photoResponse,
        timestamp: Date.now(),
        photoIndex: photoIndex,
        previousPhotoIndex: previousIndex,
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
