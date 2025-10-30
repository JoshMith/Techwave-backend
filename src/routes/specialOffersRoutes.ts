import express from 'express'
import { getSpecialOffers, getSpecialOfferById, createSpecialOffer, updateSpecialOffer, deleteSpecialOffer, toggleSpecialOfferActivation, getOffersCount } from '../controllers/specialOffersController';
import { adminSellerGuard } from '../middlewares/auth/roleMiddleWare';
import { protect } from '../middlewares/auth/protect';



const router = express.Router()

router.get("/", getSpecialOffers);
router.get("/offersCount", getOffersCount)
router.get("/:id", getSpecialOfferById);
router.post("/", protect, adminSellerGuard, createSpecialOffer);
router.put("/:id", protect, adminSellerGuard, updateSpecialOffer);
router.put("/:id/toggle-activation", protect, adminSellerGuard, toggleSpecialOfferActivation);
router.delete("/:id", protect, adminSellerGuard, deleteSpecialOffer);

export default router