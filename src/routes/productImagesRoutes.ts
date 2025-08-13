import express from "express";
import { getProductImages, uploadProductImages, updateProductImage, deleteProductImage } from "../controllers/productImagesController";
import path from "path";

const router = express.Router()


router.get("/:productId", getProductImages);
router.post("/", uploadProductImages);
router.put("/:productId/images/:imageId", updateProductImage);
router.delete("/:productId/images/:imageId", deleteProductImage);

router.get("/image/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, "../../public/uploads/products", filename
    );
    res.sendFile(filePath);
});

export default router