import mongoose, { Schema } from "mongoose";
import { HabitDocument } from "../types/habit.types";

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
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
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
  const formattedDate = new Date(date).setHours(0, 0, 0, 0);
  return this.completedDates.some(
    (completedDate: Date) =>
      new Date(completedDate).setHours(0, 0, 0, 0) === formattedDate
  );
};

// Pre-save middleware to update streak
habitSchema.pre("save", function (next) {
  if (this.isModified("completedDates")) {
    // Logic to calculate streak based on completedDates and frequency
    const sortedDates = [...this.completedDates].map(date => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }).sort((a, b) => b - a); // Sort in descending order (newest first)

    if (sortedDates.length === 0) {
      this.streak = 0;
      return next();
    }

    // Convert frequency to day indices (0 = Sunday, 1 = Monday, etc.)
    const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const frequencyIndices = this.frequency.map(day => daysOfWeek.indexOf(day.toLowerCase()))
      .filter(index => index !== -1)
      .sort((a, b) => a - b);

    // Get today's date and set hours to midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    // Initialize streak counter
    let streak = 0;
    
    // Check if the habit was completed today if it was due
    const todayIndex = today.getDay();
    const isDueToday = frequencyIndices.includes(todayIndex);
    const isCompletedToday = sortedDates[0] === todayTime;
    
    // If due today but not completed, break the streak
    if (isDueToday && !isCompletedToday) {
      this.streak = 0;
      return next();
    }
    
    // If completed today, start counting
    if (isCompletedToday) {
      streak = 1;
    }

    // Create a map of completed dates for faster lookup
    const completedDatesMap = new Set(sortedDates);
    
    // Get the date range to check (go back up to 365 days)
    let checkDate = new Date(today);
    if (isCompletedToday) {
      // If completed today, start checking from yesterday
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    // Check the past year, one day at a time
    for (let i = 0; i < 365; i++) {
      const checkDateIndex = checkDate.getDay();
      const isDueOnCheckDate = frequencyIndices.includes(checkDateIndex);
      
      // Only check days when the habit was due
      if (isDueOnCheckDate) {
        const checkDateTime = checkDate.getTime();
        
        // If this due date was completed, increase streak
        if (completedDatesMap.has(checkDateTime)) {
          streak++;
        } else {
          // If a due date was missed, stop counting
          break;
        }
      }
      
      // Move to the previous day
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    this.streak = streak;
  }
  next();
});

export const Habit = mongoose.model<HabitDocument>("Habit", habitSchema);
