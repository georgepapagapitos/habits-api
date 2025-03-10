import { Router } from "express";
import { habitController } from "../controllers/habit.controller";
import { protect } from "../middleware/auth.middleware";
import rateLimit from "express-rate-limit";

const router = Router();

// Set up rate limiter: maximum of 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per windowMs
});

// Apply auth protection to all habit routes
router.use(protect);

// Apply rate limiter to routes that perform expensive operations
router.use(limiter);

// GET statistics for all habits
router.get("/stats", habitController.getStats);

// GET all habits
router.get("/", habitController.getAllHabits);

// GET single habit
router.get("/:id", habitController.getHabitById);

// POST create new habit
router.post("/", habitController.createHabit);

// PUT update habit
router.put("/:id", habitController.updateHabit);

// DELETE habit (soft delete)
router.delete("/:id", habitController.deleteHabit);

// PATCH toggle habit completion
router.patch("/:id/toggle-completion", habitController.toggleCompletion);

// PATCH reset habit (clear all completions and streak)
router.patch("/:id/reset", habitController.resetHabit);

export default router;
