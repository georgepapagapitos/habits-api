import { subDays } from "date-fns";
import { HabitDocument } from "../types/habit.types";

// Mock date-fns-tz methods to prevent timezone issues in tests
jest.mock("date-fns-tz", () => ({
  toZonedTime: jest.fn((date) => date),
  formatInTimeZone: jest.fn(),
}));

// Function to simulate the streak calculation logic from the Habit model
function calculateStreak(
  habit: Partial<HabitDocument>,
  today: Date = new Date()
): number {
  // Safety check
  if (
    !habit.completedDates ||
    !Array.isArray(habit.completedDates) ||
    habit.completedDates.length === 0
  ) {
    return 0;
  }

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
  const frequency = habit.frequency || [];
  const frequencyIndices = frequency
    .map((day) => daysOfWeek.indexOf(day.toLowerCase()))
    .filter((index) => index !== -1)
    .sort((a, b) => a - b);

  // Normalize today to start of day
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);

  // Get today's day of week (0-6)
  const todayIndex = todayStart.getDay();

  // Check if the habit is due today
  const isDueToday = frequencyIndices.includes(todayIndex);

  // Convert completed dates to Date objects
  const completedDates = habit.completedDates.map((date) => {
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0); // Normalize to start of day
    return dateObj;
  });

  // Sort completed dates from newest to oldest
  completedDates.sort((a, b) => b.getTime() - a.getTime());

  // Check if completed today
  const isCompletedToday = completedDates.some(
    (date) => date.getTime() === todayStart.getTime()
  );

  // Simple streak calculation:
  // 1. If due today but not completed, streak is 0
  if (isDueToday && !isCompletedToday) {
    return 0;
  }

  // 2. Start with 0 or 1 depending on today's completion
  let streak = isCompletedToday ? 1 : 0;

  // 3. Go backwards through the calendar, checking each due date
  let checkDate = isCompletedToday
    ? subDays(todayStart, 1) // Start from yesterday if today is completed
    : todayStart; // Start from today otherwise

  let consecutiveDaysChecked = 0;

  // Only go back 365 days at most (to prevent infinite loops)
  while (consecutiveDaysChecked < 365) {
    consecutiveDaysChecked++;

    // Check if this day is a due date
    const dayIndex = checkDate.getDay();
    const isDueDate = frequencyIndices.includes(dayIndex);

    if (isDueDate) {
      // This is a due date, check if it was completed
      const wasCompleted = completedDates.some(
        (date) => date.getTime() === checkDate.getTime()
      );

      if (wasCompleted) {
        // This due date was completed, add to streak
        streak++;
      } else {
        // This due date was missed, streak is broken
        break;
      }
    }

    // Move to the previous day
    checkDate = subDays(checkDate, 1);
  }

  return streak;
}

describe("Streak Calculation", () => {
  // Helper function to create test habits
  const createTestHabit = (overrides = {}): Partial<HabitDocument> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      name: "Test Habit",
      frequency: ["monday", "wednesday", "friday"],
      completedDates: [],
      streak: 0,
      ...overrides,
    };
  };

  // Helper to get day name
  const getDayName = (date: Date): string => {
    const days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    return days[date.getDay()];
  };

  test("streak should be 0 if no completed dates", () => {
    const habit = createTestHabit();
    expect(calculateStreak(habit)).toBe(0);
  });

  test("streak should be 0 if due today but not completed", () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create a habit that's due today (whatever day it is)
    const todayName = getDayName(today);
    const habit = createTestHabit({
      frequency: [todayName],
      completedDates: [
        // Completed prior dates but not today
        subDays(today, 7).toISOString(), // Last week
        subDays(today, 14).toISOString(), // Two weeks ago
      ],
    });

    expect(calculateStreak(habit, today)).toBe(0);
  });

  test("streak should be 1 if only today is completed", () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create a habit that's due today and completed today
    const todayName = getDayName(today);
    const habit = createTestHabit({
      frequency: [todayName],
      completedDates: [today.toISOString()],
    });

    expect(calculateStreak(habit, today)).toBe(1);
  });

  test("streak should count consecutive completed dates based on frequency", () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Let's say today is Monday for this test
    const mockToday = new Date(2025, 2, 3); // Monday, March 3, 2025
    mockToday.setHours(0, 0, 0, 0);

    // Create a habit due on Mon, Wed, Fri
    const habit = createTestHabit({
      frequency: ["monday", "wednesday", "friday"],
      completedDates: [
        mockToday.toISOString(), // Monday (today)
        subDays(mockToday, 3).toISOString(), // Friday
        subDays(mockToday, 5).toISOString(), // Wednesday
        subDays(mockToday, 7).toISOString(), // Monday
        subDays(mockToday, 10).toISOString(), // Friday
      ],
    });

    // Should count today (1) + the last 4 due dates that were completed (4) = 5
    expect(calculateStreak(habit, mockToday)).toBe(5);
  });

  test("streak should break if a due date was missed", () => {
    // Let's say today is Monday for this test
    const mockToday = new Date(2025, 2, 3); // Monday, March 3, 2025
    mockToday.setHours(0, 0, 0, 0);

    // Create a habit due on Mon, Wed, Fri but Wednesday was missed
    const habit = createTestHabit({
      frequency: ["monday", "wednesday", "friday"],
      completedDates: [
        mockToday.toISOString(), // Monday (today)
        subDays(mockToday, 3).toISOString(), // Friday
        // Missing Wednesday
        subDays(mockToday, 7).toISOString(), // Monday
      ],
    });

    // Should only count today (1) + Friday (1) = 2, since Wednesday was missed
    expect(calculateStreak(habit, mockToday)).toBe(2);
  });

  test("streak should ignore non-due dates", () => {
    // Let's say today is Monday for this test
    const mockToday = new Date(2025, 2, 3); // Monday, March 3, 2025
    mockToday.setHours(0, 0, 0, 0);

    // Create a habit due only on Mondays
    const habit = createTestHabit({
      frequency: ["monday"],
      completedDates: [
        mockToday.toISOString(), // Monday (today)
        subDays(mockToday, 7).toISOString(), // Last Monday
        subDays(mockToday, 14).toISOString(), // Monday two weeks ago
      ],
    });

    // Should count all 3 Mondays
    expect(calculateStreak(habit, mockToday)).toBe(3);
  });

  test('streak should handle "every day" frequency correctly', () => {
    // Let's say today is Monday for this test
    const mockToday = new Date(2025, 2, 3); // Monday, March 3, 2025
    mockToday.setHours(0, 0, 0, 0);

    // Create a habit due every day, with a couple of misses
    const habit = createTestHabit({
      frequency: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
      completedDates: [
        mockToday.toISOString(), // Monday (today)
        subDays(mockToday, 1).toISOString(), // Sunday
        subDays(mockToday, 2).toISOString(), // Saturday
        // Missed Friday
        subDays(mockToday, 4).toISOString(), // Thursday
        subDays(mockToday, 5).toISOString(), // Wednesday
      ],
    });

    // Should count today (1) + Sunday (1) + Saturday (1) = 3, since Friday was missed
    expect(calculateStreak(habit, mockToday)).toBe(3);
  });

  test("streak should be 0 for future dates that are not yet due", () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find a day that's not today
    const futureDayName = getDayName(
      new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2)
    );

    // Create a habit due on that future day
    const habit = createTestHabit({
      frequency: [futureDayName],
      completedDates: [
        subDays(today, 7).toISOString(), // Last week
        subDays(today, 14).toISOString(), // Two weeks ago
      ],
    });

    // Streak should be 0 since it's not due today and not completed today
    expect(calculateStreak(habit, today)).toBe(0);
  });
});
