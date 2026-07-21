import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { userModel } from "../models/user.model";

export const authService = {
  async login(email: string, password: string) {
    // Find user
    const user = await userModel.findByEmail(email);

    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    console.log(isMatch);

    if (!isMatch) {
      throw new Error("Invalid email or password");
    }

    /* old code
    // Check account status
    if (user.status !== "active") {
      throw new Error("Account is banned");
    }
    */

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "1d",
      }
    );

    // Return response
    // ??$$$
    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };
  },

  async signup(name: string, email: string, password: string) {
    // Check if user already exists
    const existingUser = await userModel.findByEmail(email);

    if (existingUser) {
      throw new Error("User already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await userModel.create(
      name,
      email,
      hashedPassword,
      "student", // default role
      "active"   // default status
    );

    // Generate JWT
    const token = jwt.sign(
      {
        id: newUser.id,
        role: newUser.role,
      },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "1d",
      }
    );

    // Return response
    // ??$$$
    return {
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
      },
    };
  },

};