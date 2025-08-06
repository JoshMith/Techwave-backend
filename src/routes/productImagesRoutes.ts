import express from "express";
import { getProductImages, uploadProductImages, updateProductImage, deleteProductImage } from "../controllers/productImagesController";

const router = express.Router()


router.get("/:productId", getProductImages);
router.post("/", uploadProductImages);
router.put("/:productId/images/:imageId", updateProductImage);
router.delete("/:productId/images/:imageId", deleteProductImage);


export default router