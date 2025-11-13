// ============================================
// M-PESA CONTROLLER
// ============================================
import express from 'express';
import pool from '../config/db.config';
import asyncHandler from '../middlewares/asyncHandler';
import { initiateSTKPush, querySTKPushStatus } from '../services/mpesaService';

/**
 * @desc    Initiate M-Pesa STK Push
 * @route   POST /api/mpesa/stkpush
 * @access  Private
 */
export const initiatePayment = asyncHandler(async (req: express.Request, res: express.Response) => {
    const { phoneNumber, amount, orderId, accountReference } = req.body;

    // Validation
    if (!phoneNumber || !amount || !orderId) {
        return res.status(400).json({
            message: 'Phone number, amount, and order ID are required',
        });
    }

    // Validate phone number format
    const phoneRegex = /^(\+?254|0)[17]\d{8}$/;
    if (!phoneRegex.test(phoneNumber)) {
        return res.status(400).json({
            message: 'Invalid phone number format. Use 254XXXXXXXXX or 07XXXXXXXX',
        });
    }

    // Validate amount
    if (amount < 1) {
        return res.status(400).json({
            message: 'Amount must be at least KSh 1',
        });
    }

    // Check if order exists
    const orderCheck = await pool.query(
        'SELECT order_id, total_amount, status FROM orders WHERE order_id = $1',
        [orderId]
    );

    if (orderCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Order not found' });
    }

    const order = orderCheck.rows[0];

    // Verify amount matches order total
    if (Math.abs(order.total_amount - amount) > 0.01) {
        return res.status(400).json({
            message: 'Payment amount does not match order total',
        });
    }

    // Initiate STK Push
    const result = await initiateSTKPush(
        phoneNumber,
        amount,
        orderId,
        accountReference
    );

    if (!result.success) {
        return res.status(400).json({
            message: result.error || 'Failed to initiate payment',
            code: result.responseCode,
        });
    }

    // Store transaction details in database
    await pool.query(
        `INSERT INTO mpesa_transactions 
        (order_id, checkout_request_id, merchant_request_id, phone_number, amount, status)
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [
            orderId,
            result.checkoutRequestID,
            result.merchantRequestID,
            phoneNumber,
            amount,
            'pending'
        ]
    );

    res.status(200).json({
        success: true,
        message: 'STK push sent successfully. Please check your phone.',
        checkoutRequestID: result.checkoutRequestID,
        merchantRequestID: result.merchantRequestID,
        customerMessage: result.customerMessage,
    });
});

/**
 * @desc    M-Pesa Payment Callback (from Safaricom)
 * @route   POST /api/mpesa/callback
 * @access  Public (called by M-Pesa)
 */
export const mpesaCallback = asyncHandler(async (req: express.Request, res: express.Response) => {
    console.log('📥 M-Pesa Callback Received:', JSON.stringify(req.body, null, 2));

    const { Body } = req.body;
    
    if (!Body || !Body.stkCallback) {
        return res.status(400).json({ message: 'Invalid callback data' });
    }

    const { stkCallback } = Body;
    const {
        MerchantRequestID,
        CheckoutRequestID,
        ResultCode,
        ResultDesc,
        CallbackMetadata
    } = stkCallback;

    // Get transaction details
    const transactionQuery = await pool.query(
        'SELECT * FROM mpesa_transactions WHERE checkout_request_id = $1',
        [CheckoutRequestID]
    );

    if (transactionQuery.rows.length === 0) {
        console.error('❌ Transaction not found:', CheckoutRequestID);
        return res.status(404).json({ message: 'Transaction not found' });
    }

    const transaction = transactionQuery.rows[0];
    const orderId = transaction.order_id;

    // Check if payment was successful
    if (ResultCode === 0) {
        // Payment successful - extract callback data
        const metadata = CallbackMetadata?.Item || [];
        
        const amount = metadata.find((item: any) => item.Name === 'Amount')?.Value;
        const mpesaReceiptNumber = metadata.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value;
        const transactionDate = metadata.find((item: any) => item.Name === 'TransactionDate')?.Value;
        const phoneNumber = metadata.find((item: any) => item.Name === 'PhoneNumber')?.Value;

        console.log('✅ Payment Successful:', {
            orderId,
            amount,
            mpesaReceiptNumber,
            transactionDate,
        });

        // Update transaction status
        await pool.query(
            `UPDATE mpesa_transactions 
            SET status = $1, 
                mpesa_receipt_number = $2, 
                transaction_date = $3,
                result_code = $4,
                result_desc = $5,
                updated_at = NOW()
            WHERE checkout_request_id = $6`,
            ['completed', mpesaReceiptNumber, transactionDate, ResultCode, ResultDesc, CheckoutRequestID]
        );

        // Update payment record
        await pool.query(
            `UPDATE payments 
            SET is_confirmed = true,
                mpesa_code = $1,
                confirmed_at = NOW()
            WHERE order_id = $2 AND method = 'mpesa'`,
            [mpesaReceiptNumber, orderId]
        );

        // Update order status
        await pool.query(
            `UPDATE orders 
            SET status = 'processing'
            WHERE order_id = $1`,
            [orderId]
        );

        // TODO: Send confirmation email to customer
        // TODO: Reduce product stock
        // TODO: Notify seller

        res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });

    } else {
        // Payment failed
        console.error('❌ Payment Failed:', {
            orderId,
            ResultCode,
            ResultDesc,
        });

        // Update transaction status
        await pool.query(
            `UPDATE mpesa_transactions 
            SET status = $1,
                result_code = $2,
                result_desc = $3,
                updated_at = NOW()
            WHERE checkout_request_id = $4`,
            ['failed', ResultCode, ResultDesc, CheckoutRequestID]
        );

        // Update order status
        await pool.query(
            `UPDATE orders 
            SET status = 'failed',
                notes = CONCAT(COALESCE(notes, ''), ' | Payment failed: ', $1)
            WHERE order_id = $2`,
            [ResultDesc, orderId]
        );

        res.status(200).json({ ResultCode: 0, ResultDesc: 'Callback received' });
    }
});

/**
 * @desc    Query STK Push Payment Status
 * @route   POST /api/mpesa/query
 * @access  Private
 */
export const queryPaymentStatus = asyncHandler(async (req: express.Request, res: express.Response) => {
    const { checkoutRequestID } = req.body;

    if (!checkoutRequestID) {
        return res.status(400).json({ message: 'Checkout Request ID is required' });
    }

    // Check transaction in database first
    const transaction = await pool.query(
        'SELECT * FROM mpesa_transactions WHERE checkout_request_id = $1',
        [checkoutRequestID]
    );

    if (transaction.rows.length === 0) {
        return res.status(404).json({ message: 'Transaction not found' });
    }

    const txn = transaction.rows[0];

    // If already completed/failed, return cached result
    if (txn.status !== 'pending') {
        return res.status(200).json({
            status: txn.status,
            resultCode: txn.result_code,
            resultDesc: txn.result_desc,
            mpesaReceiptNumber: txn.mpesa_receipt_number,
        });
    }

    // Query M-Pesa API for status
    const result = await querySTKPushStatus(checkoutRequestID);

    if (result.success) {
        res.status(200).json({
            status: result.resultCode === '0' ? 'completed' : 'pending',
            resultCode: result.resultCode,
            resultDesc: result.resultDesc,
            data: result.data,
        });
    } else {
        res.status(400).json({
            message: result.error || 'Failed to query payment status',
        });
    }
});

export default {
    initiatePayment,
    mpesaCallback,
    queryPaymentStatus,
};