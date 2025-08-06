import express from 'express'
import { getSpecialOffers, getSpecialOfferById, createSpecialOffer, updateSpecialOffer, deleteSpecialOffer, toggleSpecialOfferActivation } from '../controllers/specialOffersController';



const router = express.Router()

router.get("/", getSpecialOffers);
router.get("/:id", getSpecialOfferById);
router.post("/", createSpecialOffer);
router.put("/:id", updateSpecialOffer);
router.put("/:id/toggle-activation", toggleSpecialOfferActivation);
router.delete("/:id", deleteSpecialOffer);

export default router