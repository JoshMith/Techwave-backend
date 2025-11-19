import { Request, Response, NextFunction } from "express"
import pool from "../config/db.config";
import bcrypt from 'bcryptjs'
import asyncHandler from "../middlewares/asyncHandler";
import jwt from 'jsonwebtoken'
import passport from 'passport';


// Generate JWT Token
const generateToken = (user_id: number, email: string, role: string): string => {
    return jwt.sign(
        { user_id, email, role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '30d' }
    );
};

// @desc    Login user
// @route   POST /auth/login
// @access  Public
export const login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400);
        throw new Error('Please provide email and password');
    }

    // Find user
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);

    if (result.rows.length === 0) {
        res.status(401);
        throw new Error('Invalid email or password');
    }

    const user = result.rows[0];

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        res.status(401);
        throw new Error('Invalid email or password');
    }

    // Check if user is a seller
    let sellerData = null;
    if (user.role === 'seller') {
        const sellerQuery = await pool.query(
            'SELECT seller_id, business_name, tax_id, business_license, total_sales FROM sellers WHERE user_id = $1',
            [user.user_id]
        );
        if (sellerQuery.rows.length > 0) {
            sellerData = sellerQuery.rows[0];
        }
    }

    // Generate token
    const token = generateToken(user.user_id, user.email, user.role);

    // Set cookie (for same-domain requests)
    res.cookie('jwt', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    // Update last login
    await pool.query(
        'UPDATE users SET last_login = NOW() WHERE user_id = $1',
        [user.user_id]
    );

    // Return response with token in body (CRITICAL for cross-domain)
    res.status(200).json({
        success: true,
        message: 'Login successful',
        token, // ← CRITICAL: Return token in response body
        user: {
            user_id: user.user_id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            terms: user.terms,
            newsletter: user.newsletter
        },
        ...(sellerData && { seller: sellerData })
    });
});



// @desc    Register user
// @route   POST /auth/register
// @access  Public
export const register = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password, phone, role = 'customer', terms, newsletter } = req.body;

    // Validation
    if (!name || !email || !password) {
        res.status(400);
        throw new Error('Please provide name, email, and password');
    }

    // Check if user exists
    const existingUser = await pool.query(
        'SELECT user_id FROM users WHERE email = $1',
        [email]
    );

    if (existingUser.rows.length > 0) {
        res.status(400);
        throw new Error('User already exists with this email');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const insertQuery = `
    INSERT INTO users (name, email, password, phone, role, terms, newsletter)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING user_id, name, email, phone, role, terms, newsletter, created_at
  `;

    const result = await pool.query(insertQuery, [
        name,
        email,
        hashedPassword,
        phone || null,
        role,
        terms || false,
        newsletter || false
    ]);

    const user = result.rows[0];

    // Generate token
    const token = generateToken(user.user_id, user.email, user.role);

    // Set cookie
    res.cookie('jwt', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000
    });

    // Return response with token
    res.status(201).json({
        success: true,
        message: 'Registration successful',
        token, // ← Return token in response body
        user: {
            user_id: user.user_id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            terms: user.terms,
            newsletter: user.newsletter
        }
    });
});



export const logoutUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    //We need to immedietly invalidate the access token and the refreh token 
    res.cookie("access_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development",
        sameSite: "strict",
        expires: new Date(0) // Expire immediately
    });

    res.cookie("refresh_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development",
        sameSite: "strict",
        expires: new Date(0) // Expire immediately
    });

    res.status(200).json({
        success: true,
        message: "Logged out successfully"
    });
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {

    // console.log("verify email called")
    const token = req.query.token as string;
    console.log("recived token")
    if (!token) {
        return res.status(400).json({ message: "Invalid or missing token" });
    }


    try {
        // Decode the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

        // Update user as verified
        const result = await pool.query(
            "UPDATE users SET verified = TRUE WHERE id = $1 RETURNING id, email, verified",
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({ message: "Email successfully verified", user: result.rows[0] });

    } catch (error) {
        return res.status(400).json({ message: "Invalid or expired token" });
    }
});



export const googleAuth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

export const googleAuthCallback = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('google', { failureRedirect: '/homepage' }, async (err: any, user: any) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.redirect('/homepage');
        }

        // Generate token
        const token = generateToken(user.user_id, user.email, user.role);

        // Check if user exists in the database
        const userQuery = await pool.query(
            `SELECT user_id, name, email, role, verified
        FROM users
        WHERE user_id = $1`,
            [user.user_id]
        );


        // If no user is found, return an error
        if (userQuery.rows.length === 0) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Retrieve the user data from the query result
        const userData = userQuery.rows[0];

        // Prepare user data for frontend
        const response = {
            user_id: userData.user_id,
            email: userData.email,
            role: userData.role,
            verified: userData.verified
        };

        // Encode user data for URL
        const encodedUserData = encodeURIComponent(JSON.stringify(response));

        // Redirect to frontend with user data
        // res.redirect(`${process.env.FRONTEND_URL}/homepage?user=${encodedUserData}`);
        res.redirect(`${process.env.FRONTEND_URL}/homepage`);
    })(req, res, next);
});