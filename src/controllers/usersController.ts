// CRUD operations for users in an Express application using PostgreSQL
// -- Users table (base for all accounts)
// CREATE TABLE users (
//     user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
//     role user_role NOT NULL,
//     name VARCHAR(100) NOT NULL,
//     email VARCHAR(100) UNIQUE NOT NULL,
//     phone VARCHAR(13) UNIQUE NOT NULL CHECK (phone LIKE '+254%'),
//     password_hash VARCHAR(255) NOT NULL,
//     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
//     updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
// );

import { Request, Response } from "express";
import pool from "../config/db.config";
import asyncHandler from "../middlewares/asyncHandler";
import { UserRequest } from "../utils/types/userTypes";

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
    const query = `
        SELECT 
            user_id, 
            name, 
            email, 
            phone, 
            role, 
            created_at
        FROM users 
        ORDER BY created_at DESC
    `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const query = `
        SELECT 
            user_id, 
            name, 
            email, 
            phone, 
            role, 
            created_at
        FROM users 
        WHERE user_id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        res.status(404);
        throw new Error("User not found");
    }

    res.status(200).json(result.rows[0]);
});

// @desc    Create a new user
// @route   POST /api/users
// @access  Public
export const createUser = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, phone, password, role = 'customer' } = req.body;

    // Check if user already exists
    const existingUser = await pool.query(
        "SELECT user_id FROM users WHERE email = $1 OR phone = $2",
        [email, phone]
    );

    if (existingUser.rows.length > 0) {
        res.status(400);
        throw new Error("User with this email or phone already exists");
    }

    const query = `
        INSERT INTO users (
            name, 
            email, 
            phone, 
            password_hash, 
            role
        ) 
        VALUES ($1, $2, $3, $4, $5)
        RETURNING 
            user_id, 
            name, 
            email, 
            phone, 
            role, 
            created_at
    `;

    const result = await pool.query(query, [
        name,
        email,
        phone,
        password, // Note: You should hash this password before storing
        role
    ]);

    res.status(201).json(result.rows[0]);
});

// @desc    Update user profile
// @route   PUT /api/users/:id
// @access  Private
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, email, phone, role, terms, newsletter } = req.body;

    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let index = 1;

    if (name) {
        fieldsToUpdate.push(`name = $${index++}`);
        values.push(name);
    }
    if (email) {
        fieldsToUpdate.push(`email = $${index++}`);
        values.push(email);
    }
    if (phone) {
        fieldsToUpdate.push(`phone = $${index++}`);
        values.push(phone);
    }
    if (role) {
        fieldsToUpdate.push(`role = $${index++}`);
        values.push(role);
    }
    if (terms) {
        fieldsToUpdate.push(`terms = $${index++}`);
        values.push(terms);
    }
    if (newsletter) {
        fieldsToUpdate.push(`newsletter = $${index++}`);
        values.push(newsletter);
    }

    if (fieldsToUpdate.length === 0) {
        return res.status(400).json({ message: "No fields provided for update" });
    }

    // Check for email/phone conflicts if those fields are being updated
    if (email || phone) {
        const conflictQuery = `
            SELECT user_id FROM users
            WHERE (email = $1 OR phone = $2)
            AND user_id != $3
        `;
        const conflictResult = await pool.query(conflictQuery, [
            email ?? null,
            phone ?? null,
            id
        ]);
        if (conflictResult.rows.length > 0) {
            return res.status(400).json({ message: "Email or phone number already in use by another account" });
        }
    }

    fieldsToUpdate.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
        UPDATE users
        SET ${fieldsToUpdate.join(", ")}
        WHERE user_id = $${index++}
        RETURNING user_id, name, email, phone, role, created_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(result.rows[0]);
});

// @desc    Delete a user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Verify user exists
    const userExists = await pool.query(
        "SELECT user_id FROM users WHERE user_id = $1",
        [id]
    );

    if (userExists.rows.length === 0) {
        res.status(404);
        throw new Error("User not found");
    }

    // First delete dependent records (addresses, etc.)
    await pool.query("DELETE FROM addresses WHERE user_id = $1", [id]);

    // Then delete the user
    await pool.query("DELETE FROM users WHERE user_id = $1", [id]);

    res.status(200).json({
        success: true,
        message: "User deleted successfully"
    });
});

// @desc    Get current user profile
// @route   GET /api/users/userLoggedIn
// @access  Public (but returns user only if authenticated)
export const getCurrentUser = asyncHandler(async (req: UserRequest, res: Response) => {
    // Check if user is authenticated
    const userId = req.user?.user_id;
    
    // If no user, return null instead of throwing error
    if (!userId) {
        return res.status(200).json({ 
            authenticated: false,
            user: null,
            seller: null
        });
    }

    const query = `
        SELECT 
            user_id,
            name, 
            email, 
            phone,
            role,
            terms,
            newsletter,
            last_login,
            created_at
        FROM users 
        WHERE user_id = $1
    `;
    const userQuery = await pool.query(query, [userId]);

    if (userQuery.rows.length === 0) {
        return res.status(200).json({ 
            authenticated: false,
            user: null,
            seller: null
        });
    }

    // Check if user is a seller and fetch seller details if applicable
    let sellerData = null;
    if (userQuery.rows[0].role === 'seller') {
        const sellerQuery = await pool.query(
            `SELECT seller_id, business_name, tax_id, business_license, total_sales
             FROM sellers
             WHERE user_id = $1`,
            [userId]
        );
        if (sellerQuery.rows.length > 0) {
            sellerData = sellerQuery.rows[0];
        }
    }

    // Construct the response
    const result = {
        authenticated: true,
        user: userQuery.rows[0],
        ...(sellerData && { seller: sellerData })
    };
    
    res.status(200).json(result);
});


// @desc    Get current user profile
// @route   GET /api/users/me
// @access  Private

// Get user profile from users table and addresses table
export const getCurrentUserProfile = asyncHandler(async (req: UserRequest, res: Response) => {
    const { id } = req.params;

    if (!id) {
        res.status(400);
        throw new Error("User ID parameter is required");
    }

    const query = `
        SELECT 
            u.user_id, 
            u.name, 
            u.email, 
            u.phone, 
            u.role, 
            u.created_at,
            a.address_id,
            a.city,
            a.street,
            a.building,
            a.postal_code,
            a.is_default
        FROM users u
        LEFT JOIN addresses a ON u.user_id = a.user_id
        WHERE u.user_id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        res.status(404);
        throw new Error("User not found");
    }

    res.status(200).json(result.rows[0]);
});

// Total number of customers
export const getCustomerCount = asyncHandler(async (req: UserRequest, res: Response) => {
    try {
        const query = `SELECT COUNT(*) AS customercount FROM users WHERE role = 'customer' `;
        const result = await pool.query(query);

        const customerCount: number = parseInt(result.rows[0].customercount, 10);

        res.status(200).json({ customerCount })

    } catch (error) {
        console.error("Error fetching customer count:", error);
        res.status(500).json({ message: "Internal server error" });
    }
})
