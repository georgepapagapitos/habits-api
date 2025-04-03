import { HabitDocument } from "../types/habit.types";
import { isSameDay } from "date-fns";

// Mock date-fns-tz methods to prevent timezone issues in tests
jest.mock("date-fns-tz", () => ({
  toZonedTime: (date: Date) => date,
  getTimezoneOffset: () => 0,
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

  // Convert completed dates to Date objects and normalize to start of day
  const completedDates = habit.completedDates.map((date) => {
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);
    return dateObj;
  });

  // Sort completed dates from newest to oldest
  completedDates.sort((a, b) => b.getTime() - a.getTime());

  // Get the most recent completion
  const mostRecentCompletion = completedDates[0];

  // Check if completed today
  const isCompletedToday = completedDates.some(
    (date) => date.getTime() === todayStart.getTime()
  );

  // If today is a due date and not completed, streak is 0
  if (isDueToday && !isCompletedToday) {
    return 0;
  }

  // Start with current day's completion state
  let streak = isCompletedToday ? 1 : 0;

  // If not completed today but has recent completions, check if streak can be continued
  if (!isCompletedToday && mostRecentCompletion) {
    const daysSinceLastCompletion = Math.floor(
      (todayStart.getTime() - mostRecentCompletion.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    // If completed yesterday, start streak at 1
    if (daysSinceLastCompletion === 1) {
      streak = 1;
    }
    // If more than one day since last completion, check if due dates were missed
    else if (daysSinceLastCompletion > 1) {
      let missedDueDate = false;
      const checkDate = new Date(todayStart);
      checkDate.setDate(checkDate.getDate() - 1); // Start from yesterday

      // Check each day between yesterday and last completion
      while (
        checkDate.getTime() > mostRecentCompletion.getTime() &&
        !missedDueDate
      ) {
        const checkDayIndex = checkDate.getDay();
        const isDueOnCheckDate = frequencyIndices.includes(checkDayIndex);
        const isCompletedOnCheckDate = completedDates.some(
          (date) => date.getTime() === checkDate.getTime()
        );

        // If this was a due date but not completed, streak is broken
        if (isDueOnCheckDate && !isCompletedOnCheckDate) {
          missedDueDate = true;
        }

        // Move to the previous day
        checkDate.setDate(checkDate.getDate() - 1);
      }

      // If no missed due dates, set streak to 1 to encourage continuing
      if (!missedDueDate) {
        streak = 1;
      }
    }
  }

  // Count consecutive completed dates going backward
  if (streak > 0 || isCompletedToday) {
    // Adjust starting point for backward count
    const checkDate = isCompletedToday
      ? new Date(todayStart)
      : new Date(mostRecentCompletion);

    let consecutiveDaysChecked = 0;
    let lastCompletedDate = checkDate;

    // Only go back 365 days at most (to prevent infinite loops)
    while (consecutiveDaysChecked < 365) {
      consecutiveDaysChecked++;

      // Check if this day is a due date
      const dayIndex = checkDate.getDay();
      const isDueDate = frequencyIndices.includes(dayIndex);

      // Check if this date was completed
      const wasCompleted = completedDates.some(
        (date) => date.getTime() === checkDate.getTime()
      );

      // Calculate days since last completed date
      const daysSinceLastCompleted = Math.floor(
        (lastCompletedDate.getTime() - checkDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      if (isDueDate) {
        // This is a due date
        if (wasCompleted) {
          // This due date was completed, add to streak
          streak++;
          lastCompletedDate = new Date(checkDate);
        } else if (daysSinceLastCompleted > 1) {
          // This due date was missed and there's a gap - break the streak
          break;
        }
      } else if (wasCompleted && daysSinceLastCompleted <= 1) {
        // This is a non-due date but was completed anyway (bonus)
        streak++;
        lastCompletedDate = new Date(checkDate);
      }

      // Move to the previous day
      checkDate.setDate(checkDate.getDate() - 1);
    }
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

  // Helper to create a date for a specific day of the week
  const createDateForDay = (dayName: string, offset = 0): Date => {
    const days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const dayIndex = days.indexOf(dayName.toLowerCase());
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    const currentDay = date.getDay();
    const daysToAdd = (dayIndex - currentDay + 7) % 7;
    date.setDate(date.getDate() + daysToAdd + offset * 7);
    return date;
  };

  test("streak should count consecutive completions", () => {
    const habit = {
      frequency: ["monday", "wednesday", "friday"],
      completedDates: [
        new Date("2024-04-01T00:00:00.000Z"), // Monday
        new Date("2024-04-02T00:00:00.000Z"), // Tuesday
        new Date("2024-04-03T00:00:00.000Z"), // Wednesday
      ],
      startDate: new Date("2024-04-01T00:00:00.000Z"),
      name: "Test Habit",
      description: "Test Description",
      color: "#000000",
      icon: "check",
      timeOfDay: "anytime",
      active: true,
      userId: "test-user",
      userTimezone: "UTC",
      showReward: false,
    } as unknown as HabitDocument;

    const today = new Date("2024-04-04T00:00:00.000Z"); // Thursday

    // Should be 0 since today is not completed
    expect(calculateStreak(habit, today)).toBe(0);

    // Add today's completion - streak should be 5
    habit.completedDates?.push(today);
    expect(calculateStreak(habit, today)).toBe(5);
  });

  test("streak should break on missed due date", () => {
    const habit = {
      frequency: ["monday", "wednesday", "friday"],
      completedDates: [
        new Date("2024-04-01T00:00:00.000Z"), // Monday
        new Date("2024-04-03T00:00:00.000Z"), // Wednesday
        new Date("2024-04-05T00:00:00.000Z"), // Friday
      ],
      startDate: new Date("2024-04-01T00:00:00.000Z"),
      name: "Test Habit",
      description: "Test Description",
      color: "#000000",
      icon: "check",
      timeOfDay: "anytime",
      active: true,
      userId: "test-user",
      userTimezone: "UTC",
      showReward: false,
    } as unknown as HabitDocument;

    const today = new Date("2024-04-06T00:00:00.000Z"); // Saturday

    // Should be 0 since today is not completed
    expect(calculateStreak(habit, today)).toBe(0);

    // Add today's completion - streak should be 3
    habit.completedDates?.push(today);
    expect(calculateStreak(habit, today)).toBe(3);
  });

  test("streak should handle non-due day completions", () => {
    const habit = {
      frequency: ["monday", "wednesday", "friday"],
      completedDates: [
        new Date("2024-04-01T00:00:00.000Z"), // Monday
        new Date("2024-04-02T00:00:00.000Z"), // Tuesday (non-due day)
        new Date("2024-04-03T00:00:00.000Z"), // Wednesday
        new Date("2024-04-04T00:00:00.000Z"), // Thursday (non-due day)
        new Date("2024-04-05T00:00:00.000Z"), // Friday
      ],
      startDate: new Date("2024-04-01T00:00:00.000Z"),
      name: "Test Habit",
      description: "Test Description",
      color: "#000000",
      icon: "check",
      timeOfDay: "anytime",
      active: true,
      userId: "test-user",
      userTimezone: "UTC",
      showReward: false,
    } as unknown as HabitDocument;

    const today = new Date("2024-04-06T00:00:00.000Z"); // Saturday

    // Should be 0 since today is not completed
    expect(calculateStreak(habit, today)).toBe(0);

    // Add today's completion - streak should be 7
    habit.completedDates?.push(today);
    expect(calculateStreak(habit, today)).toBe(7);
  });

  test("streak should handle today's due date correctly", () => {
    const habit = {
      frequency: ["monday", "wednesday", "friday"],
      completedDates: [
        new Date("2024-04-01T00:00:00.000Z"), // Monday
        new Date("2024-04-03T00:00:00.000Z"), // Wednesday
      ],
      startDate: new Date("2024-04-01T00:00:00.000Z"),
      name: "Test Habit",
      description: "Test Description",
      color: "#000000",
      icon: "check",
      timeOfDay: "anytime",
      active: true,
      userId: "test-user",
      userTimezone: "UTC",
      showReward: false,
    } as unknown as HabitDocument;

    const today = new Date("2024-04-05T00:00:00.000Z"); // Friday

    // Should be 0 since today is not completed
    expect(calculateStreak(habit, today)).toBe(0);

    // Add today's completion - streak should be 2
    habit.completedDates?.push(today);
    expect(calculateStreak(habit, today)).toBe(2);
  });

  test("streak should handle multiple non-due day completions", () => {
    const habit = {
      frequency: ["monday", "wednesday", "friday"],
      completedDates: [
        new Date("2024-04-01T00:00:00.000Z"), // Monday
        new Date("2024-04-02T00:00:00.000Z"), // Tuesday (non-due day)
        new Date("2024-04-03T00:00:00.000Z"), // Wednesday
        new Date("2024-04-04T00:00:00.000Z"), // Thursday (non-due day)
        new Date("2024-04-05T00:00:00.000Z"), // Friday
        new Date("2024-04-06T00:00:00.000Z"), // Saturday (non-due day)
        new Date("2024-04-07T00:00:00.000Z"), // Sunday (non-due day)
      ],
      startDate: new Date("2024-04-01T00:00:00.000Z"),
      name: "Test Habit",
      description: "Test Description",
      color: "#000000",
      icon: "check",
      timeOfDay: "anytime",
      active: true,
      userId: "test-user",
      userTimezone: "UTC",
      showReward: false,
    } as unknown as HabitDocument;

    const today = new Date("2024-04-08T00:00:00.000Z"); // Monday

    // Should be 8 since all days are completed
    expect(calculateStreak(habit, today)).toBe(8);

    // Add today's completion - streak should be 9
    habit.completedDates?.push(today);
    expect(calculateStreak(habit, today)).toBe(9);
  });

  test("streak should handle gaps in completions", () => {
    const habit = {
      frequency: ["monday", "wednesday", "friday"],
      completedDates: [
        new Date("2024-04-01T00:00:00.000Z"), // Monday
        new Date("2024-04-03T00:00:00.000Z"), // Wednesday
        new Date("2024-04-05T00:00:00.000Z"), // Friday
        new Date("2024-04-08T00:00:00.000Z"), // Monday (next week)
      ],
      startDate: new Date("2024-04-01T00:00:00.000Z"),
      name: "Test Habit",
      description: "Test Description",
      color: "#000000",
      icon: "check",
      timeOfDay: "anytime",
      active: true,
      userId: "test-user",
      userTimezone: "UTC",
      showReward: false,
    } as unknown as HabitDocument;

    const today = new Date("2024-04-09T00:00:00.000Z"); // Tuesday

    // Should be 0 since today is not completed
    expect(calculateStreak(habit, today)).toBe(0);

    // Add today's completion - streak should be 3
    habit.completedDates?.push(today);
    expect(calculateStreak(habit, today)).toBe(3);
  });
});
