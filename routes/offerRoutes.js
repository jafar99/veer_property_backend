require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Offer = require('../models/Offer');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const router = express.Router();

// ✅ Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Set up Cloudinary Storage for Multer
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'offer_images',
    format: async (req, file) => 'png',
    public_id: (req, file) => {
      // Generate a unique public_id using timestamp and original filename
      const timestamp = Date.now();
      const filename = file.originalname.replace(/\.[^/.]+$/, ""); // Remove extension
      return `${timestamp}-${filename}`;
    },
  },
});
const upload = multer({ storage });

// 🔹 Get all offers with pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offers = await Offer.find({ isActive: true })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .lean();
    const total = await Offer.countDocuments({ isActive: true });
    res.json({ offers, total, page, limit });
  } catch (err) {
    console.error('Error fetching offers:', err);
    res.status(500).send({ error: 'Failed to fetch offers' });
  }
});

// 🔹 Get an offer by ID
router.get('/:id', async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).lean();
    if (!offer) return res.status(404).send({ message: 'Offer not found' });
    res.json(offer);
  } catch (err) {
    console.error('Error fetching offer:', err);
    res.status(500).send({ error: 'Failed to fetch offer' });
  }
});

// 🔹 Create a new offer with Cloudinary images
router.post("/add", upload.array("images", 10), async (req, res) => {
  try {
    console.log("Received files:", req.files);

    // Store both URL and public_id from Cloudinary response
    const uploadedImages = req.files ? req.files.map((file) => {
      console.log("Processing file:", file);
      // Extract the public_id from the path
      const publicId = file.filename.split('.')[0]; // Remove the extension
      return {
        url: file.path,
        public_id: publicId,
      };
    }) : [];

    console.log("Formatted uploaded images:", uploadedImages);

    // Create offer object with images
    const offerData = {
      images: uploadedImages,
    };

    console.log("Creating new offer with data:", offerData);

    const newOffer = new Offer(offerData);

    // Validate the offer before saving
    const validationError = newOffer.validateSync();
    if (validationError) {
      console.error("Validation error:", validationError);
      return res.status(400).json({ 
        error: "Validation error", 
        details: validationError.errors 
      });
    }

    await newOffer.save();
    console.log("Offer saved successfully:", newOffer);

    res.status(201).json({ 
      message: "Offer added successfully", 
      offer: newOffer 
    });
  } catch (error) {
    console.error("Error adding offer:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      error: "Failed to add offer",
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 🔹 Update an offer
router.put("/:id", upload.array("images", 10), async (req, res) => {
  try {
    const { imageUrls, existingImages, deletedImages } = req.body;

    // ✅ Include `public_id` when storing newly uploaded images
    let formattedImages = req.files ? req.files.map((file) => ({
      url: file.path,
      public_id: file.filename, // Store Cloudinary's `public_id`
    })) : [];

    if (existingImages) {
      if (typeof existingImages === "string") {
        existingImages = [existingImages];
      }
      formattedImages = [
        ...formattedImages,
        ...existingImages.map((imgUrl) => ({ url: imgUrl })),
      ];
    }

    if (imageUrls) {
      formattedImages = [
        ...formattedImages,
        ...imageUrls.split(",").map((url) => ({ url })),
      ];
    }

    const offerToUpdate = await Offer.findById(req.params.id);
    if (!offerToUpdate) {
      return res.status(404).json({ error: "Offer not found" });
    }

    // **✅ Handle Image Deletion with `public_id`**
    if (deletedImages) {
      if (typeof deletedImages === "string") {
        deletedImages = [deletedImages];
      }

      await Promise.all(
        deletedImages.map(async (imageUrl) => {
          const image = offerToUpdate.images.find((img) => img.url === imageUrl);
          if (image?.public_id) {
            await cloudinary.uploader.destroy(image.public_id);
          }
        })
      );

      offerToUpdate.images = offerToUpdate.images.filter(
        (img) => !deletedImages.includes(img.url)
      );
    }

    const updatedImages = [
      ...offerToUpdate.images,
      ...formattedImages.filter(
        (img) => !offerToUpdate.images.some((existingImg) => existingImg.url === img.url)
      ),
    ];

    offerToUpdate.images = updatedImages;
    offerToUpdate.updatedAt = Date.now();

    const updatedOffer = await offerToUpdate.save();

    res.status(200).json({
      message: "Offer updated successfully",
      updatedOffer,
    });
  } catch (error) {
    console.error("Error updating offer:", error);
    res.status(500).json({ error: error.message });
  }
});

// 🔹 Delete an offer
router.delete("/:id", async (req, res) => {
  try {
    console.log("Starting delete process for offer ID:", req.params.id);
    
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      console.log("Offer not found with ID:", req.params.id);
      return res.status(404).send({ message: "Offer not found" });
    }

    console.log("Found offer:", {
      id: offer._id,
      imageCount: offer.images?.length || 0
    });

    if (offer.images && offer.images.length > 0) {
      const publicIds = offer.images
        .filter(image => image.public_id)
        .map(image => image.public_id);

      console.log("Public IDs to delete:", publicIds);

      if (publicIds.length > 0) {
        try {
          console.log("Attempting to delete from Cloudinary with public_ids:", publicIds);
          // Add folder prefix to public_ids if not present
          const formattedPublicIds = publicIds.map(id => 
            id.startsWith('offer_images/') ? id : `offer_images/${id}`
          );
          
          console.log("Formatted public IDs:", formattedPublicIds);
          
          const result = await cloudinary.api.delete_resources(formattedPublicIds, {
            type: 'upload',
            resource_type: 'image'
          });
          
          console.log("✅ Cloudinary delete response:", result);
        } catch (error) {
          console.error("❌ Error deleting images from Cloudinary:", error);
          console.error("Error details:", {
            message: error.message,
            code: error.code,
            http_code: error.http_code,
            name: error.name,
            stack: error.stack
          });
        }
      }
    }

    console.log("Deleting offer from database");
    await Offer.findByIdAndDelete(req.params.id);
    console.log("Offer deleted successfully");
    
    res.status(200).send({ message: "✅ Offer and its images deleted successfully" });
  } catch (err) {
    console.error("❌ Error in delete route:", err);
    console.error("Error stack:", err.stack);
    res.status(500).send({ 
      error: "Failed to delete offer",
      details: err.message 
    });
  }
});

module.exports = router; 