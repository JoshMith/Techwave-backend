import express from 'express'
import { createOrder, getOrders, getOrderById, updateOrder, deleteOrder, getOrdersCount } from '../controllers/ordersController';
import { protect } from '../middlewares/auth/protect';


const router = express.Router()

router.get("/",  getOrders);
router.get("/ordersCount", getOrdersCount);
router.get("/:id", protect, getOrderById);
router.post("/", protect, createOrder);
router.put("/:id", protect, updateOrder);
router.delete("/:id", protect, deleteOrder);

export default router
