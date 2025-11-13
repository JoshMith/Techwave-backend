// ============================================
// M-PESA SERVICE
// ============================================
import axios from 'axios';
import { mpesaConfig, getEndpoint } from '../config/mpesa.config';

/**
 * Generate M-Pesa Access Token
 */
export const generateAccessToken = async (): Promise<string> => {
    try {
        const auth = Buffer.from(
            `${mpesaConfig.consumerKey}:${mpesaConfig.consumerSecret}`
        ).toString('base64');

        const response = await axios.get(getEndpoint('oauth'), {
            headers: {
                Authorization: `Basic ${auth}`,
            },
        });

        return response.data.access_token;
    } catch (error: any) {
        console.error('❌ M-Pesa OAuth Error:', error.response?.data || error.message);
        throw new Error('Failed to generate M-Pesa access token');
    }
};

/**
 * Generate M-Pesa Password
 * Formula: Base64(ShortCode + Passkey + Timestamp)
 */
export const generatePassword = (timestamp: string): string => {
    const data = mpesaConfig.shortCode + mpesaConfig.passkey + timestamp;
    return Buffer.from(data).toString('base64');
};

/**
 * Generate Timestamp in format: YYYYMMDDHHmmss
 */
export const generateTimestamp = (): string => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
};

/**
 * Format phone number to M-Pesa format (254XXXXXXXXX)
 */
export const formatPhoneNumber = (phone: string): string => {
    // Remove spaces, dashes, and other non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle different formats
    if (cleaned.startsWith('0')) {
        cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('+254')) {
        cleaned = cleaned.substring(1);
    } else if (cleaned.startsWith('254')) {
        // Already in correct format
    } else if (cleaned.length === 9) {
        cleaned = '254' + cleaned;
    }
    
    return cleaned;
};

/**
 * Initiate STK Push (Lipa Na M-Pesa Online)
 */
export const initiateSTKPush = async (
    phoneNumber: string,
    amount: number,
    orderId: string,
    accountReference?: string
): Promise<any> => {
    try {
        // Get access token
        const accessToken = await generateAccessToken();
        
        // Format phone number
        const formattedPhone = formatPhoneNumber(phoneNumber);
        
        // Generate timestamp and password
        const timestamp = generateTimestamp();
        const password = generatePassword(timestamp);
        
        // Prepare request payload
        const payload = {
            BusinessShortCode: mpesaConfig.shortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: mpesaConfig.transactionType,
            Amount: Math.round(amount), // M-Pesa only accepts whole numbers
            PartyA: formattedPhone, // Customer phone number
            PartyB: mpesaConfig.shortCode, // Business short code
            PhoneNumber: formattedPhone, // Phone to receive STK push
            CallBackURL: mpesaConfig.callbackURL,
            AccountReference: accountReference || mpesaConfig.accountReference,
            TransactionDesc: `Payment for Order ${orderId}`,
        };

        console.log('📱 Initiating STK Push:', {
            phone: formattedPhone,
            amount,
            orderId,
        });

        // Make API request
        const response = await axios.post(
            getEndpoint('stkPush'),
            payload,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        console.log('✅ STK Push initiated:', response.data);

        return {
            success: true,
            checkoutRequestID: response.data.CheckoutRequestID,
            merchantRequestID: response.data.MerchantRequestID,
            responseCode: response.data.ResponseCode,
            responseDescription: response.data.ResponseDescription,
            customerMessage: response.data.CustomerMessage,
        };

    } catch (error: any) {
        console.error('❌ STK Push Error:', error.response?.data || error.message);
        
        return {
            success: false,
            error: error.response?.data?.errorMessage || 'Failed to initiate payment',
            responseCode: error.response?.data?.ResponseCode,
        };
    }
};

/**
 * Query STK Push Transaction Status
 */
export const querySTKPushStatus = async (checkoutRequestID: string): Promise<any> => {
    try {
        const accessToken = await generateAccessToken();
        const timestamp = generateTimestamp();
        const password = generatePassword(timestamp);

        const payload = {
            BusinessShortCode: mpesaConfig.shortCode,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: checkoutRequestID,
        };

        const response = await axios.post(
            getEndpoint('stkQuery'),
            payload,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return {
            success: true,
            resultCode: response.data.ResultCode,
            resultDesc: response.data.ResultDesc,
            data: response.data,
        };

    } catch (error: any) {
        console.error('❌ STK Query Error:', error.response?.data || error.message);
        
        return {
            success: false,
            error: error.response?.data?.errorMessage || 'Failed to query payment status',
        };
    }
};
