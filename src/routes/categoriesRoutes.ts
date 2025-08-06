import express from 'express'
import { protect } from '../middlewares/auth/protect'
import { createCategory, getCategories, getCategoryById, updateCategory, deleteCategory, getProductCountByCategory } from '../controllers/categoriesController';

const router = express.Router()

router.get("/", getCategories);
router.get("/:id", getCategoryById);
router.get('/:id/product-count', getProductCountByCategory);
router.post("/", protect, createCategory);
router.put("/:id",  updateCategory);
router.delete("/:id", protect, deleteCategory);

export default router