import express from 'express';
import { 
    getCartItemsByCartId, 
    getCartItemById, 
    addCartItem, 
    updateCartItem, 
    removeCartItem,
    getCartSummary 
} from '../controllers/cartItemsController';

const router = express.Router();

// All routes are public/private based on cart ownership
// Protection can be added at the controller level based on cart ownership
router.get("/cart/:cartId", getCartItemsByCartId);
router.get("/cart/:cartId/summary", getCartSummary);
router.get("/:id", getCartItemById);
router.post("/", addCartItem);
router.put("/:id", updateCartItem);
router.delete("/:id", removeCartItem);

export default router;