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
    // support any format of images
    format: async (req, file) => 'png', // 'jpeg', 'jpg', 'png'
    public_id: (req, file) => Date.now() + '-' + file.originalname,
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
    const { amenities, features, imageUrls, ...otherData } = req.body;

    const formattedAmenities = amenities ? amenities.split(",") : [];
    const formattedFeatures = features ? features.split(",") : [];

    // Get uploaded image URLs from Multer (or Cloudinary)
    const uploadedImages = req.files.map((file) => ({ url: file.path }));

    // Extract existing image URLs
    const parsedImageUrls = imageUrls ? imageUrls.split(",").map((url) => ({ url })) : [];

    // Combine both uploaded and existing images
    const formattedImages = [...uploadedImages, ...parsedImageUrls];

    const newProperty = new Property({
      ...otherData,
      amenities: formattedAmenities,
      features: formattedFeatures,
      images: formattedImages,
    });

    await newProperty.save();
    res.status(201).json({ message: "Property added successfully", property: newProperty });
  } catch (error) {
    console.error("Error adding property:", error);
    res.status(500).json({ error: error.message });
  }
});



router.put("/:id", upload.array("images", 10), async (req, res) => {
  try {
    console.log("Incoming update request:", req.body);

    let { amenities, features, imageUrls, existingImages, ...otherData } = req.body;

    // Ensure amenities & features are arrays
    const formattedAmenities = amenities ? amenities.split(",") : [];
    const formattedFeatures = features ? features.split(",") : [];

    // Process newly uploaded images
    let formattedImages = req.files.map((file) => ({ url: file.path }));

    // Process existing images (handle as an array)
    if (existingImages) {
      if (typeof existingImages === "string") {
        existingImages = [existingImages]; // Convert single string to array
      }
      formattedImages = [
        ...formattedImages,
        ...existingImages.map((imgUrl) => ({ url: imgUrl })),
      ];
    }

    // Process imageUrls if provided as a comma-separated string
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

    // Ensure images are unique (avoid duplicates)
    const updatedImages = [
      ...propertyToUpdate.images,
      ...formattedImages.filter(
        (img) =>
          !propertyToUpdate.images.some(
            (existingImg) => existingImg.url === img.url
          )
      ),
    ];

    // Update the property
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









// 🔹 Delete a property and its associated images from Cloudinary
router.delete('/:id', async (req, res) => {
  try {
    const property = await Property.findByIdAndDelete(req.params.id);
    if (!property) return res.status(404).send({ message: 'Property not found' });

    // ✅ Delete images from Cloudinary
    if (property.images && property.images.length > 0) {
      await Promise.all(
        property.images.map(async (image) => {
          const publicId = image.url.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`property_images/${publicId}`);
        })
      );
    }

    res.status(200).send({ message: 'Property and its images deleted successfully' });
  } catch (err) {
    console.error('Error deleting property:', err);
    res.status(500).send({ error: 'Failed to delete property' });
  }
});

module.exports = router;
