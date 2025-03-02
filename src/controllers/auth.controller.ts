import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { User } from "../models/user.model";
import { AuthRequest, AuthResponse, LoginRequest } from "../types/user.types";

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
      res.status(400).json({
        message: "User already exists",
        field: existingUser.email === email ? "email" : "username",
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
    res.status(500).json({ message: "Server error during registration" });
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
      res.status(400).json({
        message: "Invalid credentials",
        field: "email",
      });
      return;
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      res.status(400).json({
        message: "Invalid credentials",
        field: "password",
      });
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
    res.status(500).json({ message: "Server error during login" });
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
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching user" });
  }
};
