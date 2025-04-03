import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../src/models/user.model";
import { Habit } from "../src/models/habit.model";
import dotenv from "dotenv";
import { subDays } from "date-fns";

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async (): Promise<void> => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error(
        "MongoDB connection string is not defined in environment variables"
      );
    }

    mongoose.set("strictQuery", false);
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

// Generate test user
const createTestUser = async (): Promise<{
  id: string;
  email: string;
  username: string;
}> => {
  try {
    // Check if test user already exists
    const existingUser = await User.findOne({ email: "test@example.com" });

    if (existingUser) {
      console.log("Test user already exists, using existing user.");
      return {
        id: existingUser._id.toString(),
        email: existingUser.email,
        username: existingUser.username,
      };
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("password123", salt);

    // Create new user
    const newUser = await User.create({
      username: "testuser",
      email: "test@example.com",
      password: hashedPassword,
    });

    console.log("Test user created successfully");
    return {
      id: newUser._id.toString(),
      email: newUser.email,
      username: newUser.username,
    };
  } catch (error) {
    console.error("Error creating test user:", error);
    throw error;
  }
};

// Generate sample habits with different completion patterns
const createSampleHabits = async (userId: string): Promise<void> => {
  try {
    // Delete existing habits for this user
    await Habit.deleteMany({ userId });
    console.log("Deleted existing habits for test user");

    const today = new Date();
    const userTimezone = "America/Chicago";

    // 1. Daily habit with perfect streak
    const dailyHabit = await Habit.create({
      name: "Daily Exercise",
      description: "Exercise for at least 30 minutes",
      color: "#3498db",
      icon: "run",
      frequency: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
      timeOfDay: "morning",
      userId,
      userTimezone,
      completedDates: [],
      startDate: subDays(today, 14),
    });

    // Add completed dates for the last 10 days
    for (let i = 10; i >= 0; i--) {
      dailyHabit.completedDates.push(subDays(today, i));
    }
    await dailyHabit.save();

    // 2. Weekday habit with some missed days
    const weekdayHabit = await Habit.create({
      name: "Work on Side Project",
      description: "Spend 1 hour on coding projects",
      color: "#e74c3c",
      icon: "code",
      frequency: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      timeOfDay: "evening",
      userId,
      userTimezone,
      completedDates: [],
      startDate: subDays(today, 14),
    });

    // Add completed dates with some gaps
    const weekdayCompletions = [1, 2, 3, 6, 7, 8, 9];
    for (const day of weekdayCompletions) {
      weekdayHabit.completedDates.push(subDays(today, day));
    }
    await weekdayHabit.save();

    // 3. Three days a week habit with some non-due day completions
    const threeTimesWeekHabit = await Habit.create({
      name: "Read a Book",
      description: "Read for 30 minutes",
      color: "#2ecc71",
      icon: "book",
      frequency: ["monday", "wednesday", "friday"],
      timeOfDay: "anytime",
      userId,
      userTimezone,
      completedDates: [],
      startDate: subDays(today, 14),
    });

    // Add completions on due days
    const dueCompletions = [2, 4, 7, 9];
    // Add completions on non-due days (Tuesday and Thursday)
    const nonDueCompletions = [1, 3, 6, 8];

    for (const day of dueCompletions) {
      threeTimesWeekHabit.completedDates.push(subDays(today, day));
    }
    for (const day of nonDueCompletions) {
      threeTimesWeekHabit.completedDates.push(subDays(today, day));
    }
    await threeTimesWeekHabit.save();

    // 4. Weekend habit that's been missed (to test creating a streak with today's completion)
    const weekendHabit = await Habit.create({
      name: "Meal Prep",
      description: "Prepare meals for the week",
      color: "#9b59b6",
      icon: "food",
      frequency: ["saturday", "sunday"],
      timeOfDay: "afternoon",
      userId,
      userTimezone,
      completedDates: [],
      startDate: subDays(today, 14),
    });

    // Only completed past weekends, not the most recent one
    const weekendDates = [13, 12, 6, 5];
    for (const day of weekendDates) {
      weekendHabit.completedDates.push(subDays(today, day));
    }
    await weekendHabit.save();

    // 5. Habit with bonus completions between due dates
    const bonusHabit = await Habit.create({
      name: "Meditation",
      description: "Meditate for 10 minutes",
      color: "#f1c40f",
      icon: "meditation",
      frequency: ["monday", "friday"],
      timeOfDay: "morning",
      userId,
      userTimezone,
      completedDates: [],
      startDate: subDays(today, 14),
    });

    // Add completions on due days and bonus days
    const bonusDueCompletions = [0, 7, 14]; // Mondays and Fridays
    const bonusCompletions = [1, 2, 3, 8, 9, 10]; // Days between due dates

    for (const day of bonusDueCompletions) {
      bonusHabit.completedDates.push(subDays(today, day));
    }
    for (const day of bonusCompletions) {
      bonusHabit.completedDates.push(subDays(today, day));
    }
    await bonusHabit.save();

    // 6. Timezone-sensitive habit (to test timezone handling)
    const timezoneHabit = await Habit.create({
      name: "Evening Journal",
      description: "Write in journal before bed",
      color: "#1abc9c",
      icon: "journal",
      frequency: ["monday", "wednesday", "friday"],
      timeOfDay: "evening",
      userId,
      userTimezone: "Asia/Tokyo", // Different timezone
      completedDates: [],
      startDate: subDays(today, 14),
    });

    // Add completions with timezone-sensitive dates
    const timezoneCompletions = [0, 2, 4, 7, 9];
    for (const day of timezoneCompletions) {
      const date = subDays(today, day);
      // Set to end of day in Tokyo timezone
      date.setHours(23, 59, 59, 999);
      timezoneHabit.completedDates.push(date);
    }
    await timezoneHabit.save();

    // 7. Habit with missed due dates (to test streak breaking)
    const missedHabit = await Habit.create({
      name: "Language Practice",
      description: "Practice language for 20 minutes",
      color: "#e67e22",
      icon: "language",
      frequency: ["monday", "wednesday", "friday"],
      timeOfDay: "morning",
      userId,
      userTimezone,
      completedDates: [],
      startDate: subDays(today, 14),
    });

    // Add completions with intentional gaps
    const missedCompletions = [0, 2, 7, 9]; // Missing some due dates
    for (const day of missedCompletions) {
      missedHabit.completedDates.push(subDays(today, day));
    }
    await missedHabit.save();

    // 8. Habit with leap year dates (to test date edge cases)
    const leapYearHabit = await Habit.create({
      name: "Leap Year Habit",
      description: "Test habit for leap year dates",
      color: "#34495e",
      icon: "calendar",
      frequency: ["monday"],
      timeOfDay: "anytime",
      userId,
      userTimezone,
      completedDates: [],
      startDate: subDays(today, 14),
    });

    // Add completions including February 29th
    const leapYear = 2024;
    const feb29 = new Date(leapYear, 1, 29);
    const feb28 = new Date(leapYear, 1, 28);
    leapYearHabit.completedDates.push(feb29, feb28);
    await leapYearHabit.save();

    console.log("Sample habits created successfully");
  } catch (error) {
    console.error("Error creating sample habits:", error);
    throw error;
  }
};

// Main function
const seedTestData = async (): Promise<void> => {
  try {
    await connectDB();

    // Create test user
    const testUser = await createTestUser();
    console.log(`Test user: ${testUser.username} (${testUser.email})`);

    // Create sample habits
    await createSampleHabits(testUser.id);

    console.log("\nTest data seeded successfully!");
    console.log("\nLogin credentials:");
    console.log("Email: test@example.com");
    console.log("Password: password123");

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("MongoDB disconnected");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding test data:", error);
    process.exit(1);
  }
};

// Run the seed function
seedTestData();
