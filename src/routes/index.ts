import { Router } from "express";
import authRoutes from "./auth.routes";
import habitRoutes from "./habit.routes";

const router = Router();

// Health check route
router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// API routes
router.use("/api/habits", habitRoutes);
router.use("/api/auth", authRoutes);

export default router;
