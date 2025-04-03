import mongoose, { Schema } from "mongoose";
import { HabitDocument } from "../types/habit.types";
import { isSameDay, subDays, startOfDay, getDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const habitSchema = new Schema<HabitDocument>(
  {
    name: {
      type: String,
      required: [true, "Habit name is required"],
      trim: true,
      maxlength: [100, "Habit name cannot be more than 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot be more than 500 characters"],
    },
    color: {
      type: String,
      default: "#3498db", // Default color
    },
    icon: {
      type: String,
      default: "check", // Default icon
    },
    frequency: {
      type: [String],
      required: [true, "Frequency is required"],
      validate: {
        validator: function (value: string[]) {
          const validDays = [
            "sunday",
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
          ];
          return value.every((day) => validDays.includes(day.toLowerCase()));
        },
        message: "Frequency must include valid days of the week",
      },
    },
    timeOfDay: {
      type: String,
      enum: ["morning", "afternoon", "evening", "anytime"],
      default: "anytime",
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    streak: {
      type: Number,
      default: 0,
    },
    completedDates: {
      type: [Date],
      default: [],
    },
    active: {
      type: Boolean,
      default: true,
    },
    userId: {
      type: String,
      required: [true, "User ID is required"],
    },
    // Add user timezone preference field to store timezone
    userTimezone: {
      type: String,
      default: "UTC",
    },
    // Show reward when habit is completed
    showReward: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for better performance
habitSchema.index({ userId: 1 });
habitSchema.index({ active: 1 });

// Method to check if habit is completed for a specific date
habitSchema.methods.isCompletedForDate = function (date: Date): boolean {
  // Import date-fns isSameDay function
  // isSameDay is imported at the top of the file

  // Log debugging info
  console.log(
    `Checking if date ${new Date(date).toISOString()} is in completed dates`
  );

  if (
    !this.completedDates ||
    !Array.isArray(this.completedDates) ||
    this.completedDates.length === 0
  ) {
    console.log("No completed dates to check against");
    return false;
  }

  // Compare with completed dates using date-fns isSameDay function
  // which checks if two dates have the same year, month, and day
  const isCompleted = this.completedDates.some((completedDate: Date) => {
    const compDate = new Date(completedDate);
    const checkDate = new Date(date);
    const result = isSameDay(compDate, checkDate);
    console.log(
      `Comparing ${compDate.toISOString()} with ${checkDate.toISOString()} => ${result}`
    );
    return result;
  });

  console.log(`Final result: ${isCompleted}`);
  return isCompleted;
};

// Pre-save middleware to update streak
habitSchema.pre("save", function (next) {
  if (this.isModified("completedDates")) {
    // Get the user's timezone or default to UTC
    const timezone = this.userTimezone || "UTC";

    // Add debug logging
    console.log(
      `Calculating streak for habit: ${this._id}, name: ${this.name}`
    );
    console.log(`Current streak: ${this.streak}`);
    console.log(`Completed dates count: ${this.completedDates.length}`);

    // Convert completed dates to Date objects, in user's timezone
    const completedDatesInTz = this.completedDates.map((date) => {
      const dateObj = toZonedTime(new Date(date), timezone);
      return startOfDay(dateObj); // Normalize to start of day
    });

    // Map day names to indices (0 = Sunday, 1 = Monday, etc.)
    const daysOfWeek = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    // Convert frequency names to day indices
    const frequencyIndices = this.frequency
      .map((day) => daysOfWeek.indexOf(day.toLowerCase()))
      .filter((index) => index !== -1)
      .sort((a, b) => a - b);

    console.log(`Frequency indices: ${frequencyIndices.join(", ")}`);

    // Get today in user's timezone
    const now = new Date();
    console.log(`Using timezone: ${timezone}`);

    const todayInUserTz = toZonedTime(now, timezone);
    const todayStart = startOfDay(todayInUserTz);

    console.log(`Today in user timezone: ${todayStart.toISOString()}`);

    // Get today's day of week in user's timezone (0-6)
    const todayIndex = getDay(todayStart);
    console.log(`Today's day index: ${todayIndex} (${daysOfWeek[todayIndex]})`);

    // Check if the habit is due today
    const isDueToday = frequencyIndices.includes(todayIndex);
    console.log(`Is due today: ${isDueToday}`);

    // Get the habit's start date in the user's timezone
    const startDateInTz = toZonedTime(this.startDate, timezone);
    const startDate = startOfDay(startDateInTz);
    console.log(`Habit start date: ${startDate.toISOString()}`);

    // Sort completed dates from newest to oldest
    completedDatesInTz.sort((a, b) => b.getTime() - a.getTime());

    // If no completed dates, streak is 0
    if (!completedDatesInTz.length) {
      this.streak = 0;
      return next();
    }

    // Get the most recent completion date
    const lastCompletion = completedDatesInTz[0];
    console.log(`Last completion date: ${lastCompletion.toISOString()}`);

    // Helper function to check if a date is a due date
    const isDueDate = (date: Date) => {
      const dayIndex = getDay(date);
      return frequencyIndices.includes(dayIndex);
    };

    // Helper function to check if a date was completed
    const wasCompleted = (date: Date) => {
      return completedDatesInTz.some((completedDate) =>
        isSameDay(completedDate, date)
      );
    };

    // Helper function to get the next due date before a given date
    const getPreviousDueDate = (date: Date) => {
      let previousDate = subDays(date, 1);
      while (previousDate.getTime() >= startDate.getTime()) {
        if (isDueDate(previousDate)) {
          return previousDate;
        }
        previousDate = subDays(previousDate, 1);
      }
      return null;
    };

    // Calculate the streak by checking consecutive completions
    let streak = 0;
    let currentDate = lastCompletion;

    while (currentDate.getTime() >= startDate.getTime()) {
      if (wasCompleted(currentDate)) {
        streak++;
        console.log(
          `Date ${currentDate.toISOString()} was completed, streak now: ${streak}`
        );
      }

      // Get the previous date
      currentDate = subDays(currentDate, 1);
    }

    // Final safety check
    if (streak > this.completedDates.length) {
      console.log(
        `Safety check: Reducing calculated streak ${streak} to match completedDates.length: ${this.completedDates.length}`
      );
      streak = this.completedDates.length;
    }

    this.streak = streak;
    console.log(`Final streak calculated: ${this.streak}`);
  }
  next();
});

export const Habit = mongoose.model<HabitDocument>("Habit", habitSchema);
