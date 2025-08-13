import express from 'express'
import { googleAuth, googleAuthCallback, loginUser, logoutUser, registerUser, verifyEmail } from '../controllers/authController'

const router = express.Router()

//public routes 
router.post("/register", registerUser)
router.post("/login", loginUser)
router.post("/logout", logoutUser)

router.get("/verifyEmail",verifyEmail)

// Google OAuth routes
router.get("/google", googleAuth)
router.get("/google/callback", googleAuthCallback)


export default router