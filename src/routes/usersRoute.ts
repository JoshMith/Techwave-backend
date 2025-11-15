import express from 'express'
import { createUser, deleteUser, getCurrentUserProfile, getUserById, getUsers, updateUser, getCustomerCount, getCurrentUser } from '../controllers/usersController'
import { protect } from '../middlewares/auth/protect'
import { adminCustomerGuard } from '../middlewares/auth/roleMiddleWare'

const router = express.Router()

router.get("/", protect, getUsers)
router.get("/userLoggedIn", protect, getCurrentUser)
router.get("/customerCount", protect, getCustomerCount)
router.get("/:id", protect, getUserById)
router.get("/profile/:id", protect, getCurrentUserProfile)
// router.post("/", protect, createUser)
router.put("/:id", protect, adminCustomerGuard, updateUser)
router.delete("/:id", protect, deleteUser)


export default router