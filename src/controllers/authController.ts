import { Request, Response, NextFunction } from "express"
import pool from "../config/db.config";
import bcrypt from 'bcryptjs'
import { generateToken } from "../utils/helpers/generateToken";
import asyncHandler from "../middlewares/asyncHandler";
import jwt from 'jsonwebtoken'
import passport from 'passport';


export const login = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { email, password } = req.body

    // Check if user exists
    const userQuery = await pool.query(
        `SELECT user_id, name, email, password_hash, role FROM users WHERE email = $1`,
        [email]
    );

    if (userQuery.rows.length === 0) {
        res.status(401).json({ message: "Invalid email or password" });
        return;
    }

    // Check if user is a seller and fetch seller details if applicable
    let sellerData = null;
    if (userQuery.rows[0].role === 'seller') {
        const sellerQuery = await pool.query(
            `SELECT seller_id, business_name, tax_id, business_license, total_sales
             FROM sellers
             WHERE user_id = $1`,
            [userQuery.rows[0].user_id]
        );
        if (sellerQuery.rows.length > 0) {
            sellerData = sellerQuery.rows[0];
        }
    }

    //query the user  
    const user = userQuery.rows[0];

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password_hash)
    if (!isMatch) {
        res.status(401).json({ message: "Invalid email or password" });
        return;
    }

    //generate JWT token 
    await generateToken(res, user.user_id, user.role);
    // await console.log("😐😐", req.cookies)

    // Update last login time to current timestamp
    await pool.query(
        `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE email = $1`,
        [email]
    );

    res.status(200).json({
        message: "Login successful",
        user: {
            user_id: user.user_id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role
        },
        sellerData: {
            ...sellerData
        }
    });
    //next();
}) 

export const register = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, phone, password, role, terms, newsletter } = req.body

    // Check if user exists
    const userExists = await pool.query("SELECT user_id FROM users WHERE email = $1", [email]);

    if (userExists.rows.length > 0) {
        res.status(400).json({ message: "User already exists" });
        return;
    }

    //before inserting into users, we need to hash the passwords
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    //insert into user table 
    const newUser = await pool.query(
        "INSERT INTO users (name, email, phone, password_hash, role, terms, newsletter) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING user_id, name, email, phone, role",
        [name, email, phone, hashedPassword, "customer", terms, newsletter]
    );


    //generate JWT token for user access 
    generateToken(res, newUser.rows[0].user_id, newUser.rows[0].role)
     

    res.status(201).json({
        message: "User registered successfully",
        user: newUser.rows[0]
    });

    //next() - I will redirect automatically is successfully registered
})



export const logout = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    //We need to immedietly invalidate the access token and the refreh token 
    res.cookie("access_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development",
        sameSite: "none",
        expires: new Date(0) // Expire immediately
    });

    res.cookie("refresh_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development",
        sameSite: "none",
        expires: new Date(0) // Expire immediately
    });

    res.status(200).json({ message: "User logged out successfully" });
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

        // Generate tokens and set cookies
        await generateToken(res, user.user_id, user.role);

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
        res.redirect(`${process.env.FRONTEND_URL}/home`);
    })(req, res, next);
});