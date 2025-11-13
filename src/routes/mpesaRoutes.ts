import express from 'express';
import { 
    initiatePayment, 
    mpesaCallback, 
    queryPaymentStatus 
} from '../controllers/mpesaController';
import { protect } from '../middlewares/auth/protect';

const router = express.Router();

// Initiate STK Push (Protected - requires authentication)
router.post('/stkpush', protect, initiatePayment);

// M-Pesa Callback (Public - called by Safaricom servers)
router.post('/callback', mpesaCallback);

// Query payment status (Protected)
router.post('/query', protect, queryPaymentStatus);

export default router;