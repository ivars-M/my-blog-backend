import fs from "fs";
import path from "path";
import PostModel from "../models/Post.js";
import CommentModel from "../models/Comment.js";

// Iegūst pēdējās piecas atzīmes no rakstiem
export const getLastTags = async (req, res) => {
  try {
    const posts = await PostModel.find().limit(9).exec();

    const tags = posts
      .map((obj) => obj.tags)
      .flat()
      .slice(0, 9);
    res.json(tags);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Neizdevās iegūt rakstus" });
  }
};
export const getPostsByTag = async (req, res) => {
  try {
    const tag = req.params.tag; // Iegūstam tagu no URL

    // Meklējam rakstus, kuru 'tags' masīvā ir šis tags
    // const posts = await PostModel.find({ tags: tag }).populate("user").exec();
    const posts = await PostModel.find({
      tags: { $regex: tag, $options: "i" },
    })
      .populate("user")
      .exec();
    res.json(posts);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Neizdevās iegūt rakstus pēc taga",
    });
  }
};

export const getAll = async (req, res) => {
  try {
    let posts = await PostModel.find()
      .populate({
        path: "user",
        select: "fullName avatarUrl",
        options: { strictPopulate: false },
      })
      .lean();

    // 🔥 Drošs fallback, ja lietotājs ir izdzēsts
    posts = posts.map((post) => ({
      ...post,
      user: post.user || { fullName: "Anonīms autors", avatarUrl: null },
    }));

    // Pievienojam komentāru skaitu
    for (let post of posts) {
      post.commentsCount = await CommentModel.countDocuments({
        post: post._id,
      });
    }

    res.json(posts);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Neizdevās ielādēt postus" });
  }
};

// Iegūst komentārus pēc posta ID
export const getCommentsByPost = async (req, res) => {
  try {
    let comments = await CommentModel.find({ post: req.params.postId })
      .populate({
        path: "user",
        select: "fullName avatarUrl",
        options: { strictPopulate: false },
      })
      .lean();

    // 🔥 Drošs fallback komentāriem
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

// Iegūst vienu rakstu un palielina skatījumu skaitu
export const getOne = async (req, res) => {
  try {
    const postId = req.params.id;

    let doc = await PostModel.findOneAndUpdate(
      { _id: postId },
      { $inc: { viewsCount: 1 } },
      { returnDocument: "after" },
    ).populate({
      path: "user",
      select: "fullName avatarUrl",
      options: { strictPopulate: false },
    });

    if (!doc) {
      return res.status(404).json({ message: "Raksts nav atrasts" });
    }

    // 🔥 Drošs fallback, ja lietotājs ir izdzēsts
    if (!doc.user) {
      doc = {
        ...doc._doc,
        user: { fullName: "Anonīms autors", avatarUrl: null },
      };
    }

    res.json(doc);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Neizdevās iegūt rakstu" });
  }
};

export const remove = async (req, res) => {
  try {
    const postId = req.params.id;

    const post = await PostModel.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Posts nav atrasts" });
    }
    await CommentModel.deleteMany({ post: postId });

    // 1. Pārbaude: vai lietotājs ir autors
    if (post.user.toString() !== req.userId) {
      return res.status(403).json({ message: "Nav tiesību dzēst šo postu" });
    }

    // 2. Dzēšam attēlu, ja ir
    if (post.imageUrl) {
      const filePath = path.join(process.cwd(), post.imageUrl);
      fs.unlink(filePath, (err) => {
        if (err) console.log("Neizdevās dzēst failu:", err);
      });
    }

    // 3. Dzēšam postu
    await PostModel.findByIdAndDelete(postId);

    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Neizdevās dzēst postu" });
  }
};

// Izveido jaunu rakstu
export const create = async (req, res) => {
  try {
    const doc = new PostModel({
      title: req.body.title,
      text: req.body.text,
      imageUrl: req.body.imageUrl,
      tags: req.body.tags,
      user: req.userId,
    });

    const post = await doc.save();
    res.json(post);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Neizdevās izveidot rakstu" });
  }
};

export const update = async (req, res) => {
  try {
    const postId = req.params.id;
    const updatedPost = await PostModel.findByIdAndUpdate(
      postId,
      {
        title: req.body.title,
        text: req.body.text,
        imageUrl: req.body.imageUrl,
        tags: req.body.tags,
        user: req.userId,
      },
      { new: true },
    );
    res.json(updatedPost);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Neizdevās atjaunot rakstu",
    });
  }
};
