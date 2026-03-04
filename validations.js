import { body } from "express-validator";

export const loginValidation = [
  body("email", "Nepareizs epasta formāts").isEmail(),
  body("password", "parolei jāsatur vismaz 5 zīmes").isLength({
    min: 5,
  }),
];

export const registerValidation = [
  body("email", "Nepareizs epasta formāts").isEmail(),
  body("password", "parolei jāsatur vismaz 5 zīmes").isLength({
    min: 5,
  }),
  body("fullName", "Norādiet vārdu").isLength({
    min: 3,
  }),
  body("avatarUrl").optional().isString(),
];

export const postCreateValidation = [
  body("title", "Ierakstīt virsrakstu").isLength({ min: 3 }).isString(),
  body("text", "Ierakstīt tekstu")
    .isLength({
      min: 5,
    })
    .isString(),
  body("tags", "Nepareizs tega formāts (norādīt masīvu)").optional().isArray(),
  body("ImageUrl", "Nepareiza saite uz attēlu").optional().isString(),
];
