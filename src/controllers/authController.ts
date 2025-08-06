import { Request, Response, NextFunction } from "express"
import pool from "../config/db.config";
import bcrypt from 'bcryptjs'
import { generateToken } from "../utils/helpers/generateToken";
import asyncHandler from "../middlewares/asyncHandler";

export const registerUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, phone, password, role } = req.body

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
        "INSERT INTO users (name, email, phone, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING user_id, name, email, phone, role",
        [name, email, phone, hashedPassword, role]
    );


    //generate JWT token for user access 
    generateToken(res, newUser.rows[0].user_id, newUser.rows[0].role)
     

    res.status(201).json({
        message: "User registered successfully",
        user: newUser.rows[0]
    });

    //next() - I will redirect automatically is successfully registered
})



export const loginUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { email, password } = req.body

    // Check if user exists
    // Check if user exists
    const userQuery = await pool.query(
        `SELECT user_id, name, email, password_hash, role FROM users WHERE email = $1`,
        [email]
    );

    if (userQuery.rows.length === 0) {
        res.status(401).json({ message: "Invalid email or password" });
        return;
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


    res.status(200).json({
        message: "Login successful",
        user: {
            user_id: user.user_id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role
        }
    });

    //next();
}) 


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

    res.status(200).json({ message: "User logged out successfully" });
});
