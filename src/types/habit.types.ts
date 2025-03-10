import { Document } from "mongoose";

export interface HabitBase {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  frequency: string[]; // days of week: ['monday', 'wednesday', 'friday']
  timeOfDay?: string;
  startDate: Date;
  streak: number;
  completedDates: Date[];
  active: boolean;
  userId: string;
  userTimezone?: string; // Store user's timezone for correct date calculations
  showReward?: boolean; // Whether to show a reward photo when completing the habit
}

export interface HabitDocument extends HabitBase, Document {
  createdAt: Date;
  updatedAt: Date;
  isCompletedForDate(date: Date): boolean;
}
