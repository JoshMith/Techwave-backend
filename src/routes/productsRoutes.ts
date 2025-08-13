
import express from 'express'
import { createProduct, getProducts, getProductById, updateProduct, deleteProduct, getProductsCountByCategoryId, getProductsByCategoryName } from '../controllers/productsController'



const router = express.Router()

router.get("/", getProducts);
router.get("/:id", getProductById);
router.get("/count/:id", getProductsCountByCategoryId);
router.get("/category/:name", getProductsByCategoryName);
router.post("/", createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);



export default router