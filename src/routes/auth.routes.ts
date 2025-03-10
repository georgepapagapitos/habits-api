import express from "express";
import {
  getCurrentUser,
  loginUser,
  registerUser,
} from "../controllers/auth.controller";
import { protect } from "../middleware/auth.middleware";
import { validateLogin, validateRegister } from "../middleware/auth.validation";
import rateLimit from "express-rate-limit";

// More strict rate limiter for authentication routes to prevent brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for login/register
  message: "Too many requests from this IP, please try again after 15 minutes",
});

const router = express.Router();

// Apply rate limiting to authentication endpoints
router.post("/register", authLimiter, validateRegister, registerUser);
router.post("/login", authLimiter, validateLogin, loginUser);
router.get("/me", protect, getCurrentUser);

export default router;
