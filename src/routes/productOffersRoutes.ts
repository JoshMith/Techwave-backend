import express from 'express'
import { getProductOffers, getProductOfferByProductId, createProductOffer, updateProductOffer, deleteProductOffer } from '../controllers/productOffersController'


const router = express.Router()

router.get("/", getProductOffers);
router.get("/:productId", getProductOfferByProductId);
router.post("/", createProductOffer);
router.put("/:id", updateProductOffer);
router.delete("/:id", deleteProductOffer);

export default router