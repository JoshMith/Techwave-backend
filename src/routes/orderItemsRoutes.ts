import express from 'express'
import { protect } from '../middlewares/auth/protect'
import { createOrderItem, getOrderItems, getOrderItemById } from '../controllers/orderItemsController';



const router = express.Router()

router.get("/", getOrderItems);
router.get("/:id", getOrderItemById);
router.post("/", protect, createOrderItem);
router.put("/:id", protect, createOrderItem);
router.delete("/:id", protect, createOrderItem);

export default router