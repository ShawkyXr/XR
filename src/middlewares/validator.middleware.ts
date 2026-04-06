import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const UserSchema = z.object({
    username: z.string().min(3, 'Username must be at least 3 characters long').regex(/^[a-z0-9_-]+$/, 'Username can only contain lowercase letters, numbers, underscores, and dashes'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    rememberMe: z.boolean().optional(),
});

export const BlogSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    content: z.string().min(1, 'Content is required'),
});

export const RoomSchema = z.object({
    name: z.string().min(1, 'Room name is required'),
    description: z.string().optional(),
    type: z.enum(['public', 'private'], 'Type must be either public or private'),
    accessCode: z.string().optional(),
}).refine((data) => {
    if (data.type === 'private') {
        return !!data.accessCode;
    }
    return true;
});

export const CommentSchema = z.object({
    content: z.string().min(1, 'Comment content is required'),
});

export const validator = <T>(schema: z.ZodType<T>) => {
    return (req: Request<object, object, T>, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            const errors = result.error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message }));
            return res.status(400).json({ error: 'Validation Error', details: errors });
        }

        req.body = result.data;
        next();
    }
}
