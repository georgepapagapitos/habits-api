import { Router } from "express";
import habitRoutes from "./habit.routes";

const router = Router();

// Health check route
router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// API routes
router.use("/api/habits", habitRoutes);

export default router;
