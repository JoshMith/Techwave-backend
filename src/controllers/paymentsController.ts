// CRUD operations for payments
// -- Payments
// CREATE TABLE payments (
//     payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
//     order_id UUID UNIQUE NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
//     method payment_method NOT NULL,
//     amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
//     mpesa_code VARCHAR(20),
//     mpesa_phone VARCHAR(13) CHECK (mpesa_phone LIKE '+254%'),
//     transaction_reference VARCHAR(100),
//     is_confirmed BOOLEAN DEFAULT false,
//     confirmed_at TIMESTAMP WITH TIME ZONE,
//     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
// );


import express from "express";
import pool from "../config/db.config";
import asyncHandler from "../middlewares/asyncHandler";
import { UserRequest } from "../utils/types/userTypes";


// @desc    Get all payments
// @route   GET /api/payments
// @access  Private
export const getPayments = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const query = `
        SELECT 
            p.payment_id, 
            p.method, 
            p.amount, 
            p.mpesa_code, 
            p.mpesa_phone, 
            p.transaction_reference, 
            p.is_confirmed, 
            p.confirmed_at, 
            o.order_id,
            o.total_amount,
            o.status,
            o.created_at
        FROM payments p
        JOIN orders o ON p.order_id = o.order_id
        ORDER BY p.created_at DESC
    `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
});


// @desc    Get payment by ID
// @route   GET /api/payments/:id
// @access  Private
export const getPaymentById = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;

    const query = `
        SELECT 
            p.payment_id, 
            p.method, 
            p.amount, 
            p.mpesa_code, 
            p.mpesa_phone, 
            p.transaction_reference, 
            p.is_confirmed, 
            p.confirmed_at, 
            o.order_id,
            o.total_amount,
            o.status,
            o.created_at
        FROM payments p
        JOIN orders o ON p.order_id = o.order_id
        WHERE p.payment_id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "Payment not found" });
    }

    res.status(200).json(result.rows[0]);
});


// @desc    Create a new payment
// @route   POST /api/payments
// @access  Private
export const createPayment = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { orderId, method, amount, mpesaCode, mpesaPhone, transactionReference } = req.body;

    if (!orderId || !method || !amount) {
        return res.status(400).json({ message: "Order ID, payment method, and amount are required" });
    }

    const query = `
        INSERT INTO payments (order_id, method, amount, mpesa_code, mpesa_phone, transaction_reference)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
    `;
    const values = [orderId, method, amount, mpesaCode || null, mpesaPhone || null, transactionReference || null];
    
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
});


// @desc    Update payment confirmation status
// @route   PUT /api/payments/:id/confirm
// @access  Private
export const confirmPayment = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;
    const { isConfirmed } = req.body;

    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let index = 1;

    if (typeof isConfirmed === 'boolean') {
        fieldsToUpdate.push(`is_confirmed = $${index++}`);
        values.push(isConfirmed);
        if (isConfirmed) {
            fieldsToUpdate.push(`confirmed_at = NOW()`);
        } else {
            fieldsToUpdate.push(`confirmed_at = NULL`);
        }
    }

    if (fieldsToUpdate.length === 0) {
        return res.status(400).json({ message: "No fields provided for update" });
    }

    values.push(id);

    const query = `
        UPDATE payments
        SET ${fieldsToUpdate.join(", ")}
        WHERE payment_id = $${index++}
        RETURNING payment_id
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "Payment not found" });
    }

    res.status(200).json({ message: "Payment confirmation updated", paymentId: result.rows[0].payment_id });
});


// @desc    Delete payment
// @route   DELETE /api/payments/:id
// @access  Private
export const deletePayment = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;

    const query = `
        DELETE FROM payments 
        WHERE payment_id = $1
        RETURNING *
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "Payment not found" });
    }

    res.status(200).json({ message: "Payment deleted successfully" });
});