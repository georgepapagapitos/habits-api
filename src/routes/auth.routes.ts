import express from "express";
import {
  registerUser,
  loginUser,
  getCurrentUser,
} from "../controllers/auth.controller";
import { validateLogin, validateRegister } from "../middleware/auth.validation";
import { protect } from "../middleware/auth.middleware";

const router = express.Router();

router.post("/register", validateRegister, registerUser);
router.post("/login", validateLogin, loginUser);
router.get("/me", protect, getCurrentUser);

export default router;
