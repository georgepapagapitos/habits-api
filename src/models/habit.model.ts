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
    // Check if yesterday was a due day for this habit
    const isYesterdayDue = frequencyIndices.includes(getDay(yesterday));
    console.log(`Is yesterday due: ${isYesterdayDue}`);

    // Initialize streak counter
    let streak = 0;

    // Calculate the current streak by checking for consecutive completed due dates

    // First, determine the most recent date that we need to check
    let checkDate: Date | undefined;

    // If today is completed and it's a due date, start checking from today
    if (isCompletedToday && isDueToday) {
      checkDate = todayStart;
      streak = 1;
      console.log(`Today is completed and due, starting streak at 1`);
    }
    // If today is not completed but it's due, we need to check if the streak is broken
    else if (!isCompletedToday && isDueToday) {
      // Streak is 0 if today is due but not completed (end of day has passed)
      const nowHours = new Date().getHours();
      // For testing purposes, consider the day "passed" after 6pm
      const dayHasPassed = nowHours >= 18;

      if (dayHasPassed) {
        console.log(
          `Today is due but not completed and day has passed, streak is 0`
        );
        this.streak = 0;
        return next();
      } else {
        // Day hasn't passed yet, so we'll check from yesterday
        checkDate = yesterday;
        console.log(
          `Today is due but not completed, day hasn't passed, checking from yesterday`
        );
      }
    }
    // If today is not a due date, start checking from most recent due date
    else {
      // Find the most recent due date
      let daysBack = 0;
      let foundDueDate = false;

      while (!foundDueDate && daysBack < 7) {
        const checkingDate = subDays(todayStart, daysBack);
        const checkingDayIndex = getDay(checkingDate);

        if (frequencyIndices.includes(checkingDayIndex)) {
          foundDueDate = true;
          checkDate = checkingDate;

          // If this recent due date was completed, start streak at 1
          const wasCompleted = completedDatesInTz.some((date) =>
            isSameDay(date, checkDate as Date)
          );

          if (wasCompleted) {
            streak = 1;
            console.log(
              `Most recent due date ${(checkDate as Date).toISOString()} was completed, starting streak at 1`
            );
          } else {
            console.log(
              `Most recent due date ${(checkDate as Date).toISOString()} was NOT completed, streak is 0`
            );
            this.streak = 0;
            return next();
          }
        }

        daysBack++;
      }

      // If we didn't find a due date in the last 7 days but have a recent completion
      if (!foundDueDate && mostRecentCompletion) {
        console.log(
          `No due dates found in the last 7 days, using most recent completion`
        );
        checkDate = mostRecentCompletion;
      }
    }

    // If we couldn't determine a valid check date, streak is 0
    if (!checkDate) {
      console.log(`No valid check date determined, setting streak to 0`);
      this.streak = 0;
      return next();
    }

    console.log(`Starting streak check from date: ${checkDate.toISOString()}`);

    // Count consecutive completed due dates going backward
    let consecutiveDaysChecked = 0;

    // Start checking from yesterday if today is completed and due
    // Otherwise start from the check date we determined
    let currentDate =
      isCompletedToday && isDueToday ? yesterday : (checkDate as Date);

    // Only go back 365 days at most (to prevent infinite loops)
    while (consecutiveDaysChecked < 365 && currentDate) {
      consecutiveDaysChecked++;

      // Only check due dates - skip non-due dates
      const dayIndex = getDay(currentDate);
      const isDueDate = frequencyIndices.includes(dayIndex);

      if (isDueDate) {
        // This date is due, check if it was completed
        const wasCompleted = completedDatesInTz.some((date) =>
          isSameDay(date, currentDate)
        );

        console.log(
          `Checking due date ${currentDate.toISOString()} (${daysOfWeek[dayIndex]}): completed=${wasCompleted}`
        );

        if (wasCompleted) {
          // Due date was completed, add to streak
          streak++;
          console.log(
            `Due date was completed, added to streak, now: ${streak}`
          );
        } else {
          // Due date was not completed, break the streak
          console.log(`Due date not completed, breaking streak at ${streak}`);
          break;
        }
      } else {
        console.log(
          `Skipping non-due date ${currentDate.toISOString()} (${daysOfWeek[dayIndex]})`
        );
      }

      // Move to the previous day
      currentDate = subDays(currentDate, 1);
    }

    console.log(`Final streak calculation: ${streak}`);
    this.streak = streak;
  }
  next();
});

export const Habit = mongoose.model<HabitDocument>("Habit", habitSchema);
