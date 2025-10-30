import express from 'express'
import { createSeller, deleteSeller, getSellerById, getSellers, updateSeller } from '../controllers/sellersController'
import { protect } from '../middlewares/auth/protect'
import { adminGuard, adminSellerGuard } from '../middlewares/auth/roleMiddleWare'

const router = express.Router()

router.get("/", protect, adminSellerGuard, getSellers)
router.get("/:id", protect, adminSellerGuard, getSellerById)
router.post("/", protect, adminGuard, createSeller)
router.put("/:id", protect, adminSellerGuard, updateSeller)
router.delete("/:id", protect, adminGuard, deleteSeller)


export default router