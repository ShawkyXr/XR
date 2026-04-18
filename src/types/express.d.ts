import type { JwtPayload } from '../utils/jwt.util';

declare global {
  namespace Express {
    interface User extends JwtPayload {}
  }
}

export {};