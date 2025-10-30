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
            o.updated_at,
            u.name AS user_name,
            P.title AS product_name,
            P.price AS product_price,
            oi.quantity AS product_quantity,
            a.city AS city,
            a.street AS street,
            a.building AS building,
            a.postal_code AS postal_code
        FROM orders o
        JOIN users u ON o.user_id = u.user_id
        JOIN addresses a ON o.address_id = a.address_id
        JOIN order_items oi ON o.order_id = oi.order_id
        JOIN products p ON oi.product_id = p.product_id
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
            oi.quantity, 
            oi.unit_price, 
            oi.discount,
            p.product_id,
            p.title AS product_title,
            p.description AS product_description,
            u.name AS user_name,
            u.email AS user_email,
            u.phone AS user_phone,
            a.city AS city,
            a.street AS street,
            a.building AS building,
            a.postal_code AS postal_code
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        JOIN products p ON oi.product_id = p.product_id
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
    const { user_id, cart_id, address_id, total_amount, status = 'pending', notes } = req.body;

    console.log('Received order data:', req.body); // Debug log


    const query = `
        INSERT INTO orders (user_id, cart_id, address_id, total_amount, status, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
    `;
    const values = [user_id, cart_id, address_id, total_amount, status, notes];
    const result = await pool.query(query, values);

    res.status(201).json({
        message: "Order created successfully",
        order: result.rows[0]
    });
});


// @desc    Update an order
// @route   PUT /api/orders/:id
// @access  Private
export const updateOrder = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;
    const { status, notes, address_id, total_amount } = req.body;

    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let index = 1;

    if (status) {
        fieldsToUpdate.push(`status = $${index++}`);
        values.push(status);
    }
    if (notes) {
        fieldsToUpdate.push(`notes = $${index++}`);
        values.push(notes);
    }
    if (address_id) {
        fieldsToUpdate.push(`address_id = $${index++}`);
        values.push(address_id);
    }
    if (total_amount) {
        fieldsToUpdate.push(`total_amount = $${index++}`);
        values.push(total_amount);
    }

    if (fieldsToUpdate.length === 0) {
        return res.status(400).json({ message: "No fields provided for update" });
    }

    fieldsToUpdate.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
        UPDATE orders
        SET ${fieldsToUpdate.join(", ")}
        WHERE order_id = $${index++}
        RETURNING order_id, status, notes, address_id, total_amount, updated_at
    `;

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


// Total number of orders
export const getOrdersCount = asyncHandler(async (req: UserRequest, res: express.Response) => {
    try {
        const query = "SELECT COUNT(*) AS ordercount FROM orders";
        const result = await pool.query(query);

        const orderCount: number = parseInt(result.rows[0].ordercount, 10);

        res.status(200).json({ orderCount })

    } catch (error) {
        console.error("Error fetching order count:", error);
        res.status(500).json({ message: "Internal server error" });
    }
})



