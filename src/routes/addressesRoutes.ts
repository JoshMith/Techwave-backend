import express from "express";
import { createAddress, deleteAddress, getAddressById, getAddresses, updateAddress } from "../controllers/addressesController";
import { protect } from "../middlewares/auth/protect";


const router = express.Router()

router.get("/",  getAddresses)
router.get("/:id", protect, getAddressById)
router.post("/", protect, createAddress)
router.put("/:id", protect, updateAddress)
router.delete("/:id", protect, deleteAddress)

export default router