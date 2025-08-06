import express from "express";
import { getPayments, getPaymentById, createPayment, confirmPayment, deletePayment } from "../controllers/paymentsController";
import { protect } from "../middlewares/auth/protect";



const router = express.Router()

router.get("/",  getPayments);
router.get("/:id", protect, getPaymentById);
router.post("/", protect, createPayment); 
router.put("/:id/confirm", protect, confirmPayment);
router.delete("/:id", protect, deletePayment);


export default router
