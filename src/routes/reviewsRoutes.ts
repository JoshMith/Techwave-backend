import express from 'express'
import { getReviews, getReviewById, getReviewsByProductId, createReview, updateReview, deleteReview, } from '../controllers/reviewsController';
import { protect } from '../middlewares/auth/protect';



const router = express.Router()

router.get("/",  getReviews);
router.get("/:id", getReviewById);
router.get("/product/:productId", getReviewsByProductId);
router.post("/", protect, createReview);
router.put("/:id", protect, updateReview);
router.delete("/:id", protect, deleteReview);

export default router
