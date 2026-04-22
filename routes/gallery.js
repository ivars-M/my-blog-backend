import express from "express";
import { checkAuth, handleValidationErrors } from "../utils/index.js";
import { GalleryController } from "../controllers/index.js";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { v2 as cloudinary } from "cloudinary";

const router = express.Router();

const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "gallery-uploads",
    allowed_formats: ["jpg", "png", "jpeg", "webp", "mp4", "mov", "avi"],
    resource_type: "auto",
  },
});

const uploadCloud = multer({ storage: cloudinaryStorage });

router.get("/", GalleryController.getAll);
router.post(
  "/upload",
  checkAuth,
  uploadCloud.single("file"),
  GalleryController.upload,
);
router.delete("/:id", checkAuth, GalleryController.delete);

export default router;
