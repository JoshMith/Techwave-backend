import express from 'express'
import dotenv from 'dotenv'
import cookieParser from "cookie-parser"
import cors from "cors"
import { notFound } from './middlewares/errorMiddlewares'
import authRoutes from './routes/authRoutes'
import usersRoute from './routes/usersRoute'
import sellersRoutes from './routes/sellersRoutes'
import addressesRoutes from './routes/addressesRoutes'
import categoriesRoutes from './routes/categoriesRoutes'
import productsRoutes from './routes/productsRoutes'
import productImagesRoutes from './routes/productImagesRoutes'
import ordersRoutes from './routes/ordersRoutes'
import orderItemsRoutes from './routes/orderItemsRoutes'
import specialOffersRoutes from './routes/specialOffersRoutes'
import productOffersRoutes from './routes/productOffersRoutes'
import paymentsRoutes from './routes/paymentsRoutes'
import reviewsRoutes from './routes/reviewsRoutes'
import deliveryPriceRoutes from './routes/deliveryPriceRoutes'
import passport from './config/googleStrategy'
import session from 'express-session'
import path from 'path' // For serving static files


// 1:dotenv
dotenv.config()

//2:instance of express  
const app = express()

//3:NEVER IN YOUR LIFE FORGET THIS 
app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
//Cookie parser middleware
app.use(cookieParser())

// CORS middleware
app.use(cors({
    origin: ["http://localhost:4200", "http://localhost:3000", "https://techwave-neon.vercel.app"], // Allow all origins, you can specify a specific origin if needed
    methods: "GET, POST, PUT, DELETE, OPTIONS",
    credentials: true, //allows cookies and auth headers
    allowedHeaders: "Content-Type, Authorization, X-Requested-With",
}))


//4. routes 
app.use("/auth", authRoutes)
app.use("/users", usersRoute)
app.use("/sellers", sellersRoutes)
app.use("/addresses", addressesRoutes)
app.use("/categories", categoriesRoutes)
app.use("/products", productsRoutes)
app.use("/product-images", productImagesRoutes)
app.use("/orders", ordersRoutes)
app.use("/order-items", orderItemsRoutes)
app.use("/special-offers", specialOffersRoutes)
app.use("/product-offers", productOffersRoutes)
app.use("/payments", paymentsRoutes)
app.use("/reviews", reviewsRoutes)
app.use("/delivery-prices", deliveryPriceRoutes)

// Update your static files configuration
app.use('/public', express.static(path.join(__dirname, '../../public'), {
  setHeaders: (res, path) => {
    // Set proper cache headers
    res.set('Cache-Control', 'public, max-age=31536000');
  }
}));


// Google strategy
app.use(session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Set to true if using HTTPS. //
    // httpOnly: true, // Helps prevent XSS attacks // JS on client side cannot access the cookie
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());


app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Techwave Backend API</title>
    <style>
        font-family: Arial, sans-serif;
        background-color: #f4f4f4;
        color: #333;
        text-align: center;
        padding: 50px;
        border-radius: 10px;
        box-shadow: 0 2px 10px rgba(0, 0, 0.1);
    </style>
</head>
<body>
    <h1>Welcome to Techwave Backend API</h1>
    <p>This is the backend API for Techwave, a platform for managing products, orders, and more.</p>
    <p>Explore the API endpoints to interact with the system.</p>
    <p>For more visualization, visit our <a href="https://techwave-neon.vercel.app">Application</a>.</p>
    <p>Enjoy building with Techwave!</p>
</body>
</html>`)
})

//5. middlewares for error handlers 
app.use(notFound)

//6: start the serve 
const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
    console.log(`🚀🚀 server is running on port - ${PORT}
        link: http://localhost:${PORT}`)
})
