import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { validationResult } from "express-validator";
import UserModel from "../models/User.js";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(errors.array());
    }
    const password = req.body.password;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const doc = new UserModel({
      email: req.body.email,
      fullName: req.body.fullName,
      passwordHash: hash,
      avatarUrl: req.body.avatarUrl,
    });

    const user = await doc.save();

    const { passwordHash: _, ...userData } = user._doc;
    const token = jwt.sign({ _id: user._id }, "secret123", {
      expiresIn: "30d",
    });

    res.json({ ...userData, token });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Registration failed" });
  }
};

export const login = async (req, res) => {
  try {
    const user = await UserModel.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({ message: "User no found" });
    }

    const isValidPass = await bcrypt.compare(
      req.body.password,
      user._doc.passwordHash,
    );
    if (!isValidPass) {
      return res.status(404).json({ message: "Invalid login or password " });
    }
    const token = jwt.sign(
      {
        _id: user._id,
      },
      "secret123",
      {
        expiresIn: "30d",
      },
    );
    const { passwordHash: _, ...userData } = user._doc;

    res.json({ ...userData, token });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Login failed, Invalid login or password ",
    });
  }
};
export const updateAvatar = async (req, res) => {
  try {
    const userId = req.userId; // Dabūjam no checkAuth
    const newAvatarUrl = req.body.avatarUrl; // Šī būs Cloudinary saite

    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "Lietotājs nav atrasts" });
    }

    // Ja gribi dzēst no Cloudinary, tam vajag speciālu API izsaukumu,
    // bet sākumam vienkārši pārrakstām URL:
    user.avatarUrl = newAvatarUrl;
    await user.save();

    res.json({
      success: true,
      avatarUrl: user.avatarUrl,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Neizdevās atjaunot profilu" });
  }
};

// export const updateAvatar = async (userId, newAvatarUrl) => {
//   const user = await UserModel.findById(userId);
//   if (!user) {
//     throw new Error("User not found");
//   }
//   if (user.avatarUrl) {
//     const oldAvatarPath = path.join(__dirname, "..", user.avatarUrl);
//     if (fs.existsSync(oldAvatarPath)) {
//       fs.unlinkSync(oldAvatarPath);
//     }
//   }
//   user.avatarUrl = newAvatarUrl;
//   await user.save();
//   return user;
// };

export const updateProfile = async (req, res) => {
  try {
    const { fullName, email } = req.body;
    const updatedUser = await UserModel.findByIdAndUpdate(
      req.userId,
      { fullName, email },
      { new: true },
    );
    if (!updatedUser) {
      return res.status(404).json({ message: "Lietotājs nav atrasts" });
    }
    const { passwordHash, ...userData } = updatedUser._doc;
    res.json(userData);
  } catch (err) {
    res.status(500).json({ message: "Neizdevās atjaunināt profilu" });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const user = await UserModel.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "Lietotājs nav atrasts" });
    }

    // pārbaudām veco paroli
    const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ message: "Vecā parole nav pareiza" });
    }

    // saglabājam jauno paroli
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    user.passwordHash = hash;
    await user.save();

    const { passwordHash, ...userData } = user._doc;
    res.json(userData);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Neizdevās nomainīt paroli" });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await UserModel.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        message: "User noot found",
      });
    }

    const { passwordHash: _, ...userData } = user._doc;
    const token = jwt.sign(
      {
        _id: user._id,
      },
      "secret123",
      {
        expiresIn: "30d",
      },
    );

    res.json({ ...userData, token });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to get user" }); // IZMAIŅA: pievienota kļūdu apstrāde
  }
};

export const removeMe = async (req, res) => {
  try {
    const user = await UserModel.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "Lietotājs nav atrasts" });
    }

    if (user.avatarUrl) {
      const avatarPath = path.join(__dirname, "..", user.avatarUrl);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    await UserModel.findByIdAndDelete(req.userId);
    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Neizdevās dzēst profilu" });
  }
};
