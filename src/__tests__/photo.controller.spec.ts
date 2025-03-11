import { Request, Response } from "express";
import { photoController } from "../controllers/photo.controller";
import * as googlePhotosService from "../services/google-photos.service";

// Mock the Google Photos service
jest.mock("../services/google-photos.service", () => ({
  getRandomPhoto: jest.fn(),
  getAuthUrl: jest.fn(),
  handleOAuth2Callback: jest.fn(),
  listAlbums: jest.fn(),
}));

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
      expect(mockResponse.json).toHaveBeenCalledWith({ authUrl: mockAuthUrl });
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
});
