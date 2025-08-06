// CRUD operations for sellers in the Techwave backend
// -- Sellers table (extends users)
// CREATE TABLE sellers (
//     seller_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
//     user_id UUID UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
//     business_name VARCHAR(100) NOT NULL,
//     tax_id VARCHAR(50),
//     business_license VARCHAR(100),
//     total_sales NUMERIC(12, 2) DEFAULT 0,
//     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
// );


// Techwave-backend/src/controllers/sellerController.ts
import { Request, Response } from "express";
import pool from "../config/db.config";
import asyncHandler from "../middlewares/asyncHandler";
import { UserRequest } from "../utils/types/userTypes";

// @desc    Get all sellers (Admin only)
// @route   GET /api/sellers
// @access  Private/Admin
export const getSellers = asyncHandler(async (req: Request, res: Response) => {
    const query = `
        SELECT 
            s.seller_id, 
            u.user_id, 
            u.name, 
            u.email, 
            u.phone, 
            s.business_name, 
            s.tax_id, 
            s.business_license, 
            s.total_sales, 
            s.created_at
        FROM sellers s
        JOIN users u ON s.user_id = u.user_id
        ORDER BY s.created_at DESC
    `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
});


// @desc    Get seller by ID
// @route   GET /api/sellers/:id
// @access  Private
export const getSellerById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const query = `
        SELECT 
            s.seller_id, 
            u.user_id, 
            u.name, 
            u.email, 
            u.phone, 
            s.business_name, 
            s.tax_id, 
            s.business_license, 
            s.total_sales, 
            s.created_at
        FROM sellers s
        JOIN users u ON s.user_id = u.user_id
        WHERE s.seller_id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        res.status(404);
        throw new Error("Seller not found");
    }

    res.status(200).json(result.rows[0]);
});


// @desc    Create a new seller
// @route   POST /api/sellers
// @access  Private
export const createSeller = asyncHandler(async (req: UserRequest, res: Response) => {
    const { business_name, tax_id, business_license } = req.body;
    const userId = req.user?.user_id; // Assuming user is authenticated and user_id is available

    // Check if seller already exists for this user
    const existingSeller = await pool.query(
        "SELECT seller_id FROM sellers WHERE user_id = $1",
        [userId]
    );

    if (existingSeller.rows.length > 0) {
        res.status(400);
        throw new Error("Seller already exists for this user");
    }

    const query = `
        INSERT INTO sellers (
            user_id, 
            business_name, 
            tax_id, 
            business_license
        ) 
        VALUES ($1, $2, $3, $4)
        RETURNING 
            seller_id, 
            user_id, 
            business_name, 
            tax_id, 
            business_license, 
            total_sales, 
            created_at
    `;

    const result = await pool.query(query, [
        userId,
        business_name,
        tax_id,
        business_license
    ]);

    res.status(201).json(result.rows[0]);
});


// @desc    Update seller profile
// @route   PUT /api/sellers/:id
// @access  Private
export const updateSeller = asyncHandler(async (req: UserRequest, res: Response) => {
    const { id } = req.params;
    const { business_name, tax_id, business_license } = req.body;

    // Verify seller exists
    const sellerExists = await pool.query(
        "SELECT seller_id FROM sellers WHERE seller_id = $1",
        [id]
    );

    if (sellerExists.rows.length === 0) {
        res.status(404);
        throw new Error("Seller not found");
    }

    const query = `
        UPDATE sellers 
        SET 
            business_name = $1,
            tax_id = $2,
            business_license = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE seller_id = $4
        RETURNING 
            seller_id, 
            user_id, 
            business_name, 
            tax_id, 
            business_license, 
            total_sales, 
            created_at
    `;

    const result = await pool.query(query, [
        business_name,
        tax_id,
        business_license,
        id
    ]);

    res.status(200).json(result.rows[0]);
});


// @desc    Delete a seller
// @route   DELETE /api/sellers/:id
// @access  Private/Admin
export const deleteSeller = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Verify seller exists
    const sellerExists = await pool.query(
        "SELECT seller_id FROM sellers WHERE seller_id = $1",
        [id]
    );

    if (sellerExists.rows.length === 0) {
        res.status(404);
        throw new Error("Seller not found");
    }

    // Delete the seller
    await pool.query("DELETE FROM sellers WHERE seller_id = $1", [id]);

    res.status(200).json({
        success: true,
        message: "Seller deleted successfully"
    });
});

