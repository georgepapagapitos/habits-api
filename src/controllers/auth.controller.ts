import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { User } from "../models/user.model";
import { AuthRequest, AuthResponse, LoginRequest } from "../types/user.types";
import {
  sendErrorResponse,
  createConflictError,
  createNotFoundError,
  createUnauthorizedError,
} from "../utils/error.utils";

// Generate JWT Token
const generateToken = (id: string, username: string, email: string) => {
  return jwt.sign(
    { id, username, email },
    process.env.JWT_SECRET || "default_secret",
    { expiresIn: "30d" }
  );
};

// @desc    Register new user
// @route   POST /api/auth/register
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { username, email, password }: AuthRequest = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      const field = existingUser.email === email ? "email" : "username";
      sendErrorResponse(res, 409, `User with this ${field} already exists`, {
        field,
      });
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    // Generate token
    const token = generateToken(user._id.toString(), user.username, user.email);

    const response: AuthResponse = {
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
      },
    };

    res.status(201).json(response);
  } catch (error) {
    console.error(error);
    sendErrorResponse(res, 500, "Server error during registration", error);
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password }: LoginRequest = req.body;

    // Check for user
    const user = await User.findOne({ email });

    if (!user) {
      sendErrorResponse(res, 401, "Invalid credentials", { field: "email" });
      return;
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      sendErrorResponse(res, 401, "Invalid credentials", { field: "password" });
      return;
    }

    // Generate token
    const token = generateToken(user._id.toString(), user.username, user.email);

    const response: AuthResponse = {
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
      },
    };

    res.json(response);
  } catch (error) {
    console.error(error);
    sendErrorResponse(res, 500, "Server error during login", error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
export const getCurrentUser = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user || !req.user.id) {
      sendErrorResponse(res, 401, "Not authorized");
      return;
    }

    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      sendErrorResponse(res, 404, "User not found");
      return;
    }

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    console.error(error);
    sendErrorResponse(res, 500, "Server error fetching user", error);
  }
};
