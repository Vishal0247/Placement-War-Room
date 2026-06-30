import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user?: { uid: string, email: string };
}

/**
 * Hackathon Dummy Auth middleware — verifies the Bearer token from the Authorization header
 * and uses it directly as the user's unique ID.
 */
export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing token' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];
  
  // Token is just the username for hackathon
  if (token) {
    req.user = { uid: token, email: `${token}@placement-war.app` };
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
