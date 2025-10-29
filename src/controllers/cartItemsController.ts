// CRUD operations for cart items
// -- Cart items table
// CREATE TABLE cart_items (
//     cart_item_id SERIAL PRIMARY KEY,
//     cart_id INTEGER NOT NULL REFERENCES carts(cart_id) ON DELETE CASCADE,
//     product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
//     quantity INTEGER NOT NULL CHECK (quantity > 0),
//     added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
//     unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price > 0),
//     UNIQUE (cart_id, product_id)
// );

import express from "express";
import pool from "../config/db.config";
import asyncHandler from "../middlewares/asyncHandler";
import { UserRequest } from "../utils/types/userTypes";

// @desc    Get all cart items for a specific cart
// @route   GET /api/cart-items/cart/:cartId
// @access  Public/Private
export const getCartItemsByCartId = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { cartId } = req.params;

    const query = `
        SELECT 
            ci.cart_item_id,
            ci.cart_id,
            ci.product_id,
            ci.quantity,
            ci.unit_price,
            ci.added_at,
            p.title AS product_title,
            p.description AS product_description,
            p.price AS current_price,
            p.sale_price AS current_sale_price,
            p.stock AS available_stock,
            p.rating,
            c.name AS category_name,
            (ci.quantity * ci.unit_price) AS subtotal
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.product_id
        JOIN categories c ON p.category_id = c.category_id
        WHERE ci.cart_id = $1
        ORDER BY ci.added_at DESC
    `;
    const result = await pool.query(query, [cartId]);

    res.status(200).json(result.rows);
});

// @desc    Get cart item by ID
// @route   GET /api/cart-items/:id
// @access  Public/Private
export const getCartItemById = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;

    const query = `
        SELECT 
            ci.cart_item_id,
            ci.cart_id,
            ci.product_id,
            ci.quantity,
            ci.unit_price,
            ci.added_at,
            p.title AS product_title,
            p.description AS product_description,
            p.price AS current_price,
            p.sale_price AS current_sale_price,
            p.stock AS available_stock,
            (ci.quantity * ci.unit_price) AS subtotal
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.product_id
        WHERE ci.cart_item_id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "Cart item not found" });
    }

    res.status(200).json(result.rows[0]);
});

// @desc    Add item to cart
// @route   POST /api/cart-items
// @access  Public/Private
export const addCartItem = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { cart_id, product_id, quantity } = req.body;

    if (!cart_id || !product_id || !quantity) {
        return res.status(400).json({ 
            message: "cart_id, product_id, and quantity are required" 
        });
    }

    // Get current product price
    const priceQuery = `
        SELECT price, sale_price, stock 
        FROM products 
        WHERE product_id = $1
    `;
    const priceResult = await pool.query(priceQuery, [product_id]);

    if (priceResult.rows.length === 0) {
        return res.status(404).json({ message: "Product not found" });
    }

    const product = priceResult.rows[0];
    
    // Check stock availability
    if (product.stock < quantity) {
        return res.status(400).json({ 
            message: "Insufficient stock", 
            available: product.stock 
        });
    }

    const unit_price = product.sale_price || product.price;

    // Check if item already exists in cart
    const checkQuery = `
        SELECT cart_item_id, quantity 
        FROM cart_items 
        WHERE cart_id = $1 AND product_id = $2
    `;
    const checkResult = await pool.query(checkQuery, [cart_id, product_id]);

    if (checkResult.rows.length > 0) {
        // Update existing cart item
        const newQuantity = checkResult.rows[0].quantity + quantity;
        
        if (product.stock < newQuantity) {
            return res.status(400).json({ 
                message: "Insufficient stock for requested quantity", 
                available: product.stock,
                currentInCart: checkResult.rows[0].quantity
            });
        }

        const updateQuery = `
            UPDATE cart_items 
            SET quantity = $1, unit_price = $2
            WHERE cart_item_id = $3
            RETURNING cart_item_id, cart_id, product_id, quantity, unit_price, added_at
        `;
        const updateResult = await pool.query(updateQuery, [newQuantity, unit_price, checkResult.rows[0].cart_item_id]);

        // Update cart timestamp
        await pool.query(`UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE cart_id = $1`, [cart_id]);

        return res.status(200).json({
            message: "Cart item quantity updated",
            cartItem: updateResult.rows[0]
        });
    }

    // Insert new cart item
    const insertQuery = `
        INSERT INTO cart_items (cart_id, product_id, quantity, unit_price)
        VALUES ($1, $2, $3, $4)
        RETURNING cart_item_id, cart_id, product_id, quantity, unit_price, added_at
    `;
    const values = [cart_id, product_id, quantity, unit_price];
    const result = await pool.query(insertQuery, values);

    // Update cart timestamp
    await pool.query(`UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE cart_id = $1`, [cart_id]);

    res.status(201).json({
        message: "Item added to cart successfully",
        cartItem: result.rows[0]
    });
});

// @desc    Update cart item quantity
// @route   PUT /api/cart-items/:id
// @access  Public/Private
export const updateCartItem = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
        return res.status(400).json({ message: "Valid quantity is required" });
    }

    // Get cart item and check stock
    const checkQuery = `
        SELECT ci.cart_id, ci.product_id, p.stock
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.product_id
        WHERE ci.cart_item_id = $1
    `;
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
        return res.status(404).json({ message: "Cart item not found" });
    }

    const { cart_id, stock } = checkResult.rows[0];

    if (stock < quantity) {
        return res.status(400).json({ 
            message: "Insufficient stock", 
            available: stock 
        });
    }

    const query = `
        UPDATE cart_items
        SET quantity = $1
        WHERE cart_item_id = $2
        RETURNING cart_item_id, cart_id, product_id, quantity, unit_price, added_at
    `;
    const result = await pool.query(query, [quantity, id]);

    // Update cart timestamp
    await pool.query(`UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE cart_id = $1`, [cart_id]);

    res.status(200).json({
        message: "Cart item updated successfully",
        cartItem: result.rows[0]
    });
});

// @desc    Remove item from cart
// @route   DELETE /api/cart-items/:id
// @access  Public/Private
export const removeCartItem = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;

    // Get cart_id before deletion for updating timestamp
    const cartQuery = `SELECT cart_id FROM cart_items WHERE cart_item_id = $1`;
    const cartResult = await pool.query(cartQuery, [id]);

    if (cartResult.rows.length === 0) {
        return res.status(404).json({ message: "Cart item not found" });
    }

    const cart_id = cartResult.rows[0].cart_id;

    const query = `
        DELETE FROM cart_items 
        WHERE cart_item_id = $1
        RETURNING cart_item_id
    `;
    const result = await pool.query(query, [id]);

    // Update cart timestamp
    await pool.query(`UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE cart_id = $1`, [cart_id]);

    res.status(200).json({ 
        message: "Cart item removed successfully", 
        cartItemId: result.rows[0].cart_item_id 
    });
});

// @desc    Get cart summary for a user (total items and subtotal)
// @route   GET /api/cart-items/user/:userId/summary
// @access  Public/Private
export const getCartSummary = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { cartId } = req.params;

    if (!cartId) {
        return res.status(400).json({ message: "cartId is required" });
    }

    const query = `
        SELECT
            COUNT(ci.cart_item_id) AS total_items,
            COALESCE(SUM(ci.quantity * ci.unit_price), 0) AS subtotal
        FROM cart_items ci
        JOIN carts c ON ci.cart_id = c.cart_id
        WHERE c.cart_id = $1
    `;
    const result = await pool.query(query, [cartId]);
    const row = result.rows[0] || { total_items: '0', subtotal: '0' };

    res.status(200).json({
        cartId: Number(cartId),
        totalItems: parseInt(row.total_items, 10) || 0,
        subtotal: Number(row.subtotal) || 0
    });
});
