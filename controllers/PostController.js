import fs from "fs";
import path from "path";
import PostModel from "../models/Post.js";
import CommentModel from "../models/Comment.js";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
export const getByUser = async (req, res) => {
  try {
    const userId = req.params.id;
    // Atrodam visus postus, kur 'user' lauks sakrīt ar userId
    const posts = await PostModel.find({ user: userId }).populate('user').exec();

    res.json(posts);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: 'Neizdevās ielādēt lietotāja rakstus',
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

    // 1. Atrodam postu
    const post = await PostModel.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Posts nav atrasts" });
    }

    // 2. Pārbaude: vai lietotājs ir autors
    if (post.user.toString() !== req.userId) {
      return res.status(403).json({ message: "Nav tiesību dzēst šo postu" });
    }

    // 3. Dzēšam attēlu no CLOUDINARY (nevis no diska)
    if (post.imageUrl) {
      try {
        const parts = post.imageUrl.split("/");
        const fileName = parts[parts.length - 1].split(".")[0]; // nosaukums bez paplašinājuma
        const folder = parts[parts.length - 2]; // mapes nosaukums (blog-uploads)
        const publicId = `${folder}/${fileName}`;

        await cloudinary.uploader.destroy(publicId);
        console.log("Cloudinary bilde izdzēsta:", publicId);
      } catch (cloudErr) {
        // Ja bilde nav atrodama Cloudinary, mēs tikai ierakstām konsolē, bet turpinām dzēst postu
        console.log("Kļūda dzēšot bildi no Cloudinary:", cloudErr);
      }
    }

    // 4. Dzēšam saistītos komentārus
    await CommentModel.deleteMany({ post: postId });

    // 5. Dzēšam pašu postu no DB
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

    // 1. Atrodam esošo postu, lai zinātu, kāda bilde tam bija
    const post = await PostModel.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Posts nav atrasts" });
    }

    // 2. Ja bilde ir mainījusies (datubāzē ir cita, nekā nāk no request)
    // Un ja vecā bilde vispār eksistēja
    if (post.imageUrl && post.imageUrl !== req.body.imageUrl) {
      try {
        const parts = post.imageUrl.split("/");
        const fileName = parts[parts.length - 1].split(".")[0];
        const folder = parts[parts.length - 2];
        const publicId = `${folder}/${fileName}`;

        await cloudinary.uploader.destroy(publicId);
        console.log("Vecā bilde izdzēsta no Cloudinary:", publicId);
      } catch (err) {
        console.log("Neizdevās izdzēst veco bildi:", err);
      }
    }

    // 3. Atjaunojam informāciju datubāzē
    await PostModel.updateOne(
      { _id: postId },
      {
        title: req.body.title,
        text: req.body.text,
        imageUrl: req.body.imageUrl,
        user: req.userId,
        tags: req.body.tags,
      },
    );

    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Neizdevās atjaunot rakstu" });
  }
};
// export const search = async (req, res) => {
//   try {
//     const query = req.query.query; // Dabūjam meklējamo vārdu no URL (?query=...)

//     const posts = await PostModel.find({
//       $or: [
//         { title: { $regex: query, $options: "i" } }, // 'i' nozīmē case-insensitive (nav svarīgi lielie/mazie burti)
//         { text: { $regex: query, $options: "i" } },
//       ],
//     })
//       .populate("user")
//       .exec();

//     res.json(posts);
//   } catch (err) {
//     console.log(err);
//     res.status(500).json({ message: "Neizdevās atrast rakstus" });
//   }
// };
