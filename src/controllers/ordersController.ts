// CRUD operations for orders
// -- Orders
// CREATE TABLE orders (
//     order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
//     user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
//     address_id UUID NOT NULL REFERENCES addresses(address_id) ON DELETE RESTRICT,
//     total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount > 0),
//     status order_status NOT NULL DEFAULT 'pending',
//     notes TEXT,
//     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
//     updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
// );

import express from "express";
import pool from "../config/db.config";
import asyncHandler from "../middlewares/asyncHandler";
import { UserRequest } from "../utils/types/userTypes";

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
export const getOrders = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const query = `
        SELECT 
            o.order_id, 
            o.total_amount, 
            o.status, 
            o.notes, 
            o.created_at, 
            u.name AS user_name,
            a.city AS city,
            a.street AS street,
            a.building AS building,
            a.postal_code AS postal_code
        FROM orders o
        JOIN users u ON o.user_id = u.user_id
        JOIN addresses a ON o.address_id = a.address_id
        ORDER BY o.created_at DESC
    `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
});


// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;

    const query = `
        SELECT 
            o.order_id, 
            o.total_amount, 
            o.status, 
            o.notes, 
            o.created_at, 
            u.name AS user_name,
            a.city AS city,
            a.street AS street,
            a.building AS building,
            a.postal_code AS postal_code
        FROM orders o
        JOIN users u ON o.user_id = u.user_id
        JOIN addresses a ON o.address_id = a.address_id
        WHERE o.order_id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json(result.rows[0]);
});


// @desc    Create a new order
// @route   POST /api/orders
// @access  Private
export const createOrder = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { user_id, address_id, total_amount, status = 'pending', notes } = req.body;

    const query = `
        INSERT INTO orders (user_id, address_id, total_amount, status, notes)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING order_id, created_at
    `;
    const values = [user_id, address_id, total_amount, status, notes];
    const result = await pool.query(query, values);

    res.status(201).json({
        orderId: result.rows[0].order_id,
        createdAt: result.rows[0].created_at
    });
});


// @desc    Update an order
// @route   PUT /api/orders/:id
// @access  Private
export const updateOrder = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;
    const { status, notes } = req.body;

    const query = `
        UPDATE orders
        SET 
            status = $1, 
            notes = $2, 
            updated_at = CURRENT_TIMESTAMP
        WHERE order_id = $3
        RETURNING order_id, status, updated_at
    `;
    const values = [status, notes, id];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json(result.rows[0]);
});


// @desc    Delete an order
// @route   DELETE /api/orders/:id
// @access  Private
export const deleteOrder = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;

    const query = `
        DELETE FROM orders 
        WHERE order_id = $1
        RETURNING order_id
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({ message: "Order deleted successfully", orderId: result.rows[0].order_id });
});




