// ============================================
// M-PESA DARAJA API INTEGRATION
// ============================================
import dotenv from 'dotenv';
dotenv.config();

export const mpesaConfig = {
    // Get these from Safaricom Daraja Portal (https://developer.safaricom.co.ke)
    consumerKey: process.env.MPESA_CONSUMER_KEY || '',
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
    // Business Short Code (Paybill or Till Number)
    shortCode: process.env.MPESA_SHORT_CODE || '',
    // Lipa Na M-Pesa Online Passkey
    passkey: process.env.MPESA_PASSKEY || '',
    // API URLs
    environment: process.env.MPESA_ENVIRONMENT || 'sandbox', // 'sandbox' or 'production'
    // Callback URLs (must be publicly accessible)
    callbackURL: process.env.MPESA_CALLBACK_URL || 'https://miffiest-tom-pyramidally.ngrok-free.dev/mpesa/callback',
    // Transaction Type
    transactionType: 'CustomerPayBillOnline', // or 'CustomerBuyGoodsOnline' for PayBill
    // Account Reference
    accountReference: 'TechWave',
};

// API Endpoints
export const mpesaEndpoints = {
    sandbox: {
        oauth: 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
        stkPush: 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
        stkQuery: 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query',
    },
    production: {
        oauth: 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
        stkPush: 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
        stkQuery: 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query',
    }
};

export const getEndpoint = (type: 'oauth' | 'stkPush' | 'stkQuery') => {
    const env = mpesaConfig.environment as 'sandbox' | 'production';
    return mpesaEndpoints[env][type];
};