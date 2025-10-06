import express from 'express'
import { createUser, deleteUser, getCurrentUserProfile, getUserById, getUsers, updateUser, getCustomerCount } from '../controllers/usersController'
import { protect } from '../middlewares/auth/protect'

const router = express.Router()

router.get("/",  getUsers)
router.get("/customerCount", getCustomerCount)
router.get("/:id", protect, getUserById)
router.get("/profile", protect, getCurrentUserProfile)
router.post("/", protect, createUser)
router.put("/:id",  updateUser)
router.delete("/:id", protect, deleteUser)


export default router