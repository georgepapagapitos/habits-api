import { NextFunction, Request, Response } from "express";
import Joi from "joi";
import { AuthRequest, LoginRequest } from "../types/user.types";

export const validateRegister = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const schema = Joi.object({
    username: Joi.string().min(3).max(50).required().messages({
      "string.min": "Username must be at least 3 characters long",
      "string.max": "Username must be at most 50 characters long",
      "any.required": "Username is required",
    }),
    email: Joi.string().email().required().messages({
      "string.email": "Invalid email format",
      "any.required": "Email is required",
    }),
    password: Joi.string().min(6).required().messages({
      "string.min": "Password must be at least 6 characters long",
      "any.required": "Password is required",
    }),
  });

  const { error } = schema.validate(req.body as AuthRequest);

  if (error) {
    res.status(400).json({
      message: "Validation Error",
      details: error.details[0].message,
    });
    return;
  }

  next();
};

export const validateLogin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const schema = Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Invalid email format",
      "any.required": "Email is required",
    }),
    password: Joi.string().required().messages({
      "any.required": "Password is required",
    }),
  });

  const { error } = schema.validate(req.body as LoginRequest);

  if (error) {
    res.status(400).json({
      message: "Validation Error",
      details: error.details[0].message,
    });
    return;
  }

  next();
};
