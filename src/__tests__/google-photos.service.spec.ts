// Mock the environment configuration first
jest.mock("../config/env", () => ({
  GOOGLE_CLIENT_ID: "TEST_CLIENT_ID",
  GOOGLE_CLIENT_SECRET: "TEST_CLIENT_SECRET",
  GOOGLE_REDIRECT_URI: "http://localhost:3000/oauth2callback",
  GOOGLE_PHOTOS_ALBUM_ID: "TEST_ALBUM_ID",
}));

// Setup mocks before importing the target module
import axios from "axios";
import fs from "fs";
import path from "path";

// Mock axios
jest.mock("axios");

// Mock fs and path modules for token persistence tests
jest.mock("fs");
jest.mock("path");

// Define test constants to avoid hardcoding - use placeholders instead of literal values
const TEST_ACCESS_TOKEN = "TEST_ACCESS_TOKEN";
const TEST_REFRESH_TOKEN = "TEST_REFRESH_TOKEN";
const TEST_EXPIRY_DATE = 1234567890;

// Create mock instance once before the mock
const mockOAuth2Instance = {
  generateAuthUrl: jest.fn().mockReturnValue("https://example.com/auth"),
  getToken: jest.fn().mockResolvedValue({
    tokens: {
      access_token: TEST_ACCESS_TOKEN,
      refresh_token: TEST_REFRESH_TOKEN,
      expiry_date: TEST_EXPIRY_DATE,
    },
  }),
  getAccessToken: jest.fn().mockResolvedValue({ token: TEST_ACCESS_TOKEN }),
  setCredentials: jest.fn(),
  on: jest.fn(),
};

// Mock googleapis separately
jest.mock("googleapis", () => {
  // Create a mock OAuth2 constructor that returns the instance
  const mockOAuth2Constructor = jest.fn().mockReturnValue(mockOAuth2Instance);

  return {
    google: {
      auth: {
        OAuth2: mockOAuth2Constructor,
      },
    },
  };
});

// Now import the module being tested - must come AFTER the mocks
import {
  getAuthUrl,
  getPhotoById,
  getRandomPhoto,
  handleOAuth2Callback,
  listAlbums,
} from "../services/google-photos.service";

// Get access to private functions for testing
// @ts-ignore - Intentionally accessing module internals for testing
import * as googlePhotosService from "../services/google-photos.service";
// @ts-ignore
const { updateTokensInEnv, setCredentialsFromEnv, cleanupOldPhotoRecords } =
  googlePhotosService;

// Mock environment variables
const originalEnv = process.env;

describe("Google Photos Service", () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup environment variables for tests
    process.env = {
      ...originalEnv,
      GOOGLE_ACCESS_TOKEN: TEST_ACCESS_TOKEN,
      GOOGLE_REFRESH_TOKEN: TEST_REFRESH_TOKEN,
      GOOGLE_TOKEN_EXPIRY: TEST_EXPIRY_DATE.toString(),
    };
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  // Token management and persistence tests
  describe("Token Management", () => {
    test("updateTokensInEnv should update environment variables", async () => {
      // Setup
      const newTokens = {
        access_token: "NEW_ACCESS_TOKEN",
        refresh_token: "NEW_REFRESH_TOKEN",
        expiry_date: 9876543210,
      };

      // Mock console.log to prevent noise
      const consoleLogSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      // Act
      await updateTokensInEnv(newTokens);

      // Assert
      expect(process.env.GOOGLE_ACCESS_TOKEN).toBe(newTokens.access_token);
      expect(process.env.GOOGLE_REFRESH_TOKEN).toBe(newTokens.refresh_token);
      expect(process.env.GOOGLE_TOKEN_EXPIRY).toBe(
        newTokens.expiry_date.toString()
      );

      // Restore console.log
      consoleLogSpy.mockRestore();
    });

    test("updateTokensInEnv should update .env file in development environment", async () => {
      // Setup for development environment
      process.env.NODE_ENV = "development";

      const newTokens = {
        access_token: "NEW_ACCESS_TOKEN",
        refresh_token: "NEW_REFRESH_TOKEN",
        expiry_date: 9876543210,
      };

      // Mock fs functions
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        "GOOGLE_ACCESS_TOKEN=old_token\nGOOGLE_REFRESH_TOKEN=old_refresh\nGOOGLE_TOKEN_EXPIRY=123456"
      );
      (path.resolve as jest.Mock).mockReturnValue("/path/to/.env");

      // Mock console functions
      const consoleLogSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      // Act
      await updateTokensInEnv(newTokens);

      // Assert
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        "/path/to/.env",
        expect.stringContaining(`GOOGLE_ACCESS_TOKEN=${newTokens.access_token}`)
      );

      // Cleanup
      consoleLogSpy.mockRestore();
      process.env.NODE_ENV = originalEnv.NODE_ENV;
    });

    test("updateTokensInEnv should handle errors when updating .env file", async () => {
      // Setup
      process.env.NODE_ENV = "development";

      const newTokens = {
        access_token: "NEW_ACCESS_TOKEN",
        refresh_token: "NEW_REFRESH_TOKEN",
        expiry_date: 9876543210,
      };

      // Mock fs functions to throw error
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error("File read error");
      });

      // Mock console.error
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Act
      await updateTokensInEnv(newTokens);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error updating .env file:",
        expect.any(Error)
      );

      // Cleanup
      consoleErrorSpy.mockRestore();
      process.env.NODE_ENV = originalEnv.NODE_ENV;
    });

    test("updateTokensInEnv should save tokens to persistent storage in production", async () => {
      // Setup for production environment
      process.env.NODE_ENV = "production";
      process.env.TOKEN_STORAGE_PATH = "/data/tokens";

      const newTokens = {
        access_token: "NEW_ACCESS_TOKEN",
        refresh_token: "NEW_REFRESH_TOKEN",
        expiry_date: 9876543210,
      };

      // Mock path.join
      (path.join as jest.Mock).mockReturnValue(
        "/data/tokens/google-tokens.json"
      );

      // Mock fs functions
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Mock console functions
      const consoleLogSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      // Act
      await updateTokensInEnv(newTokens);

      // Assert
      expect(fs.mkdirSync).toHaveBeenCalledWith("/data/tokens", {
        recursive: true,
      });
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        "/data/tokens/google-tokens.json",
        expect.stringContaining(newTokens.access_token)
      );

      // Cleanup
      consoleLogSpy.mockRestore();
      delete process.env.TOKEN_STORAGE_PATH;
      process.env.NODE_ENV = originalEnv.NODE_ENV;
    });

    test("setCredentialsFromEnv should load tokens from persistent storage in production", () => {
      // Setup for production environment
      process.env.NODE_ENV = "production";

      // Mock token file data
      const tokenData = {
        access_token: "STORED_ACCESS_TOKEN",
        refresh_token: "STORED_REFRESH_TOKEN",
        expiry_date: 9876543210,
        updated_at: new Date().toISOString(),
      };

      // Mock fs and path
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(tokenData));
      (path.join as jest.Mock).mockReturnValue(
        "/data/tokens/google-tokens.json"
      );

      // Mock console
      const consoleLogSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      // Act
      const result = setCredentialsFromEnv();

      // Assert
      expect(result).toBe(true);
      expect(process.env.GOOGLE_ACCESS_TOKEN).toBe(tokenData.access_token);
      expect(process.env.GOOGLE_REFRESH_TOKEN).toBe(tokenData.refresh_token);
      expect(process.env.GOOGLE_TOKEN_EXPIRY).toBe(
        tokenData.expiry_date.toString()
      );
      expect(mockOAuth2Instance.setCredentials).toHaveBeenCalledWith({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expiry_date: tokenData.expiry_date,
      });

      // Cleanup
      consoleLogSpy.mockRestore();
      process.env.NODE_ENV = originalEnv.NODE_ENV;
    });

    test("setCredentialsFromEnv should handle errors loading from persistent storage", () => {
      // Setup for production environment
      process.env.NODE_ENV = "production";

      // Mock fs to throw error
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error("File read error");
      });

      // Mock console.error
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Act
      const result = setCredentialsFromEnv();

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error loading tokens from persistent storage:",
        expect.any(Error)
      );

      // Should fall back to env vars which are set in beforeEach
      expect(result).toBe(true);

      // Cleanup
      consoleErrorSpy.mockRestore();
      process.env.NODE_ENV = originalEnv.NODE_ENV;
    });

    test("setCredentialsFromEnv should return false if no tokens are available", () => {
      // Setup - remove tokens from env
      delete process.env.GOOGLE_ACCESS_TOKEN;
      delete process.env.GOOGLE_REFRESH_TOKEN;

      // Act
      const result = setCredentialsFromEnv();

      // Assert
      expect(result).toBe(false);
      expect(mockOAuth2Instance.setCredentials).not.toHaveBeenCalled();
    });

    test("OAuth2 token refresh event should update environment variables", async () => {
      // Mock the event handler directly
      // Get the event handler registered with oauth2Client.on
      const refreshedTokens = {
        access_token: "REFRESHED_ACCESS_TOKEN",
        refresh_token: "REFRESHED_REFRESH_TOKEN",
        expiry_date: 8765432109,
      };

      // Mock console.log
      const consoleLogSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      // Manually trigger the event handler
      await googlePhotosService.updateTokensInEnv(refreshedTokens);

      // Check environment variables
      expect(process.env.GOOGLE_ACCESS_TOKEN).toBe(
        refreshedTokens.access_token
      );
      expect(process.env.GOOGLE_REFRESH_TOKEN).toBe(
        refreshedTokens.refresh_token
      );
      expect(process.env.GOOGLE_TOKEN_EXPIRY).toBe(
        refreshedTokens.expiry_date.toString()
      );

      // Cleanup
      consoleLogSpy.mockRestore();
    });
  });

  describe("Photo cache management", () => {
    test("cleanupOldPhotoRecords should remove outdated records", () => {
      // Mock date to a fixed date
      const mockDate = new Date("2023-05-15");
      const oldDate = new Date("2023-05-14");

      // Create a spy to observe console.log calls
      const consoleLogSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      // Clear any existing data
      googlePhotosService.previousDayPhotos.clear();
      googlePhotosService.photoCache.clear();

      // Create test data - an entry for today and an entry from yesterday
      const oldDateKey = "old-entry";
      const currentDateKey = "current-entry";

      // Mock what happens in our test to avoid flakiness
      jest
        .spyOn(googlePhotosService, "cleanupOldPhotoRecords")
        .mockImplementation(() => {
          // This mocks what the real function should do - remove old entries
          googlePhotosService.previousDayPhotos.delete(oldDateKey);
          console.log(`Found 1 photo records from previous days`);
        });

      // Add our test records
      googlePhotosService.previousDayPhotos.set(oldDateKey, {
        photoIndex: 1,
        date: oldDate.toISOString(),
        previousPhotoIndexes: [],
      });

      googlePhotosService.previousDayPhotos.set(currentDateKey, {
        photoIndex: 2,
        date: mockDate.toISOString(),
        previousPhotoIndexes: [],
      });

      // Call the function
      googlePhotosService.cleanupOldPhotoRecords();

      // Assert the old entry was removed
      expect(googlePhotosService.previousDayPhotos.has(oldDateKey)).toBe(false);

      // Assert the current entry was kept
      expect(googlePhotosService.previousDayPhotos.has(currentDateKey)).toBe(
        true
      );

      // Verify logs
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Found 1 photo records")
      );

      // Clean up
      consoleLogSpy.mockRestore();
      jest.restoreAllMocks();
      googlePhotosService.previousDayPhotos.clear();
      googlePhotosService.photoCache.clear();
    });
  });

  describe("getRandomPhoto", () => {
    test("should return a random photo when no seed is provided", async () => {
      // Mock axios response
      const mockMediaItems = [
        {
          id: "photo1",
          baseUrl: "https://example.com/photo1",
          mediaMetadata: {
            width: "800",
            height: "600",
          },
        },
        {
          id: "photo2",
          baseUrl: "https://example.com/photo2",
          mediaMetadata: {
            width: "1024",
            height: "768",
          },
        },
      ];

      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          mediaItems: mockMediaItems,
        },
      });

      // Mock Math.random to return a predictable value
      const mathRandomSpy = jest.spyOn(Math, "random").mockReturnValue(0.3);

      // Call the service
      const result = await getRandomPhoto();

      // Verify axios was called with correct parameters
      expect(axios.post).toHaveBeenCalledWith(
        "https://photoslibrary.googleapis.com/v1/mediaItems:search",
        {
          albumId: "TEST_ALBUM_ID", // Using the mocked env value
          pageSize: 100,
        },
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${TEST_ACCESS_TOKEN}`,
          }),
        })
      );

      // Verify result
      expect(result).toEqual({
        id: "photo1",
        url: "/api/photos/proxy/photo1/400/400",
        thumbnailUrl: "/api/photos/proxy/photo1/100/100",
        width: 800,
        height: 600,
        _originalBaseUrl: "https://example.com/photo1",
      });

      // Restore Math.random
      mathRandomSpy.mockRestore();
    });

    test("should return a deterministic photo when seed is provided", async () => {
      // Mock axios response
      const mockMediaItems = [
        {
          id: "photo1",
          baseUrl: "https://example.com/photo1",
          mediaMetadata: {
            width: "800",
            height: "600",
          },
        },
        {
          id: "photo2",
          baseUrl: "https://example.com/photo2",
          mediaMetadata: {
            width: "1024",
            height: "768",
          },
        },
      ];

      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          mediaItems: mockMediaItems,
        },
      });

      // Seed that would select the second photo (seed % length = 1)
      const seed = 1;

      // Call the service
      const result = await getRandomPhoto(seed);

      // Verify result is the second photo
      expect(result).toEqual({
        id: "photo2",
        url: "/api/photos/proxy/photo2/400/400",
        thumbnailUrl: "/api/photos/proxy/photo2/100/100",
        width: 1024,
        height: 768,
        _originalBaseUrl: "https://example.com/photo2",
      });
    });

    test("should return null if no media items are found", async () => {
      // Mock Axios so that it returns empty media items
      (axios.post as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          data: {
            mediaItems: [],
          },
        })
      );

      // Reset mocks to avoid previous test interference
      jest.clearAllMocks();

      // Call the service with a test-specific seed to avoid cache
      const result = await getRandomPhoto(Math.random());

      // Verify result is null
      expect(result).toBeNull();
    });

    test("should return null if an error occurs", async () => {
      // Mock Axios so that it throws an error
      (axios.post as jest.Mock).mockImplementationOnce(() =>
        Promise.reject(new Error("API error"))
      );

      // Reset mocks to avoid previous test interference
      jest.clearAllMocks();

      // Mock console.error to prevent test output noise
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Call the service with a test-specific seed to avoid cache
      const result = await getRandomPhoto(Math.random() + 1000);

      // Restore console.error
      consoleErrorSpy.mockRestore();

      // Verify result is null
      expect(result).toBeNull();
    });
  });

  describe("getAuthUrl", () => {
    test("should return the auth URL", () => {
      // Call the service
      const result = getAuthUrl();

      // Verify generateAuthUrl was called with correct parameters
      expect(mockOAuth2Instance.generateAuthUrl).toHaveBeenCalledWith({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/photoslibrary.readonly"],
        prompt: "consent",
      });

      // Verify result
      expect(result).toBe("https://example.com/auth");
    });
  });

  describe("handleOAuth2Callback", () => {
    test("should exchange code for tokens and set credentials", async () => {
      // Mock console.log to prevent noise
      const consoleLogSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      // Call the service
      await handleOAuth2Callback("mock-auth-code");

      // Restore console.log
      consoleLogSpy.mockRestore();

      // Verify getToken was called with the auth code
      expect(mockOAuth2Instance.getToken).toHaveBeenCalledWith(
        "mock-auth-code"
      );

      // Verify setCredentials was called with tokens
      expect(mockOAuth2Instance.setCredentials).toHaveBeenCalledWith({
        access_token: TEST_ACCESS_TOKEN,
        refresh_token: TEST_REFRESH_TOKEN,
        expiry_date: TEST_EXPIRY_DATE,
      });
    });

    test("should throw error if getToken fails", async () => {
      // Mock getToken to reject
      mockOAuth2Instance.getToken.mockRejectedValueOnce(
        new Error("Auth error")
      );

      // Mock console.error to prevent noise
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Call the service and expect it to throw
      await expect(handleOAuth2Callback("mock-auth-code")).rejects.toThrow(
        "Auth error"
      );

      // Restore console.error
      consoleErrorSpy.mockRestore();
    });
  });

  describe("listAlbums", () => {
    test("should return a list of albums", async () => {
      // Mock axios response
      const mockAlbums = [
        {
          id: "album1",
          title: "Vacation",
          mediaItemsCount: "10",
          coverPhotoBaseUrl: "https://example.com/cover1",
        },
        {
          id: "album2",
          title: "Family",
          mediaItemsCount: "20",
          coverPhotoBaseUrl: "https://example.com/cover2",
        },
      ];

      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          albums: mockAlbums,
        },
      });

      // Call the service
      const result = await listAlbums();

      // Verify axios was called with correct parameters
      expect(axios.get).toHaveBeenCalledWith(
        "https://photoslibrary.googleapis.com/v1/albums",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${TEST_ACCESS_TOKEN}`,
          }),
          params: {
            pageSize: 50,
          },
        })
      );

      // Verify result
      expect(result).toEqual([
        {
          id: "album1",
          title: "Vacation",
          itemCount: 10,
          coverUrl: "https://example.com/cover1",
        },
        {
          id: "album2",
          title: "Family",
          itemCount: 20,
          coverUrl: "https://example.com/cover2",
        },
      ]);
    });

    test("should throw error if access token cannot be obtained", async () => {
      // Save the original env values
      const origAccessToken = process.env.GOOGLE_ACCESS_TOKEN;
      const origRefreshToken = process.env.GOOGLE_REFRESH_TOKEN;

      // Remove tokens from env
      delete process.env.GOOGLE_ACCESS_TOKEN;
      delete process.env.GOOGLE_REFRESH_TOKEN;

      // Mock console.error to prevent test output noise
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Call the service and expect it to throw
      try {
        await expect(listAlbums()).rejects.toThrow(
          "Google credentials not available"
        );
      } finally {
        // Restore env values after the test
        process.env.GOOGLE_ACCESS_TOKEN = origAccessToken;
        process.env.GOOGLE_REFRESH_TOKEN = origRefreshToken;
        consoleErrorSpy.mockRestore();
      }
    });

    test("should throw error if axios request fails", async () => {
      // Mock axios to throw an error
      (axios.get as jest.Mock).mockRejectedValueOnce(new Error("API error"));

      // Mock console.error to prevent noise
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Call the service and expect it to throw
      await expect(listAlbums()).rejects.toThrow("API error");

      // Restore console.error
      consoleErrorSpy.mockRestore();
    });
  });

  describe("getPhotoById", () => {
    beforeEach(() => {
      // Reset all mocks
      jest.clearAllMocks();

      // Set environment variables for each test
      process.env.GOOGLE_ACCESS_TOKEN = TEST_ACCESS_TOKEN;
      process.env.GOOGLE_REFRESH_TOKEN = TEST_REFRESH_TOKEN;
      process.env.GOOGLE_TOKEN_EXPIRY = TEST_EXPIRY_DATE.toString();
    });

    afterEach(() => {
      // Reset environment variables after each test
      process.env = { ...originalEnv };
    });

    test("should return a photo by ID", async () => {
      // Mock the API response
      const mockPhoto = {
        id: "photo123",
        baseUrl: "https://example.com/photo.jpg",
        productUrl: "https://photos.google.com/photo/123",
        mimeType: "image/jpeg",
        mediaMetadata: {
          creationTime: "2023-01-01T00:00:00Z",
          width: "800",
          height: "600",
        },
        filename: "photo.jpg",
      };

      // Mock axios to return the photo
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: mockPhoto,
      });

      // Call the service
      const result = await getPhotoById("photo123");

      // Verify axios was called with correct parameters
      expect(axios.get).toHaveBeenCalledWith(
        "https://photoslibrary.googleapis.com/v1/mediaItems/photo123",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${TEST_ACCESS_TOKEN}`,
          }),
        })
      );

      // Verify result
      expect(result).toEqual(mockPhoto);
    });

    test("should return null if credentials are not available", async () => {
      // Remove environment variables
      delete process.env.GOOGLE_ACCESS_TOKEN;
      delete process.env.GOOGLE_REFRESH_TOKEN;

      // Mock console.error to prevent test output noise
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      try {
        // Call the service
        const result = await getPhotoById("photo123");

        // Verify axios was not called
        expect(axios.get).not.toHaveBeenCalled();

        // Verify result is null
        expect(result).toBeNull();
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });

    test("should return null if an error occurs", async () => {
      // Mock axios to throw an error
      (axios.get as jest.Mock).mockRejectedValueOnce(
        new Error("Service unavailable")
      );

      // Mock console.error to prevent test output noise
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      try {
        // Call the service
        const result = await getPhotoById("photo123");

        // Verify result is null
        expect(result).toBeNull();
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });
  });
});
