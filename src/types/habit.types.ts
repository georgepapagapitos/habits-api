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
  userId?: string; // For future authentication
}

export interface HabitDocument extends HabitBase, Document {
  createdAt: Date;
  updatedAt: Date;
  isCompletedForDate(date: Date): boolean;
}
