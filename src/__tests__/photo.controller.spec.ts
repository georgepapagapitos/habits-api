import { Request, Response } from "express";
import { photoController } from "../controllers/photo.controller";
import * as googlePhotosService from "../services/google-photos.service";
import axios from "axios";

// Mock the Google Photos service
jest.mock("../services/google-photos.service", () => ({
  getRandomPhoto: jest.fn(),
  getAuthUrl: jest.fn(),
  handleOAuth2Callback: jest.fn(),
  listAlbums: jest.fn(),
  getPhotoById: jest.fn(),
}));

// Mock axios
jest.mock("axios");

describe("Photo Controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    mockRequest = {
      query: {},
      body: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  });

  describe("getRandomPhoto", () => {
    test("should return a random photo with no seed", async () => {
      // Mock photo service to return a photo
      const mockPhoto = {
        id: "photo123",
        url: "https://example.com/photo.jpg",
        thumbnailUrl: "https://example.com/thumb.jpg",
        width: 800,
        height: 600,
      };
      (googlePhotosService.getRandomPhoto as jest.Mock).mockResolvedValue(
        mockPhoto
      );

      // Call the controller
      await photoController.getRandomPhoto(
        mockRequest as Request,
        mockResponse as Response
      );

      // Verify service was called
      expect(googlePhotosService.getRandomPhoto).toHaveBeenCalledWith(
        undefined
      );

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockPhoto);
    });

    test("should use a seed parameter when provided", async () => {
      // Set seed in query params
      mockRequest.query = { seed: "12345" };

      // Mock photo service to return a photo
      const mockPhoto = {
        id: "photo123",
        url: "https://example.com/photo.jpg",
        thumbnailUrl: "https://example.com/thumb.jpg",
        width: 800,
        height: 600,
      };
      (googlePhotosService.getRandomPhoto as jest.Mock).mockResolvedValue(
        mockPhoto
      );

      // Call the controller
      await photoController.getRandomPhoto(
        mockRequest as Request,
        mockResponse as Response
      );

      // Verify service was called with seed
      expect(googlePhotosService.getRandomPhoto).toHaveBeenCalledWith(12345);

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockPhoto);
    });

    test("should return 404 if no photos found", async () => {
      // Mock photo service to return null (no photos)
      (googlePhotosService.getRandomPhoto as jest.Mock).mockResolvedValue(null);

      // Call the controller
      await photoController.getRandomPhoto(
        mockRequest as Request,
        mockResponse as Response
      );

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "No photos found in the album",
      });
    });

    test("should handle errors", async () => {
      // Mock photo service to throw error
      (googlePhotosService.getRandomPhoto as jest.Mock).mockRejectedValue(
        new Error("Service error")
      );

      // Call the controller
      await photoController.getRandomPhoto(
        mockRequest as Request,
        mockResponse as Response
      );

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Error fetching random photo",
        error: "Service error",
      });
    });
  });

  describe("listAlbums", () => {
    test("should return a list of albums", async () => {
      // Mock albums service to return albums
      const mockAlbums = [
        {
          id: "album1",
          title: "Vacation",
          itemCount: 10,
          coverUrl: "https://example.com/cover1.jpg",
        },
        {
          id: "album2",
          title: "Family",
          itemCount: 20,
          coverUrl: "https://example.com/cover2.jpg",
        },
      ];
      (googlePhotosService.listAlbums as jest.Mock).mockResolvedValue(
        mockAlbums
      );

      // Call the controller
      await photoController.listAlbums(
        mockRequest as Request,
        mockResponse as Response
      );

      // Verify service was called
      expect(googlePhotosService.listAlbums).toHaveBeenCalled();

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        count: 2,
        data: mockAlbums,
      });
    });

    test("should handle errors", async () => {
      // Mock albums service to throw error
      (googlePhotosService.listAlbums as jest.Mock).mockRejectedValue(
        new Error("Service error")
      );

      // Call the controller
      await photoController.listAlbums(
        mockRequest as Request,
        mockResponse as Response
      );

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Error listing albums",
        error: "Service error",
      });
    });
  });

  describe("getAuthUrl", () => {
    test("should return auth URL", () => {
      // Mock auth URL generation
      const mockAuthUrl = "https://example.com/auth";
      (googlePhotosService.getAuthUrl as jest.Mock).mockReturnValue(
        mockAuthUrl
      );

      // Call the controller
      photoController.getAuthUrl(
        mockRequest as Request,
        mockResponse as Response
      );

      // Verify service was called
      expect(googlePhotosService.getAuthUrl).toHaveBeenCalled();

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ url: mockAuthUrl });
    });

    test("should handle errors", () => {
      // Mock getAuthUrl to throw error
      (googlePhotosService.getAuthUrl as jest.Mock).mockImplementation(() => {
        throw new Error("Service error");
      });

      // Call the controller
      photoController.getAuthUrl(
        mockRequest as Request,
        mockResponse as Response
      );

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Error generating auth URL",
        error: "Service error",
      });
    });
  });

  describe("handleOAuthCallback", () => {
    test("should handle OAuth callback successfully", async () => {
      // Setup mock request with code
      mockRequest.query = { code: "auth-code-123" };

      // Mock OAuth callback handler
      (googlePhotosService.handleOAuth2Callback as jest.Mock).mockResolvedValue(
        undefined
      );

      // Call the controller
      await photoController.handleOAuthCallback(
        mockRequest as Request,
        mockResponse as Response
      );

      // Verify service was called with the code
      expect(googlePhotosService.handleOAuth2Callback).toHaveBeenCalledWith(
        "auth-code-123"
      );

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message:
          "Authorization successful. Check server logs for tokens to add to environment variables.",
      });
    });

    test("should return 400 if code is missing", async () => {
      // Setup mock request without code
      mockRequest.query = {};

      // Call the controller
      await photoController.handleOAuthCallback(
        mockRequest as Request,
        mockResponse as Response
      );

      // Verify service was not called
      expect(googlePhotosService.handleOAuth2Callback).not.toHaveBeenCalled();

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Authorization code is required",
      });
    });

    test("should handle errors", async () => {
      // Setup mock request with code
      mockRequest.query = { code: "auth-code-123" };

      // Mock OAuth callback handler to throw error
      (googlePhotosService.handleOAuth2Callback as jest.Mock).mockRejectedValue(
        new Error("Service error")
      );

      // Call the controller
      await photoController.handleOAuthCallback(
        mockRequest as Request,
        mockResponse as Response
      );

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Error handling OAuth callback",
        error: "Service error",
      });
    });
  });

  describe("proxyPhoto", () => {
    test("should successfully proxy a photo from Google Photos", async () => {
      // Setup mock request with params
      mockRequest.params = {
        photoId: "photo123",
        width: "400",
        height: "400",
      };

      // Mock process.env
      process.env.APP_URL = "http://localhost:5050";
      process.env.GOOGLE_ACCESS_TOKEN = "test-token";
      process.env.GOOGLE_REFRESH_TOKEN = "test-refresh-token";

      // Mock the Google Photos service to return a photo object
      const mockPhoto = {
        id: "photo123",
        baseUrl: "https://example.com/photo123",
        mediaMetadata: {
          width: "800",
          height: "600",
        },
      };
      (googlePhotosService.getPhotoById as jest.Mock).mockResolvedValue(
        mockPhoto
      );

      // Mock axios to return an image response
      const mockImageResponse = {
        headers: {
          "content-type": "image/jpeg",
        },
        data: Buffer.from("fake-image-data"),
      };
      (axios.get as jest.Mock).mockResolvedValue(mockImageResponse);

      // Call the controller
      await photoController.proxyPhoto(
        mockRequest as Request,
        mockResponse as Response
      );

      // Verify Google Photos service was called with the photo ID
      expect(googlePhotosService.getPhotoById).toHaveBeenCalledWith("photo123");

      // Verify response headers and body
      expect(mockResponse.set).toHaveBeenCalledWith(
        "Content-Type",
        "image/jpeg"
      );
      expect(mockResponse.set).toHaveBeenCalledWith(
        "Cache-Control",
        "public, max-age=86400"
      );
      expect(mockResponse.set).toHaveBeenCalledWith(
        "Access-Control-Allow-Origin",
        "*"
      );
      expect(mockResponse.send).toHaveBeenCalledWith(
        Buffer.from("fake-image-data")
      );
    });

    test("should return 404 if photo not found", async () => {
      // Setup mock request with params
      mockRequest.params = {
        photoId: "nonexistent",
        width: "400",
        height: "400",
      };

      // Mock the Google Photos service to return null (photo not found)
      (googlePhotosService.getPhotoById as jest.Mock).mockResolvedValue(null);

      // Call the controller
      await photoController.proxyPhoto(
        mockRequest as Request,
        mockResponse as Response
      );

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Photo not found",
      });
    });

    test("should handle axios error with response", async () => {
      // Setup mock request with params
      mockRequest.params = {
        photoId: "photo123",
        width: "400",
        height: "400",
      };

      // Mock process.env
      process.env.GOOGLE_ACCESS_TOKEN = "test-token";
      process.env.GOOGLE_REFRESH_TOKEN = "test-refresh-token";

      // Mock the Google Photos service to return a photo object
      const mockPhoto = {
        id: "photo123",
        baseUrl: "https://example.com/photo123",
        mediaMetadata: {
          width: "800",
          height: "600",
        },
      };
      (googlePhotosService.getPhotoById as jest.Mock).mockResolvedValue(
        mockPhoto
      );

      // Mock axios to throw an error with response
      const axiosError = {
        message: "Request failed",
        response: {
          status: 403,
        },
      };
      (axios.get as jest.Mock).mockRejectedValue(axiosError);

      // Call the controller
      await photoController.proxyPhoto(
        mockRequest as Request,
        mockResponse as Response
      );

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.any(String),
        })
      );
    });

    test("should handle axios error with request but no response", async () => {
      // Setup mock request with params
      mockRequest.params = {
        photoId: "photo123",
        width: "400",
        height: "400",
      };

      // Mock process.env
      process.env.GOOGLE_ACCESS_TOKEN = "test-token";
      process.env.GOOGLE_REFRESH_TOKEN = "test-refresh-token";

      // Mock the Google Photos service to return a photo object
      const mockPhoto = {
        id: "photo123",
        baseUrl: "https://example.com/photo123",
        mediaMetadata: {
          width: "800",
          height: "600",
        },
      };
      (googlePhotosService.getPhotoById as jest.Mock).mockResolvedValue(
        mockPhoto
      );

      // Mock axios to throw an error with request but no response
      const axiosError = {
        message: "Request timeout",
        request: {},
      };
      (axios.get as jest.Mock).mockRejectedValue(axiosError);

      // Call the controller
      await photoController.proxyPhoto(
        mockRequest as Request,
        mockResponse as Response
      );

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(504);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.any(String),
        })
      );
    });

    test("should handle generic axios error", async () => {
      // Setup mock request with params
      mockRequest.params = {
        photoId: "photo123",
        width: "400",
        height: "400",
      };

      // Mock process.env
      process.env.GOOGLE_ACCESS_TOKEN = "test-token";
      process.env.GOOGLE_REFRESH_TOKEN = "test-refresh-token";

      // Mock the Google Photos service to return a photo object
      const mockPhoto = {
        id: "photo123",
        baseUrl: "https://example.com/photo123",
        mediaMetadata: {
          width: "800",
          height: "600",
        },
      };
      (googlePhotosService.getPhotoById as jest.Mock).mockResolvedValue(
        mockPhoto
      );

      // Mock axios to throw a generic error
      const axiosError = new Error("Network error");
      (axios.get as jest.Mock).mockRejectedValue(axiosError);

      // Call the controller
      await photoController.proxyPhoto(
        mockRequest as Request,
        mockResponse as Response
      );

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(502);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.any(String),
        })
      );
    });

    test("should handle error in getPhotoById", async () => {
      // Setup mock request with params
      mockRequest.params = {
        photoId: "photo123",
        width: "400",
        height: "400",
      };

      // Mock the Google Photos service to throw an error
      (googlePhotosService.getPhotoById as jest.Mock).mockRejectedValue(
        new Error("Service error")
      );

      // Call the controller
      await photoController.proxyPhoto(
        mockRequest as Request,
        mockResponse as Response
      );

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Internal server error",
        error: "Service error",
      });
    });

    test("should use default width and height if not provided", async () => {
      // Setup mock request with only photoId
      mockRequest.params = {
        photoId: "photo123",
      };

      // Mock process.env
      process.env.GOOGLE_ACCESS_TOKEN = "test-token";
      process.env.GOOGLE_REFRESH_TOKEN = "test-refresh-token";

      // Mock the Google Photos service to return a photo object
      const mockPhoto = {
        id: "photo123",
        baseUrl: "https://example.com/photo123",
        mediaMetadata: {
          width: "800",
          height: "600",
        },
      };
      (googlePhotosService.getPhotoById as jest.Mock).mockResolvedValue(
        mockPhoto
      );

      // Mock axios to return an image response
      const mockImageResponse = {
        headers: {
          "content-type": "image/jpeg",
        },
        data: Buffer.from("fake-image-data"),
      };
      (axios.get as jest.Mock).mockResolvedValue(mockImageResponse);

      // Call the controller
      await photoController.proxyPhoto(
        mockRequest as Request,
        mockResponse as Response
      );

      // Verify response was returned properly
      expect(mockResponse.set).toHaveBeenCalledWith(
        "Content-Type",
        "image/jpeg"
      );
      expect(mockResponse.send).toHaveBeenCalledWith(
        Buffer.from("fake-image-data")
      );
    });
  });
});
