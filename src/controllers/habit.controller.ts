import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { Habit } from "../models/habit.model";
import { HabitBase } from "../types/habit.types";

export const habitController = {
  // Get all habits for the authenticated user
  getAllHabits: async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        res.status(401).json({
          success: false,
          error: "Not authorized",
        });
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
      res.status(500).json({
        success: false,
        error: "Server Error",
      });
    }
  },

  // Get habit by ID
  getHabitById: async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        res.status(401).json({
          success: false,
          error: "Not authorized",
        });
        return;
      }

      const habit = await Habit.findById(req.params.id);

      if (!habit) {
        res.status(404).json({
          success: false,
          error: "Habit not found",
        });
        return;
      }

      // Check if the habit belongs to the authenticated user
      if (habit.userId !== req.user.id) {
        res.status(403).json({
          success: false,
          error: "Not authorized to access this habit",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: habit,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Server Error",
      });
    }
  },

  // Create new habit
  createHabit: async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        res.status(401).json({
          success: false,
          error: "Not authorized",
        });
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
    } catch (error: any) {
      if (error.name === "ValidationError") {
        const messages = Object.values(error.errors).map(
          (err: any) => err.message
        );

        res.status(400).json({
          success: false,
          error: messages,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: "Server Error",
      });
    }
  },

  // Update habit
  updateHabit: async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        res.status(401).json({
          success: false,
          error: "Not authorized",
        });
        return;
      }

      const habitData: Partial<HabitBase> = req.body;

      // Find the habit first to ensure it exists
      const existingHabit = await Habit.findById(req.params.id);

      if (!existingHabit) {
        res.status(404).json({
          success: false,
          error: "Habit not found",
        });
        return;
      }

      // Check if the habit belongs to the authenticated user
      if (existingHabit.userId !== req.user.id) {
        res.status(403).json({
          success: false,
          error: "User not authorized to update this habit",
        });
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
    } catch (error: any) {
      if (error.name === "ValidationError") {
        const messages = Object.values(error.errors).map(
          (err: any) => err.message
        );

        res.status(400).json({
          success: false,
          error: messages,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: "Server Error",
      });
    }
  },

  // Delete habit (soft delete by setting active to false)
  deleteHabit: async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        res.status(401).json({
          success: false,
          error: "Not authorized",
        });
        return;
      }

      const habit = await Habit.findById(req.params.id);

      if (!habit) {
        res.status(404).json({
          success: false,
          error: "Habit not found",
        });
        return;
      }

      // Check if the habit belongs to the authenticated user
      if (habit.userId !== req.user.id) {
        res.status(403).json({
          success: false,
          error: "User not authorized to delete this habit",
        });
        return;
      }

      // Soft delete by marking as inactive
      await Habit.findByIdAndUpdate(req.params.id, { active: false });

      res.status(200).json({
        success: true,
        data: {},
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Server Error",
      });
    }
  },

  // Toggle habit completion for a specific date
  toggleCompletion: async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        res.status(401).json({
          success: false,
          error: "Not authorized",
        });
        return;
      }

      const { date, timezone } = req.body;

      console.log(
        `Toggle request received: id=${req.params.id}, date=${date}, timezone=${timezone}`
      );

      if (!date) {
        res.status(400).json({
          success: false,
          error: "Date is required",
        });
        return;
      }

      // Import date-fns and date-fns-tz functions
      const { parseISO, startOfDay, format } = require("date-fns");
      const { toZonedTime } = require("date-fns-tz");

      // Default to UTC if no timezone provided
      const userTimezone = timezone || "UTC";

      console.log(`Using timezone: ${userTimezone}`);

      const habit = await Habit.findById(req.params.id);

      if (!habit) {
        res.status(404).json({
          success: false,
          error: "Habit not found",
        });
        return;
      }

      // Check if the habit belongs to the authenticated user
      if (habit.userId !== req.user.id) {
        res.status(403).json({
          success: false,
          error: "User not authorized to update this habit",
        });
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
      console.log(
        `Habit completed dates: ${habit.completedDates.map((d) => new Date(d).toISOString()).join(", ")}`
      );

      // Check if the date is already in completedDates
      const isCompleted = habit.isCompletedForDate(dateInUserTz);
      console.log(`Is already completed for date: ${isCompleted}`);

      if (isCompleted) {
        // Remove the date if already completed
        // The current filter is incorrect - it would remove ALL dates or none
        // Instead, we need to filter out only the matching date
        habit.completedDates = habit.completedDates.filter((d: Date) => {
          const { isSameDay } = require("date-fns");
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

        res.status(200).json({
          success: true,
          data: savedHabit,
        });
      } catch (saveError: any) {
        console.error("Error saving habit:", saveError);
        res.status(500).json({
          success: false,
          error: "Error saving habit",
          details: saveError.message || String(saveError),
        });
      }
    } catch (error: any) {
      console.error("Toggle completion error:", error);
      res.status(500).json({
        success: false,
        error: "Server Error",
        details: error.message || String(error),
      });
    }
  },
};
