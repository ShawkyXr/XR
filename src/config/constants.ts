export const PORT = process.env.PORT || 1234;
export const MONGODB_URI = process.env.MONGODB_URI;
export const SECRET_KEY = process.env.SECRET_KEY;

if (!MONGODB_URI) {
    throw new Error('Error: MONGODB_URI is not defined in environment variables');
}

if (!SECRET_KEY) {
    throw new Error('Error: SECRET_KEY is not defined in environment variables');
}

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
} as const;

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const;
