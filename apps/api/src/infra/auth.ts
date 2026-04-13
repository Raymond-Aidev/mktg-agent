import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "./env.ts";

export interface JwtPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

/**
 * Express middleware that extracts and verifies JWT from the Authorization
 * header. On success, sets req.user with the decoded payload.
 * Falls back to query param tenantId for backward compatibility with
 * unauthenticated demo mode.
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = verifyToken(header.slice(7));
      (req as Request & { user?: JwtPayload }).user = payload;
    } catch {
      // Invalid token — continue without user (backward compat)
    }
  }
  next();
}

/**
 * Require authenticated user. Returns 401 if no valid JWT.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const user = (req as Request & { user?: JwtPayload }).user;
  if (!user) {
    res.status(401).json({ error: "unauthorized", message: "Login required" });
    return;
  }
  next();
}
