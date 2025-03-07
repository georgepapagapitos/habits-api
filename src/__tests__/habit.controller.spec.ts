import { Response } from "express";
import { habitController } from "../controllers/habit.controller";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { Habit } from "../models/habit.model";

// Mock the Habit model
jest.mock("../models/habit.model", () => {
  return {
    Habit: {
      find: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    },
  };
});

describe("Habit Controller", () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockHabit: {
    _id: string;
    name: string;
    frequency: string[];
    completedDates: Date[];
    streak: number;
    userId: string;
    save: jest.Mock;
    userTimezone: string;
    isCompletedForDate: jest.Mock;
  };

  beforeEach(() => {
    // Reset mocks for each test
    jest.clearAllMocks();

    mockRequest = {
      params: { id: "habit123" },
      body: {},
      user: { id: "user123", username: "testuser", email: "test@example.com" },
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockHabit = {
      _id: "habit123",
      name: "Test Habit",
      frequency: ["monday", "wednesday", "friday"],
      completedDates: [],
      streak: 0,
      userId: "user123",
      save: jest.fn().mockResolvedValue({
        _id: "habit123",
        name: "Test Habit",
        frequency: ["monday", "wednesday", "friday"],
        completedDates: [new Date()],
        streak: 1,
        userId: "user123",
      }),
      userTimezone: "America/Chicago",
      isCompletedForDate: jest.fn(),
    };
  });

  describe("getAllHabits", () => {
    test("should return 401 if user is not authenticated", async () => {
      // Remove user from request
      mockRequest.user = undefined;

      // Call controller
      await habitController.getAllHabits(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      // Expectations
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Not authorized",
        error: "Server Error",
      });
      expect(Habit.find).not.toHaveBeenCalled();
    });

    test("should return habits for authenticated user", async () => {
      // Mock Habit.find to return array of habits
      (Habit.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockResolvedValue([mockHabit]),
      });

      // Call controller
      await habitController.getAllHabits(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      // Expectations
      expect(Habit.find).toHaveBeenCalledWith({
        active: true,
        userId: "user123",
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        count: 1,
        data: [mockHabit],
      });
    });

    test("should handle server errors", async () => {
      // Mock Habit.find to throw error
      (Habit.find as jest.Mock).mockImplementation(() => {
        throw new Error("Database error");
      });

      // Call controller
      await habitController.getAllHabits(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      // Expectations
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Error fetching habits",
        error: expect.any(Error),
      });
    });
  });

  describe("toggleCompletion", () => {
    beforeEach(() => {
      // Set up request body for toggle
      mockRequest.body = {
        date: new Date().toISOString(),
        timezone: "America/Chicago",
      };

      // Mock Habit.findById to return a mock habit
      (Habit.findById as jest.Mock).mockResolvedValue(mockHabit);
    });

    test("should return 401 if user is not authenticated", async () => {
      // Remove user from request
      mockRequest.user = undefined;

      // Call controller
      await habitController.toggleCompletion(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      // Expectations
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Not authorized",
        error: "Server Error",
      });
    });

    test("should return 400 if date is not provided", async () => {
      // Remove date from request
      mockRequest.body = { timezone: "America/Chicago" };

      // Call controller
      await habitController.toggleCompletion(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      // Expectations
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Date is required",
        error: "Server Error",
      });
    });

    test("should return 404 if habit is not found", async () => {
      // Mock Habit.findById to return null
      (Habit.findById as jest.Mock).mockResolvedValue(null);

      // Call controller
      await habitController.toggleCompletion(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      // Expectations
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Habit with ID habit123 not found",
        error: "Server Error",
      });
    });

    test("should return 403 if habit does not belong to user", async () => {
      // Change habit userId
      mockHabit.userId = "different-user";

      // Call controller
      await habitController.toggleCompletion(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      // Expectations
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "User not authorized to update this habit",
        error: "Server Error",
      });
    });

    test("should add date to completedDates if not already completed", async () => {
      // Mock habit.isCompletedForDate to return false (not completed)
      mockHabit.isCompletedForDate.mockReturnValue(false);
      mockHabit.completedDates = [];

      // Call controller
      await habitController.toggleCompletion(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      // Expectations
      expect(mockHabit.isCompletedForDate).toHaveBeenCalled();
      expect(mockHabit.completedDates.length).toBe(1); // Date should be added
      expect(mockHabit.save).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    test("should remove date from completedDates if already completed", async () => {
      // Mock habit.isCompletedForDate to return true (already completed)
      const today = new Date();
      mockHabit.isCompletedForDate.mockReturnValue(true);

      // The test passes locally but fails in CI because the date filtering logic
      // in the controller tries to filter based on isSameDay, and depending on
      // the timezone where the test runs, this filtering may behave differently.
      // To make the test more predictable, we'll create two dates that are clearly different days.
      const yesterdayDate = new Date(today);
      yesterdayDate.setDate(today.getDate() - 1);

      mockHabit.completedDates = [today, yesterdayDate];

      // Set mockRequest body date to match today
      mockRequest.body = {
        date: today.toISOString(),
        timezone: "America/Chicago",
      };

      // Call controller
      await habitController.toggleCompletion(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      // Expectations
      expect(mockHabit.isCompletedForDate).toHaveBeenCalled();
      expect(mockHabit.completedDates.length).toBe(1); // One date should be removed
      expect(mockHabit.save).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    test("should handle errors during save", async () => {
      // Mock habit.save to throw error
      mockHabit.save.mockRejectedValue(new Error("Save error"));

      // Call controller
      await habitController.toggleCompletion(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      // Expectations
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Error saving habit",
        error: expect.any(Error),
      });
    });
  });
});
