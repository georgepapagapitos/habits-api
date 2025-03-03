import { format, addDays, isSameDay } from "date-fns";
import { parseISO } from "date-fns";

describe("Habit Utility Functions", () => {
  // Test utility to check if two dates are the same day
  const areSameDates = (
    date1: Date | string,
    date2: Date | string
  ): boolean => {
    const d1 = typeof date1 === "string" ? parseISO(date1) : date1;
    const d2 = typeof date2 === "string" ? parseISO(date2) : date2;
    return isSameDay(d1, d2);
  };

  describe("Date Comparison", () => {
    test("correctly identifies same dates in ISO format", () => {
      const date1 = "2025-03-02T12:00:00.000Z";
      const date2 = "2025-03-02T18:30:00.000Z";

      expect(areSameDates(date1, date2)).toBe(true);
    });

    test("identifies different dates", () => {
      const date1 = "2025-03-02T12:00:00.000Z";
      const date2 = "2025-03-03T12:00:00.000Z";

      expect(areSameDates(date1, date2)).toBe(false);
    });

    test("handles Date objects and strings", () => {
      const date1 = new Date("2025-03-02T12:00:00.000Z");
      const date2 = "2025-03-02T18:30:00.000Z";

      expect(areSameDates(date1, date2)).toBe(true);
    });
  });

  describe("Date Formatting", () => {
    test("formats dates consistently", () => {
      const date = new Date("2025-03-02T12:00:00.000Z");
      const formatted = format(date, "yyyy-MM-dd");

      expect(formatted).toBe("2025-03-02");
    });

    test("maintains date when adding zero days", () => {
      const date = new Date("2025-03-02T12:00:00.000Z");
      const newDate = addDays(date, 0);

      expect(areSameDates(date, newDate)).toBe(true);
    });

    test("correctly adds days to a date", () => {
      const date = new Date("2025-03-02T12:00:00.000Z"); // March 2, 2025
      const newDate = addDays(date, 5);
      const expected = new Date("2025-03-07T12:00:00.000Z"); // March 7, 2025

      expect(areSameDates(newDate, expected)).toBe(true);
    });

    test("handles crossing month boundaries", () => {
      const date = new Date("2025-03-30T12:00:00.000Z"); // March 30, 2025
      const newDate = addDays(date, 3);
      const expected = new Date("2025-04-02T12:00:00.000Z"); // April 2, 2025

      expect(areSameDates(newDate, expected)).toBe(true);
    });

    test("handles crossing year boundaries", () => {
      const date = new Date("2025-12-30T12:00:00.000Z"); // December 30, 2025
      const newDate = addDays(date, 3);
      const expected = new Date("2026-01-02T12:00:00.000Z"); // January 2, 2026

      expect(areSameDates(newDate, expected)).toBe(true);
    });
  });

  describe("Leap Year Handling", () => {
    test("correctly handles February 28 in a non-leap year", () => {
      const date = new Date("2025-02-28T12:00:00.000Z"); // Not a leap year
      const newDate = addDays(date, 1);
      const expected = new Date("2025-03-01T12:00:00.000Z");

      expect(areSameDates(newDate, expected)).toBe(true);
    });

    test("correctly handles February 28 in a leap year", () => {
      const date = new Date("2024-02-28T12:00:00.000Z"); // Leap year
      const newDate = addDays(date, 1);
      const expected = new Date("2024-02-29T12:00:00.000Z");

      expect(areSameDates(newDate, expected)).toBe(true);
    });

    test("correctly handles February 29 in a leap year", () => {
      const date = new Date("2024-02-29T12:00:00.000Z"); // Leap year
      const newDate = addDays(date, 1);
      const expected = new Date("2024-03-01T12:00:00.000Z");

      expect(areSameDates(newDate, expected)).toBe(true);
    });
  });
});
