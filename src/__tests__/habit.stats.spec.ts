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

describe("Habit Stats Controller", () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockHabits: Array<{
    _id: string;
    name: string;
    frequency: string[];
    completedDates: Date[];
    streak: number;
    userId: string;
    startDate: Date;
  }>;

  beforeEach(() => {
    // Reset mocks for each test
    jest.clearAllMocks();

    // Setup mock request with authenticated user
    mockRequest = {
      user: { id: "user123", username: "testuser", email: "test@example.com" },
    };

    // Setup mock response
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Create sample mock habits
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    mockHabits = [
      {
        _id: "habit1",
        name: "Running",
        frequency: ["monday", "wednesday", "friday"],
        completedDates: [new Date(), new Date(), new Date()],
        streak: 3,
        userId: "user123",
        startDate: twoMonthsAgo,
      },
      {
        _id: "habit2",
        name: "Meditation",
        frequency: ["everyday"],
        completedDates: [
          new Date(),
          new Date(),
          new Date(),
          new Date(),
          new Date(),
        ],
        streak: 5,
        userId: "user123",
        startDate: twoMonthsAgo,
      },
    ];
  });

  test("should return 401 if user is not authenticated", async () => {
    // Remove user from request
    mockRequest.user = undefined;

    // Call controller
    await habitController.getStats(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response
    );

    // Expectations
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Not authorized",
      })
    );
  });

  test("should return default stats if user has no habits", async () => {
    // Mock Habit.find to return empty array
    (Habit.find as jest.Mock).mockResolvedValue([]);

    // Call controller
    await habitController.getStats(
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
      data: {
        totalHabits: 0,
        longestStreak: { habit: null, streak: 0 },
        mostConsistent: { habit: null, percentage: 0 },
        mostCompletedHabit: { habit: null, count: 0 },
        totalCompletions: 0,
        averageStreak: 0,
      },
    });
  });

  test("should calculate and return stats for user habits", async () => {
    // Mock Habit.find to return mock habits
    (Habit.find as jest.Mock).mockResolvedValue(mockHabits);

    // Call controller
    await habitController.getStats(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response
    );

    // Expectations
    expect(Habit.find).toHaveBeenCalledWith({
      active: true,
      userId: "user123",
    });
    expect(mockResponse.status).toHaveBeenCalledWith(200);

    // Verify response contains stats
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        totalHabits: 2,
        longestStreak: expect.objectContaining({
          habit: expect.objectContaining({
            name: "Meditation",
          }),
          streak: 5,
        }),
        totalCompletions: 8, // 3 + 5
        averageStreak: 4, // (3 + 5) / 2
      }),
    });
  });

  test("should handle errors during stats calculation", async () => {
    // Mock Habit.find to throw error
    (Habit.find as jest.Mock).mockRejectedValue(new Error("Database error"));

    // Call controller
    await habitController.getStats(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response
    );

    // Expectations
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error getting habit statistics",
      })
    );
  });
});
