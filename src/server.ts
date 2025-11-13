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
import cartItemsRoutes from './routes/cartItemsRoutes'
import cartRoutes from './routes/cartRoutes'
import mpesaRoutes from './routes/mpesaRoutes';



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
    origin: ["http://localhost:4200", "https://techwave-neon.vercel.app"],
    methods: "GET, POST, PUT, DELETE, OPTIONS",
    credentials: true,
    allowedHeaders: "Content-Type, Authorization, X-Requested-With, X-CSRF-Token",
}))
// Handle preflight requests
app.options('*', cors({
    origin: ["http://localhost:4200", "https://techwave-neon.vercel.app"],
    credentials: true,
    allowedHeaders: "Content-Type, Authorization, X-Requested-With, X-CSRF-Token",
}));



//4. routes 
app.use("/auth", authRoutes)
app.use("/users", usersRoute)
app.use("/sellers", sellersRoutes)
app.use("/addresses", addressesRoutes)
app.use("/categories", categoriesRoutes)
app.use("/products", productsRoutes)
app.use("/product-images", productImagesRoutes)
app.use("/carts", cartRoutes) // Importing with require to handle ES module compatibility
app.use("/cart-items", cartItemsRoutes) // Importing with require to handle ES module compatibility
app.use("/orders", ordersRoutes)
app.use("/order-items", orderItemsRoutes)
app.use("/special-offers", specialOffersRoutes)
app.use("/product-offers", productOffersRoutes)
app.use("/payments", paymentsRoutes)
app.use("/reviews", reviewsRoutes)
app.use("/delivery-prices", deliveryPriceRoutes)
app.use("/mpesa", mpesaRoutes);

// Update your static files configuration
app.use('/public', express.static(path.join(__dirname, '../public'), {
  setHeaders: (res, path) => {
    // Set proper cache headers
    res.set('Cache-Control', 'public, max-age=31536000');
  }
}));

// Serve static files from 'public' directory as root
app.use(express.static(path.join(__dirname, '../public')));


// Google strategy
app.use(session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'development' ? false : true, // Set to true if using HTTPS in production 
    httpOnly: true, // Helps prevent XSS attacks // JS on client side cannot access the cookie
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
  <link href="https://fonts.googleapis.com/css?family=Montserrat:700,400&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Montserrat', Arial, sans-serif;
      background: linear-gradient(135deg, #00c6ff 0%, #0072ff 100%);
      color: #fff;
      min-height: 100vh;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: rgba(255,255,255,0.08);
      padding: 40px 32px;
      border-radius: 18px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      text-align: center;
      max-width: 420px;
    }
    h1 {
      font-size: 2.5rem;
      margin-bottom: 18px;
      font-weight: 700;
      letter-spacing: 1px;
    }
    p {
      font-size: 1.08rem;
      margin-bottom: 18px;
      font-weight: 400;
    }
    .btn {
      display: inline-block;
      padding: 14px 32px;
      font-size: 1.1rem;
      font-weight: 700;
      color: #fff;
      background: linear-gradient(90deg, #ff512f 0%, #dd2476 100%);
      border: none;
      border-radius: 8px;
      text-decoration: none;
      box-shadow: 0 2px 8px rgba(221,36,118,0.18);
      transition: background 0.2s, transform 0.2s;
      cursor: pointer;
    }
    .btn:hover {
      background: linear-gradient(90deg, #dd2476 0%, #ff512f 100%);
      transform: translateY(-2px) scale(1.04);
    }
    @media (max-width: 500px) {
      .container {
        padding: 24px 8px;
      }
      h1 {
        font-size: 2rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Techwave Backend API</h1>
    <p>Welcome to the backend API for <strong>Techwave</strong>.<br>
    Manage products, orders, users, and more with powerful endpoints.</p>
    <p>Ready to explore the frontend?</p>
    <a class="btn" href="https://techwave-neon.vercel.app" target="_blank">Go to Techwave Frontend (Production)</a>
    <br><br>
    <a class="btn" href="http://localhost:4200" target="_blank">Go to Techwave Frontend (Localhost)</a>
    <p style="margin-top:22px;font-size:0.95rem;opacity:0.7;">Enjoy building with Techwave!</p>
  </div>
</body>
</html>
  `);
});

//5. middlewares for error handlers 
app.use(notFound)

//6: start the serve 
const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
    console.log(`🚀🚀 server is running on port - ${PORT}
        link: http://localhost:${PORT}`)
})
