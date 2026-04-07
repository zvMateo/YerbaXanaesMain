import { Request } from 'express';
import { Session, User } from '@prisma/client';

export type SessionWithUser = Session & { user: User };

export interface AuthenticatedRequest extends Request {
  user?: User;
  session?: SessionWithUser;
}
