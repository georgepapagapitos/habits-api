// Mock the environment configuration first
jest.mock("../config/env", () => ({
  GOOGLE_CLIENT_ID: "TEST_CLIENT_ID",
  GOOGLE_CLIENT_SECRET: "TEST_CLIENT_SECRET",
  GOOGLE_REDIRECT_URI: "http://localhost:3000/oauth2callback",
  GOOGLE_PHOTOS_ALBUM_ID: "TEST_ALBUM_ID",
}));

// Setup mocks before importing the target module
import axios from "axios";

// Mock axios
jest.mock("axios");

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
  getRandomPhoto,
  getAuthUrl,
  handleOAuth2Callback,
  listAlbums,
  getPhotoById,
} from "../services/google-photos.service";

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
