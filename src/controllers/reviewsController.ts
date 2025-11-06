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

    // Start a transaction to ensure data consistency
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Insert the new review
        const insertReviewQuery = `
            INSERT INTO reviews (user_id, product_id, rating, comment)
            VALUES ($1, $2, $3, $4)
            RETURNING review_id, created_at
        `;
        const insertValues = [req.user?.user_id, product_id, rating, comment];
        const reviewResult = await client.query(insertReviewQuery, insertValues);

        // 2. Calculate new average rating and review count
        const statsQuery = `
            SELECT 
                COUNT(*) as review_count,
                AVG(rating) as average_rating
            FROM reviews 
            WHERE product_id = $1
        `;
        const statsResult = await client.query(statsQuery, [product_id]);

        const reviewCount = parseInt(statsResult.rows[0].review_count);
        const averageRating = parseFloat(statsResult.rows[0].average_rating);

        // 3. Update the product with new rating and review count
        const updateProductQuery = `
            UPDATE products 
            SET 
                rating = $1,
                review_count = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE product_id = $3
            RETURNING product_id
        `;
        const updateValues = [averageRating, reviewCount, product_id];
        await client.query(updateProductQuery, updateValues);

        await client.query('COMMIT');

        res.status(201).json({
            message: "Review created successfully",
            review: reviewResult.rows[0],
            productStats: {
                rating: averageRating,
                review_count: reviewCount
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating review:', error);
        res.status(500).json({ message: "Failed to create review" });
    } finally {
        client.release();
    }
});


// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private
export const updateReview = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. First get the current review to know the product_id
        const getReviewQuery = `SELECT product_id FROM reviews WHERE review_id = $1`;
        const currentReview = await client.query(getReviewQuery, [id]);

        if (currentReview.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: "Review not found" });
        }

        const product_id = currentReview.rows[0].product_id;

        // 2. Update the review
        const fieldsToUpdate: string[] = [];
        const values: any[] = [];
        let index = 1;

        if (rating !== undefined) {
            fieldsToUpdate.push(`rating = $${index++}`);
            values.push(rating);
        }
        if (comment !== undefined) {
            fieldsToUpdate.push(`comment = $${index++}`);
            values.push(comment);
        }

        if (fieldsToUpdate.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: "No fields provided for update" });
        }

        fieldsToUpdate.push(`created_at = CURRENT_TIMESTAMP`);
        values.push(id);
        values.push(req.user?.user_id);

        const updateReviewQuery = `
            UPDATE reviews
            SET ${fieldsToUpdate.join(", ")}
            WHERE review_id = $${index++} AND user_id = $${index++}
            RETURNING *
        `;

        const result = await client.query(updateReviewQuery, values);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: "Review not found or you do not have permission to update it" });
        }

        // 3. Recalculate product stats
        const statsQuery = `
            SELECT 
                COUNT(*) as review_count,
                AVG(rating) as average_rating
            FROM reviews 
            WHERE product_id = $1
        `;
        const statsResult = await client.query(statsQuery, [product_id]);

        const reviewCount = parseInt(statsResult.rows[0].review_count);
        const averageRating = parseFloat(statsResult.rows[0].average_rating);

        // 4. Update the product
        const updateProductQuery = `
            UPDATE products 
            SET 
                rating = $1,
                review_count = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE product_id = $3
        `;
        await client.query(updateProductQuery, [averageRating, reviewCount, product_id]);

        await client.query('COMMIT');

        res.status(200).json({
            message: "Review updated successfully",
            review: result.rows[0],
            productStats: {
                rating: averageRating,
                review_count: reviewCount
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating review:', error);
        res.status(500).json({ message: "Failed to update review" });
    } finally {
        client.release();
    }
});


// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private
export const deleteReview = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. First get the review to know the product_id
        const getReviewQuery = `SELECT product_id FROM reviews WHERE review_id = $1`;
        const currentReview = await client.query(getReviewQuery, [id]);

        if (currentReview.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: "Review not found" });
        }

        const product_id = currentReview.rows[0].product_id;

        // 2. Delete the review
        const deleteQuery = `
            DELETE FROM reviews
            WHERE review_id = $1 AND user_id = $2
            RETURNING *
        `;
        const deleteValues = [id, req.user?.user_id];
        const result = await client.query(deleteQuery, deleteValues);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: "Review not found or you do not have permission to delete it" });
        }

        // 3. Recalculate product stats
        const statsQuery = `
            SELECT 
                COUNT(*) as review_count,
                AVG(rating) as average_rating
            FROM reviews 
            WHERE product_id = $1
        `;
        const statsResult = await client.query(statsQuery, [product_id]);

        const reviewCount = parseInt(statsResult.rows[0].review_count);
        const averageRating = statsResult.rows[0].average_rating ? parseFloat(statsResult.rows[0].average_rating) : 0;

        // 4. Update the product
        const updateProductQuery = `
            UPDATE products 
            SET 
                rating = $1,
                review_count = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE product_id = $3
        `;
        await client.query(updateProductQuery, [averageRating, reviewCount, product_id]);

        await client.query('COMMIT');

        res.status(200).json({
            message: "Review deleted successfully",
            review: result.rows[0],
            productStats: {
                rating: averageRating,
                review_count: reviewCount
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting review:', error);
        res.status(500).json({ message: "Failed to delete review" });
    } finally {
        client.release();
    }
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

