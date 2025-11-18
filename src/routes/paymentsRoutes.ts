import express from "express";
import { getPayments, getPaymentById, createPayment, confirmPayment, deletePayment, getPaymentByUserId } from "../controllers/paymentsController";
import { protect } from "../middlewares/auth/protect";
import { ownUserGuard } from "../middlewares/auth/roleMiddleWare";



const router = express.Router()

router.get("/",  getPayments);
router.get("/:id", protect, getPaymentById);
router.get("/user/payments", protect, ownUserGuard, getPaymentByUserId)
router.post("/", protect, createPayment); 
router.put("/:orderId/confirm", protect, confirmPayment);
router.delete("/:id", protect, deletePayment);


export default router
