import "dotenv/config"; // Šis ielādē datus no .env faila
import express from "express";
import multer from "multer";
import cors from "cors";
import mongoose from "mongoose";
import commentRoutes from "./routes/comments.js";
import { createComment } from "./controllers/commentController.js";

import {
  registerValidation,
  loginValidation,
  postCreateValidation,
} from "./validations.js";
import { checkAuth, handleValidationErrors } from "./utils/index.js";
import { UserController, PostController } from "./controllers/index.js";

// const express = require("express"); // 2. IMPORTĒJAM EXPRESS

const dbURI = process.env.MONGODB_URI;
mongoose
  .connect(dbURI)

  .then(() => console.log("DB OK"))
  .catch((err) => console.log("DB ERR", err));

const app = express();

const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    cb(null, "uploads/");
  },
  filename: (_, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

app.use(express.json());

//Šī vieta JĀMAINA ADRESE
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://my-blog-frontend-ten.vercel.app",
    ],
    credentials: true,
  }),
);

app.use("/uploads", express.static("uploads"));
app.use("/comments", commentRoutes);
app.post("/upload/avatar", upload.single("image"), (req, res) => {
  try {
    res.json({
      url: "/uploads/" + req.file.filename,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Upload failed" });
  }
});

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
app.post("/posts/uploads", checkAuth, upload.single("image"), (req, res) => {
  res.json({
    url: "/uploads/" + req.file.filename,
  });
});
app.get("/tags", PostController.getLastTags);
app.get("/posts", PostController.getAll);
app.get("/posts/tags", PostController.getLastTags);
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

// Izmantojam portu no servera iestatījumiem vai 4444 kā rezerves variantu lokāli
const PORT = process.env.PORT || 4444;

app.listen(PORT, (err) => {
  if (err) {
    return console.log(err);
  }
  console.log(`Serveris griežas uz porta ${PORT}`);
});



// npm run start:dev
