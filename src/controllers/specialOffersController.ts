// CRUD operations for special offers
// -- Special offers
// CREATE TABLE special_offers (
//     offer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
//     title VARCHAR(100) NOT NULL,
//     description TEXT,
//     discount_percent NUMERIC(5, 2) CHECK (discount_percent > 0 AND discount_percent <= 100),
//     banner_image_url VARCHAR(255),
//     valid_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
//     valid_until TIMESTAMP WITH TIME ZONE,
//     is_active BOOLEAN DEFAULT true,
//     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
// );

import express from "express";
import pool from "../config/db.config";
import asyncHandler from "../middlewares/asyncHandler";
import { UserRequest } from "../utils/types/userTypes";


// @desc    Get all special offers
// @route   GET /api/special-offers
// @access  Private
export const getSpecialOffers = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const query = `
        SELECT 
            offer_id, 
            title, 
            description, 
            discount_percent, 
            banner_image_url, 
            valid_from, 
            valid_until, 
            is_active, 
            created_at
        FROM special_offers
        ORDER BY created_at DESC
    `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
});



// @desc    Get special offer by ID
// @route   GET /api/special-offers/:id
// @access  Private
export const getSpecialOfferById = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;

    const query = `
        SELECT 
            offer_id, 
            title, 
            description, 
            discount_percent, 
            banner_image_url, 
            valid_from, 
            valid_until, 
            is_active, 
            created_at
        FROM special_offers
        WHERE offer_id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        res.status(404).json({ message: "Special offer not found" });
    } else {
        res.status(200).json(result.rows[0]);
    }
});


// @desc    Create a new special offer
// @route   POST /api/special-offers
// @access  Private
export const createSpecialOffer = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { title, description, discount_percent, banner_image_url, valid_until } = req.body;

    if (!title || !discount_percent || !valid_until) {
        return res.status(400).json({ message: "Title, discount percent, and valid until date are required" });
    }

    const query = `
        INSERT INTO special_offers (title, description, discount_percent, banner_image_url, valid_until)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    `;
    const values = [title, description, discount_percent, banner_image_url, valid_until];
    const result = await pool.query(query, values);

    res.status(201).json(result.rows[0]);
});



// @desc    Update a special offer
// @route   PUT /api/special-offers/:id
// @access  Private
export const updateSpecialOffer = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;
    const { title, description, discount_percent, banner_image_url, valid_until, is_active } = req.body;

    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let index = 1;

    if (title) {
        fieldsToUpdate.push(`title = $${index++}`);
        values.push(title);
    }
    if (description) {
        fieldsToUpdate.push(`description = $${index++}`);
        values.push(description);
    }
    if (discount_percent) {
        fieldsToUpdate.push(`discount_percent = $${index++}`);
        values.push(discount_percent);
    }
    if (banner_image_url) {
        fieldsToUpdate.push(`banner_image_url = $${index++}`);
        values.push(banner_image_url);
    }
    if (valid_until) {
        fieldsToUpdate.push(`valid_until = $${index++}`);
        values.push(valid_until);
    }
    if (typeof is_active === "boolean") {
        fieldsToUpdate.push(`is_active = $${index++}`);
        values.push(is_active);
    }

    if (fieldsToUpdate.length === 0) {
        return res.status(400).json({ message: "No fields provided for update" });
    }

    fieldsToUpdate.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
        UPDATE special_offers
        SET ${fieldsToUpdate.join(", ")}
        WHERE offer_id = $${index++}
        RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "Special offer not found" });
    }

    res.status(200).json(result.rows[0]);
});


// @desc    Delete a special offer
// @route   DELETE /api/special-offers/:id
export const deleteSpecialOffer = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;

    const query = `
        DELETE FROM special_offers
        WHERE offer_id = $1
        RETURNING *
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "Special offer not found" });
    }

    res.status(200).json({ message: "Special offer deleted successfully", offer: result.rows[0] });
});

// @desc    Activate or deactivate a special offer
// @route   PUT /api/special-offers/:id/activate
export const toggleSpecialOfferActivation = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
        return res.status(400).json({ message: "is_active must be a boolean" });
    }

    const query = `
        UPDATE special_offers
        SET is_active = $1
        WHERE offer_id = $2
        RETURNING *
    `;
    const values = [is_active, id];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "Special offer not found" });
    }

    res.status(200).json(result.rows[0]);
});


