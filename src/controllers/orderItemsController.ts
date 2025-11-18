// CRUD operations for order items
// -- Order items
// CREATE TABLE order_items (
//     order_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
//     order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
//     product_id UUID NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
//     quantity INTEGER NOT NULL CHECK (quantity > 0),
//     unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price > 0),
//     discount NUMERIC(10, 2) DEFAULT 0
// );

import express from "express";
import pool from "../config/db.config";
import asyncHandler from "../middlewares/asyncHandler";

// @desc    Get all order items
// @route   GET /api/order-items
// @access  Public
export const getOrderItems = asyncHandler(async (req: express.Request, res: express.Response) => {
    const query = `
        SELECT 
            order_item_id, 
            order_id, 
            product_id, 
            quantity, 
            unit_price, 
            discount
        FROM order_items
        ORDER BY order_item_id DESC
    `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
});


// @desc    Get order item by ID
// @route   GET /api/order-items/:id
// @access  Public
export const getOrderItemById = asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;

    const query = `
        SELECT 
            order_item_id, 
            order_id, 
            product_id, 
            quantity, 
            unit_price, 
            discount
        FROM order_items
        WHERE order_item_id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "Order item not found" });
    }

    res.status(200).json(result.rows[0]);
});




// @desc    Create a new order item
// @route   POST /api/order-items
// @access  Private
export const createOrderItem = asyncHandler(async (req: express.Request, res: express.Response) => {
    const { order_id, product_id, quantity, unit_price, discount } = req.body;

    const query = `
        INSERT INTO order_items (order_id, product_id, quantity, unit_price, discount)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING order_item_id, order_id, product_id, quantity, unit_price, discount
    `;
    const result = await pool.query(query, [order_id, product_id, quantity, unit_price, discount]);

    res.status(201).json(result.rows[0]);
});


// @desc    Update an order item
// @route   PUT /api/order-items/:id
// @access  Private
export const updateOrderItem = asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const { order_id, product_id, quantity, unit_price, discount } = req.body;

    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let index = 1;

    if (order_id) {
        fieldsToUpdate.push(`order_id = $${index++}`);
        values.push(order_id);
    }
    if (product_id) {
        fieldsToUpdate.push(`product_id = $${index++}`);
        values.push(product_id);
    }
    if (quantity) {
        fieldsToUpdate.push(`quantity = $${index++}`);
        values.push(quantity);
    }
    if (unit_price) {
        fieldsToUpdate.push(`unit_price = $${index++}`);
        values.push(unit_price);
    }
    if (discount) {
        fieldsToUpdate.push(`discount = $${index++}`);
        values.push(discount);
    }

    if (fieldsToUpdate.length === 0) {
        return res.status(400).json({ message: "No fields provided for update" });
    }

    fieldsToUpdate.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
        UPDATE order_items
        SET ${fieldsToUpdate.join(", ")}
        WHERE order_item_id = $${index++}
        RETURNING order_item_id, order_id, product_id, quantity, unit_price, discount
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "Order item not found" });
    }

    res.status(200).json(result.rows[0]);
});


// @desc    Delete an order item
// @route   DELETE /api/order-items/:id
// @access  Private
export const deleteOrderItem = asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;

    const query = `
        DELETE FROM order_items
        WHERE order_item_id = $1
        RETURNING order_item_id
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "Order item not found" });
    }

    res.status(200).json({ message: "Order item deleted successfully", order_item_id: result.rows[0].order_item_id });
});

