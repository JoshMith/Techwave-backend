// Admin Management Controller
// Comprehensive admin operations for managing all database entities

import { Request, Response } from "express";
import pool from "../config/db.config";
import asyncHandler from "../middlewares/asyncHandler";
import { UserRequest } from "../utils/types/userTypes";
import bcrypt from 'bcryptjs';

// ============================================
// USER MANAGEMENT
// ============================================

/**
 * @desc    Bulk update user status
 * @route   PUT /api/admin/users/bulk-update
 * @access  Private/Admin
 */
export const bulkUpdateUsers = asyncHandler(async (req: UserRequest, res: Response) => {
    const { userIds, action } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ message: 'User IDs array is required' });
    }

    if (!action) {
        return res.status(400).json({ message: 'Action is required' });
    }

    let query = '';
    const values: any[] = [userIds];

    switch (action) {
        case 'delete':
            query = 'DELETE FROM users WHERE user_id = ANY($1::uuid[]) RETURNING user_id';
            break;
        case 'deactivate':
            query = 'UPDATE users SET role = $2 WHERE user_id = ANY($1::uuid[]) RETURNING user_id';
            values.push('guest');
            break;
        default:
            return res.status(400).json({ message: 'Invalid action' });
    }

    const result = await pool.query(query, values);

    res.status(200).json({
        success: true,
        message: `${result.rows.length} users ${action}d successfully`,
        affectedUsers: result.rows.map(row => row.user_id)
    });
});

/**
 * @desc    Change user role
 * @route   PUT /api/admin/users/:id/role
 * @access  Private/Admin
 */
export const changeUserRole = asyncHandler(async (req: UserRequest, res: Response) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['admin', 'seller', 'customer', 'guest'].includes(role)) {
        return res.status(400).json({ message: 'Valid role is required (admin, seller, customer, guest)' });
    }

    const query = `
        UPDATE users 
        SET role = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE user_id = $2 
        RETURNING user_id, name, email, role
    `;

    const result = await pool.query(query, [role, id]);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
        success: true,
        message: 'User role updated successfully',
        user: result.rows[0]
    });
});

/**
 * @desc    Reset user password (admin only)
 * @route   PUT /api/admin/users/:id/reset-password
 * @access  Private/Admin
 */
export const resetUserPassword = asyncHandler(async (req: UserRequest, res: Response) => {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const query = `
        UPDATE users 
        SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE user_id = $2 
        RETURNING user_id, name, email
    `;

    const result = await pool.query(query, [hashedPassword, id]);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
        success: true,
        message: 'Password reset successfully',
        user: result.rows[0]
    });
});

// ============================================
// ORDER MANAGEMENT
// ============================================

/**
 * @desc    Bulk update order status
 * @route   PUT /api/admin/orders/bulk-update
 * @access  Private/Admin
 */
export const bulkUpdateOrders = asyncHandler(async (req: UserRequest, res: Response) => {
    const { orderIds, status } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ message: 'Order IDs array is required' });
    }

    if (!status) {
        return res.status(400).json({ message: 'Status is required' });
    }

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'failed'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
    }

    const query = `
        UPDATE orders 
        SET status = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE order_id = ANY($2::uuid[]) 
        RETURNING order_id, status
    `;

    const result = await pool.query(query, [status, orderIds]);

    res.status(200).json({
        success: true,
        message: `${result.rows.length} orders updated to ${status}`,
        orders: result.rows
    });
});

/**
 * @desc    Get order details with full information
 * @route   GET /api/admin/orders/:id/details
 * @access  Private/Admin
 */
export const getOrderDetails = asyncHandler(async (req: UserRequest, res: Response) => {
    const { id } = req.params;

    // Get order information
    const orderQuery = `
        SELECT 
            o.order_id,
            o.total_amount,
            o.status,
            o.notes,
            o.created_at,
            o.updated_at,
            u.user_id,
            u.name as customer_name,
            u.email as customer_email,
            u.phone as customer_phone,
            a.city,
            a.street,
            a.building,
            a.postal_code
        FROM orders o
        JOIN users u ON o.user_id = u.user_id
        JOIN addresses a ON o.address_id = a.address_id
        WHERE o.order_id = $1
    `;

    const orderResult = await pool.query(orderQuery, [id]);

    if (orderResult.rows.length === 0) {
        return res.status(404).json({ message: 'Order not found' });
    }

    // Get order items
    const itemsQuery = `
        SELECT 
            oi.order_item_id,
            oi.quantity,
            oi.unit_price,
            oi.discount,
            p.product_id,
            p.title as product_title,
            p.description as product_description,
            c.name as category_name,
            s.business_name as seller_name
        FROM order_items oi
        JOIN products p ON oi.product_id = p.product_id
        JOIN categories c ON p.category_id = c.category_id
        JOIN sellers s ON p.seller_id = s.seller_id
        WHERE oi.order_id = $1
    `;

    const itemsResult = await pool.query(itemsQuery, [id]);

    // Get payment information
    const paymentQuery = `
        SELECT 
            payment_id,
            method,
            amount,
            mpesa_code,
            mpesa_phone,
            is_confirmed,
            confirmed_at,
            created_at
        FROM payments
        WHERE order_id = $1
    `;

    const paymentResult = await pool.query(paymentQuery, [id]);

    const orderDetails = {
        order: orderResult.rows[0],
        items: itemsResult.rows,
        payment: paymentResult.rows[0] || null
    };

    res.status(200).json({
        success: true,
        data: orderDetails
    });
});

// ============================================
// PRODUCT MANAGEMENT
// ============================================

/**
 * @desc    Bulk update product status (activate/deactivate)
 * @route   PUT /api/admin/products/bulk-update
 * @access  Private/Admin
 */
export const bulkUpdateProducts = asyncHandler(async (req: UserRequest, res: Response) => {
    const { productIds, action, value } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ message: 'Product IDs array is required' });
    }

    if (!action) {
        return res.status(400).json({ message: 'Action is required' });
    }

    let query = '';
    let values = [];

    switch (action) {
        case 'delete':
            query = 'DELETE FROM products WHERE product_id = ANY($1::uuid[]) RETURNING product_id';
            values = [productIds];
            break;
        case 'updateStock':
            if (value === undefined) {
                return res.status(400).json({ message: 'Stock value is required' });
            }
            query = 'UPDATE products SET stock = $2, updated_at = CURRENT_TIMESTAMP WHERE product_id = ANY($1::uuid[]) RETURNING product_id, stock';
            values = [productIds, value];
            break;
        case 'updatePrice':
            if (value === undefined) {
                return res.status(400).json({ message: 'Price value is required' });
            }
            query = 'UPDATE products SET price = $2, updated_at = CURRENT_TIMESTAMP WHERE product_id = ANY($1::uuid[]) RETURNING product_id, price';
            values = [productIds, value];
            break;
        default:
            return res.status(400).json({ message: 'Invalid action' });
    }

    const result = await pool.query(query, values);

    res.status(200).json({
        success: true,
        message: `${result.rows.length} products ${action}d successfully`,
        products: result.rows
    });
});

/**
 * @desc    Get product details with all related information
 * @route   GET /api/admin/products/:id/details
 * @access  Private/Admin
 */
export const getProductDetails = asyncHandler(async (req: UserRequest, res: Response) => {
    const { id } = req.params;

    // Get product information
    const productQuery = `
        SELECT 
            p.*,
            c.name as category_name,
            s.seller_id,
            s.business_name as seller_name,
            u.name as seller_owner_name,
            u.email as seller_email
        FROM products p
        JOIN categories c ON p.category_id = c.category_id
        JOIN sellers s ON p.seller_id = s.seller_id
        JOIN users u ON s.user_id = u.user_id
        WHERE p.product_id = $1
    `;

    const productResult = await pool.query(productQuery, [id]);

    if (productResult.rows.length === 0) {
        return res.status(404).json({ message: 'Product not found' });
    }

    // Get product images
    const imagesQuery = `
        SELECT * FROM product_images WHERE product_id = $1 ORDER BY is_primary DESC, sort_order
    `;
    const imagesResult = await pool.query(imagesQuery, [id]);

    // Get product reviews
    const reviewsQuery = `
        SELECT 
            r.*,
            u.name as user_name,
            u.email as user_email
        FROM reviews r
        JOIN users u ON r.user_id = u.user_id
        WHERE r.product_id = $1
        ORDER BY r.created_at DESC
    `;
    const reviewsResult = await pool.query(reviewsQuery, [id]);

    // Get sales statistics
    const salesQuery = `
        SELECT 
            COUNT(oi.order_item_id) as times_ordered,
            SUM(oi.quantity) as units_sold,
            SUM(oi.quantity * oi.unit_price) as revenue
        FROM order_items oi
        WHERE oi.product_id = $1
    `;
    const salesResult = await pool.query(salesQuery, [id]);

    const productDetails = {
        product: productResult.rows[0],
        images: imagesResult.rows,
        reviews: reviewsResult.rows,
        sales: salesResult.rows[0]
    };

    res.status(200).json({
        success: true,
        data: productDetails
    });
});

// ============================================
// SELLER MANAGEMENT
// ============================================

/**
 * @desc    Approve or suspend seller account
 * @route   PUT /api/admin/sellers/:id/status
 * @access  Private/Admin
 */
export const updateSellerStatus = asyncHandler(async (req: UserRequest, res: Response) => {
    const { id } = req.params;
    const { action } = req.body;

    if (!action || !['approve', 'suspend'].includes(action)) {
        return res.status(400).json({ message: 'Valid action is required (approve, suspend)' });
    }

    // Get seller's user_id
    const sellerQuery = await pool.query('SELECT user_id FROM sellers WHERE seller_id = $1', [id]);

    if (sellerQuery.rows.length === 0) {
        return res.status(404).json({ message: 'Seller not found' });
    }

    const userId = sellerQuery.rows[0].user_id;
    const newRole = action === 'approve' ? 'seller' : 'guest';

    const query = `
        UPDATE users 
        SET role = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE user_id = $2 
        RETURNING user_id, name, email, role
    `;

    const result = await pool.query(query, [newRole, userId]);

    res.status(200).json({
        success: true,
        message: `Seller ${action}d successfully`,
        user: result.rows[0]
    });
});

/**
 * @desc    Get seller details with statistics
 * @route   GET /api/admin/sellers/:id/details
 * @access  Private/Admin
 */
export const getSellerDetails = asyncHandler(async (req: UserRequest, res: Response) => {
    const { id } = req.params;

    // Get seller information
    const sellerQuery = `
        SELECT 
            s.*,
            u.name,
            u.email,
            u.phone,
            u.role,
            u.created_at as user_created_at
        FROM sellers s
        JOIN users u ON s.user_id = u.user_id
        WHERE s.seller_id = $1
    `;

    const sellerResult = await pool.query(sellerQuery, [id]);

    if (sellerResult.rows.length === 0) {
        return res.status(404).json({ message: 'Seller not found' });
    }

    // Get seller's products
    const productsQuery = `
        SELECT 
            p.product_id,
            p.title,
            p.price,
            p.stock,
            p.rating,
            c.name as category_name
        FROM products p
        JOIN categories c ON p.category_id = c.category_id
        WHERE p.seller_id = $1
        ORDER BY p.created_at DESC
    `;
    const productsResult = await pool.query(productsQuery, [id]);

    // Get seller's sales statistics
    const salesQuery = `
        SELECT 
            COUNT(DISTINCT o.order_id) as total_orders,
            COALESCE(SUM(oi.quantity * oi.unit_price), 0) as total_revenue,
            COALESCE(AVG(oi.quantity * oi.unit_price), 0) as average_order_value
        FROM products p
        JOIN order_items oi ON p.product_id = oi.product_id
        JOIN orders o ON oi.order_id = o.order_id
        WHERE p.seller_id = $1 AND o.status NOT IN ('cancelled', 'failed')
    `;
    const salesResult = await pool.query(salesQuery, [id]);

    const sellerDetails = {
        seller: sellerResult.rows[0],
        products: productsResult.rows,
        statistics: salesResult.rows[0]
    };

    res.status(200).json({
        success: true,
        data: sellerDetails
    });
});

// ============================================
// PAYMENT MANAGEMENT
// ============================================

/**
 * @desc    Manually confirm/reject payment
 * @route   PUT /api/admin/payments/:id/confirm
 * @access  Private/Admin
 */
export const manualPaymentConfirmation = asyncHandler(async (req: UserRequest, res: Response) => {
    const { id } = req.params;
    const { isConfirmed, notes } = req.body;

    if (typeof isConfirmed !== 'boolean') {
        return res.status(400).json({ message: 'isConfirmed (boolean) is required' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Update payment
        const paymentQuery = `
            UPDATE payments 
            SET is_confirmed = $1, 
                confirmed_at = ${isConfirmed ? 'NOW()' : 'NULL'},
                updated_at = NOW()
            WHERE payment_id = $2 
            RETURNING payment_id, order_id, is_confirmed
        `;
        const paymentResult = await client.query(paymentQuery, [isConfirmed, id]);

        if (paymentResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Payment not found' });
        }

        const orderId = paymentResult.rows[0].order_id;

        // Update order status based on payment confirmation
        const orderStatus = isConfirmed ? 'processing' : 'failed';
        const orderNotes = notes ? `Admin note: ${notes}` : '';

        await client.query(
            `UPDATE orders 
            SET status = $1, 
                notes = CONCAT(COALESCE(notes, ''), ' | ', $2),
                updated_at = NOW()
            WHERE order_id = $3`,
            [orderStatus, orderNotes, orderId]
        );

        await client.query('COMMIT');

        res.status(200).json({
            success: true,
            message: `Payment ${isConfirmed ? 'confirmed' : 'rejected'} successfully`,
            payment: paymentResult.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error confirming payment:', error);
        res.status(500).json({ message: 'Failed to confirm payment' });
    } finally {
        client.release();
    }
});

/**
 * @desc    Get all pending payments
 * @route   GET /api/admin/payments/pending
 * @access  Private/Admin
 */
export const getPendingPayments = asyncHandler(async (req: UserRequest, res: Response) => {
    const query = `
        SELECT 
            p.*,
            o.total_amount as order_total,
            o.status as order_status,
            u.name as customer_name,
            u.email as customer_email,
            u.phone as customer_phone
        FROM payments p
        JOIN orders o ON p.order_id = o.order_id
        JOIN users u ON o.user_id = u.user_id
        WHERE p.is_confirmed = false
        ORDER BY p.created_at DESC
    `;

    const result = await pool.query(query);

    res.status(200).json({
        success: true,
        data: result.rows
    });
});

// ============================================
// CATEGORY MANAGEMENT
// ============================================

/**
 * @desc    Merge two categories
 * @route   POST /api/admin/categories/merge
 * @access  Private/Admin
 */
export const mergeCategories = asyncHandler(async (req: UserRequest, res: Response) => {
    const { sourceCategoryId, targetCategoryId } = req.body;

    if (!sourceCategoryId || !targetCategoryId) {
        return res.status(400).json({ message: 'Source and target category IDs are required' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Move all products from source to target category
        const updateQuery = `
            UPDATE products 
            SET category_id = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE category_id = $2
            RETURNING product_id
        `;
        const updateResult = await client.query(updateQuery, [targetCategoryId, sourceCategoryId]);

        // Delete source category
        await client.query('DELETE FROM categories WHERE category_id = $1', [sourceCategoryId]);

        await client.query('COMMIT');

        res.status(200).json({
            success: true,
            message: `${updateResult.rows.length} products moved and source category deleted`,
            movedProducts: updateResult.rows.length
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error merging categories:', error);
        res.status(500).json({ message: 'Failed to merge categories' });
    } finally {
        client.release();
    }
});

// ============================================
// REVIEW MANAGEMENT
// ============================================

/**
 * @desc    Bulk delete reviews
 * @route   DELETE /api/admin/reviews/bulk-delete
 * @access  Private/Admin
 */
export const bulkDeleteReviews = asyncHandler(async (req: UserRequest, res: Response) => {
    const { reviewIds } = req.body;

    if (!reviewIds || !Array.isArray(reviewIds) || reviewIds.length === 0) {
        return res.status(400).json({ message: 'Review IDs array is required' });
    }

    const query = 'DELETE FROM reviews WHERE review_id = ANY($1::uuid[]) RETURNING review_id';
    const result = await pool.query(query, [reviewIds]);

    res.status(200).json({
        success: true,
        message: `${result.rows.length} reviews deleted successfully`,
        deletedReviews: result.rows.map(row => row.review_id)
    });
});

/**
 * @desc    Get flagged reviews (low ratings or specific keywords)
 * @route   GET /api/admin/reviews/flagged
 * @access  Private/Admin
 */
export const getFlaggedReviews = asyncHandler(async (req: UserRequest, res: Response) => {
    const query = `
        SELECT 
            r.*,
            u.name as user_name,
            u.email as user_email,
            p.title as product_title
        FROM reviews r
        JOIN users u ON r.user_id = u.user_id
        JOIN products p ON r.product_id = p.product_id
        WHERE r.rating <= 2 
        OR r.comment ILIKE '%scam%'
        OR r.comment ILIKE '%fake%'
        OR r.comment ILIKE '%fraud%'
        ORDER BY r.created_at DESC
    `;

    const result = await pool.query(query);

    res.status(200).json({
        success: true,
        data: result.rows
    });
});

export default {
    bulkUpdateUsers,
    changeUserRole,
    resetUserPassword,
    bulkUpdateOrders,
    getOrderDetails,
    bulkUpdateProducts,
    getProductDetails,
    updateSellerStatus,
    getSellerDetails,
    manualPaymentConfirmation,
    getPendingPayments,
    mergeCategories,
    bulkDeleteReviews,
    getFlaggedReviews
};