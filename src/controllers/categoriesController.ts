// CRUD operation for categories
// -- Product categories
// CREATE TABLE categories (
//     category_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
//     name VARCHAR(50) NOT NULL UNIQUE,
//     description TEXT,
//     featured BOOLEAN DEFAULT false,
//     icon_path VARCHAR(255),
//     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
// );

import express from "express";
import pool from "../config/db.config";
import asyncHandler from "../middlewares/asyncHandler";
import { UserRequest } from "../utils/types/userTypes";

// @desc    Get all categories
// @route   GET /api/categories 
// @access  Public
export const getCategories = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const query = `
        SELECT 
            category_id, 
            name, 
            description, 
            featured, 
            icon_path, 
            created_at
        FROM categories
        ORDER BY created_at DESC
    `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
});


// @desc    Get category by ID
// @route   GET /api/categories/:id
// @access  Public
export const getCategoryById = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;

    const query = `
        SELECT 
            category_id, 
            name, 
            description, 
            featured, 
            icon_path, 
            created_at
        FROM categories
        WHERE category_id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json(result.rows[0]);
});



export const getProductCountByCategory = asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;

    // Validate category ID
    if (!id || isNaN(Number(id))) {
        res.status(400);
        throw new Error('Invalid category ID');
    }

    const query = `
        SELECT 
            c.category_id,
            c.name AS category_name,
            COUNT(p.product_id) AS product_count
        FROM 
            categories c
        LEFT JOIN 
            products p ON c.category_id = p.category_id
        WHERE 
            c.category_id = $1
        GROUP BY 
            c.category_id, c.name
    `;

    try {
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            res.status(404);
            throw new Error('Category not found');
        }

        const categoryData = result.rows[0];
        
        res.status(200).json({
            success: true,
            data: {
                category_id: categoryData.category_id,
                category_name: categoryData.category_name,
                product_count: Number(categoryData.product_count)
            }
        });

    } catch (error) {
        console.error('Error fetching product count by category:', error);
        throw error; // Let the asyncHandler handle it
    }
});



// @desc    Create a new category
// @route   POST /api/categories
// @access  Private/Admin
export const createCategory = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { name, description, featured, icon_path } = req.body;

    const query = `
        INSERT INTO categories (name, description, featured, icon_path)
        VALUES ($1, $2, $3, $4)
        RETURNING category_id, name, description, featured, icon_path, created_at
    `;
    const result = await pool.query(query, [name, description, featured || false, icon_path || null]);

    res.status(201).json(result.rows[0]);
});


// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private/Admin
export const updateCategory = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;
    const { name, description, featured, icon_path } = req.body;

    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let index = 1;

    if (name) {
        fieldsToUpdate.push(`name = $${index++}`);
        values.push(name);
    }
    if (description) {
        fieldsToUpdate.push(`description = $${index++}`);
        values.push(description);
    }
    if (featured ) {
        fieldsToUpdate.push(`featured = $${index++}`);
        values.push(featured);
    }
    if (icon_path) {
        fieldsToUpdate.push(`icon_path = $${index++}`);
        values.push(icon_path);
    }

    if (fieldsToUpdate.length === 0) {
        return res.status(400).json({ message: "No fields provided for update" });
    }

    fieldsToUpdate.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
        UPDATE categories
        SET ${fieldsToUpdate.join(", ")}
        WHERE category_id = $${index++}
        RETURNING category_id, name, description, featured, icon_path, created_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json(result.rows[0]);
});


// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
export const deleteCategory = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;

    const query = `
        DELETE FROM categories
        WHERE category_id = $1
        RETURNING category_id
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({ message: "Category deleted successfully", categoryId: result.rows[0].category_id });
});