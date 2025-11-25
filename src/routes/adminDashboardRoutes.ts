// Admin Dashboard Routes
// Routes for comprehensive admin dashboard management

import express from 'express';
import {
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
} from '../controllers/adminDashboardController';
import { protect } from '../middlewares/auth/protect';
import { adminGuard } from '../middlewares/auth/roleMiddleWare';

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(adminGuard);

router.get('/stats', getDashboardStats);
router.get('/revenue-trends', getRevenueTrends);
router.get('/daily-revenue', getDailyRevenue);
router.get('/top-products', getTopProducts);
router.get('/top-customers', getTopCustomers);
router.get('/top-sellers', getTopSellers);
router.get('/low-stock-products', getLowStockProducts);
router.get('/out-of-stock-products', getOutOfStockProducts);
router.get('/recent-orders', getRecentOrders);
router.get('/recent-users', getRecentUsers);
router.get('/recent-reviews', getRecentReviews);
router.get('/category-performance', getCategoryPerformance);
router.get('/alerts', getSystemAlerts);
router.get('/database-stats', getDatabaseStats);

export default router;