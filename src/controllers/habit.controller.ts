import { isSameDay, parseISO, startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { Habit } from "../models/habit.model";
import { HabitBase } from "../types/habit.types";
import { sendErrorResponse } from "../utils/error.utils";

// Define a type for validation errors
interface ValidationError {
  name: string;
  errors: Record<string, { message: string }>;
}

// Type guard function to check if an error is a ValidationError
function isValidationError(error: unknown): error is ValidationError {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as ValidationError).name === "ValidationError" &&
    "errors" in error &&
    typeof (error as ValidationError).errors === "object"
  );
}

export const habitController = {
  // Get statistics for user's habits
  getStats: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        sendErrorResponse(res, 401, "Not authorized");
        return;
      }

      // Get all active habits for the user
      const habits = await Habit.find({
        active: true,
        userId: req.user.id,
      });

      if (!habits || habits.length === 0) {
        res.status(200).json({
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
        return;
      }

      // Define types for our stats
      type HabitSummary = { name: string; id: string };

      // Find the habit with the longest streak
      const longestStreak = habits.reduce<{
        habit: HabitSummary | null;
        streak: number;
      }>(
        (max, habit) => {
          return habit.streak > max.streak
            ? {
                habit: {
                  name: habit.name,
                  id: String(habit._id),
                },
                streak: habit.streak,
              }
            : max;
        },
        { habit: null, streak: 0 }
      );

      // Calculate consistency percentage (completions / expected)
      const habitsWithConsistency = habits.map((habit) => {
        const startDate = new Date(habit.startDate);
        const now = new Date();
        const daysSinceStart = Math.ceil(
          (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Calculate expected completions based on frequency and days since start
        const frequencyPerWeek = habit.frequency.length;
        const expectedCompletions = Math.max(
          1,
          Math.ceil((daysSinceStart * frequencyPerWeek) / 7)
        );

        // Get actual completions
        const actualCompletions = habit.completedDates.length;

        // Calculate consistency percentage
        const consistencyPercentage = Math.min(
          100,
          Math.round((actualCompletions / expectedCompletions) * 100)
        );

        return {
          habit: {
            name: habit.name,
            id: String(habit._id),
          },
          consistencyPercentage,
          actualCompletions,
        };
      });

      // Find the most consistent habit
      const mostConsistent = habitsWithConsistency.reduce<{
        habit: HabitSummary | null;
        percentage: number;
      }>(
        (max, current) => {
          return current.consistencyPercentage > max.percentage
            ? {
                habit: current.habit,
                percentage: current.consistencyPercentage,
              }
            : max;
        },
        { habit: null, percentage: 0 }
      );

      // Find the most completed habit
      const mostCompletedHabit = habitsWithConsistency.reduce<{
        habit: HabitSummary | null;
        count: number;
      }>(
        (max, current) => {
          return current.actualCompletions > max.count
            ? { habit: current.habit, count: current.actualCompletions }
            : max;
        },
        { habit: null, count: 0 }
      );

      // Calculate total completions across all habits
      const totalCompletions = habitsWithConsistency.reduce(
        (sum, current) => sum + current.actualCompletions,
        0
      );

      // Calculate average streak
      const averageStreak = Math.round(
        habits.reduce((sum, habit) => sum + habit.streak, 0) / habits.length
      );

      res.status(200).json({
        success: true,
        data: {
          totalHabits: habits.length,
          longestStreak,
          mostConsistent,
          mostCompletedHabit,
          totalCompletions,
          averageStreak,
        },
      });
    } catch (error) {
      console.error("Error getting habit stats:", error);
      sendErrorResponse(res, 500, "Error getting habit statistics", error);
    }
  },

  // Reset a habit by clearing completed dates and streak
  resetHabit: async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        sendErrorResponse(res, 401, "Not authorized");
        return;
      }

      const habit = await Habit.findById(req.params.id);

      if (!habit) {
        sendErrorResponse(res, 404, `Habit with ID ${req.params.id} not found`);
        return;
      }

      // Check if the habit belongs to the authenticated user
      if (habit.userId !== req.user.id) {
        sendErrorResponse(res, 403, "User not authorized to reset this habit");
        return;
      }

      // Reset the habit by clearing completed dates and streak
      habit.completedDates = [];
      habit.streak = 0;

      // Save the updated habit
      await habit.save();

      res.status(200).json({
        success: true,
        data: habit,
      });
    } catch (error) {
      console.error("Error resetting habit:", error);
      sendErrorResponse(res, 500, "Server Error", error);
    }
  },

  // Get all habits for the authenticated user
  getAllHabits: async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        sendErrorResponse(res, 401, "Not authorized");
        return;
      }

      const habits = await Habit.find({
        active: true,
        userId: req.user.id,
      }).sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        count: habits.length,
        data: habits,
      });
    } catch (error) {
      sendErrorResponse(res, 500, "Error fetching habits", error);
    }
  },

  // Get habit by ID
  getHabitById: async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        sendErrorResponse(res, 401, "Not authorized");
        return;
      }

      const habit = await Habit.findById(req.params.id);

      if (!habit) {
        sendErrorResponse(res, 404, `Habit with ID ${req.params.id} not found`);
        return;
      }

      // Check if the habit belongs to the authenticated user
      if (habit.userId !== req.user.id) {
        sendErrorResponse(res, 403, "Not authorized to access this habit");
        return;
      }

      res.status(200).json({
        success: true,
        data: habit,
      });
    } catch (error) {
      sendErrorResponse(res, 500, "Error fetching habit", error);
    }
  },

  // Create new habit
  createHabit: async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        sendErrorResponse(res, 401, "Not authorized");
        return;
      }

      const habitData: HabitBase = req.body;

      // Set the userId to the authenticated user's ID
      habitData.userId = req.user.id;

      const habit = await Habit.create(habitData);

      res.status(201).json({
        success: true,
        data: habit,
      });
    } catch (error) {
      if (isValidationError(error)) {
        const messages = Object.values(error.errors).map((err) => err.message);
        sendErrorResponse(res, 400, "Validation failed", messages);
        return;
      }

      sendErrorResponse(res, 500, "Error creating habit", error);
    }
  },

  // Update habit
  updateHabit: async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        sendErrorResponse(res, 401, "Not authorized");
        return;
      }

      const habitData: Partial<HabitBase> = req.body;

      // Find the habit first to ensure it exists
      const existingHabit = await Habit.findById(req.params.id);

      if (!existingHabit) {
        sendErrorResponse(res, 404, `Habit with ID ${req.params.id} not found`);
        return;
      }

      // Check if the habit belongs to the authenticated user
      if (existingHabit.userId !== req.user.id) {
        sendErrorResponse(res, 403, "User not authorized to update this habit");
        return;
      }

      const habit = await Habit.findByIdAndUpdate(req.params.id, habitData, {
        new: true,
        runValidators: true,
      });

      res.status(200).json({
        success: true,
        data: habit,
      });
    } catch (error) {
      if (isValidationError(error)) {
        const messages = Object.values(error.errors).map((err) => err.message);
        sendErrorResponse(res, 400, "Validation failed", messages);
        return;
      }

      sendErrorResponse(res, 500, "Error updating habit", error);
    }
  },

  // Delete habit (soft delete by setting active to false)
  deleteHabit: async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        sendErrorResponse(res, 401, "Not authorized");
        return;
      }

      const habit = await Habit.findById(req.params.id);

      if (!habit) {
        sendErrorResponse(res, 404, `Habit with ID ${req.params.id} not found`);
        return;
      }

      // Check if the habit belongs to the authenticated user
      if (habit.userId !== req.user.id) {
        sendErrorResponse(res, 403, "User not authorized to delete this habit");
        return;
      }

      // Soft delete by marking as inactive
      await Habit.findByIdAndUpdate(req.params.id, { active: false });

      res.status(200).json({
        success: true,
        data: {},
      });
    } catch (error) {
      sendErrorResponse(res, 500, "Error deleting habit", error);
    }
  },

  // Toggle habit completion for a specific date
  toggleCompletion: async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        sendErrorResponse(res, 401, "Not authorized");
        return;
      }

      const { date, timezone, seed } = req.body;

      console.log(
        `Toggle request received: id=${req.params.id}, date=${date || "undefined"}, timezone=${timezone}, seed=${seed || "undefined"}`
      );

      if (!date) {
        sendErrorResponse(res, 400, "Date is required");
        return;
      }

      // Default to UTC if no timezone provided
      const userTimezone = timezone || "UTC";

      console.log(`Using timezone: ${userTimezone}`);

      const habit = await Habit.findById(req.params.id);

      if (!habit) {
        sendErrorResponse(res, 404, `Habit with ID ${req.params.id} not found`);
        return;
      }

      // Check if the habit belongs to the authenticated user
      if (habit.userId !== req.user.id) {
        sendErrorResponse(res, 403, "User not authorized to update this habit");
        return;
      }

      // Parse the ISO date string to a Date object
      const parsedDate = parseISO(date);

      console.log(`Parsed date: ${parsedDate.toISOString()}`);

      // Convert the date to the user's timezone, then to UTC for consistent storage
      // This ensures the date represents the correct calendar day in the user's timezone
      const dateInUserTz = startOfDay(toZonedTime(parsedDate, userTimezone));

      console.log(
        `Date in user timezone (${userTimezone}): ${dateInUserTz.toISOString()}`
      );

      // Safely log completed dates, handling the case when the array might be empty
      const completedDatesString =
        habit.completedDates && habit.completedDates.length > 0
          ? habit.completedDates
              .map((d) => new Date(d).toISOString())
              .join(", ")
          : "none";

      console.log(`Habit completed dates: ${completedDatesString}`);

      // Check if the date is already in completedDates
      const isCompleted = habit.isCompletedForDate(dateInUserTz);
      console.log(
        `Is already completed for date: ${isCompleted === true ? "true" : "false"}`
      );

      if (isCompleted) {
        // Remove the date if already completed
        habit.completedDates = habit.completedDates.filter((d: Date) => {
          return !isSameDay(new Date(d), new Date(dateInUserTz));
        });
      } else {
        // Add the date if not completed
        habit.completedDates.push(dateInUserTz);
      }

      // Store the user's timezone preference in the habit document
      habit.userTimezone = userTimezone;

      // Save the updated habit
      try {
        const savedHabit = await habit.save();
        console.log(
          `Habit saved successfully. New streak: ${savedHabit.streak}`
        );
        console.log(
          `Updated completed dates: ${savedHabit.completedDates.map((d) => new Date(d).toISOString()).join(", ")}`
        );

        // Get a reward photo when habit is completed (only for habits with showReward=true)
        let rewardPhoto = null;

        if (!isCompleted && habit.showReward === true) {
          console.log(
            "Getting reward photo for completed habit with showReward=true"
          );
          try {
            // Import the service to avoid circular dependencies
            const { getRandomPhoto } = await import(
              "../services/google-photos.service"
            );

            // Pass the seed if available for deterministic photo selection
            rewardPhoto = await getRandomPhoto(seed ? Number(seed) : undefined);

            console.log(
              "Successfully fetched reward photo:",
              rewardPhoto ? "Present" : "Null"
            );
            if (rewardPhoto) {
              console.log("Photo details:", JSON.stringify(rewardPhoto));
            } else {
              console.log("No photo was returned from Google Photos API");
            }
          } catch (photoError) {
            console.error("Error fetching reward photo:", photoError);
            // Continue without a photo if there's an error
          }
        } else if (!isCompleted) {
          console.log(
            `Habit was completed but showReward=${habit.showReward}, not fetching reward photo`
          );
        } else {
          console.log("Habit was unmarked, not fetching reward photo");
        }

        res.status(200).json({
          success: true,
          data: savedHabit,
          rewardPhoto,
        });
      } catch (saveError) {
        console.error("Error saving habit:", saveError);
        sendErrorResponse(res, 500, "Error saving habit", saveError);
      }
    } catch (error) {
      console.error("Toggle completion error:", error);
      sendErrorResponse(res, 500, "Error toggling habit completion", error);
    }
  },
};
