import { Router } from "express";
import { habitController } from "../controllers/habit.controller";

const router = Router();

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
