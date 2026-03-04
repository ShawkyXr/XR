import { NextFunction, Request, Response } from 'express';
import { ERROR_CODES, HTTP_STATUS } from '../config/constants';

type AppError = Error & {
    statusCode?: number;
    errorCode?: string;
    details?: unknown;
};

export const notFoundHandler = (req: Request, res: Response, _next: NextFunction) => {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: ERROR_CODES.NOT_FOUND,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
};

export const errorHandler = (error: AppError, _req: Request, res: Response, _next: NextFunction) => {
    const statusCode = error.statusCode ?? HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const errorCode = error.errorCode ?? ERROR_CODES.INTERNAL_ERROR;
    const message = error.message || 'Internal Server Error';

    return res.status(statusCode).json({
        error: errorCode,
        message,
        ...(error.details ? { details: error.details } : {}),
    });
};
