import CommentModel from "../models/Comment.js";

// Izveidot komentāru
export const createComment = async (req, res) => {
  try {
    const { postId, text } = req.body;

    const comment = new CommentModel({
      post: postId,
      text,
      user: req.userId,
    });

    const savedComment = await comment.save();

    const populated = await savedComment.populate({
      path: "user",
      select: "fullName avatarUrl",
      options: { strictPopulate: false },
    });

    // 🔥 Drošs fallback, ja lietotājs ir izdzēsts
    const safeComment = {
      ...populated._doc,
      user: populated.user || {
        fullName: "Anonīms lietotājs",
        avatarUrl: null,
      },
    };

    res.json(safeComment);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Neizdevās izveidot komentāru" });
  }
};

// Iegūt komentārus pēc posta ID
export const getCommentsByPost = async (req, res) => {
  try {
    let comments = await CommentModel.find({ post: req.params.postId })
      .populate({
        path: "user",
        select: "fullName avatarUrl",
        options: { strictPopulate: false },
      })
      .lean();

    // 🔥 Drošs fallback visiem komentāriem
    comments = comments.map((c) => ({
      ...c,
      user: c.user || { fullName: "Anonīms lietotājs", avatarUrl: null },
    }));

    res.json(comments);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Neizdevās ielādēt komentārus" });
  }
};

// Iegūt visus komentārus (admin/debug)
export const getAllComments = async (req, res) => {
  try {
    let comments = await CommentModel.find()
      .populate({
        path: "user",
        select: "fullName avatarUrl",
        options: { strictPopulate: false },
      })
      .lean();

    comments = comments.map((c) => ({
      ...c,
      user: c.user || { fullName: "Anonīms lietotājs", avatarUrl: null },
    }));

    res.json(comments);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Neizdevās ielādēt komentārus" });
  }
};

// controllers/CommentController.js

export const update = async (req, res) => {
  try {
    const commentId = req.params.id;

    // Atjaunojam komentāru datubāzē
    await CommentModel.updateOne({ _id: commentId }, { text: req.body.text });

    res.json({
      success: true,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Neizdevās atjaunot komentāru",
    });
  }
};

// Dzēst komentāru
export const deleteComment = async (req, res) => {
  try {
    const commentId = req.params.id;

    const comment = await CommentModel.findById(commentId);

    if (!comment) {
      return res.status(404).json({ message: "Komentārs nav atrasts" });
    }

    if (comment.user.toString() !== req.userId) {
      return res
        .status(403)
        .json({ message: "Nav tiesību dzēst šo komentāru" });
    }

    await CommentModel.findByIdAndDelete(commentId);

    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Neizdevās dzēst komentāru" });
  }
};
