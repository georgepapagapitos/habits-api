import { Response } from "express";
import { Habit } from "../models/habit.model";
import { HabitBase } from "../types/habit.types";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

export const habitController = {
  // Get all habits for the authenticated user
  getAllHabits: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
        userId: req.user.id 
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
  getHabitById: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
  createHabit: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
  updateHabit: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
          error: 'User not authorized to update this habit'
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
  deleteHabit: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
          error: 'User not authorized to delete this habit'
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
  toggleCompletion: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        res.status(401).json({
          success: false,
          error: "Not authorized",
        });
        return;
      }

      const { date } = req.body;

      if (!date) {
        res.status(400).json({
          success: false,
          error: "Date is required",
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
          error: 'User not authorized to update this habit'
        });
        return;
      }

      const completionDate = new Date(date);
      const formattedDate = new Date(completionDate.setHours(0, 0, 0, 0));

      // Check if the date is already in completedDates
      const isCompleted = habit.isCompletedForDate(formattedDate);

      if (isCompleted) {
        // Remove the date if already completed
        habit.completedDates = habit.completedDates.filter(
          (d: Date) =>
            new Date(d).setHours(0, 0, 0, 0) !== formattedDate.getTime()
        );
      } else {
        // Add the date if not completed
        habit.completedDates.push(formattedDate);
      }

      await habit.save();

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
};
