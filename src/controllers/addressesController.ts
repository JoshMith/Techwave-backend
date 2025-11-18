// CRUD operations for addresses in an Express application using PostgreSQL
// -- User addresses
// CREATE TABLE addresses (
//     address_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
//     user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
//     city VARCHAR(50) NOT NULL,
//     street VARCHAR(255) NOT NULL,
//     building VARCHAR(50),
//     postal_code VARCHAR(20),
//     is_default BOOLEAN DEFAULT false,
//     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
// );

import { Request, Response } from "express";
import pool from "../config/db.config";
import asyncHandler from "../middlewares/asyncHandler";
import { UserRequest } from "../utils/types/userTypes";
import { use } from "passport";

// @desc    Get all addresses for a user
// @route   GET /api/addresses
// @access  Private
export const getAddresses = asyncHandler(async (req: UserRequest, res: Response) => {
    const userId = req.user?.user_id;

    const query = `
        SELECT 
            address_id, 
            city, 
            street, 
            building, 
            postal_code, 
            is_default, 
            created_at
        FROM addresses
        WHERE user_id = $1
        ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    res.status(200).json(result.rows);
});


// @desc    Get address by ID
// @route   GET /api/addresses/:id
// @access  Private
export const getAddressById = asyncHandler(async (req: UserRequest, res: Response) => {
    const userId = req.user?.user_id;
    const { id } = req.params;

    const query = `
        SELECT 
            address_id, 
            city, 
            street, 
            building, 
            postal_code, 
            is_default, 
            created_at
        FROM addresses
        WHERE address_id = $1 AND user_id = $2
    `;
    const result = await pool.query(query, [id, userId]);

    if (result.rows.length === 0) {
        res.status(404);
        throw new Error("Address not found");
    }

    res.status(200).json(result.rows[0]);
});


// @desc    Get address by user ID
// @route   GET /api/addresses/:id
// @access  Private
export const getAddressByUserId = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const query = `
        SELECT 
            address_id,
            city, 
            street, 
            building,
            postal_code, 
            is_default, 
            created_at  
        FROM addresses
        WHERE user_id = $1
        ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [id]);
    res.status(200).json(result.rows);
});


// @desc    Create a new address
// @route   POST /api/addresses
// @access  Private
export const createAddress = asyncHandler(async (req: UserRequest, res: Response) => {
    const { userId, city, street, building, postal_code, is_default } = req.body;

    if (userId === undefined) {
        res.status(400);
        throw new Error("User ID is required");
    }

    if (!city || !street) {
        res.status(400);
        throw new Error("City and street are required");
    }

    const query = `
        INSERT INTO addresses (user_id, city, street, building, postal_code, is_default)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING address_id
    `;
    const result = await pool.query(query, [userId, city, street, building, postal_code, is_default]);

    res.status(201).json({ address_id: result.rows[0].address_id });
});


// @desc    Update an address
// @route   PUT /api/addresses/:id
// @access  Private
export const updateAddress = asyncHandler(async (req: UserRequest, res: Response) => {
    const userId = req.user?.user_id;
    const { id } = req.params;
    const { city, street, building, postal_code, is_default } = req.body;

    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let index = 1;

    if (city) {
        fieldsToUpdate.push(`city = $${index++}`);
        values.push(city);
    }
    if (street) {
        fieldsToUpdate.push(`street = $${index++}`);
        values.push(street);
    }
    if (building ) {
        fieldsToUpdate.push(`building = $${index++}`);
        values.push(building);
    }
    if (postal_code ) {
        fieldsToUpdate.push(`postal_code = $${index++}`);
        values.push(postal_code);
    }
    if (is_default ) {
        fieldsToUpdate.push(`is_default = $${index++}`);
        values.push(is_default);
    }

    if (fieldsToUpdate.length === 0) {
        return res.status(400).json({ message: "No fields provided for update" });
    }

    fieldsToUpdate.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id, userId);

    const query = `
        UPDATE addresses
        SET ${fieldsToUpdate.join(", ")}
        WHERE address_id = $${index++} AND user_id = $${index++}
        RETURNING address_id
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "Address not found" });
    }

    res.status(200).json({ message: "Address updated successfully", address_id: result.rows[0].address_id });
});


// @desc    Delete an address
// @route   DELETE /api/addresses/:id
// @access  Private
export const deleteAddress = asyncHandler(async (req: UserRequest, res: Response) => {
    const userId = req.user?.user_id;
    const { id } = req.params;

    const query = `
        DELETE FROM addresses
        WHERE address_id = $1 AND user_id = $2
        RETURNING address_id
    `;
    const result = await pool.query(query, [id, userId]);

    if (result.rows.length === 0) {
        res.status(404);
        throw new Error("Address not found");
    }

    res.status(200).json({ message: "Address deleted successfully" });
});



