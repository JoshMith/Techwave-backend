import express from 'express';
import { 
    getCarts, 
    getCartById, 
    getCartByUserId, 
    getCartBySessionId,
    createCart, 
    updateCart, 
    deleteCart,
    clearCart 
} from '../controllers/cartController';
import { protect } from '../middlewares/auth/protect';

const router = express.Router();

// Public routes
router.post("/", createCart);
router.get("/session/:sessionId", getCartBySessionId);

// Protected routes
router.get("/",  getCarts);
router.get("/:id", protect, getCartById);
router.get("/user/:userId", protect, getCartByUserId);
router.put("/:id", protect, updateCart);
router.delete("/:id", protect, deleteCart);
router.delete("/:id/clear", protect, clearCart);

export default router;