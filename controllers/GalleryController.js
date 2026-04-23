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
      // Pievienojam .sort({ createdAt: -1 }), lai jaunākie attēli būtu pirmie
      const items = await Gallery.find().sort({ createdAt: -1 });
      console.log("=== GALERIJAS PIEPRASĪJUMS ===");
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

      console.log("Saņemtie dati:", req.body); // Šeit redzēsi virsrakstu un aprakstu

      const item = new Gallery({
        url: req.file.path,
        cloudinaryPublicId: req.file.filename,
        type: req.file.mimetype.startsWith("image/") ? "image" : "video",
        user: req.userId,
        // --- PIEVIENOTIE LAUKI ---
        title: req.body.title || "",
        description: req.body.description || "",
        // -------------------------
      });

      const savedItem = await item.save();
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

      // Pārbaudām resursa tipu Cloudinary dzēšanai
      const resourceType = item.type === "video" ? "video" : "image";

      if (item.cloudinaryPublicId) {
        await cloudinary.uploader.destroy(item.cloudinaryPublicId, {
          resource_type: resourceType,
        });
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
