// CRUD operations for delivery pricing rules
// -- Delivery pricing rules
// CREATE TABLE delivery_pricing (
//     rule_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
//     city VARCHAR(50) NOT NULL,
//     min_free_delivery NUMERIC(10, 2) DEFAULT 0,
//     standard_fee NUMERIC(10, 2) NOT NULL,
//     is_active BOOLEAN DEFAULT true,
//     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
//     UNIQUE (city)
// );


import express from "express";  
import pool from "../config/db.config";
import asyncHandler from "../middlewares/asyncHandler";
import { UserRequest } from "../utils/types/userTypes";


// @desc    Get all delivery pricing rules
// @route   GET /api/delivery-pricing   
// @access  Private
export const getDeliveryPrices = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const query = `
        SELECT 
            rule_id, 
            city, 
            min_free_delivery, 
            standard_fee, 
            is_active, 
            created_at
        FROM delivery_pricing
        ORDER BY created_at DESC
    `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
});



// @desc    Get delivery pricing rule by ID
// @route   GET /api/delivery-pricing/:id
// @access  Private
export const getDeliveryPriceById = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;

    const query = `
        SELECT 
            rule_id, 
            city, 
            min_free_delivery, 
            standard_fee, 
            is_active, 
            created_at
        FROM delivery_pricing
        WHERE rule_id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "Delivery pricing rule not found" });
    }

    res.status(200).json(result.rows[0]);
});



// @desc    Create a new delivery pricing rule
// @route   POST /api/delivery-pricing
// @access  Private
export const createDeliveryPrice = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { city, min_free_delivery, standard_fee } = req.body;

    if (!city || !standard_fee) {
        return res.status(400).json({ message: "City and standard fee are required" });
    }

    const query = `
        INSERT INTO delivery_pricing (city, min_free_delivery, standard_fee)
        VALUES ($1, $2, $3)
        RETURNING *
    `;
    const values = [city, min_free_delivery || 0, standard_fee];
    const result = await pool.query(query, values);

    res.status(201).json(result.rows[0]);
});



// @desc    Update a delivery pricing rule
// @route   PUT /api/delivery-pricing/:id
// @access  Private
export const updateDeliveryPrice = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;
    const { city, min_free_delivery, standard_fee, is_active } = req.body;

    const query = `
        UPDATE delivery_pricing
        SET 
            city = COALESCE($1, city),
            min_free_delivery = COALESCE($2, min_free_delivery),
            standard_fee = COALESCE($3, standard_fee),
            is_active = COALESCE($4, is_active)
        WHERE rule_id = $5
        RETURNING *
    `;
    const values = [city, min_free_delivery || 0, standard_fee, is_active, id];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "Delivery pricing rule not found" });
    }

    res.status(200).json(result.rows[0]);
});


// @desc    Delete a delivery pricing rule
// @route   DELETE /api/delivery-pricing/:id
// @access  Private
export const deleteDeliveryPrice = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;

    const query = `
        DELETE FROM delivery_pricing
        WHERE rule_id = $1
        RETURNING *
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "Delivery pricing rule not found" });
    }

    res.status(200).json({ message: "Delivery pricing rule deleted successfully" });
});
