// CRUD operations for 
// -- Product-offer relationship
// CREATE TABLE product_offers (
//     product_id UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
//     offer_id UUID NOT NULL REFERENCES special_offers(offer_id) ON DELETE CASCADE,
//     PRIMARY KEY (product_id, offer_id)
// );


import express from 'express';
import pool from '../config/db.config';
import asyncHandler from '../middlewares/asyncHandler';
import { UserRequest } from '../utils/types/userTypes';

// @desc    Get all product offers
// @route   GET /api/product-offers
// @access  Private
export const getProductOffers = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const query = `
        SELECT 
            po.product_id, 
            po.offer_id, 
            p.title AS product_name, 
            o.title AS offer_title
        FROM product_offers po
        JOIN products p ON po.product_id = p.product_id
        JOIN special_offers o ON po.offer_id = o.offer_id
        ORDER BY p.title, o.title
    `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
});


// @desc    Get product offer by product ID
// @route   GET /api/product-offers/product/:productId
// @access  Private
export const getProductOfferByProductId = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { productId } = req.params;

    const query = `
        SELECT 
            po.product_id, 
            po.offer_id, 
            p.title AS product_name, 
            o.title AS offer_title
        FROM product_offers po
        JOIN products p ON po.product_id = p.product_id
        JOIN special_offers o ON po.offer_id = o.offer_id
        WHERE po.product_id = $1
    `;
    const result = await pool.query(query, [productId]);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: 'No offers found for this product' });
    }

    res.status(200).json(result.rows);
});


// @desc    Create a new product offer
// @route   POST /api/product-offers
// @access  Private
export const createProductOffer = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { productId, offerId } = req.body;

    if (!productId || !offerId) {
        return res.status(400).json({ message: 'Product ID and Offer ID are required' });
    }

    const query = `
        INSERT INTO product_offers (product_id, offer_id)
        VALUES ($1, $2)
        RETURNING *
    `;
    const result = await pool.query(query, [productId, offerId]);

    res.status(201).json(result.rows[0]);
});


// @desc    Update a product offer
// @route   PUT /api/product-offers/:id
// @access  Private
export const updateProductOffer = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;
    const { productId, offerId } = req.body;

    if (!productId || !offerId) {
        return res.status(400).json({ message: 'Product ID and Offer ID are required' });
    }

    const query = `
        UPDATE product_offers
        SET product_id = $1, offer_id = $2
        WHERE product_id = $3 AND offer_id = $4
        RETURNING *
    `;
    const result = await pool.query(query, [productId, offerId, id]);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Product offer not found' });
    }

    res.status(200).json(result.rows[0]);
});



// @desc    Delete a product offer
// @route   DELETE /api/product-offers/:id
// @access  Private
export const deleteProductOffer = asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { id } = req.params;

    const query = `
        DELETE FROM product_offers
        WHERE product_id = $1
        RETURNING *
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Product offer not found' });
    }

    res.status(200).json({ message: 'Product offer deleted successfully' });
});

