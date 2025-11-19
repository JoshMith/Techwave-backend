import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import pool from "../../config/db.config";
import { UserRequest } from "../../utils/types/userTypes";
import asyncHandler from "../asyncHandler";



//Auth middleware to protect routes 
export const protect = asyncHandler(async (req: UserRequest, res: Response, next: NextFunction) => {
    let token;

    // 1. Try to get token from Authorization header (RECOMMENDED for production)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Remove 'Bearer ' prefix
        console.log('✅ Token found in Authorization header');
    }

    //get the token from cookies 
    if (!token && req.cookies?.access_token) {
        token = req.cookies.access_token;
        console.log('✅ Token found in cookie');
    }

    //if no token found
    if (!token) {
        console.log('❌ No token found in request');
        res.status(401);
        throw new Error('Not authorized, no token! Login');
    }

    try {
        //we have the token but we nneed to verify it using JWT_SECRET
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not defined in environment variables");
        }

        //verify token 
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: string; email: string; role: number };

        //get the user from database
        const userQuery = await pool.query(
            "SELECT user_id, name, email, role, last_login FROM users WHERE user_id = $1",
            [decoded.userId]
        );

        if (userQuery.rows.length === 0) {
            res.status(401).json({ message: "User not found" });
            return;
        }

        //attach the user to the request 
        req.user = userQuery.rows[0]
        console.log('✅ User authenticated:', req.user?.user_id);
        next() //proceed to next thing 

    } catch (error) {
        console.error('❌ Token verification failed:', error);
        res.status(401);
        throw new Error('Not authorized, token failed');

    }
})