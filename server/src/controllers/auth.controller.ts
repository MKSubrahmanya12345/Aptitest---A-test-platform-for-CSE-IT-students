import type { Request, Response } from "express";

import { authService } from "../services/auth.service";

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Basic validation, both fields must exist
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // Call service to validate the request
    const result = await authService.login(email, password);

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(401).json({
      message: error.message || "Login failed",
    });
  }
};

export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required",
      });
    }

    // Call service to create the user
    const result = await authService.signup(name, email, password);

    return res.status(201).json(result);
  } catch (error: any) {
    return res.status(400).json({
      message: error.message || "Signup failed",
    });
  }
};