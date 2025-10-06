// CRUD operations for carts
// -- Shopping carts table
// CREATE TABLE carts (
//     cart_id SERIAL PRIMARY KEY,
//     user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
//     session_id VARCHAR(100),
//     status cart_status NOT NULL DEFAULT 'active',
//     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
//     updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
//     CONSTRAINT cart_owner CHECK (
//         (user_id IS NOT NULL AND session_id IS NULL) OR
//         (user_id IS NULL AND session_id IS NOT NULL)
//     )
// );

import express from "express";
import pool from "../config/db.config";
import asyncHandler from "../middlewares/asyncHandler";
import { UserRequest } from "../utils/types/userTypes";

// @desc    Get all carts
// @route   GET /api/carts
// @access  Private/Admin
export const getCarts = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const query = `
        SELECT 
            c.cart_id,
            c.user_id,
            c.session_id,
            c.status,
            c.created_at,
            c.updated_at,
            u.name AS user_name,
            u.email AS user_email,
            COUNT(ci.cart_item_id) AS item_count,
            COALESCE(SUM(ci.quantity * ci.unit_price), 0) AS total_amount
        FROM carts c
        LEFT JOIN users u ON c.user_id = u.user_id
        LEFT JOIN cart_items ci ON c.cart_id = ci.cart_id
        GROUP BY c.cart_id, u.name, u.email
        ORDER BY c.created_at DESC
    `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
});

// @desc    Get cart by ID
// @route   GET /api/carts/:id
// @access  Private
export const getCartById = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;

    const query = `
        SELECT 
            c.cart_id,
            c.user_id,
            c.session_id,
            c.status,
            c.created_at,
            c.updated_at,
            u.name AS user_name,
            u.email AS user_email,
            COUNT(ci.cart_item_id) AS item_count,
            COALESCE(SUM(ci.quantity * ci.unit_price), 0) AS total_amount
        FROM carts c
        LEFT JOIN users u ON c.user_id = u.user_id
        LEFT JOIN cart_items ci ON c.cart_id = ci.cart_id
        WHERE c.cart_id = $1
        GROUP BY c.cart_id, u.name, u.email
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "Cart not found" });
    }

    res.status(200).json(result.rows[0]);
});

// @desc    Get cart by user ID
// @route   GET /api/carts/user/:userId
// @access  Private
export const getCartByUserId = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { userId } = req.params;

    const query = `
        SELECT 
            c.cart_id,
            c.user_id,
            c.status,
            c.created_at,
            c.updated_at,
            COUNT(ci.cart_item_id) AS item_count,
            COALESCE(SUM(ci.quantity * ci.unit_price), 0) AS total_amount
        FROM carts c
        LEFT JOIN cart_items ci ON c.cart_id = ci.cart_id
        WHERE c.user_id = $1 AND c.status = 'active'
        GROUP BY c.cart_id
        ORDER BY c.created_at DESC
        LIMIT 1
    `;
    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "No active cart found for this user" });
    }

    res.status(200).json(result.rows[0]);
});

// @desc    Get cart by session ID
// @route   GET /api/carts/session/:sessionId
// @access  Public
export const getCartBySessionId = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { sessionId } = req.params;

    const query = `
        SELECT 
            c.cart_id,
            c.session_id,
            c.status,
            c.created_at,
            c.updated_at,
            COUNT(ci.cart_item_id) AS item_count,
            COALESCE(SUM(ci.quantity * ci.unit_price), 0) AS total_amount
        FROM carts c
        LEFT JOIN cart_items ci ON c.cart_id = ci.cart_id
        WHERE c.session_id = $1 AND c.status = 'active'
        GROUP BY c.cart_id
        ORDER BY c.created_at DESC
        LIMIT 1
    `;
    const result = await pool.query(query, [sessionId]);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "No active cart found for this session" });
    }

    res.status(200).json(result.rows[0]);
});

// @desc    Create a new cart
// @route   POST /api/carts
// @access  Public
export const createCart = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { user_id, session_id, status = 'active' } = req.body;

    // Validate cart_owner constraint
    if ((user_id && session_id) || (!user_id && !session_id)) {
        return res.status(400).json({ 
            message: "Cart must have either user_id or session_id, but not both" 
        });
    }

    const query = `
        INSERT INTO carts (user_id, session_id, status)
        VALUES ($1, $2, $3)
        RETURNING cart_id, user_id, session_id, status, created_at
    `;
    const values = [user_id || null, session_id || null, status];
    const result = await pool.query(query, values);

    res.status(201).json({
        message: "Cart created successfully",
        cart: result.rows[0]
    });
});

// @desc    Update cart status
// @route   PUT /api/carts/:id
// @access  Private
export const updateCart = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;
    const { status, user_id } = req.body;

    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let index = 1;

    if (status) {
        fieldsToUpdate.push(`status = $${index++}`);
        values.push(status);
    }
    
    // Allow converting guest cart to user cart
    if (user_id) {
        fieldsToUpdate.push(`user_id = $${index++}`);
        values.push(user_id);
        fieldsToUpdate.push(`session_id = NULL`);
    }

    if (fieldsToUpdate.length === 0) {
        return res.status(400).json({ message: "No fields provided for update" });
    }

    fieldsToUpdate.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
        UPDATE carts
        SET ${fieldsToUpdate.join(", ")}
        WHERE cart_id = $${index++}
        RETURNING cart_id, user_id, session_id, status, updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "Cart not found" });
    }

    res.status(200).json({
        message: "Cart updated successfully",
        cart: result.rows[0]
    });
});

// @desc    Delete a cart
// @route   DELETE /api/carts/:id
// @access  Private
export const deleteCart = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;

    const query = `
        DELETE FROM carts 
        WHERE cart_id = $1
        RETURNING cart_id
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "Cart not found" });
    }

    res.status(200).json({ 
        message: "Cart deleted successfully", 
        cartId: result.rows[0].cart_id 
    });
});

// @desc    Clear cart (delete all items but keep cart)
// @route   DELETE /api/carts/:id/clear
// @access  Private
export const clearCart = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;

    // First check if cart exists
    const checkQuery = `SELECT cart_id FROM carts WHERE cart_id = $1`;
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
        return res.status(404).json({ message: "Cart not found" });
    }

    // Delete all cart items
    const deleteQuery = `DELETE FROM cart_items WHERE cart_id = $1`;
    await pool.query(deleteQuery, [id]);

    // Update cart timestamp
    const updateQuery = `
        UPDATE carts 
        SET updated_at = CURRENT_TIMESTAMP 
        WHERE cart_id = $1
        RETURNING cart_id
    `;
    await pool.query(updateQuery, [id]);

    res.status(200).json({ 
        message: "Cart cleared successfully", 
        cartId: id 
    });
});