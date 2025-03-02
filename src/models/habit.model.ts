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
      required: [true, 'User ID is required']
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
    // This is a simplified version and would need to be enhanced based on exact requirements
    const sortedDates = [...this.completedDates].sort(
      (a, b) => a.getTime() - b.getTime()
    );

    if (sortedDates.length === 0) {
      this.streak = 0;
      return next();
    }

    // Here would go more complex streak calculation logic
    // For now, we'll just set the streak to the number of completed dates
    // In real implementation, you'd need to check for consecutive days relative to frequency
  }
  next();
});

export const Habit = mongoose.model<HabitDocument>("Habit", habitSchema);
