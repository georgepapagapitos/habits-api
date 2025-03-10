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

    // If no completed dates, streak is 0
    if (
      !this.completedDates ||
      !Array.isArray(this.completedDates) ||
      this.completedDates.length === 0
    ) {
      console.log("No completed dates, setting streak to 0");
      this.streak = 0;
      return next();
    }

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

    // Convert completed dates to Date objects, in user's timezone
    const completedDatesInTz = this.completedDates.map((date) => {
      const dateObj = toZonedTime(new Date(date), timezone);
      return startOfDay(dateObj); // Normalize to start of day
    });

    // Sort completed dates from newest to oldest
    completedDatesInTz.sort((a, b) => b.getTime() - a.getTime());

    console.log(
      `Completed dates (newest first): ${completedDatesInTz.map((d) => d.toISOString()).join(", ")}`
    );

    // Check if completed today
    const isCompletedToday = completedDatesInTz.some((date) =>
      isSameDay(date, todayStart)
    );
    console.log(`Is completed today: ${isCompletedToday}`);

    // Get the most recent completion
    const mostRecentCompletion = completedDatesInTz[0];
    const yesterday = subDays(todayStart, 1);
    const isCompletedYesterday = completedDatesInTz.some((date) =>
      isSameDay(date, yesterday)
    );

    // Initialize streak counter
    let streak = 0;

    // If completed today, start with 1
    if (isCompletedToday) {
      streak = 1;
      console.log(`Habit completed today, starting streak at 1`);
    }
    // If not completed today but completed yesterday and due today, start with 1
    else if (isCompletedYesterday && isDueToday) {
      streak = 1;
      console.log(
        `Habit completed yesterday and due today, starting streak at 1`
      );
    }
    // If not completed today or yesterday, streak starts at 0
    else if (mostRecentCompletion) {
      console.log(
        `Habit not completed today or yesterday, starting streak at 0`
      );
    }

    // Set the starting point for looking back in the streak
    let checkDate: Date;
    if (isCompletedToday) {
      // If completed today, start checking from yesterday
      checkDate = yesterday;
    } else if (mostRecentCompletion) {
      // If not completed today, start checking from the most recent completion
      checkDate = mostRecentCompletion;
    } else {
      // No completions at all
      this.streak = 0;
      return next();
    }

    // Count consecutive completed days going backward
    let consecutiveDaysChecked = 0;
    let foundCompletedDates = isCompletedToday ? 1 : 0; // Count today if completed

    // Only go back 365 days at most (to prevent infinite loops)
    while (consecutiveDaysChecked < 365 && checkDate) {
      consecutiveDaysChecked++;

      // Check if this date was completed
      const wasCompleted = completedDatesInTz.some((date) =>
        isSameDay(date, checkDate)
      );

      // Get the day of week for this date
      const dayIndex = getDay(checkDate);
      const isDueDate = frequencyIndices.includes(dayIndex);

      console.log(
        `Checking for streak ${checkDate.toISOString()} (${daysOfWeek[dayIndex]}): due=${isDueDate}, completed=${wasCompleted}`
      );

      if (wasCompleted) {
        // This date was completed, add to streak
        foundCompletedDates++;
        streak++;
        console.log(`Completed date found, added to streak, now: ${streak}`);
      } else if (isDueDate) {
        // This was a due date but not completed, break the streak
        console.log(`Due date not completed, breaking streak at ${streak}`);
        break;
      }
      // else: not due, not completed, continue checking backward

      // Move to the previous day
      checkDate = subDays(checkDate, 1);
    }

    // If we found completed dates, ensure streak is at least as large as the count
    if (foundCompletedDates > 0 && streak < foundCompletedDates) {
      streak = foundCompletedDates;
    }

    console.log(`Final streak calculation: ${streak}`);
    this.streak = streak;
  }
  next();
});

export const Habit = mongoose.model<HabitDocument>("Habit", habitSchema);
