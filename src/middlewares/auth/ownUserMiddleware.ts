// ownUserMiddleware.ts
import { Response, NextFunction } from 'express';
import { UserRequest } from '../../utils/types/userTypes';
import asyncHandler from '../asyncHandler';
// Middleware to check if the user is accessing their own data
export const ownUserMiddleware = asyncHandler(async (req: UserRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.user_id; // Assuming req.user is set by the protect middleware

    if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check if the user is trying to access their own data
    if (req.params.id !== userId) {
        return res.status(403).json({ message: 'Forbidden: You can only access your own data' });
    }

    next(); // Proceed to the next middleware or route handler
});