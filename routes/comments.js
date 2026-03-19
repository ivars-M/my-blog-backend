import express from "express";
import checkAuth from "../utils/checkAuth.js";
import {
  createComment,
  getCommentsByPost,
  deleteComment,
  getAllComments,
} from "../controllers/CommentController.js";

const router = express.Router();

// Izveidot komentāru
router.post("/", checkAuth, createComment);

// 🔥 Pareizais maršruts komentāriem pēc posta ID
router.get("/post/:postId", getCommentsByPost);

// Visi komentāri (admin/debug)
router.get("/", getAllComments);

// Dzēst komentāru
router.delete("/:id", checkAuth, deleteComment);

export default router;
