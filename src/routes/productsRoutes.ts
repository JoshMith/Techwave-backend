
import express from 'express'
import { createProduct, getProducts, getProductById, updateProduct, deleteProduct, getProductsCountByCategoryId, getProductsByCategoryName } from '../controllers/productsController'
import { protect } from '../middlewares/auth/protect';
import { adminSellerGuard } from '../middlewares/auth/roleMiddleWare';



const router = express.Router()

router.get("/", getProducts);
router.get("/:id", getProductById);
router.get("/count/:id", getProductsCountByCategoryId);
router.get("/category/:name", getProductsByCategoryName);
router.post("/", protect, adminSellerGuard, createProduct);
router.put("/:id", protect, adminSellerGuard, updateProduct);
router.delete("/:id", protect, adminSellerGuard, deleteProduct);



export default router