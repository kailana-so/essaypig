import type { Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';
import '../services/firebase'; // ensures the admin app is initialised

export interface AuthedRequest extends Request {
  uid?: string;
}

// Verifies the Firebase ID token sent as `Authorization: Bearer <token>`
// and exposes the verified uid on the request. Routes must use this uid —
// never a userId supplied by the client.
export const requireAuth = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;

  if (!token) {
    return res.status(401).json({ error: 'Not signed in' });
  }

  try {
    const decoded = await getAuth().verifyIdToken(token);
    req.uid = decoded.uid;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
};
