// Admin Dashboard Controller
// Comprehensive statistics and management for admin dashboard

import { Request, Response } from "express";
import pool from "../config/db.config";
import asyncHandler from "../middlewares/asyncHandler";
import { UserRequest } from "../utils/types/userTypes";

// ============================================
// DASHBOARD OVERVIEW STATISTICS
// ============================================

/**
 * @desc    Get comprehensive dashboard statistics
 * @route   GET /api/admin/dashboard/stats
 * @access  Private/Admin
 */
export const getDashboardStats = asyncHandler(async (req: UserRequest, res: Response) => {
    try {
        // 1. Users Statistics
        const usersStats = await pool.query(`
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN role = 'customer' THEN 1 END) as total_customers,
                COUNT(CASE WHEN role = 'seller' THEN 1 END) as total_sellers,
                COUNT(CASE WHEN role = 'admin' THEN 1 END) as total_admins,
                COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_last_30_days,
                COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_users_last_7_days
            FROM users
        `);

        // 2. Products Statistics
        const productsStats = await pool.query(`
            SELECT 
                COUNT(*) as total_products,
                COUNT(CASE WHEN stock > 0 THEN 1 END) as in_stock_products,
                COUNT(CASE WHEN stock = 0 THEN 1 END) as out_of_stock_products,
                COUNT(CASE WHEN stock <= 10 AND stock > 0 THEN 1 END) as low_stock_products,
                COALESCE(AVG(price), 0) as average_price,
                COALESCE(SUM(stock), 0) as total_stock_units
            FROM products
        `);

        // 3. Orders Statistics
        const ordersStats = await pool.query(`
            SELECT 
                COUNT(*) as total_orders,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
                COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_orders,
                COUNT(CASE WHEN status = 'shipped' THEN 1 END) as shipped_orders,
                COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_orders,
                COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as orders_last_30_days,
                COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as orders_last_7_days
            FROM orders
        `);

        // 4. Revenue Statistics
        const revenueStats = await pool.query(`
            SELECT 
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN total_amount END), 0) as revenue_last_30_days,
                COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN total_amount END), 0) as revenue_last_7_days,
                COALESCE(AVG(total_amount), 0) as average_order_value
            FROM orders
            WHERE status NOT IN ('cancelled', 'failed')
        `);

        // 5. Payments Statistics
        const paymentsStats = await pool.query(`
            SELECT 
                COUNT(*) as total_payments,
                COUNT(CASE WHEN is_confirmed = true THEN 1 END) as confirmed_payments,
                COUNT(CASE WHEN is_confirmed = false THEN 1 END) as pending_payments,
                COUNT(CASE WHEN method = 'mpesa' THEN 1 END) as mpesa_payments,
                COUNT(CASE WHEN method = 'cash' THEN 1 END) as cash_payments,
                COALESCE(SUM(amount), 0) as total_payment_amount
            FROM payments
        `);

        // 6. Categories Statistics
        const categoriesStats = await pool.query(`
            SELECT 
                COUNT(*) as total_categories,
                COUNT(CASE WHEN featured = true THEN 1 END) as featured_categories
            FROM categories
        `);

        // 7. Reviews Statistics
        const reviewsStats = await pool.query(`
            SELECT 
                COUNT(*) as total_reviews,
                COALESCE(AVG(rating), 0) as average_rating,
                COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star_reviews,
                COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star_reviews,
                COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star_reviews,
                COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star_reviews,
                COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star_reviews
            FROM reviews
        `);

        // 8. Carts Statistics
        const cartsStats = await pool.query(`
            SELECT 
                COUNT(*) as total_carts,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_carts,
                COUNT(CASE WHEN status = 'abandoned' THEN 1 END) as abandoned_carts,
                COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as user_carts,
                COUNT(CASE WHEN session_id IS NOT NULL THEN 1 END) as guest_carts
            FROM carts
        `);

        // 9. Special Offers Statistics
        const offersStats = await pool.query(`
            SELECT 
                COUNT(*) as total_offers,
                COUNT(CASE WHEN is_active = true THEN 1 END) as active_offers,
                COUNT(CASE WHEN valid_until >= NOW() THEN 1 END) as valid_offers
            FROM special_offers
        `);

        // Construct comprehensive response
        const dashboardStats = {
            users: {
                total: parseInt(usersStats.rows[0].total_users) || 0,
                customers: parseInt(usersStats.rows[0].total_customers) || 0,
                sellers: parseInt(usersStats.rows[0].total_sellers) || 0,
                admins: parseInt(usersStats.rows[0].total_admins) || 0,
                newLast30Days: parseInt(usersStats.rows[0].new_users_last_30_days) || 0,
                newLast7Days: parseInt(usersStats.rows[0].new_users_last_7_days) || 0
            },
            products: {
                total: parseInt(productsStats.rows[0].total_products) || 0,
                inStock: parseInt(productsStats.rows[0].in_stock_products) || 0,
                outOfStock: parseInt(productsStats.rows[0].out_of_stock_products) || 0,
                lowStock: parseInt(productsStats.rows[0].low_stock_products) || 0,
                averagePrice: parseFloat(productsStats.rows[0].average_price).toFixed(2) || 0,
                totalStockUnits: parseInt(productsStats.rows[0].total_stock_units) || 0
            },
            orders: {
                total: parseInt(ordersStats.rows[0].total_orders) || 0,
                pending: parseInt(ordersStats.rows[0].pending_orders) || 0,
                processing: parseInt(ordersStats.rows[0].processing_orders) || 0,
                shipped: parseInt(ordersStats.rows[0].shipped_orders) || 0,
                delivered: parseInt(ordersStats.rows[0].delivered_orders) || 0,
                cancelled: parseInt(ordersStats.rows[0].cancelled_orders) || 0,
                failed: parseInt(ordersStats.rows[0].failed_orders) || 0,
                last30Days: parseInt(ordersStats.rows[0].orders_last_30_days) || 0,
                last7Days: parseInt(ordersStats.rows[0].orders_last_7_days) || 0
            },
            revenue: {
                total: parseFloat(revenueStats.rows[0].total_revenue).toFixed(2) || 0,
                last30Days: parseFloat(revenueStats.rows[0].revenue_last_30_days).toFixed(2) || 0,
                last7Days: parseFloat(revenueStats.rows[0].revenue_last_7_days).toFixed(2) || 0,
                averageOrderValue: parseFloat(revenueStats.rows[0].average_order_value).toFixed(2) || 0
            },
            payments: {
                total: parseInt(paymentsStats.rows[0].total_payments) || 0,
                confirmed: parseInt(paymentsStats.rows[0].confirmed_payments) || 0,
                pending: parseInt(paymentsStats.rows[0].pending_payments) || 0,
                mpesa: parseInt(paymentsStats.rows[0].mpesa_payments) || 0,
                cash: parseInt(paymentsStats.rows[0].cash_payments) || 0,
                totalAmount: parseFloat(paymentsStats.rows[0].total_payment_amount).toFixed(2) || 0
            },
            categories: {
                total: parseInt(categoriesStats.rows[0].total_categories) || 0,
                featured: parseInt(categoriesStats.rows[0].featured_categories) || 0
            },
            reviews: {
                total: parseInt(reviewsStats.rows[0].total_reviews) || 0,
                averageRating: parseFloat(reviewsStats.rows[0].average_rating).toFixed(2) || 0,
                fiveStar: parseInt(reviewsStats.rows[0].five_star_reviews) || 0,
                fourStar: parseInt(reviewsStats.rows[0].four_star_reviews) || 0,
                threeStar: parseInt(reviewsStats.rows[0].three_star_reviews) || 0,
                twoStar: parseInt(reviewsStats.rows[0].two_star_reviews) || 0,
                oneStar: parseInt(reviewsStats.rows[0].one_star_reviews) || 0
            },
            carts: {
                total: parseInt(cartsStats.rows[0].total_carts) || 0,
                active: parseInt(cartsStats.rows[0].active_carts) || 0,
                abandoned: parseInt(cartsStats.rows[0].abandoned_carts) || 0,
                userCarts: parseInt(cartsStats.rows[0].user_carts) || 0,
                guestCarts: parseInt(cartsStats.rows[0].guest_carts) || 0
            },
            offers: {
                total: parseInt(offersStats.rows[0].total_offers) || 0,
                active: parseInt(offersStats.rows[0].active_offers) || 0,
                valid: parseInt(offersStats.rows[0].valid_offers) || 0
            }
        };

        res.status(200).json({
            success: true,
            data: dashboardStats
        });

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard statistics'
        });
    }
});

// ============================================
// REVENUE ANALYTICS
// ============================================

/**
 * @desc    Get revenue trends over time
 * @route   GET /api/admin/dashboard/revenue-trends
 * @access  Private/Admin
 */
export const getRevenueTrends = asyncHandler(async (req: UserRequest, res: Response) => {
    const { period = '12' } = req.query; // Default to 12 months

    const query = `
        SELECT 
            TO_CHAR(created_at, 'Mon YYYY') as month,
            EXTRACT(YEAR FROM created_at) as year,
            EXTRACT(MONTH FROM created_at) as month_number,
            COUNT(*) as order_count,
            COALESCE(SUM(total_amount), 0) as revenue,
            COALESCE(AVG(total_amount), 0) as average_order_value
        FROM orders
        WHERE status NOT IN ('cancelled', 'failed')
        AND created_at >= NOW() - INTERVAL '${parseInt(period as string)} months'
        GROUP BY year, month_number, month
        ORDER BY year DESC, month_number DESC
    `;

    const result = await pool.query(query);

    const trends = result.rows.map(row => ({
        month: row.month,
        year: parseInt(row.year),
        monthNumber: parseInt(row.month_number),
        orderCount: parseInt(row.order_count),
        revenue: parseFloat(row.revenue).toFixed(2),
        averageOrderValue: parseFloat(row.average_order_value).toFixed(2)
    }));

    res.status(200).json({
        success: true,
        data: trends
    });
});

/**
 * @desc    Get daily revenue for current month
 * @route   GET /api/admin/dashboard/daily-revenue
 * @access  Private/Admin
 */
export const getDailyRevenue = asyncHandler(async (req: UserRequest, res: Response) => {
    const query = `
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as order_count,
            COALESCE(SUM(total_amount), 0) as revenue
        FROM orders
        WHERE status NOT IN ('cancelled', 'failed')
        AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    `;

    const result = await pool.query(query);

    const dailyRevenue = result.rows.map(row => ({
        date: row.date,
        orderCount: parseInt(row.order_count),
        revenue: parseFloat(row.revenue).toFixed(2)
    }));

    res.status(200).json({
        success: true,
        data: dailyRevenue
    });
});

// ============================================
// TOP PERFORMERS
// ============================================

/**
 * @desc    Get top selling products
 * @route   GET /api/admin/dashboard/top-products
 * @access  Private/Admin
 */
export const getTopProducts = asyncHandler(async (req: UserRequest, res: Response) => {
    const { limit = '10' } = req.query;

    const query = `
        SELECT 
            p.product_id,
            p.title,
            p.price,
            p.sale_price,
            p.stock,
            c.name as category_name,
            COUNT(oi.order_item_id) as times_ordered,
            SUM(oi.quantity) as units_sold,
            COALESCE(SUM(oi.quantity * oi.unit_price), 0) as revenue
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN order_items oi ON p.product_id = oi.product_id
        GROUP BY p.product_id, p.title, p.price, p.sale_price, p.stock, c.name
        ORDER BY units_sold DESC NULLS LAST
        LIMIT $1
    `;

    const result = await pool.query(query, [parseInt(limit as string)]);

    const topProducts = result.rows.map(row => ({
        productId: row.product_id,
        title: row.title,
        price: parseFloat(row.price),
        salePrice: row.sale_price ? parseFloat(row.sale_price) : null,
        stock: parseInt(row.stock),
        categoryName: row.category_name,
        timesOrdered: parseInt(row.times_ordered) || 0,
        unitsSold: parseInt(row.units_sold) || 0,
        revenue: parseFloat(row.revenue).toFixed(2)
    }));

    res.status(200).json({
        success: true,
        data: topProducts
    });
});

/**
 * @desc    Get top customers by spending
 * @route   GET /api/admin/dashboard/top-customers
 * @access  Private/Admin
 */
export const getTopCustomers = asyncHandler(async (req: UserRequest, res: Response) => {
    const { limit = '10' } = req.query;

    const query = `
        SELECT 
            u.user_id,
            u.name,
            u.email,
            u.phone,
            COUNT(o.order_id) as total_orders,
            COALESCE(SUM(o.total_amount), 0) as total_spent,
            COALESCE(AVG(o.total_amount), 0) as average_order_value,
            MAX(o.created_at) as last_order_date
        FROM users u
        JOIN orders o ON u.user_id = o.user_id
        WHERE o.status NOT IN ('cancelled', 'failed')
        GROUP BY u.user_id, u.name, u.email, u.phone
        ORDER BY total_spent DESC
        LIMIT $1
    `;

    const result = await pool.query(query, [parseInt(limit as string)]);

    const topCustomers = result.rows.map(row => ({
        userId: row.user_id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        totalOrders: parseInt(row.total_orders),
        totalSpent: parseFloat(row.total_spent).toFixed(2),
        averageOrderValue: parseFloat(row.average_order_value).toFixed(2),
        lastOrderDate: row.last_order_date
    }));

    res.status(200).json({
        success: true,
        data: topCustomers
    });
});

/**
 * @desc    Get top sellers by revenue
 * @route   GET /api/admin/dashboard/top-sellers
 * @access  Private/Admin
 */
export const getTopSellers = asyncHandler(async (req: UserRequest, res: Response) => {
    const { limit = '10' } = req.query;

    const query = `
        SELECT 
            s.seller_id,
            s.business_name,
            u.name as owner_name,
            u.email,
            COUNT(DISTINCT p.product_id) as total_products,
            COUNT(DISTINCT o.order_id) as total_orders,
            COALESCE(SUM(oi.quantity * oi.unit_price), 0) as revenue,
            COALESCE(AVG(r.rating), 0) as average_rating,
            COUNT(DISTINCT r.review_id) as review_count
        FROM sellers s
        JOIN users u ON s.user_id = u.user_id
        LEFT JOIN products p ON s.seller_id = p.seller_id
        LEFT JOIN order_items oi ON p.product_id = oi.product_id
        LEFT JOIN orders o ON oi.order_id = o.order_id
        LEFT JOIN reviews r ON p.product_id = r.product_id
        WHERE o.status IS NULL OR o.status NOT IN ('cancelled', 'failed')
        GROUP BY s.seller_id, s.business_name, u.name, u.email
        ORDER BY revenue DESC
        LIMIT $1
    `;

    const result = await pool.query(query, [parseInt(limit as string)]);

    const topSellers = result.rows.map(row => ({
        sellerId: row.seller_id,
        businessName: row.business_name,
        ownerName: row.owner_name,
        email: row.email,
        totalProducts: parseInt(row.total_products) || 0,
        totalOrders: parseInt(row.total_orders) || 0,
        revenue: parseFloat(row.revenue).toFixed(2),
        averageRating: parseFloat(row.average_rating).toFixed(2),
        reviewCount: parseInt(row.review_count) || 0
    }));

    res.status(200).json({
        success: true,
        data: topSellers
    });
});

// ============================================
// INVENTORY MANAGEMENT
// ============================================

/**
 * @desc    Get low stock products alert
 * @route   GET /api/admin/dashboard/low-stock-products
 * @access  Private/Admin
 */
export const getLowStockProducts = asyncHandler(async (req: UserRequest, res: Response) => {
    const { threshold = '10' } = req.query;

    const query = `
        SELECT 
            p.product_id,
            p.title,
            p.stock,
            p.price,
            c.name as category_name,
            s.business_name as seller_name,
            u.email as seller_email
        FROM products p
        JOIN categories c ON p.category_id = c.category_id
        JOIN sellers s ON p.seller_id = s.seller_id
        JOIN users u ON s.user_id = u.user_id
        WHERE p.stock <= $1 AND p.stock > 0
        ORDER BY p.stock ASC
    `;

    const result = await pool.query(query, [parseInt(threshold as string)]);

    const lowStockProducts = result.rows.map(row => ({
        productId: row.product_id,
        title: row.title,
        stock: parseInt(row.stock),
        price: parseFloat(row.price),
        categoryName: row.category_name,
        sellerName: row.seller_name,
        sellerEmail: row.seller_email
    }));

    res.status(200).json({
        success: true,
        data: lowStockProducts
    });
});

/**
 * @desc    Get out of stock products
 * @route   GET /api/admin/dashboard/out-of-stock-products
 * @access  Private/Admin
 */
export const getOutOfStockProducts = asyncHandler(async (req: UserRequest, res: Response) => {
    const query = `
        SELECT 
            p.product_id,
            p.title,
            p.price,
            c.name as category_name,
            s.business_name as seller_name,
            u.email as seller_email,
            p.updated_at as last_updated
        FROM products p
        JOIN categories c ON p.category_id = c.category_id
        JOIN sellers s ON p.seller_id = s.seller_id
        JOIN users u ON s.user_id = u.user_id
        WHERE p.stock = 0
        ORDER BY p.updated_at DESC
    `;

    const result = await pool.query(query);

    const outOfStockProducts = result.rows.map(row => ({
        productId: row.product_id,
        title: row.title,
        price: parseFloat(row.price),
        categoryName: row.category_name,
        sellerName: row.seller_name,
        sellerEmail: row.seller_email,
        lastUpdated: row.last_updated
    }));

    res.status(200).json({
        success: true,
        data: outOfStockProducts
    });
});

// ============================================
// RECENT ACTIVITIES
// ============================================

/**
 * @desc    Get recent orders
 * @route   GET /api/admin/dashboard/recent-orders
 * @access  Private/Admin
 */
export const getRecentOrders = asyncHandler(async (req: UserRequest, res: Response) => {
    const { limit = '20' } = req.query;

    const query = `
        SELECT 
            o.order_id,
            o.total_amount,
            o.status,
            o.created_at,
            u.name as customer_name,
            u.email as customer_email,
            u.phone as customer_phone,
            COUNT(oi.order_item_id) as item_count
        FROM orders o
        JOIN users u ON o.user_id = u.user_id
        LEFT JOIN order_items oi ON o.order_id = oi.order_id
        GROUP BY o.order_id, o.total_amount, o.status, o.created_at, u.name, u.email, u.phone
        ORDER BY o.created_at DESC
        LIMIT $1
    `;

    const result = await pool.query(query, [parseInt(limit as string)]);

    const recentOrders = result.rows.map(row => ({
        orderId: row.order_id,
        totalAmount: parseFloat(row.total_amount).toFixed(2),
        status: row.status,
        createdAt: row.created_at,
        customerName: row.customer_name,
        customerEmail: row.customer_email,
        customerPhone: row.customer_phone,
        itemCount: parseInt(row.item_count)
    }));

    res.status(200).json({
        success: true,
        data: recentOrders
    });
});

/**
 * @desc    Get recent users
 * @route   GET /api/admin/dashboard/recent-users
 * @access  Private/Admin
 */
export const getRecentUsers = asyncHandler(async (req: UserRequest, res: Response) => {
    const { limit = '20' } = req.query;

    const query = `
        SELECT 
            u.user_id,
            u.name,
            u.email,
            u.phone,
            u.role,
            u.created_at,
            COUNT(o.order_id) as order_count,
            COALESCE(SUM(o.total_amount), 0) as total_spent
        FROM users u
        LEFT JOIN orders o ON u.user_id = o.user_id
        GROUP BY u.user_id, u.name, u.email, u.phone, u.role, u.created_at
        ORDER BY u.created_at DESC
        LIMIT $1
    `;

    const result = await pool.query(query, [parseInt(limit as string)]);

    const recentUsers = result.rows.map(row => ({
        userId: row.user_id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        role: row.role,
        createdAt: row.created_at,
        orderCount: parseInt(row.order_count) || 0,
        totalSpent: parseFloat(row.total_spent).toFixed(2)
    }));

    res.status(200).json({
        success: true,
        data: recentUsers
    });
});

/**
 * @desc    Get recent reviews
 * @route   GET /api/admin/dashboard/recent-reviews
 * @access  Private/Admin
 */
export const getRecentReviews = asyncHandler(async (req: UserRequest, res: Response) => {
    const { limit = '20' } = req.query;

    const query = `
        SELECT 
            r.review_id,
            r.rating,
            r.comment,
            r.created_at,
            u.name as user_name,
            u.email as user_email,
            p.title as product_title,
            p.product_id
        FROM reviews r
        JOIN users u ON r.user_id = u.user_id
        JOIN products p ON r.product_id = p.product_id
        ORDER BY r.created_at DESC
        LIMIT $1
    `;

    const result = await pool.query(query, [parseInt(limit as string)]);

    const recentReviews = result.rows.map(row => ({
        reviewId: row.review_id,
        rating: parseInt(row.rating),
        comment: row.comment,
        createdAt: row.created_at,
        userName: row.user_name,
        userEmail: row.user_email,
        productTitle: row.product_title,
        productId: row.product_id
    }));

    res.status(200).json({
        success: true,
        data: recentReviews
    });
});

// ============================================
// CATEGORY PERFORMANCE
// ============================================

/**
 * @desc    Get category performance statistics
 * @route   GET /api/admin/dashboard/category-performance
 * @access  Private/Admin
 */
export const getCategoryPerformance = asyncHandler(async (req: UserRequest, res: Response) => {
    const query = `
        SELECT 
            c.category_id,
            c.name as category_name,
            COUNT(DISTINCT p.product_id) as product_count,
            COUNT(DISTINCT oi.order_item_id) as times_ordered,
            COALESCE(SUM(oi.quantity), 0) as units_sold,
            COALESCE(SUM(oi.quantity * oi.unit_price), 0) as revenue,
            COALESCE(AVG(r.rating), 0) as average_rating,
            COUNT(DISTINCT r.review_id) as review_count
        FROM categories c
        LEFT JOIN products p ON c.category_id = p.category_id
        LEFT JOIN order_items oi ON p.product_id = oi.product_id
        LEFT JOIN reviews r ON p.product_id = r.product_id
        GROUP BY c.category_id, c.name
        ORDER BY revenue DESC
    `;

    const result = await pool.query(query);

    const categoryPerformance = result.rows.map(row => ({
        categoryId: row.category_id,
        categoryName: row.category_name,
        productCount: parseInt(row.product_count) || 0,
        timesOrdered: parseInt(row.times_ordered) || 0,
        unitsSold: parseInt(row.units_sold) || 0,
        revenue: parseFloat(row.revenue).toFixed(2),
        averageRating: parseFloat(row.average_rating).toFixed(2),
        reviewCount: parseInt(row.review_count) || 0
    }));

    res.status(200).json({
        success: true,
        data: categoryPerformance
    });
});

// ============================================
// SYSTEM HEALTH & ALERTS
// ============================================

/**
 * @desc    Get system alerts and notifications
 * @route   GET /api/admin/dashboard/alerts
 * @access  Private/Admin
 */
export const getSystemAlerts = asyncHandler(async (req: UserRequest, res: Response) => {
    const alerts = [];

    // Check for low stock products
    const lowStockQuery = await pool.query(`
        SELECT COUNT(*) as count FROM products WHERE stock <= 10 AND stock > 0
    `);
    if (parseInt(lowStockQuery.rows[0].count) > 0) {
        alerts.push({
            type: 'warning',
            category: 'inventory',
            message: `${lowStockQuery.rows[0].count} products have low stock (≤10 units)`,
            count: parseInt(lowStockQuery.rows[0].count)
        });
    }

    // Check for out of stock products
    const outOfStockQuery = await pool.query(`
        SELECT COUNT(*) as count FROM products WHERE stock = 0
    `);
    if (parseInt(outOfStockQuery.rows[0].count) > 0) {
        alerts.push({
            type: 'error',
            category: 'inventory',
            message: `${outOfStockQuery.rows[0].count} products are out of stock`,
            count: parseInt(outOfStockQuery.rows[0].count)
        });
    }

    // Check for pending orders
    const pendingOrdersQuery = await pool.query(`
        SELECT COUNT(*) as count FROM orders WHERE status = 'pending'
    `);
    if (parseInt(pendingOrdersQuery.rows[0].count) > 0) {
        alerts.push({
            type: 'info',
            category: 'orders',
            message: `${pendingOrdersQuery.rows[0].count} orders are pending processing`,
            count: parseInt(pendingOrdersQuery.rows[0].count)
        });
    }

    // Check for unconfirmed payments
    const unconfirmedPaymentsQuery = await pool.query(`
        SELECT COUNT(*) as count FROM payments WHERE is_confirmed = false
    `);
    if (parseInt(unconfirmedPaymentsQuery.rows[0].count) > 0) {
        alerts.push({
            type: 'warning',
            category: 'payments',
            message: `${unconfirmedPaymentsQuery.rows[0].count} payments are pending confirmation`,
            count: parseInt(unconfirmedPaymentsQuery.rows[0].count)
        });
    }

    // Check for expired offers
    const expiredOffersQuery = await pool.query(`
        SELECT COUNT(*) as count FROM special_offers 
        WHERE is_active = true AND valid_until < NOW()
    `);
    if (parseInt(expiredOffersQuery.rows[0].count) > 0) {
        alerts.push({
            type: 'warning',
            category: 'offers',
            message: `${expiredOffersQuery.rows[0].count} active offers have expired`,
            count: parseInt(expiredOffersQuery.rows[0].count)
        });
    }

    res.status(200).json({
        success: true,
        data: alerts
    });
});

/**
 * @desc    Get database table sizes and statistics
 * @route   GET /api/admin/dashboard/database-stats
 * @access  Private/Admin
 */
export const getDatabaseStats = asyncHandler(async (req: UserRequest, res: Response) => {
    const query = `
        SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
            pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `;

    const result = await pool.query(query);

    res.status(200).json({
        success: true,
        data: result.rows
    });
});

export default {
    getDashboardStats,
    getRevenueTrends,
    getDailyRevenue,
    getTopProducts,
    getTopCustomers,
    getTopSellers,
    getLowStockProducts,
    getOutOfStockProducts,
    getRecentOrders,
    getRecentUsers,
    getRecentReviews,
    getCategoryPerformance,
    getSystemAlerts,
    getDatabaseStats
};