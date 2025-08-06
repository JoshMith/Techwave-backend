import express from 'express'
import { createSeller, deleteSeller, getSellerById, getSellers, updateSeller } from '../controllers/sellersController'
import { protect } from '../middlewares/auth/protect'

const router = express.Router()

router.get("/",  getSellers)
router.get("/:id", protect, getSellerById)
router.post("/", protect, createSeller)
router.put("/:id", protect, updateSeller)
router.delete("/:id", protect, deleteSeller)


export default router