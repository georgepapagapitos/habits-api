# Testing the Habit Completion Feature

This guide explains how to test the habit completion feature, specifically around completing habits on non-due days and tracking streaks.

## Setting Up Test Data

1. Make sure your environment is properly configured with a MongoDB connection string:

   - Check that your `.env` file contains a valid `MONGODB_URI`
   - If you don't have a MongoDB instance, you can use MongoDB Atlas or set up a local instance

2. Seed the test data:

   ```bash
   npm run seed
   ```

   This will create:

   - A test user with email `test@example.com` and password `password123`
   - Four sample habits with different completion patterns:
     - "Daily Exercise" - A daily habit with a perfect streak
     - "Work on Side Project" - A weekday habit with some missed days
     - "Read a Book" - A Mon/Wed/Fri habit with some non-due day completions
     - "Meal Prep" - A weekend habit that's been missed recently

## Testing the Feature

1. Start the API server:

   ```bash
   npm run dev
   ```

2. Start the UI:

   ```bash
   # From the habits-ui directory
   npm run dev
   ```

3. Log in with:

   - Email: `test@example.com`
   - Password: `password123`

4. Testing scenarios:

   a. Completing a habit on a non-due day:

   - Find "Read a Book" (due Mon/Wed/Fri)
   - Complete it on a Tuesday or Thursday
   - Observe that the streak increases
   - Check the UI feedback message confirming this adds to the streak

   b. Verifying streak maintenance:

   - Find "Work on Side Project" (weekdays only)
   - Complete it on a Saturday or Sunday
   - Verify the streak increases
   - Skip the following Monday
   - Notice the streak does not break because of the weekend completion

   c. Testing the updated UI feedback:

   - Complete any habit on a non-due day
   - Check that the message confirms it adds to your streak

## Verifying in the Database

If you want to verify the data directly in MongoDB:

1. The habit documents have a `completedDates` array with all completions
2. The `streak` field is calculated automatically by the Mongoose pre-save middleware
3. When habits are completed on non-due days, they should:
   - Be stored in the `completedDates` array
   - Contribute to the streak value
   - Prevent the streak from breaking if a due day is missed

## Expected Behavior

- Completing a habit on ANY day (due or not) should increase the streak
- Missing a due day should NOT break the streak if there are completions on other days
- The UI should clearly indicate when a non-due day completion is recorded
