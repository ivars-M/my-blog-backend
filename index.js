import "dotenv/config";
import express from "express";
import multer from "multer";
import cors from "cors";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

import commentRoutes from "./routes/comments.js";
import {
  registerValidation,
  loginValidation,
  postCreateValidation,
} from "./validations.js";
import { checkAuth, handleValidationErrors } from "./utils/index.js";
import { UserController, PostController } from "./controllers/index.js";

const dbURI = process.env.MONGODB_URI;
mongoose
  .connect(dbURI)
  .then(() => console.log("DB OK"))
  .catch((err) => console.log("DB ERR", err));

const app = express();

// --- CLOUDINARY KONFIGURĀCIJA ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "blog-uploads",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});

const uploadCloud = multer({ storage: cloudinaryStorage });

app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://my-blog-frontend-ten.vercel.app",
    ],
    credentials: true,
  }),
);

// Paturam šo vecajām bildēm, ja tādas vēl ir lokāli
app.use("/uploads", express.static("uploads"));
app.use("/comments", commentRoutes);

// --- AUGŠUPIELĀDES MARŠRUTI (Tagad uz Cloudinary) ---

app.post("/upload/avatar", uploadCloud.single("image"), (req, res) => {
  try {
    res.json({
      url: req.file.path, // Atgriež pilnu https:// saiti
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Avatar upload failed" });
  }
});

app.post(
  "/posts/uploads",
  checkAuth,
  uploadCloud.single("image"),
  (req, res) => {
    try {
      res.json({
        url: req.file.path, // Atgriež pilnu https:// saiti
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "Post image upload failed" });
    }
  },
);

// --- LIETOTĀJA MARŠRUTI ---
app.post(
  "/auth/login",
  loginValidation,
  handleValidationErrors,
  UserController.login,
);
app.post(
  "/auth/register",
  registerValidation,
  handleValidationErrors,
  UserController.register,
);
app.get("/auth/me", checkAuth, UserController.getMe);
app.patch("/auth/me", checkAuth, UserController.updateProfile);

app.patch("/auth/avatar", checkAuth, UserController.updateAvatar);

app.delete("/auth/me", checkAuth, UserController.removeMe);
app.patch("/auth/password", checkAuth, UserController.updatePassword);

// --- POSTU MARŠRUTI ---
app.get("/tags", PostController.getLastTags);
app.get("/posts", PostController.getAll);
app.get("/posts/tags", PostController.getLastTags);
app.get("/posts/tags/:tag", PostController.getPostsByTag);
app.get("/posts/:id", PostController.getOne);

app.post(
  "/posts",
  checkAuth,
  postCreateValidation,
  handleValidationErrors,
  PostController.create,
);
app.delete("/posts/:id", checkAuth, PostController.remove);
app.patch(
  "/posts/:id",
  checkAuth,
  postCreateValidation,
  handleValidationErrors,
  PostController.update,
);

const PORT = process.env.PORT || 4444;
app.listen(PORT, (err) => {
  if (err) {
    return console.log(err);
  }
  console.log(`Serveris griežas uz porta ${PORT}`);
});
