require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Property = require('../models/Property');
const { body, validationResult } = require('express-validator');
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
    folder: 'property_images',
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

// ✅ Middleware for validation
const validateProperty = [
  body('title').notEmpty().withMessage('Title is required'),
];

// 🔹 Get all properties with pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const properties = await Property.find()
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    const total = await Property.countDocuments();
    res.json({ properties, total, page, limit });
  } catch (err) {
    console.error('Error fetching properties:', err);
    res.status(500).send({ error: 'Failed to fetch properties' });
  }
});

// 🔹 Get a property by ID
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).lean();
    if (!property) return res.status(404).send({ message: 'Property not found' });
    res.json(property);
  } catch (err) {
    console.error('Error fetching property:', err);
    res.status(500).send({ error: 'Failed to fetch property' });
  }
});

// 🔹 Upload a new property with Cloudinary images
router.post("/add", upload.array("images", 10), async (req, res) => {
  try {
    console.log("Received request body:", req.body);
    console.log("Received files:", req.files);

    const { amenities, features, imageUrls, ...otherData } = req.body;

    const formattedAmenities = amenities ? amenities.split(",") : [];
    const formattedFeatures = features ? features.split(",") : [];

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

    let parsedImageUrls = [];
    if (typeof imageUrls === "string") {
      parsedImageUrls = imageUrls.split(",").map((url) => ({ url }));
    } else if (Array.isArray(imageUrls)) {
      parsedImageUrls = imageUrls.map((url) => ({ url }));
    }

    const formattedImages = [...uploadedImages, ...parsedImageUrls];
    console.log("Final formatted images:", formattedImages);

    // Create property object with all fields
    const propertyData = {
      ...otherData,
      amenities: formattedAmenities,
      features: formattedFeatures,
      images: formattedImages,
    };

    console.log("Creating new property with data:", propertyData);

    const newProperty = new Property(propertyData);

    // Validate the property before saving
    const validationError = newProperty.validateSync();
    if (validationError) {
      console.error("Validation error:", validationError);
      return res.status(400).json({ 
        error: "Validation error", 
        details: validationError.errors 
      });
    }

    await newProperty.save();
    console.log("Property saved successfully:", newProperty);

    res.status(201).json({ 
      message: "Property added successfully", 
      property: newProperty 
    });
  } catch (error) {
    console.error("Error adding property:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      error: "Failed to add property",
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.put("/:id", upload.array("images", 10), async (req, res) => {
  try {
    const { amenities, features, imageUrls, existingImages, deletedImages, ...otherData } = req.body;

    const formattedAmenities = amenities ? amenities.split(",") : [];
    const formattedFeatures = features ? features.split(",") : [];

    // ✅ Include `public_id` when storing newly uploaded images
    let formattedImages = req.files.map((file) => ({
      url: file.path,
      public_id: file.filename, // Store Cloudinary's `public_id`
    }));

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

    const propertyToUpdate = await Property.findById(req.params.id);
    if (!propertyToUpdate) {
      return res.status(404).json({ error: "Property not found" });
    }

    // **✅ Handle Image Deletion with `public_id`**
    if (deletedImages) {
      if (typeof deletedImages === "string") {
        deletedImages = [deletedImages];
      }

      await Promise.all(
        deletedImages.map(async (imageUrl) => {
          const image = propertyToUpdate.images.find((img) => img.url === imageUrl);
          if (image?.public_id) {
            await cloudinary.uploader.destroy(image.public_id);
          }
        })
      );

      propertyToUpdate.images = propertyToUpdate.images.filter(
        (img) => !deletedImages.includes(img.url)
      );
    }

    const updatedImages = [
      ...propertyToUpdate.images,
      ...formattedImages.filter(
        (img) => !propertyToUpdate.images.some((existingImg) => existingImg.url === img.url)
      ),
    ];

    Object.assign(propertyToUpdate, otherData);
    propertyToUpdate.amenities = formattedAmenities;
    propertyToUpdate.features = formattedFeatures;
    propertyToUpdate.images = updatedImages;

    const updatedProperty = await propertyToUpdate.save();

    res.status(200).json({
      message: "Property updated successfully",
      updatedProperty,
    });
  } catch (error) {
    console.error("Error updating property:", error);
    res.status(500).json({ error: error.message });
  }
});

const extractPublicId = (url) => {
  try { 
    const matches = url.match(/\/property_images\/([^/]+)\.(jpg|jpeg|png)/); // Extract public_id
    if (!matches || matches.length < 2) return null;

    let publicId = decodeURIComponent(matches[1]); // Decode URL-encoded characters
    publicId = publicId.replace(/\s+/g, "").replace(/\(|\)/g, ""); // Remove spaces & parentheses

    return `property_images/${publicId}`;
  } catch (error) {
    console.error("❌ Error extracting publicId:", error);
    return null;
  }
};

router.delete("/:id", async (req, res) => {
  try {
    console.log("Starting delete process for property ID:", req.params.id);
    
    const property = await Property.findById(req.params.id);
    if (!property) {
      console.log("Property not found with ID:", req.params.id);
      return res.status(404).send({ message: "Property not found" });
    }

    console.log("Found property:", {
      id: property._id,
      title: property.title,
      imageCount: property.images?.length || 0
    });

    if (property.images && property.images.length > 0) {
      const publicIds = property.images
        .filter(image => image.public_id)
        .map(image => image.public_id);

      console.log("Public IDs to delete:", publicIds);

      if (publicIds.length > 0) {
        try {
          console.log("Attempting to delete from Cloudinary with public_ids:", publicIds);
          // Add folder prefix to public_ids if not present
          const formattedPublicIds = publicIds.map(id => 
            id.startsWith('property_images/') ? id : `property_images/${id}`
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
          // Continue with property deletion even if Cloudinary deletion fails
        }
      }
    }

    console.log("Deleting property from database");
    await Property.findByIdAndDelete(req.params.id);
    console.log("Property deleted successfully");
    
    res.status(200).send({ message: "✅ Property and its images deleted successfully" });
  } catch (err) {
    console.error("❌ Error in delete route:", err);
    console.error("Error stack:", err.stack);
    res.status(500).send({ 
      error: "Failed to delete property",
      details: err.message 
    });
  }
});

module.exports = router;
