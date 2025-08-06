import express from 'express'
import { getDeliveryPrices, getDeliveryPriceById, createDeliveryPrice, updateDeliveryPrice, deleteDeliveryPrice } from '../controllers/deliveryPriceController';
import { protect } from '../middlewares/auth/protect';

const router = express.Router()

router.get("/",  getDeliveryPrices);
router.get("/:id", protect, getDeliveryPriceById);
router.post("/", protect, createDeliveryPrice);
router.put("/:id", protect, updateDeliveryPrice);
router.delete("/:id", protect, deleteDeliveryPrice);


export default router