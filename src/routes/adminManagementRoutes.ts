// Admin Management Routes
// Routes for comprehensive admin management operations

import express from 'express';
import {
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
} from '../controllers/adminManagementController';
import { protect } from '../middlewares/auth/protect';
import { adminGuard } from '../middlewares/auth/roleMiddleWare';

const router = express.Router();

// All routes require authentication and admin role
// router.use(protect);
// router.use(adminGuard);

router.put('/users/bulk-update', bulkUpdateUsers);
router.put('/users/:id/role', changeUserRole);
router.put('/users/:id/reset-password', resetUserPassword);
router.put('/orders/bulk-update', bulkUpdateOrders);
router.get('/orders/:id/details', getOrderDetails);
router.put('/products/bulk-update', bulkUpdateProducts);
router.get('/products/:id/details', getProductDetails);
router.put('/sellers/:id/status', updateSellerStatus);
router.get('/sellers/:id/details', getSellerDetails);
router.put('/payments/:id/confirm', manualPaymentConfirmation);
router.get('/payments/pending', getPendingPayments);
router.post('/categories/merge', mergeCategories);
router.delete('/reviews/bulk-delete', bulkDeleteReviews);
router.get('/reviews/flagged', getFlaggedReviews);

export default router;