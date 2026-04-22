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
import {
  UserController,
  PostController,
  commentController,
  GalleryController,
} from "./controllers/index.js";
import galleryRoutes from "./routes/gallery.js";

console.log("Mana saite:", process.env.MONGODB_URI);

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
      "https://ideja-prakse-pieredze.vercel.app",
    ],
    credentials: true,
  }),
);

// Paturam šo vecajām bildēm, ja tādas vēl ir lokāli
// app.use("/uploads", express.static("uploads"));
app.use("/comments", commentRoutes);

// --- AUGŠUPIELĀDES MARŠRUTI (Tagad uz Cloudinary) ---
app.use("/api/gallery", galleryRoutes);

app.post("/upload/avatar", uploadCloud.single("image"), (req, res) => {
  try {
    res.json({
      url: req.file.path, // Atgriež pilnu https:// saiti
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Avatara ielāde neizdevās" });
  }
});
app.post(
  "/api/gallery/upload",
  checkAuth,
  uploadCloud.single("file"),
  GalleryController.upload,
);

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
      res.status(500).json({ message: "Attēla ielāde neizdevās" });
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
// Backendā jābūt šādai rindiņai:
app.patch("/comments/:id", checkAuth, commentController.update);

// --- POSTU MARŠRUTI ---
app.get("/tags", PostController.getLastTags);
app.get("/posts", PostController.getAll);
app.get("/posts/tags", PostController.getLastTags);
app.get("/posts/tags/:tag", PostController.getPostsByTag);
app.get("/posts/:id", PostController.getOne);
app.get("/posts/user/:id", PostController.getByUser);
app.get("/users", UserController.getAll);

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
// Testa maršruts, lai serveris neietu gulēt
app.get("/ping", (req, res) => {
  res.send("pong");
});
app.listen(PORT, (err) => {
  if (err) {
    return console.log(err);
  }
  console.log(`Serveris griežas uz porta ${PORT}`);
});

// npm run start:dev

// VIENREIZĒJA TAGU TĪRĪŠANAS FUNKCIJA (Palaid un pēc tam izdzēs šo kodu!)
// const cleanupTags = async () => {
//   try {
//     const posts = await PostModel.find();

// Atrodam visus postus
// for (const post of posts) {
//   if (post.tags && Array.isArray(post.tags)) {

// Pielietojam to pašu betona loģiku
// const uniqueTags = [...new Set(
//   post.tags.map(t => String(t).trim().toLowerCase())
// )].filter(t => t !== '');

// Atjaunojam postu datubāzē
//         await PostModel.updateOne({ _id: post._id }, { tags: uniqueTags });
//       }
//     }
//     console.log("--- VISI TAGI IR IZTĪRĪTI! ---");
//   } catch (err) {
//     console.log("Kļūda tīrot tagus:", err);
//   }
// };

// cleanupTags();
// // Noņem komentāru šai rindiņai, palaid serveri vienreiz, un tad atkal aizkomentē!
