import { Router } from "express";
import { habitController } from "../controllers/habit.controller";
import { protect } from "../middleware/auth.middleware";

const router = Router();

// Apply auth protection to all habit routes
router.use(protect);

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

export default router;
