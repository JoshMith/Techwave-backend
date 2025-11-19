import express from 'express'
import { googleAuth, googleAuthCallback, login, logout, register, verifyEmail } from '../controllers/authController'

const router = express.Router()

//public routes 
router.post("/register", register)
router.post("/login", login)
router.post("/logout", logout)

router.get("/verifyEmail",verifyEmail)

// Google OAuth routes
router.get("/google", googleAuth)
router.get("/google/callback", googleAuthCallback)


export default router