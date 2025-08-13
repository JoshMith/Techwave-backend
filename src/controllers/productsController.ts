// CRUD operation for products
// -- Products
// CREATE TABLE products (
//     product_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
//     seller_id UUID NOT NULL REFERENCES sellers(seller_id) ON DELETE CASCADE,
//     category_id UUID NOT NULL REFERENCES categories(category_id) ON DELETE RESTRICT,
//     title VARCHAR(100) NOT NULL,
//     description TEXT,
//     price NUMERIC(10, 2) NOT NULL CHECK (price > 0),
//     sale_price NUMERIC(10, 2) CHECK (sale_price > 0),
//     stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
//     specs JSONB,
//     rating NUMERIC(3, 2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
//     review_count INTEGER DEFAULT 0 CHECK (review_count >= 0),
//     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
//     updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
// );

import express from "express";
import pool from "../config/db.config";
import asyncHandler from "../middlewares/asyncHandler";
import { UserRequest } from "../utils/types/userTypes";

// @desc    Get all products
// @route   GET /api/products
// @access  Public
export const getProducts = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const query = `
        SELECT 
            p.product_id, 
            p.title, 
            p.description, 
            p.price, 
            p.sale_price, 
            p.stock, 
            p.specs, 
            p.rating, 
            p.review_count, 
            c.name AS category_name,
            u.name AS seller_name,
            p.created_at,
            p.updated_at
        FROM products p
        JOIN categories c ON p.category_id = c.category_id
        JOIN sellers s ON p.seller_id = s.seller_id
        JOIN users u ON s.seller_id = u.user_id
        ORDER BY p.created_at DESC
    `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
});

// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Public
export const getProductById = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;

    const query = `
        SELECT 
            p.product_id, 
            p.title, 
            p.description, 
            p.price, 
            p.sale_price, 
            p.stock, 
            p.specs, 
            p.rating, 
            p.review_count, 
            c.name AS category_name,
            u.name AS seller_name,
            p.created_at,
            p.updated_at
        FROM products p
        JOIN categories c ON p.category_id = c.category_id
        JOIN sellers s ON p.seller_id = s.seller_id
        JOIN users u ON s.seller_id = u.user_id
        WHERE p.product_id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(result.rows[0]);
});


// Get products by category Name
// @desc    Get products by category Name
// @route   GET /api/products/category/:name
// @access  Public
export const getProductsByCategoryName = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { name } = req.params;

    const query = `
        SELECT 
            p.product_id, 
            p.title, 
            p.description, 
            p.price, 
            p.sale_price, 
            p.stock, 
            p.specs, 
            p.rating, 
            p.review_count, 
            c.name AS category_name,
            u.name AS seller_name,
            p.created_at,
            p.updated_at
        FROM products p
        JOIN categories c ON p.category_id = c.category_id
        JOIN sellers s ON p.seller_id = s.seller_id
        JOIN users u ON s.seller_id = u.user_id
        WHERE c.name ILIKE $1
        ORDER BY p.created_at DESC
    `;
    const result = await pool.query(query, [`%${name}%`]);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "No products found for this category" });
    }

    res.status(200).json(result.rows);
});

// @desc    Create a new product
// @route   POST /api/products
// @access  Private/Seller
export const createProduct = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { title, description, price, sale_price, stock, specs, category_id } = req.body;
    const seller_id = req.user?.user_id; // Assuming the user is a seller

    if (!seller_id) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const query = `
        INSERT INTO products (seller_id, category_id, title, description, price, sale_price, stock, specs)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING product_id
    `;
    const values = [seller_id, category_id, title, description, price, sale_price || null, stock || 0, specs || null];
    
    const result = await pool.query(query, values);
    res.status(201).json({ message: "Product created successfully", productId: result.rows[0].product_id });
});


// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Seller
export const updateProduct = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;
    const { title, description, price, sale_price, stock, specs, category_id } = req.body;
    const seller_id = req.user?.user_id; // Assuming the user is a seller

    if (!seller_id) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const query = `
        UPDATE products
        SET 
            title = $1, 
            description = $2, 
            price = $3, 
            sale_price = $4, 
            stock = $5, 
            specs = $6,
            category_id = $7,
            updated_at = CURRENT_TIMESTAMP
        WHERE product_id = $8 AND seller_id = $9
        RETURNING product_id
    `;
    const values = [title, description, price, sale_price || null, stock || 0, specs || null, category_id, id, seller_id];
    
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "Product not found or unauthorized" });
    }

    res.status(200).json({ message: "Product updated successfully", productId: result.rows[0].product_id });
});


// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Seller
export const deleteProduct = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;
    const seller_id = req.user?.user_id; // Assuming the user is a seller

    if (!seller_id) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const query = `
        DELETE FROM products
        WHERE product_id = $1 AND seller_id = $2
        RETURNING product_id
    `;
    const result = await pool.query(query, [id, seller_id]);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "Product not found or unauthorized" });
    }

    res.status(200).json({ message: "Product deleted successfully", productId: result.rows[0].product_id });
});


// Products Count
// @desc    Get total count of products by categoryId
// @route   GET /api/products/count
// @access  Public
export const getProductsCountByCategoryId = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;
    const query = `
        SELECT COUNT(*) AS count
        FROM products
        WHERE category_id = $1
    `;
    const result = await pool.query(query, [id]);
    res.status(200).json({ count: parseInt(result.rows[0].count, 10) });
});