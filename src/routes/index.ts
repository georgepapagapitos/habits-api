import { Router } from "express";
import authRoutes from "./auth.routes";
import habitRoutes from "./habit.routes";
import photoRoutes from "./photo.routes";

const router = Router();

// API routes
router.use("/habits", habitRoutes);
router.use("/auth", authRoutes);
router.use("/photos", photoRoutes);

export default router;
