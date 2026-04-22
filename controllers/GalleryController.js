import Gallery from "../models/Gallery.js";
import { v2 as cloudinary } from "cloudinary";

// Konfigurācija obligāta katrā failā, kur lieto cloudinary objektu tieši
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const GalleryController = {
 

  getAll: async (req, res) => {
    try {
      const items = await Gallery.find();
      console.log("=== GALERIJAS PIEPRASĪJUMS ===");
      console.log("Atrasti ieraksti DB:", items.length);
      console.log("Pirmais ieraksts (ja ir):", items[0]);
      res.json(items);
    } catch (err) {
      console.error("Kļūda getAll:", err);
      res.status(500).json({ message: "Kļūda iegūstot galeriju" });
    }
  },

  upload: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Fails nav sūtīts" });
      }

      console.log("Mēģinu saglabāt DB bildi no:", req.file.path);
      console.log("Lietotājs, kas augšupielādē:", req.userId);

      const item = new Gallery({
        url: req.file.path,
        cloudinaryPublicId: req.file.filename,
        type: req.file.mimetype.startsWith("image/") ? "image" : "video",
        user: req.userId, // Pārliecinies, ka checkAuth šo padod
      });

      const savedItem = await item.save();
      console.log("Veiksmīgi saglabāts DB:", savedItem._id);

      res.json(savedItem);
    } catch (err) {
      console.log("SAGLABĀŠANAS KĻŪDA DB:", err);
      res.status(500).json({ message: "Augšupielādes kļūda datubāzē" });
    }
  },

  delete: async (req, res) => {
    try {
      const item = await Gallery.findById(req.params.id);
      if (!item) return res.status(404).json({ message: "Fails nav atrasts" });

      if (item.cloudinaryPublicId) {
        await cloudinary.uploader.destroy(item.cloudinaryPublicId);
      }

      await Gallery.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (err) {
      console.log("Dzēšanas kļūda:", err);
      res.status(500).json({ message: "Dzēšanas kļūda" });
    }
  },
};

export default GalleryController;
