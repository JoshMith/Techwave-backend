import { Request, Response, NextFunction } from "express";

//Middleware to catch all routes that don't exist 
const notFound = (req: Request, res:Response, next:NextFunction) => {
    const error = new Error(`Resource Not Found - ${req.originalUrl}`)
    res.status(404)
    next(error)
}

const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = err.message;

    // Always return JSON, even for errors
    res.status(statusCode).json({
        success: false,
        message: message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
};

export {notFound, errorHandler}