// CRUD operations for sellers in the Techwave backend
// -- Sellers table (extends users)
// CREATE TABLE sellers (
//     seller_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
//     user_id UUID UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
//     business_name VARCHAR(100) NOT NULL,
//     tax_id VARCHAR(50),
//     business_license VARCHAR(100),
//     total_sales NUMERIC(12, 2) DEFAULT 0,
//     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
// );


// Techwave-backend/src/controllers/sellerController.ts
import { Request, Response } from "express";
import pool from "../config/db.config";
import asyncHandler from "../middlewares/asyncHandler";
import { UserRequest } from "../utils/types/userTypes";

// @desc    Get all sellers (Admin only)
// @route   GET /api/sellers
// @access  Private/Admin
export const getSellers = asyncHandler(async (req: Request, res: Response) => {
    const query = `
        SELECT 
            s.seller_id, 
            u.user_id, 
            u.name, 
            u.email, 
            u.phone, 
            s.business_name, 
            s.tax_id, 
            s.business_license, 
            s.total_sales, 
            s.created_at
        FROM sellers s
        JOIN users u ON s.user_id = u.user_id
        ORDER BY s.created_at DESC
    `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
});


// @desc    Get seller by ID
// @route   GET /api/sellers/:id
// @access  Private
export const getSellerById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const query = `
        SELECT 
            s.seller_id, 
            u.user_id, 
            u.name, 
            u.email, 
            u.phone, 
            s.business_name, 
            s.tax_id, 
            s.business_license, 
            s.total_sales, 
            s.created_at
        FROM sellers s
        JOIN users u ON s.user_id = u.user_id
        WHERE s.seller_id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        res.status(404);
        throw new Error("Seller not found");
    }

    res.status(200).json(result.rows[0]);
});


// @desc    Create a new seller
// @route   POST /api/sellers
// @access  Private
export const createSeller = asyncHandler(async (req: UserRequest, res: Response) => {
    const { business_name, tax_id, business_license } = req.body;
    const userId = req.user?.user_id; // Assuming user is authenticated and user_id is available

    // Check if seller already exists for this user
    const existingSeller = await pool.query(
        "SELECT seller_id FROM sellers WHERE user_id = $1",
        [userId]
    );

    if (existingSeller.rows.length > 0) {
        res.status(400);
        throw new Error("Seller already exists for this user");
    }

    const query = `
        INSERT INTO sellers (
            user_id, 
            business_name, 
            tax_id, 
            business_license
        ) 
        VALUES ($1, $2, $3, $4)
        RETURNING 
            seller_id, 
            user_id, 
            business_name, 
            tax_id, 
            business_license, 
            total_sales, 
            created_at
    `;

    const result = await pool.query(query, [
        userId,
        business_name,
        tax_id,
        business_license
    ]);

    res.status(201).json(result.rows[0]);
});


// @desc    Update seller profile
// @route   PUT /api/sellers/:id
// @access  Private
export const updateSeller = asyncHandler(async (req: UserRequest, res: Response) => {
    const { id } = req.params;
    const { business_name, tax_id, business_license } = req.body;

    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let index = 1;

    if (business_name) {
        fieldsToUpdate.push(`business_name = $${index++}`);
        values.push(business_name);
    }
    if (tax_id) {
        fieldsToUpdate.push(`tax_id = $${index++}`);
        values.push(tax_id);
    }
    if (business_license) {
        fieldsToUpdate.push(`business_license = $${index++}`);
        values.push(business_license);
    }

    if (fieldsToUpdate.length === 0) {
        return res.status(400).json({ message: "No fields provided for update" });
    }

    fieldsToUpdate.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
        UPDATE sellers
        SET ${fieldsToUpdate.join(", ")}
        WHERE seller_id = $${index++}
        RETURNING seller_id, user_id, business_name, tax_id, business_license, total_sales, created_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "Seller not found" });
    }

    res.status(200).json(result.rows[0]);
});


// @desc    Delete a seller
// @route   DELETE /api/sellers/:id
// @access  Private/Admin
export const deleteSeller = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Verify seller exists
    const sellerExists = await pool.query(
        "SELECT seller_id FROM sellers WHERE seller_id = $1",
        [id]
    );

    if (sellerExists.rows.length === 0) {
        res.status(404);
        throw new Error("Seller not found");
    }

    // Delete the seller
    await pool.query("DELETE FROM sellers WHERE seller_id = $1", [id]);

    res.status(200).json({
        success: true,
        message: "Seller deleted successfully"
    });
});


// @desc    Get seller dashboard statistics
// @route   GET /api/sellers/dashboard/stats
// @access  Private/Seller
export const getSellerDashboardStats = asyncHandler(async (req: UserRequest, res: Response) => {
    const userId = req.user?.user_id;

    if (!userId) {
        res.status(401);
        throw new Error("Unauthorized");
    }

    // Get seller_id from user_id
    const sellerQuery = await pool.query(
        "SELECT seller_id FROM sellers WHERE user_id = $1",
        [userId]
    );

    if (sellerQuery.rows.length === 0) {
        res.status(404);
        throw new Error("Seller profile not found");
    }

    const sellerId = sellerQuery.rows[0].seller_id;

    // 1. Get total products count
    const productsQuery = await pool.query(
        `SELECT COUNT(*) as total_products,
                SUM(CASE WHEN stock > 0 THEN 1 ELSE 0 END) as in_stock_products,
                SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as out_of_stock_products
         FROM products
         WHERE seller_id = $1`,
        [sellerId]
    );

    // 2. Get total orders and revenue
    const ordersQuery = await pool.query(
        `SELECT 
            COUNT(DISTINCT o.order_id) as total_orders,
            COALESCE(SUM(oi.quantity * oi.unit_price), 0) as total_revenue,
            COUNT(DISTINCT CASE WHEN o.status = 'pending' THEN o.order_id END) as pending_orders,
            COUNT(DISTINCT CASE WHEN o.status = 'processing' THEN o.order_id END) as processing_orders,
            COUNT(DISTINCT CASE WHEN o.status = 'shipped' THEN o.order_id END) as shipped_orders,
            COUNT(DISTINCT CASE WHEN o.status = 'delivered' THEN o.order_id END) as delivered_orders,
            COUNT(DISTINCT CASE WHEN o.status = 'cancelled' THEN o.order_id END) as cancelled_orders
         FROM orders o
         JOIN order_items oi ON o.order_id = oi.order_id
         JOIN products p ON oi.product_id = p.product_id
         WHERE p.seller_id = $1`,
        [sellerId]
    );

    // 3. Get revenue for the last 30 days
    const revenueLastMonthQuery = await pool.query(
        `SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0) as revenue_last_30_days
         FROM orders o
         JOIN order_items oi ON o.order_id = oi.order_id
         JOIN products p ON oi.product_id = p.product_id
         WHERE p.seller_id = $1 
         AND o.created_at >= NOW() - INTERVAL '30 days'`,
        [sellerId]
    );

    // 4. Get top selling products (top 5)
    const topProductsQuery = await pool.query(
        `SELECT 
            p.product_id,
            p.title,
            p.price,
            p.sale_price,
            SUM(oi.quantity) as units_sold,
            SUM(oi.quantity * oi.unit_price) as revenue
         FROM products p
         JOIN order_items oi ON p.product_id = oi.product_id
         WHERE p.seller_id = $1
         GROUP BY p.product_id, p.title, p.price, p.sale_price
         ORDER BY units_sold DESC
         LIMIT 5`,
        [sellerId]
    );

    // 5. Get total reviews and average rating
    const reviewsQuery = await pool.query(
        `SELECT 
            COUNT(*) as total_reviews,
            COALESCE(AVG(r.rating), 0) as average_rating,
            COUNT(CASE WHEN r.rating = 5 THEN 1 END) as five_star,
            COUNT(CASE WHEN r.rating = 4 THEN 1 END) as four_star,
            COUNT(CASE WHEN r.rating = 3 THEN 1 END) as three_star,
            COUNT(CASE WHEN r.rating = 2 THEN 1 END) as two_star,
            COUNT(CASE WHEN r.rating = 1 THEN 1 END) as one_star
         FROM reviews r
         JOIN products p ON r.product_id = p.product_id
         WHERE p.seller_id = $1`,
        [sellerId]
    );

    // 6. Get recent orders (last 10)
    const recentOrdersQuery = await pool.query(
        `SELECT DISTINCT
            o.order_id,
            o.total_amount,
            o.status,
            o.created_at,
            u.name as customer_name,
            u.email as customer_email
         FROM orders o
         JOIN order_items oi ON o.order_id = oi.order_id
         JOIN products p ON oi.product_id = p.product_id
         JOIN users u ON o.user_id = u.user_id
         WHERE p.seller_id = $1
         ORDER BY o.created_at DESC
         LIMIT 10`,
        [sellerId]
    );

    // 7. Get monthly revenue trend (last 6 months)
    const revenueMonthlyQuery = await pool.query(
        `SELECT 
            TO_CHAR(o.created_at, 'Mon YYYY') as month,
            EXTRACT(YEAR FROM o.created_at) as year,
            EXTRACT(MONTH FROM o.created_at) as month_number,
            COALESCE(SUM(oi.quantity * oi.unit_price), 0) as revenue
         FROM orders o
         JOIN order_items oi ON o.order_id = oi.order_id
         JOIN products p ON oi.product_id = p.product_id
         WHERE p.seller_id = $1
         AND o.created_at >= NOW() - INTERVAL '6 months'
         GROUP BY year, month_number, month
         ORDER BY year DESC, month_number DESC`,
        [sellerId]
    );

    // 8. Get low stock products (stock <= 10)
    const lowStockQuery = await pool.query(
        `SELECT 
            product_id,
            title,
            stock,
            price
         FROM products
         WHERE seller_id = $1 AND stock <= 10 AND stock > 0
         ORDER BY stock ASC
         LIMIT 10`,
        [sellerId]
    );

    // Construct response
    const stats = {
        products: {
            total: parseInt(productsQuery.rows[0].total_products) || 0,
            inStock: parseInt(productsQuery.rows[0].in_stock_products) || 0,
            outOfStock: parseInt(productsQuery.rows[0].out_of_stock_products) || 0,
            lowStock: lowStockQuery.rows
        },
        orders: {
            total: parseInt(ordersQuery.rows[0].total_orders) || 0,
            pending: parseInt(ordersQuery.rows[0].pending_orders) || 0,
            processing: parseInt(ordersQuery.rows[0].processing_orders) || 0,
            shipped: parseInt(ordersQuery.rows[0].shipped_orders) || 0,
            delivered: parseInt(ordersQuery.rows[0].delivered_orders) || 0,
            cancelled: parseInt(ordersQuery.rows[0].cancelled_orders) || 0,
            recent: recentOrdersQuery.rows
        },
        revenue: {
            total: parseFloat(ordersQuery.rows[0].total_revenue) || 0,
            last30Days: parseFloat(revenueLastMonthQuery.rows[0].revenue_last_30_days) || 0,
            monthlyTrend: revenueMonthlyQuery.rows.map(row => ({
                month: row.month,
                revenue: parseFloat(row.revenue) || 0
            }))
        },
        reviews: {
            total: parseInt(reviewsQuery.rows[0].total_reviews) || 0,
            averageRating: parseFloat(reviewsQuery.rows[0].average_rating).toFixed(2) || 0,
            distribution: {
                fiveStar: parseInt(reviewsQuery.rows[0].five_star) || 0,
                fourStar: parseInt(reviewsQuery.rows[0].four_star) || 0,
                threeStar: parseInt(reviewsQuery.rows[0].three_star) || 0,
                twoStar: parseInt(reviewsQuery.rows[0].two_star) || 0,
                oneStar: parseInt(reviewsQuery.rows[0].one_star) || 0
            }
        },
        topProducts: topProductsQuery.rows.map(row => ({
            productId: row.product_id,
            title: row.title,
            price: parseFloat(row.price) || 0,
            salePrice: row.sale_price ? parseFloat(row.sale_price) : null,
            unitsSold: parseInt(row.units_sold) || 0,
            revenue: parseFloat(row.revenue) || 0
        }))
    };

    res.status(200).json({
        success: true,
        data: stats
    });
});