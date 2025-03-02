import cron from 'node-cron';
import { Habit } from '../models/habit.model';
import { User } from '../models/user.model';

/**
 * Schedule jobs to run at specific intervals
 */
export const setupScheduler = () => {
  // Run at midnight every day
  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily habit check...');
    await resetDailyHabitStatus();
  });
};

/**
 * Resets habit statuses each day and calculates streaks
 */
const resetDailyHabitStatus = async () => {
  try {
    // Get today's day of week (0 = Sunday, 1 = Monday, etc.)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const todayName = daysOfWeek[dayOfWeek];
    
    console.log(`Today is ${todayName}`);
    
    // Get all active users
    const users = await User.find({});
    
    for (const user of users) {
      // Get all active habits for this user that are due today
      const habits = await Habit.find({ 
        userId: user._id,
        active: true,
        frequency: { $in: [todayName] }
      });
      
      console.log(`User ${user.username} has ${habits.length} habits due today`);
      
      // For each habit, check and update streak if needed
      for (const habit of habits) {
        // Set today's date with midnight time
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        
        // Check if habit is already completed for today
        const isCompletedToday = habit.isCompletedForDate(todayDate);
        
        // If not completed, update the streak calculation
        // This will automatically reduce streak if a day was missed
        if (!isCompletedToday) {
          // This will trigger the pre-save middleware to recalculate the streak
          await habit.save();
        }
      }
    }
    
    console.log('Daily habit check completed');
  } catch (error) {
    console.error('Error running daily habit check:', error);
  }
};