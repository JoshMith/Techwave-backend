// CRUD operations for reviews
// -- Reviews
// CREATE TABLE reviews (
//     review_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
//     user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
//     product_id UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
//     rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
//     comment TEXT,
//     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
//     CONSTRAINT unique_user_product_review UNIQUE (user_id, product_id)
// );


import express from "express";
import pool from "../config/db.config";
import asyncHandler from "../middlewares/asyncHandler";
import { UserRequest } from "../utils/types/userTypes";

// @desc    Get all reviews
// @route   GET /api/reviews
// @access  Private
export const getReviews = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const query = `
        SELECT 
            r.review_id, 
            r.rating, 
            r.comment, 
            r.created_at, 
            u.user_id, 
            u.name AS user_name, 
            p.product_id, 
            p.title AS product_name
        FROM reviews r
        JOIN users u ON r.user_id = u.user_id
        JOIN products p ON r.product_id = p.product_id
        ORDER BY r.created_at DESC
    `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
});

// @desc    Get review by ID
// @route   GET /api/reviews/:id
// @access  Private
export const getReviewById = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;

    const query = `
        SELECT 
            r.review_id, 
            r.rating, 
            r.comment, 
            r.created_at, 
            u.user_id, 
            u.name AS user_name, 
            p.product_id, 
            p.title AS product_name
        FROM reviews r
        JOIN users u ON r.user_id = u.user_id
        JOIN products p ON r.product_id = p.product_id
        WHERE r.review_id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "Review not found" });
    }

    res.status(200).json(result.rows[0]);
});


// @desc    Create a review
// @route   POST /api/reviews
// @access  Private
export const createReview = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { product_id, rating, comment } = req.body;

    if (!product_id || !rating) {
        return res.status(400).json({ message: "Product ID and rating are required" });
    }

    const query = `
        INSERT INTO reviews (user_id, product_id, rating, comment)
        VALUES ($1, $2, $3, $4)
        RETURNING review_id, created_at
    `;
    const values = [req.user?.user_id, product_id, rating, comment];
    const result = await pool.query(query, values);

    res.status(201).json({
        message: "Review created successfully",
        review: result.rows[0]
    });
});


// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private
export const updateReview = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const query = `
        UPDATE reviews
        SET rating = $1, comment = $2, created_at = CURRENT_TIMESTAMP
        WHERE review_id = $3 AND user_id = $4
        RETURNING *
    `;
    const values = [rating, comment, id, req.user?.user_id];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "Review not found or you do not have permission to update it" });
    }

    res.status(200).json({
        message: "Review updated successfully",
        review: result.rows[0]
    });
});


// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private
export const deleteReview = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;

    const query = `
        DELETE FROM reviews
        WHERE review_id = $1 AND user_id = $2
        RETURNING *
    `;
    const values = [id, req.user?.user_id];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "Review not found or you do not have permission to delete it" });
    }

    res.status(200).json({
        message: "Review deleted successfully",
        review: result.rows[0]
    });
});

// @desc    Get reviews by product ID
// @route   GET /api/reviews/product/:productId
// @access  Private
export const getReviewsByProductId = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { productId } = req.params;

    const query = `
        SELECT 
            r.review_id, 
            r.rating, 
            r.comment, 
            r.created_at, 
            u.user_id, 
            u.name AS user_name
        FROM reviews r
        JOIN users u ON r.user_id = u.user_id
        WHERE r.product_id = $1
        ORDER BY r.created_at DESC
    `;
    const result = await pool.query(query, [productId]);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "No reviews found for this product" });
    }

    res.status(200).json(result.rows);
});

