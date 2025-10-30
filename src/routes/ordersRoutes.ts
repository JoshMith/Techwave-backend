import express from 'express'
import { createOrder, getOrders, getOrderById, updateOrder, deleteOrder, getOrdersCount } from '../controllers/ordersController';
import { protect } from '../middlewares/auth/protect';
import { adminCustomerGuard, adminGuard, adminSellerGuard, userGuard } from '../middlewares/auth/roleMiddleWare';


const router = express.Router()

router.get("/",  getOrders);
router.get("/ordersCount", getOrdersCount);
router.get("/:id", protect, getOrderById);
router.post("/", protect, adminCustomerGuard, createOrder);
router.put("/:id", protect, userGuard, updateOrder);
router.delete("/:id", protect, adminGuard, deleteOrder);

export default router
