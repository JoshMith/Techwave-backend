import { Response, NextFunction } from "express";
import asyncHandler from "../asyncHandler";
import { UserRequest } from "../../utils/types/userTypes";
import { ownUserMiddleware } from "./ownUserMiddleware";


//ensure user has required roles 
export const roleGuard = (allowedRoles: string[]) =>
    asyncHandler<void, UserRequest>(async (req:UserRequest, res:Response, next:NextFunction) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            res.status(403).json({ message: "Access denied: Insufficient permissions" });
            return;
        }
        next();
    });



// Specific guards
export const adminGuard = roleGuard(["admin"]);         // Full app control
export const sellerGuard = roleGuard(["seller"]); // Event creation & management
export const customerGuard = roleGuard(["customer"]);   // Attendee-only actions
export const userGuard = roleGuard(["customer", "seller", "admin"]); // General user actions
export const adminCustomerGuard = roleGuard(["admin", "customer"]); // Admin and customer actions
export const adminSellerGuard = roleGuard(["admin", "seller"]); // Admin and seller actions
export const ownUserGuard = ownUserMiddleware; // Middleware to ensure user is accessing their own data

