import "dotenv/config"; // Ielādē datus no .env faila
import express from "express";
import multer from "multer";
import cors from "cors";
import mongoose from "mongoose";

// JAUNIE IMPORTI CLOUDINARY INTEGRĀCIJAI
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

import commentRoutes from "./routes/comments.js";
import { createComment } from "./controllers/commentController.js";

import {
  registerValidation,
  loginValidation,
  postCreateValidation,
} from "./validations.js";
import { checkAuth, handleValidationErrors } from "./utils/index.js";
import { UserController, PostController } from "./controllers/index.js";

// 1. CLOUDINARY KONFIGURĀCIJA (izmanto mainīgos no .env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. CLOUDINARY STORAGE IESTATĪŠANA (Aizstāj veco diskStorage)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'blog-uploads', // Mape tavā Cloudinary panelī
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

const upload = multer({ storage });

const dbURI = process.env.MONGODB_URI;
mongoose
  .connect(dbURI)
  .then(() => console.log("DB OK"))
  .catch((err) => console.log("DB ERR", err));

const app = express();
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

// Paturam šo, lai vecās bildes (kas jau ir serverī) joprojām ielādētos
app.use("/uploads", express.static("uploads"));

app.use("/comments", commentRoutes);

// --- AUGŠUPIELĀDES MARŠRUTI (Tagad izmanto Cloudinary) ---

app.post("/upload/avatar", upload.single("image"), (req, res) => {
  try {
    res.json({
      // Cloudinary atgriež pilnu URL (https://res.cloudinary.com/...)
      url: req.file.path, 
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Upload failed" });
  }
});

app.post("/posts/uploads", checkAuth, upload.single("image"), (req, res) => {
  try {
    res.json({
      url: req.file.path, 
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Post image upload failed" });
  }
});

// --- PĀRĒJIE MARŠRUTI (Paliek nemainīti) ---

app.post("/auth/login", loginValidation, handleValidationErrors, UserController.login);
app.post("/auth/register", registerValidation, handleValidationErrors, UserController.register);

app.patch("/auth/avatar", checkAuth, async (req, res) => {
  try {
    const { avatarUrl } = req.body;
    const user = await UserController.updateAvatar(req.userId, avatarUrl);
    res.json(user);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Avatar update failed" });
  }
});

app.get("/auth/me", checkAuth, UserController.getMe);
app.patch("/auth/me", checkAuth, UserController.updateProfile);
app.delete("/auth/me", checkAuth, UserController.removeMe);
app.patch("/auth/password", checkAuth, UserController.updatePassword);

app.get("/tags", PostController.getLastTags);
app.get("/posts", PostController.getAll);
app.get("/posts/tags", PostController.getLastTags);
app.get("/posts/:id", PostController.getOne);

app.post("/posts", checkAuth, postCreateValidation, handleValidationErrors, PostController.create);
app.delete("/posts/:id", checkAuth, PostController.remove);
app.patch("/posts/:id", checkAuth, postCreateValidation, handleValidationErrors, PostController.update);

const PORT = process.env.PORT || 4444;

app.listen(PORT, (err) => {
  if (err) {
    return console.log(err);
  }
  console.log(`Serveris griežas uz porta ${PORT}`);
});