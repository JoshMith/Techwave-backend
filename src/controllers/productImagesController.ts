// CRUD operations for product images, upload images for production access. using multer for file uploads

// -- Product images
// CREATE TABLE product_images (
//     image_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
//     product_id UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
//     image_url VARCHAR(255) NOT NULL,
//     alt_text VARCHAR(100),
//     is_primary BOOLEAN DEFAULT false,
//     sort_order INTEGER DEFAULT 0
// );



import express from "express";
import pool from "../config/db.config";
import asyncHandler from "../middlewares/asyncHandler";
import { UserRequest } from "../utils/types/userTypes";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../public/uploads/products");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `product-${uniqueSuffix}${ext}`);
  },
});

// File filter for image files only
const fileFilter = (req: any, file: any, cb: any) => {
  const filetypes = /jpeg|jpg|png|webp/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error("Only images (JPEG, JPG, PNG, WEBP) are allowed"));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// @desc    Get all images for a product
// @route   GET /api/products/:productId/images
// @access  Public
export const getProductImages = asyncHandler(async (req: UserRequest, res: express.Response) => {
  const { productId } = req.params;

  const query = `
    SELECT 
      image_id, 
      image_url, 
      alt_text, 
      is_primary, 
      sort_order
    FROM product_images
    WHERE product_id = $1
    ORDER BY sort_order
  `;
  const result = await pool.query(query, [productId]);

  res.status(200).json(result.rows);
});

// @desc    Upload product images
// @route   POST /api/products/:productId/images
// @access  Private/Seller
export const uploadProductImages = [
  upload.array("images", 5), // Max 5 images per upload
  asyncHandler(async (req: UserRequest, res: express.Response) => {
    const { productId } = req.params;
    const files = req.files as Express.Multer.File[];
    const { altText, setPrimary } = req.body;

    if (!files || files.length === 0) {
      res.status(400);
      throw new Error("No files uploaded");
    }

    // Verify product exists and belongs to the requesting seller
    const productCheck = await pool.query(
      `SELECT p.product_id 
       FROM products p
       JOIN sellers s ON p.seller_id = s.seller_id
       WHERE p.product_id = $1 AND s.user_id = $2`,
      [productId, req.user?.user_id]
    );

    if (productCheck.rows.length === 0) {
      // Clean up uploaded files if product doesn't exist
      files.forEach(file => {
        fs.unlinkSync(file.path);
      });
      res.status(404);
      throw new Error("Product not found or unauthorized");
    }

    // If setting primary, first reset any existing primary image
    if (setPrimary === "true") {
      await pool.query(
        `UPDATE product_images 
         SET is_primary = false 
         WHERE product_id = $1`,
        [productId]
      );
    }

    // Process each uploaded file
    const imageUrls = await Promise.all(
      files.map(async (file) => {
        const imageUrl = `/uploads/products/${path.basename(file.path)}`;
        const isPrimary = setPrimary === "true" && files.indexOf(file) === 0;

        await pool.query(
          `INSERT INTO product_images (
            product_id, 
            image_url, 
            alt_text,
            is_primary
          ) VALUES ($1, $2, $3, $4)
          RETURNING image_id, image_url, alt_text, is_primary`,
          [productId, imageUrl, altText || null, isPrimary]
        );

        return imageUrl;
      })
    );

    res.status(201).json({
      success: true,
      message: `${files.length} image(s) uploaded successfully`,
      imageUrls,
    });
  }),
];

// @desc    Update product image details
// @route   PUT /api/products/:productId/images/:imageId
// @access  Private/Seller
export const updateProductImage = asyncHandler(async (req: UserRequest, res: express.Response) => {
  const { productId, imageId } = req.params;
  const { alt_text, is_primary, sort_order } = req.body;

  // Verify image belongs to seller's product
  const imageCheck = await pool.query(
    `SELECT pi.image_id 
     FROM product_images pi
     JOIN products p ON pi.product_id = p.product_id
     JOIN sellers s ON p.seller_id = s.seller_id
     WHERE pi.image_id = $1 AND p.product_id = $2 AND s.user_id = $3`,
    [imageId, productId, req.user?.user_id]
  );

  if (imageCheck.rows.length === 0) {
    res.status(404);
    throw new Error("Image not found or unauthorized");
  }

  // If setting as primary, first reset existing primary image
  if (is_primary === true) {
    await pool.query(
      `UPDATE product_images 
       SET is_primary = false 
       WHERE product_id = $1 AND image_id != $2`,
      [productId, imageId]
    );
  }

  const query = `
    UPDATE product_images
    SET
      alt_text = COALESCE($1, alt_text),
      is_primary = COALESCE($2, is_primary),
      sort_order = COALESCE($3, sort_order)
    WHERE image_id = $4
    RETURNING image_id, image_url, alt_text, is_primary, sort_order
  `;

  const result = await pool.query(query, [
    alt_text || null,
    is_primary || false,
    sort_order || 0,
    imageId,
  ]);

  res.status(200).json(result.rows[0]);
});

// @desc    Delete a product image
// @route   DELETE /api/products/:productId/images/:imageId
// @access  Private/Seller
export const deleteProductImage = asyncHandler(async (req: UserRequest, res: express.Response) => {
  const { productId, imageId } = req.params;

  // Verify image belongs to seller's product and get image URL
  const imageCheck = await pool.query(
    `SELECT pi.image_url 
     FROM product_images pi
     JOIN products p ON pi.product_id = p.product_id
     JOIN sellers s ON p.seller_id = s.seller_id
     WHERE pi.image_id = $1 AND p.product_id = $2 AND s.user_id = $3`,
    [imageId, productId, req.user?.user_id]
  );

  if (imageCheck.rows.length === 0) {
    res.status(404);
    throw new Error("Image not found or unauthorized");
  }

  // Delete from database
  await pool.query(
    `DELETE FROM product_images 
     WHERE image_id = $1`,
    [imageId]
  );

  // Delete the actual file
  const imagePath = path.join(__dirname, "../../public", imageCheck.rows[0].image_url);
  if (fs.existsSync(imagePath)) {
    fs.unlinkSync(imagePath);
  }

  res.status(200).json({
    success: true,
    message: "Image deleted successfully",
  });
});