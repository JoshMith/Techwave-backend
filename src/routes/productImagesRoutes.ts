import express from "express";
import { getProductImages, uploadProductImages, updateProductImage, deleteProductImage, getImageFile, serveProductImages } from "../controllers/productImagesController";
import path from "path";
import { get } from "http";
import { protect } from "../middlewares/auth/protect";

const router = express.Router()

// Public routes
router.get("/product/:productId", serveProductImages); // Get images by productId
router.get("/file/:filename", getImageFile); // Serve individual image file

// Protected routes
router.get("/:productId", getProductImages);
router.post("/upload/:productId", protect, uploadProductImages);
router.put("/:productId/images/:imageId", protect, updateProductImage);
router.delete("/:productId/images/:imageId", protect, deleteProductImage);

export default router